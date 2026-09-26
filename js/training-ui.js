/* Real password/wire/hold controls, driven by an isolated practice context.
 * A lesson never creates a Round, rolls an opponent, or reports a score. */
(() => {
  const copy = {
    clock: ["先看这三个数。", "实战时，时间和进度都在上方。"],
    wires: ["先看黄字，再剪线", "先看黄字。这次红灯亮，该剪哪根？"],
    password: ["擦清密码", "按住纸条擦灰。七位露全，再切到「输密码」。"],
    danger: ["来枪，先收身", "雷恩在 B 门陪练。点「躲避」，先退回掩体。"],
    hold: ["最后，按住拆除", "有钳按住 5 秒。手一松，进度就清零。"],
  };
  class TrainingUI {
    constructor(root, { model, replay = false, onExit, onPlay }) {
      this.root = root; this.model = model; this.replay = replay;
      this.onExit = onExit; this.onPlay = onPlay; this.disposed = false;
      this.signal = new AbortController(); this.lesson = null; this.raf = 0;
      this.frames = []; this.solved = false; this.modal = null;
      document.body.classList.add("in-training");
      this.portraitHint = document.querySelector("#portrait-guard small");
      if (this.portraitHint) this.portraitHint.textContent = "训练已暂停，转回竖屏继续";
      this.root.addEventListener("click", e => this.click(e), { signal: this.signal.signal });
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && !this.modal?.open && !document.querySelector("[popover]:popover-open")) {
          e.preventDefault(); this.confirmSkip();
        }
      }, { signal: this.signal.signal });
      this.welcome();
    }
    active() { return !this.disposed && !this.solved && !document.hidden && !window.leienOrientation?.blocked && !this.modal?.open && !document.querySelector("[popover]:popover-open"); }
    sound(name) { if (!this.disposed) Defuse.audio.play(name, { group: "training", volume: .16 }); }
    clearLesson() {
      this.lesson?.abort(); this.lesson = new AbortController();
      cancelAnimationFrame(this.raf); this.frames = []; this.solved = false;
      Defuse.audio.stop("training");
    }
    focus() { this.root.querySelector("h1")?.focus({ preventScroll: true }); window.scrollTo(0, 0); }
    welcome() {
      this.clearLesson();
      document.querySelector(".masthead").dataset.trainingLabel = "新手训练 / 不计战绩";
      const resume = !this.replay && this.model.status === "learning" && this.model.index > 0;
      this.root.innerHTML = `<section class="training-screen training-welcome" data-training-step="welcome">
        <div class="training-kicker"><span>CT / 模拟训练</span><span>不计战绩</span></div>
        <div class="training-intro-art training-leien-intro"><img src="${Defuse.cast.lead.image}" alt="雷恩"><span>雷恩 / 陪练</span></div>
        <div class="training-intro-copy"><h1 tabindex="-1">先练一包。</h1><p>「我陪你练一把。先试试拆包，错了再来。」</p><div class="training-promises"><span>5 项操作</span><span>约 1 分钟</span><span>不扣段位</span></div></div>
        <div class="training-welcome-actions"><button class="button primary" data-training="begin">${resume ? "继续训练" : "进入训练"}${Defuse.icon("arrowRight", "action-icon")}</button><button class="button secondary" data-training="skip">跳过，进入大厅</button></div>
      </section>`;
      this.focus();
    }
    render(step) {
      this.clearLesson(); this.step = step; this.substep = "";
      document.querySelector(".masthead").dataset.trainingLabel = `新手训练 · ${this.model.index + 1} / 5`;
      this.root.innerHTML = `<section class="training-screen" data-training-step="${step}">
        <header class="training-top"><span>操作训练 <b>${this.model.index + 1} / 5</b></span><span>${step === "clock" ? "时间、失误、进度" : "做完这一步，再点继续"}</span></header>
        <div class="training-progress" aria-label="训练进度 ${this.model.index + 1} / 5">${Defuse.Training.STEPS.map((s,i)=>`<i class="${i < this.model.index ? "done" : s === step ? "current" : ""}"></i>`).join("")}</div>
        <div class="training-coach"><span class="training-coach-mark" aria-hidden="true"><img src="assets/factions/ct.svg" alt=""></span><div><h1 tabindex="-1">${copy[step][0]}</h1><p aria-live="polite" data-training-message>${copy[step][1]}</p></div></div>
        <div class="training-workbench"><div class="training-module" data-training-module></div></div>
        <footer class="training-footer"><button type="button" class="training-leave" data-training="skip">稍后再练</button><button class="button primary" data-training="next" ${step === "clock" ? "" : "disabled"}>${step === "clock" ? "开始剪线练习" : "完成上方操作"} ${Defuse.icon("arrowRight", "action-icon")}</button></footer>
      </section>`;
      this.module = this.root.querySelector("[data-training-module]");
      this.focus();
      if (step === "clock") this.clock();
      else if (step === "danger") this.danger();
      else this.mountModule(step);
      let last = performance.now();
      const tick = now => {
        if (this.disposed || this.lesson.signal.aborted) return;
        const delta = Math.min(100, Math.max(0, now - last)); last = now;
        if (this.active()) for (const fn of this.frames) fn(now, delta);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }
    say(text, title) {
      const p = this.root.querySelector("[data-training-message]");
      if (p && p.textContent !== text) p.textContent = text;
      if (title) this.root.querySelector("h1").textContent = title;
    }
    solve(text) {
      if (!this.model.solve(this.step)) return;
      this.solved = true; Defuse.audio.stop("training");
      this.say(text); this.root.querySelector(".training-screen").classList.add("lesson-cleared");
      const next = this.root.querySelector('[data-training="next"]');
      next.disabled = false;
      next.innerHTML = `${{ wires: "继续：练输密码", password: "继续：练躲避", danger: "继续：练拆包", hold: "完成训练" }[this.step]} ${Defuse.icon("arrowRight", "action-icon")}`;
      this.sound("pass");
    }
    clock() {
      this.module.innerHTML = `<div class="training-read-hud" aria-label="回合信息示例">
        <div class="training-hud-caption"><span>回合信息</span><span>实战画面上方 ${Defuse.icon("arrowUpRight", "action-icon")}</span></div>
        <div class="training-clock"><span class="training-stat-label"><i>01</i> 剩余时间</span><strong>00:40<span>.00</span></strong><p>下包后开始倒计时，归零就炸。</p>${Defuse.icon("clock")}</div>
        <div class="training-hud-detail">
          <div><span class="training-stat-label"><i>02</i> 失误次数</span><b>0 <small>/ 3</small></b><p>普通失误满 3 次失败。</p></div>
          <div><span class="training-stat-label"><i>03</i> 拆包进度</span><b>1 <small>/ 4</small></b><p>常规回合四步，最后按住拆包。</p></div>
        </div>
        <p class="training-hud-note">训练不倒计时。下一步，动手剪线。</p>
      </div>`;
    }
    mountModule(id) {
      const practiceRound = { passwordCode: "7355608", passwordReveal: Array(7).fill(false), passwordWipeMs: 0, defuseDuration: 5000 };
      const signal = this.lesson.signal;
      const ctx = {
        root: this.module, round: practiceRound,
        wireRule: { type: "light", value: true, answer: "blue", text: "红灯亮 → 剪蓝线；红灯灭 → 剪红线。", label: "红色指示灯亮" },
        active: () => this.active(),
        listen: (el, type, fn) => el.addEventListener(type, fn, { signal }),
        frame: fn => this.frames.push(fn),
        action: () => {}, holdStarted: () => {},
        sound: name => this.sound(name), stopSound: () => Defuse.audio.stop("training"),
        banter: () => {},
        complete: () => this.solve(id === "wires" ? "对，就剪这根。实战每包的规则都可能变，先看黄字。" : id === "password" ? "密码对了。每包的密码都不同，照当前纸条输。" : "拆掉了。实战有人开枪，记得先松手躲。"),
        error: (text, options = {}) => {
          if (id === "password") this.say(options.fatal ? "还没看全。正式回合猜错会炸，练习里先擦净再试。" : "没对上。点「看纸条」核对一下，再输一次。");
          else this.say("这根不对。红灯是亮的，再看黄色规则。");
        },
      };
      Defuse.modules[id].mount(ctx);
      if (id === "password") {
        this.module.querySelector("#note-help").textContent = "按住擦净，再切到「输密码」。";
        this.frames.push(() => {
          if (this.substep || practiceRound.passwordWipeMs < 2400) return;
          this.substep = "clean";
          this.say("擦干净了。点「输密码」，照这七位输入，再确认。", "照着纸条，输入七位密码");
          this.module.querySelector('button[data-password-view="keys"]').classList.add("training-target");
        });
      }
      if (id === "hold") {
        const stopHint = () => { if (!this.solved && this.module.querySelector("#hold-state")?.textContent.includes("清零")) this.say("松手了，进度会清零。再按一次，这回按满 5 秒。"); };
        for (const type of ["pointerup", "pointercancel", "keyup", "blur"]) this.module.addEventListener(type, stopHint, { signal });
      }
    }
    danger() {
      this.substep = "explain";
      this.module.innerHTML = `<div class="training-threat-scene" data-drill-state="explain">
        <div class="training-partner"><img src="${Defuse.cast.lead.image}" alt="陪练雷恩" draggable="false"><b>雷恩 <small>陪练</small></b></div>
        <div class="training-drill-radio"><span>B 门 / 模拟来枪</span><p data-drill-line aria-live="polite">「我架 B 门。先试一下，点躲避收回来。」</p><small data-drill-status>先熟悉操作 · 暂不计时</small></div>
      </div><div class="training-threat"><div><small>战况提示</small><strong data-danger-title>有人在架你，先别拆！</strong><p data-danger-detail>点「躲避」，先退回掩体。</p></div><button class="button primary" data-training="evade">躲避</button></div><div class="training-threat-meter" role="progressbar" aria-label="躲避剩余时间" aria-valuemin="0" aria-valuemax="3" aria-valuenow="3"><i></i></div>`;
      let remaining = 3000;
      this.frames.push((now, dt) => {
        if (this.substep !== "timed") return;
        remaining -= dt;
        const meter = this.module.querySelector(".training-threat-meter");
        meter.style.setProperty("--remaining", `${Math.max(0, remaining) / 30}%`);
        meter.setAttribute("aria-valuenow", (Math.max(0,remaining) / 1000).toFixed(1));
        this.module.querySelector("[data-danger-title]").textContent = `来枪了！${(Math.max(0,remaining) / 1000).toFixed(1)} 秒`;
        if (remaining <= 0) {
          this.substep = "retry";
          this.drillState("retry", "「慢了，刚才那枪打到你了。再试一次。」", "练习超时 · 可以重试");
          this.say("这次躲慢了，点「再试一次」。", "反应超时");
          this.module.querySelector('[data-training="evade"]').textContent = "再试一次";
          this.module.querySelector("[data-danger-detail]").textContent = "正式回合没躲开会受伤；训练可以重试。";
        }
      });
      this.resetDanger = () => {
        remaining = 3000; this.substep = "timed";
        this.drillState("timed", "「我拉了！先收，别硬拆。」", "正在模拟来枪");
        this.sound("distant");
        const meter = this.module.querySelector(".training-threat-meter");
        meter.style.setProperty("--remaining", "100%"); meter.setAttribute("aria-valuenow", "3");
        this.module.querySelector('[data-training="evade"]').textContent = "躲避";
        this.module.querySelector("[data-danger-detail]").textContent = "点右侧按钮，先收身！";
        this.say("3 秒内点「躲避」。实战预警时间以画面为准。", "这次试试限时躲枪");
      };
    }
    drillState(state, line, status) {
      this.module.querySelector(".training-threat-scene").dataset.drillState = state;
      this.module.querySelector("[data-drill-line]").textContent = line;
      this.module.querySelector("[data-drill-status]").textContent = status;
    }
    evade() {
      if (!this.active()) return;
      const b = this.module.querySelector('[data-training="evade"]');
      if (this.substep === "explain") {
        this.substep = "ready";
        this.drillState("ready", "「对，就这么躲。准备好再来，这次给你三秒。」", "已退回掩体 · 等你准备");
        this.say("已退回掩体。下一次加入倒计时。");
        b.textContent = "准备好了";
        this.module.querySelector("[data-danger-title]").textContent = "掩体就位 / 准备限时训练";
      } else if (["ready", "retry"].includes(this.substep)) this.resetDanger();
      else if (this.substep === "timed") {
        this.substep = "safe"; b.textContent = "已躲开"; b.disabled = true;
        this.drillState("safe", "「躲开了。枪线我看着，你回去拆。」", "避险完成 · 继续拆包练习");
        this.module.querySelector("[data-danger-title]").textContent = "已避开枪线";
        this.module.querySelector("[data-danger-detail]").textContent = "正式回合来闪点背闪，来枪点躲避。";
        this.solve("躲开了。来枪点「躲避」，来闪点「背闪」，然后接着拆。");
      }
    }
    done() {
      this.clearLesson(); this.step = "done";
      document.querySelector(".masthead").dataset.trainingLabel = "训练完成 / 不计战绩";
      this.root.innerHTML = `<section class="training-screen training-done" data-training-step="done"><div class="training-kicker"><span>TRAINING COMPLETE</span><span>训练不计分</span></div><div class="training-complete-mark">${Defuse.icon("shield")}</div><h1 tabindex="-1">准备实战。</h1><p>看时间，读黄字。来枪先躲，再回来拆。</p><div class="training-match-note"><b>密码、线序、战况都会变。</b><span>每回合抽三步，先看这包的规则。<br>赢一回合 CT +1，输一回合 T +1；先到 13 分赢整场。</span></div><div class="training-welcome-actions"><button class="button primary" data-training="play">开始正式回合 ${Defuse.icon("arrowRight", "action-icon")}</button><button class="button secondary" data-training="exit">先回大厅</button></div></section>`;
      this.focus();
    }
    click(e) {
      const button = e.target.closest("[data-training]");
      if (!button || button.disabled || this.disposed) return;
      const action = button.dataset.training;
      if (action === "skip") { this.confirmSkip(); return; }
      if (this.modal?.open) return;
      Defuse.audio.unlock();
      if (action === "begin") this.render(this.model.start(this.replay));
      if (action === "evade") this.evade();
      if (action === "next") {
        // The overview is reading, not a hidden click puzzle. Its visible CTA
        // acknowledges the information and enters the first hands-on exercise.
        if (this.step === "clock" && (!this.active() || !this.model.solve("clock"))) return;
        const next = this.model.next();
        if (next === "done") this.done(); else if (next) this.render(next);
      }
      if (action === "play") this.onPlay();
      if (action === "exit") this.onExit();
    }
    confirmSkip() {
      if (this.disposed || this.modal?.open) return;
      if (this.step === "done") { this.onExit(); return; }
      document.dispatchEvent(new Event("defuse-evade"));
      this.previousFocus = document.activeElement;
      this.modal = document.createElement("dialog"); this.modal.className = "training-skip-dialog";
      this.modal.setAttribute("aria-labelledby", "training-skip-title");
      this.modal.innerHTML = `<span class="eyebrow">跳过新手训练</span><h2 id="training-skip-title">已经会玩了？</h2><p>跳过后直接进大厅。想再练，随时点首页的「新手训练」。</p><div><button class="button primary" data-keep-training>继续训练</button><button class="button secondary" data-skip-confirm>跳过，回大厅</button></div>`;
      document.body.append(this.modal);
      this.modal.addEventListener("keydown", e => e.stopPropagation());
      this.modal.addEventListener("keyup", e => e.stopPropagation());
      this.modal.addEventListener("click", e => {
        if (e.target.closest("[data-keep-training]")) this.modal.close();
        if (e.target.closest("[data-skip-confirm]")) { this.model.skip(); this.onExit(); }
      });
      this.modal.addEventListener("close", () => { this.modal?.remove(); this.modal = null; this.previousFocus?.focus({ preventScroll: true }); });
      this.modal.showModal();
    }
    dispose() {
      this.disposed = true; this.clearLesson(); this.signal.abort();
      if (this.modal) { this.modal.remove(); this.modal = null; }
      document.body.classList.remove("in-training");
      if (this.portraitHint) this.portraitHint.textContent = "拆包倒计时照常进行";
      Defuse.audio.stop("training");
    }
  }
  Defuse.TrainingUI = TrainingUI;
})();
