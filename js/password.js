/* The note and keypad use the same round-scoped, random seven-digit code. */
Defuse.modules.password = {
  title: "密码输入",
  english: "ACCESS CODE",
  instruction: "看纸条，灰挡住的按住擦。没看全就输错，会炸。",
  banter: "先擦清纸条再输！盲输错了会直接爆炸，遇袭先处理危险。",
  mount(ctx) {
    const variant = { expected: ctx.round.passwordCode, note: ctx.round.passwordCode };
    const memo = Defuse.passwordMemos.get(ctx.round), escape = Defuse.escapeHtml;
    const reveal = ctx.round.passwordReveal || Array(7).fill(false);
    const exposedCount = reveal.filter(Boolean).length;
    const hiddenPositions = reveal.flatMap((shown, i) => shown ? [] : [i]);
    const cleanDuration = 2400 * hiddenPositions.length / 7;
    let cleaned = Math.min(cleanDuration, Math.max(0, ctx.round.passwordWipeMs || 0));
    const initiallyClean = cleaned >= cleanDuration;
    ctx.action(initiallyClean ? "密码已完整露出 · 直接输入" : `先擦密码 · 已露出 ${exposedCount} / 7 位`);
    ctx.banter(Defuse.passwordGuidance(ctx.round), "commander");
    let value = "";
    ctx.root.innerHTML = `<div class="password-unit" data-password-view="note"><div class="mobile-password-nav" role="group" aria-label="密码操作"><button type="button" data-password-view="note" aria-pressed="true">看纸条</button><button type="button" data-password-view="keys" aria-pressed="false">输密码 ${Defuse.icon("arrowRight", "action-icon")}</button></div><div class="unit-top"><span>AUTHENTICATION REQUIRED</span><span class="led"></span></div><div class="code-display"><span class="screen-caption">请输入解除密码</span><b id="code-value">_ _ _ _ _ _ _</b><span class="screen-foot">INPUT <em id="code-count">0</em> / 7 <i id="password-state">● 待解除</i></span></div>
      <div class="password-note-wrap">
        <button type="button" class="password-note" data-memo="${memo.id}" data-state="${initiallyClean ? "clean" : "dirty"}" aria-label="密码纸条" aria-describedby="note-help note-memo">
          <span class="note-sheet" aria-hidden="true"></span><span class="note-fold" aria-hidden="true"></span>
          <span class="note-tape" aria-hidden="true"></span><span class="note-tape note-tape-right" aria-hidden="true"></span>
          <span class="note-heading" aria-hidden="true"><span>${escape(memo.heading)}</span><i>${escape(memo.margin)}</i></span>
          <span class="note-code-window" aria-hidden="true"><strong class="note-code">${variant.note.split("").map((digit, i) => `<span class="note-digit" data-digit="${i}" data-visible="${reveal[i]}"><span>${digit}</span><i class="digit-dust"></i></span>`).join("")}</strong><span class="wipe-cloth"></span></span>
          <span class="note-scribble" id="note-memo"><span class="note-memo-line">${escape(memo.line)}</span><span class="note-memo-reply">${escape(memo.reply)}</span></span>
          <span class="note-doodle" aria-hidden="true">B<span>${Defuse.icon("arrowUpRight", "action-icon")}</span></span>
        </button>
        <div class="note-readout"><div class="note-footer" aria-hidden="true"><span class="note-action">按住纸条擦灰</span><b class="note-percent"></b></div><span class="note-progress" aria-hidden="true"><span></span></span></div>
        <p id="note-help">没看全就猜错，一次即炸；遇袭先避险。</p>
      </div>
      <div class="keypad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "确认"].map((n) => `<button data-key="${n}" class="key ${n === "确认" ? "confirm-key" : ""}" ${n === "确认" ? "disabled" : ""} aria-label="${n === "⌫" ? "删除最后一位" : n}">${n === "⌫" ? Defuse.icon("deleteBack", "action-icon") : n}</button>`).join("")}</div></div>`;
    const note = ctx.root.querySelector(".password-note"),
      noteAction = ctx.root.querySelector(".note-action"),
      notePercent = ctx.root.querySelector(".note-percent"),
      noteReadout = ctx.root.querySelector(".note-readout");
    const digits = [...note.querySelectorAll(".note-digit")];
    let lastPaint = -1;
    const paintNote = () => {
      const progress = cleanDuration ? cleaned / cleanDuration : 1;
      const percent = Math.floor(progress * 100);
      if (percent === lastPaint) return;
      lastPaint = percent;
      let readable = 0;
      const spoken = [];
      digits.forEach((digit, i) => {
        const order = hiddenPositions.indexOf(i);
        const visible = reveal[i] || progress >= (order + 1) / hiddenPositions.length;
        if (digit.dataset.visible !== String(visible)) digit.dataset.visible = String(visible);
        if (visible) readable++;
        spoken.push(visible ? variant.note[i] : "未知");
      });
      note.dataset.revealed = String(readable);
      note.style.setProperty("--wipe", `${percent}%`);
      noteReadout.style.setProperty("--wipe", `${percent}%`);
      notePercent.textContent = `${readable} / 7 位可见`;
      noteAction.textContent = progress >= 1 ? "七位已露出" : "按住纸条擦灰";
      note.setAttribute("aria-label", `密码纸条，${spoken.join(" ")}。${progress >= 1 ? "已擦净，可直接输入" : "按住擦拭"}`);
    };
    paintNote();
    let wiping = false,
      pointerId = null,
      heldKey = null,
      lastFrame = 0;
    const stopWiping = () => {
      const wasWiping = wiping;
      wiping = false;
      heldKey = null;
      const previousPointer = pointerId;
      pointerId = null;
      if (previousPointer !== null && note.hasPointerCapture(previousPointer))
        note.releasePointerCapture(previousPointer);
      if (cleaned < cleanDuration) {
        note.dataset.state = "dirty";
        noteAction.textContent =
          cleaned > 0 ? "还差一点，继续按住擦" : "按住，擦掉灰尘";
      }
      if (wasWiping)
        ctx.action(
          cleaned >= cleanDuration
            ? "纸条已擦净 · 等待输入"
            : "擦拭暂停 · 可继续输入",
        );
    };
    const beginWiping = () => {
      if (!ctx.active() || cleaned >= cleanDuration || wiping) return false;
      wiping = true;
      lastFrame = performance.now();
      note.dataset.state = "wiping";
      noteAction.textContent = "正在擦拭…";
      ctx.action(
        "正在擦拭密码纸条",
        Math.floor((cleaned / cleanDuration) * 100),
      );
      ctx.sound("tap");
      return true;
    };
    ctx.listen(note, "pointerdown", (e) => {
      if (
        !e.isPrimary ||
        e.button !== 0 ||
        pointerId !== null ||
        heldKey !== null
      )
        return;
      e.preventDefault();
      if (!beginWiping()) return;
      pointerId = e.pointerId;
      note.setPointerCapture(e.pointerId);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
      ctx.listen(note, type, (e) => {
        if (e.pointerId === pointerId) stopWiping();
      }),
    );
    ctx.listen(note, "contextmenu", (e) => e.preventDefault());
    ctx.listen(note, "keydown", (e) => {
      if (![" ", "Enter"].includes(e.key)) return;
      e.preventDefault();
      if (!e.repeat && pointerId === null && heldKey === null && beginWiping())
        heldKey = e.key;
    });
    ctx.listen(note, "keyup", (e) => {
      if (e.key === heldKey) {
        e.preventDefault();
        stopWiping();
      }
    });
    ctx.listen(note, "blur", stopWiping);
    ctx.listen(window, "blur", stopWiping);
    ctx.listen(document, "defuse-orientation-block", stopWiping);
    ctx.listen(document, "visibilitychange", stopWiping);
    ctx.frame((now) => {
      if (!wiping) return;
      if (!ctx.active() || document.hidden) {
        stopWiping();
        return;
      }
      // A stalled or background frame never wipes the whole note at once.
      cleaned = Math.min(
        cleanDuration,
        cleaned + Math.min(100, Math.max(0, now - lastFrame)),
      );
      lastFrame = now;
      ctx.round.passwordWipeMs = cleaned;
      const percent = Math.floor((cleaned / cleanDuration) * 100);
      ctx.action(`正在擦拭纸条 · ${percent}%`, percent);
      paintNote();
      if (cleaned < cleanDuration) noteAction.textContent = "正在擦拭…";
      if (cleaned === cleanDuration) {
        stopWiping();
        note.dataset.state = "clean";
        noteAction.textContent = "七位已露出";
        notePercent.textContent = "已擦净 ✓";
        note.setAttribute(
          "aria-label",
          `纸条已擦净，解除密码 ${variant.note.split("").join(" ")}`,
        );
        ctx.banter("擦干净了，七位照着输。有情况先躲，别贪这几个数。", "commander");
      }
    });
    const update = (interrupted = false) => {
      ctx.root.querySelector("#code-value").textContent = value
        .padEnd(7, "_")
        .split("")
        .join(" ");
      ctx.root.querySelector("#code-count").textContent = value.length;
      ctx.root.querySelector(".confirm-key").disabled = value.length !== 7;
      ctx.action(
        interrupted
          ? "密码已清空 · 先处理事件"
          : value.length === 7
          ? "密码已输入 · 等待确认"
          : `输入密码 · ${value.length} / 7 位`,
      );
    };
    const interruptInput = () => {
      stopWiping();
      value = "";
      update(true);
    };
    // Listen for the warning itself, not just the subsequent dodge or hit.
    // The module's AbortSignal disposes both handlers before the next module.
    ctx.listen(document, "defuse-threat-start", interruptInput);
    ctx.listen(document, "defuse-evade", interruptInput);
    function enter(key) {
      if (!ctx.active()) return;
      if (key === "确认" && value.length !== 7) {
        ctx.action("先输满 7 位，再确认");
        return;
      }
      ctx.sound(/^\d$/.test(key) ? `key${(Number(key) % 7) + 1}` : "tap");
      if (key === "⌫") value = value.slice(0, -1);
      else if (key === "确认") {
        if (value === variant.expected)
          ctx.complete("对上了！接着拆，留意来枪。");
        else {
          const blind = cleaned < cleanDuration;
          ctx.error(
              blind
              ? "密码还没看全就盲输，错误密码触发了直接引爆。"
              : "输错了，照着上面纸条再看一遍。",
            { fatal: blind },
          );
          value = "";
        }
      } else if (value.length < 7) value += key;
      update();
    }
    function showView(name) {
      if (!ctx.active() || !["note", "keys"].includes(name)) return;
      stopWiping();
      ctx.root.querySelector(".password-unit").dataset.passwordView = name;
      ctx.root.querySelectorAll("button[data-password-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.passwordView === name)));
    }
    ctx.listen(ctx.root, "click", (e) => {
      const view = e.target.closest("button[data-password-view]");
      if (view) {
        showView(view.dataset.passwordView);
        return;
      }
      const b = e.target.closest("[data-key]");
      if (b) enter(b.dataset.key);
    });
    ctx.listen(document, "keydown", (e) => {
      if (e.repeat || e.defaultPrevented || e.isComposing) return;
      // Enter on a helper or HUD button must not accidentally submit a password.
      if (e.key === "Enter" && e.target.closest?.("button:not([data-key])"))
        return;
      const key = /^\d$/.test(e.key)
        ? e.key
        : e.key === "Backspace"
          ? "⌫"
          : e.key === "Enter"
            ? "确认"
            : null;
      if (key) {
        e.preventDefault();
        showView("keys");
        enter(key);
      }
    });
  },
};
