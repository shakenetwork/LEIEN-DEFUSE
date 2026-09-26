Defuse.modules.hold = {
  title: "有钳，直接拆",
  english: "HOLD TO DEFUSE",
  instruction: "有钳：持续长按 5 秒。松手就得重拆。",
  banter: "我架 B 洞，你拆。有钳，直接拆到底。",
  mount(ctx) {
    if (Defuse.mountTeamCoverOffer?.(ctx, () => this.mountNormal(ctx))) return;
    this.mountNormal(ctx);
  },
  mountNormal(ctx) {
    const duration = ctx.round.defuseDuration || 5000;
    const seconds = duration / 1000;
    const label = duration === 10000 ? "无钳强拆 10 秒" : "有钳 5 秒";
    const title = document.querySelector("#module-title"), instruction = document.querySelector("#module-instruction");
    if (title) title.textContent = duration === 10000 ? "无钳，十秒强拆" : this.title;
    if (instruction) instruction.textContent = `${label}。连续按住，松手清零。`;
    ctx.root.innerHTML = `<div class="hold-unit"><span class="eyebrow">MANUAL OVERRIDE</span><div class="hold-orbit"><div class="orbit-ticks"></div><button class="hold-button" aria-label="按住拆除，保持五秒，松手清零">${Defuse.icon("shield")}<b>按住拆除</b><span>HOLD TO DEFUSE</span></button></div><div class="hold-meter"><b id="hold-number">0<span>%</span></b><span id="hold-state">等待长按</span></div><div class="progress-track" role="progressbar" aria-label="拆除进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div></div></div><p class="instruction-tag">有钳 5 秒 · 松手清零</p></div>`;
    ctx.root
      .querySelector(".hold-button")
      .setAttribute("aria-label", `按住拆除，保持 ${seconds} 秒，松手清零`);
    ctx.root.querySelector(".instruction-tag").textContent =
      `${label} · 松手清零`;
    const button = ctx.root.querySelector(".hold-button"),
      bar = ctx.root.querySelector(".progress-track");
    if (Defuse.assets.button)
      button.append(
        Defuse.assetImage(Defuse.assets.button, "replacement-button"),
      );
    let held = false,
      elapsed = 0,
      last = 0,
      pointer = null,
      keyboard = false,
      messages = 0,
      renderedPercent = -1;
    const stop = () => {
      const interrupted = held && elapsed < duration;
      held = false;
      pointer = null;
      keyboard = false;
      button.classList.remove("holding");
      if (interrupted) {
        elapsed = 0;
        renderedPercent = -1;
        ctx.stopSound();
        ctx.root.querySelector("#hold-number").innerHTML = "0<span>%</span>";
        bar.firstElementChild.style.width = "0%";
        bar.setAttribute("aria-valuenow", "0");
        ctx.root
          .querySelector(".hold-orbit")
          .style.setProperty("--progress", "0%");
        ctx.root.querySelector("#hold-state").textContent =
          "松手清零 · 重新按住";
        ctx.action("拆除中断 · 重新按住");
        if (ctx.active()) ctx.banter(Defuse.supportComms?.("holdRelease", ctx.round) || Defuse.coconutLine("holdRelease"), Defuse.supportId?.(ctx.round) || "coconut");
      }
    };
    const begin = () => {
      if (!ctx.active()) return;
      held = true;
      ctx.holdStarted();
      last = performance.now();
      button.classList.add("holding");
      ctx.root.querySelector("#hold-state").textContent = "正在拆除 · 别松手";
      ctx.action("正在拆除 · 0%", 0);
      ctx.sound("defuse");
    };
    ctx.listen(button, "pointerdown", (e) => {
      if (pointer !== null || !e.isPrimary || e.button !== 0 || !ctx.active()) return;
      e.preventDefault();
      pointer = e.pointerId;
      button.setPointerCapture(e.pointerId);
      begin();
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) =>
      ctx.listen(button, type, (e) => {
        if (e.pointerId === pointer) stop();
      }),
    );
    ctx.listen(button, "contextmenu", (e) => e.preventDefault());
    ctx.listen(button, "keydown", (e) => {
      if ([" ", "Enter"].includes(e.key)) {
        e.preventDefault();
        if (!e.repeat && pointer === null) {
          keyboard = true;
          begin();
        }
      }
    });
    ctx.listen(button, "keyup", (e) => {
      if (keyboard && [" ", "Enter"].includes(e.key)) {
        e.preventDefault();
        stop();
      }
    });
    ctx.listen(button, "blur", stop);
    ctx.listen(window, "blur", stop);
    ctx.listen(document, "defuse-orientation-block", stop);
    ctx.listen(document, "visibilitychange", stop);
    ctx.listen(document, "defuse-evade", stop);
    ctx.frame((now) => {
      if (!held || !ctx.active()) {
        last = now;
        return;
      }
      elapsed += Math.max(0, now - last);
      last = now;
      const p = Math.min(100, elapsed / duration * 100);
      if (Math.floor(p) === renderedPercent) return;
      renderedPercent = Math.floor(p);
      ctx.action(`正在拆除 · ${Math.floor(p)}%`, p);
      ctx.root.querySelector("#hold-number").innerHTML =
        `${Math.floor(p)}<span>%</span>`;
      bar.firstElementChild.style.width = p + "%";
      bar.setAttribute("aria-valuenow", Math.floor(p));
      ctx.root
        .querySelector(".hold-orbit")
        .style.setProperty("--progress", p + "%");
      if (p > 28 && messages === 0) {
        ctx.banter(Defuse.supportComms?.("holdPressure", ctx.round) || Defuse.coconutLine("holdPressure"), Defuse.supportId?.(ctx.round) || "coconut");
        messages++;
      }
      if (p > 70 && messages === 1) {
        ctx.banter("过半了，继续按住。来枪就躲，别为这点进度白给。", "commander");
        messages++;
      }
      if (p >= 100) {
        held = false;
        ctx.complete("这步好了，接着来，别急。");
      }
    });
  },
};
