/* A self-contained opening. The model owns timing and hit decisions;
   the app owns the round, casualties, music and the next two modules. */
(() => {
  const supportLines = {
    lead: { waiting: "我这闪……应该挺白。听爱娃的，等它爆！", exposed: "白了白了！这次我真没乱报！", trade: "另一边又来了！这人可没白，快补我！", won: "好枪！你拆，我这次只架枪，不指挥。" },
    goggles: { waiting: "背身闪给你。等爆，枪线我补。", exposed: "爆了！他全白，跟进补掉！", trade: "另一侧反拉！他没吃闪，帮我补掉。", won: "这条枪线清了。你拆，另一边我看。" },
    rookie: { waiting: "先别露。闪到他脸上再走，我看另一边。", exposed: "他白了。准星抬头，稳住这一枪。", trade: "另一边。没白。补我。", won: "收掉了。你拆，我架最后一条枪线。" },
    coconut: { waiting: "我给闪！别跟我一起急，等它爆！", exposed: "白了！走走走，补他头！", trade: "这边这边！他没白！先帮我补枪啊！", won: "好补！这把你拆，我忍住不乱拉。" },
  };
  const clean = value => Defuse.escapeHtml(String(value ?? ""));
  const clamp = (value, low, high, fallback) => Number.isFinite(Number(value)) ? Math.min(high, Math.max(low, Number(value))) : fallback;
  class FlashRetakeUI {
    constructor(root, { model, round, onWin = () => {}, onFail = () => {} }) {
      this.root = root;
      this.model = model;
      this.round = round;
      this.onWin = onWin;
      this.onFail = onFail;
      this.controller = new AbortController();
      this.disposed = this.completed = false;
      this.lastPhase = null;
      const initial = this.snapshot();
      this.supportId = Defuse.teamIds.includes(initial.supportId) ? initial.supportId : "goggles";
      this.targetId = Defuse.enemyIds.includes(initial.targetId) ? initial.targetId : Defuse.currentEnemyId();
      const support = Defuse.cast[this.supportId];
      const target = Defuse.cast[this.targetId];
      const commander = Defuse.cast.commander;
      const image = Defuse.enemyImage(this.targetId);
      root.innerHTML = `<section class="flash-retake-screen" data-phase="waiting" aria-label="跟闪回防">
        <div class="retake-round-strip"><span>CT / 跟闪回防</span><span>DUST II · B 点</span><span>C4 <b data-retake-clock>00:40</b></span></div>
        <div class="retake-mission"><div><span class="retake-kicker">RETAKE / 01</span><h1 data-retake-title>等闪，别抢跑。</h1></div><span class="retake-phase-tag" data-retake-status>闪光准备中</span></div>
        <div class="retake-command"><img src="${clean(commander.image)}" alt="" draggable="false"><div><b>${clean(commander.name)} <span>CT 指挥</span></b><p data-retake-command>只剩你们俩了。等闪爆再跟进，别提前露枪线。</p></div><span class="retake-radio-bars" aria-hidden="true">▂▅▃▇</span></div>
        <div class="retake-arena" data-retake-arena role="group" aria-label="B 点回防枪线，等待闪光爆开">
          <img class="retake-preload" src="${clean(image)}" alt="" aria-hidden="true" draggable="false">
          <img class="retake-preload" src="assets/scenes/dust2-b-doors.webp" alt="" aria-hidden="true" draggable="false">
          <div class="retake-arena-label"><span>${initial.remainingGuardIds.length} 名守包 / 交叉枪线</span><b data-retake-enemy-state>敌人仍有视野</b></div>
          <div class="retake-cover" aria-hidden="true"><span>掩体后待命</span><i></i></div>
          <div class="retake-flash-path" aria-hidden="true"><span></span><i>✦</i></div>
          <div class="retake-waiting" data-retake-waiting><span class="retake-flash-icon" aria-hidden="true">✦</span><b>队友正在给闪</b><span>等爆开，自动跟进</span></div>
          <button class="retake-head" data-retake-head type="button" aria-label="射击${clean(target.name)}头部" hidden disabled><span class="retake-head-art" aria-hidden="true"></span><span class="retake-blind-stars" aria-hidden="true">✦ · ✦</span><span class="retake-head-tag" aria-hidden="true">致盲</span><span class="retake-head-reticle" aria-hidden="true">⌖</span></button>
          <div class="retake-hit-stamp" aria-hidden="true">HEADSHOT</div>
          <div class="retake-arena-footer"><span data-retake-target-name>${clean(target.name)}</span><b data-retake-arena-hint>闪没爆，别露！</b></div>
          <div class="retake-flash-edge" aria-hidden="true"></div>
        </div>
        <div class="retake-action-bar"><div><b data-retake-action-title>等闪爆开！</b><span data-retake-action-detail>抢跑会撞上枪线</span></div><button class="retake-entry" type="button" data-retake-entry>进点补枪 ${Defuse.icon("arrowUpRight", "action-icon")}</button><strong class="retake-shot-clock" data-retake-shot-clock hidden>3.0<span>s</span></strong></div>
        <div class="retake-window" role="progressbar" aria-label="闪光准备" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" data-retake-progress><span></span></div>
        <div class="retake-support"><img src="${clean(support.image)}" class="${support.avatar ? "is-profile" : ""}" alt="" draggable="false"><div><b>${clean(support.name)} <span>给闪 / 掩护</span></b><p data-retake-support-line>${clean(supportLines[this.supportId].waiting)}</p></div></div>
        <p class="retake-next">清掉枪线 → 队友架枪 → 你接手拆包</p>
        <span class="sr-only" data-retake-live aria-live="assertive" aria-atomic="true"></span>
      </section>`;
      const find = selector => root.querySelector(selector);
      this.screen = find(".flash-retake-screen");
      this.screen.classList.toggle("retake-soft", !!Defuse.flashPreference?.soft);
      this.arena = find("[data-retake-arena]");
      this.head = find("[data-retake-head]");
      this.entry = find("[data-retake-entry]");
      this.waiting = find("[data-retake-waiting]");
      this.clock = find("[data-retake-clock]");
      this.shotClock = find("[data-retake-shot-clock]");
      this.progress = find("[data-retake-progress]");
      this.progressFill = this.progress.querySelector("span");
      this.title = find("[data-retake-title]");
      this.status = find("[data-retake-status]");
      this.command = find("[data-retake-command]");
      this.enemyState = find("[data-retake-enemy-state]");
      this.hint = find("[data-retake-arena-hint]");
      this.actionTitle = find("[data-retake-action-title]");
      this.actionDetail = find("[data-retake-action-detail]");
      this.supportLine = find("[data-retake-support-line]");
      this.live = find("[data-retake-live]");
      this.startAt = Number(initial.startedAt ?? initial.startAt ?? model.startedAt ?? Date.now());
      const position = initial.targetPosition || model.targetPosition || {};
      this.head.style.setProperty("--retake-x", `${clamp(position.x, .2, .8, .5) * 100}%`);
      this.head.style.setProperty("--retake-y", `${clamp(position.y, .25, .6, .43) * 100}%`);
      this.head.style.setProperty("--retake-enemy-image", `url("${new URL(image, document.baseURI).href}")`);
      this.head.style.setProperty("--retake-enemy-position", Defuse.enemyProfiles[this.targetId].headPosition);
      // A pointer is handled at contact, never again by its release click.
      // Keyboard/assistive clicks have detail 0 and use the same model path.
      const press = event => {
        if (this.disposed || this.completed || document.hidden) return;
        if (event.type === "pointerdown" && (event.button !== 0 || !event.isPrimary)) return;
        if (event.type === "click" && event.detail > 0) return;
        if (event.type === "click" && event.detail === 0 && !event.target.closest("button")) return;
        event.preventDefault();
        event.stopPropagation();
        this.round.tick();
        if (this.round.state === "ended") return;
        this.model.step();
        const state = this.snapshot();
        if (state.phase !== "waiting" && state.phase !== "exposed") { this.step(); return; }
        // A touch on scenery while waiting may be a scroll, not a peek.
        if (state.phase === "waiting" && !event.target.closest("[data-retake-entry]")) return;
        // Settle and display the burst before accepting a shot at its target.
        if (this.lastPhase !== "exposed" && state.phase === "exposed") { this.step(); return; }
        this.keyboardAim = event.type === "click" && event.detail === 0;
        this.model.attempt(state.phase === "exposed" && !!event.target.closest("[data-retake-head]"));
        this.step();
      };
      [this.arena, this.entry].forEach(element => {
        element.addEventListener("pointerdown", press, { signal: this.controller.signal });
        element.addEventListener("click", press, { signal: this.controller.signal });
      });
      this.audio("flashPin", .32);
      this.step();
    }
    snapshot() { return this.model.snapshot(); }
    audio(name, volume) { Defuse.audio?.play(name, { group: "retake", volume }); }
    step() {
      if (this.disposed || this.completed || document.hidden) return;
      this.model.step();
      const state = this.snapshot();
      const phase = state.phase;
      const now = this.model.now();
      const remaining = Math.max(0, Number(this.round.remaining) || 0);
      const seconds = Math.ceil(remaining / 1000);
      const clockText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
      if (this.clock.textContent !== clockText) this.clock.textContent = clockText;
      const duration = phase === "waiting" ? Number(state.flashAt) - this.startAt : Number(state.deadline) - Number(state.targetAt ?? state.flashAt);
      const timeLeft = Math.max(0, (phase === "waiting" ? Number(state.flashAt) : Number(state.deadline)) - now);
      const percent = phase === "waiting" ? 100 - timeLeft / Math.max(1, duration) * 100 : timeLeft / Math.max(1, duration) * 100;
      this.progressFill.style.width = `${clamp(percent, 0, 100, 0)}%`;
      const progressText = String(Math.round(clamp(percent, 0, 100, 0)));
      if (this.progress.getAttribute("aria-valuenow") !== progressText) this.progress.setAttribute("aria-valuenow", progressText);
      const shotText = (timeLeft / 1000).toFixed(1);
      if (this.shotClock.firstChild.nodeValue !== shotText) this.shotClock.firstChild.nodeValue = shotText;
      if (state.targetId && state.targetId !== this.targetId) {
        this.targetId = state.targetId;
        const position = state.targetPosition;
        this.head.style.setProperty("--retake-x", `${position.x * 100}%`);
        this.head.style.setProperty("--retake-y", `${position.y * 100}%`);
        this.head.style.setProperty("--retake-enemy-image", `url("${new URL(Defuse.enemyImage(this.targetId), document.baseURI).href}")`);
        this.head.style.setProperty("--retake-enemy-position", Defuse.enemyProfiles[this.targetId].headPosition);
        this.head.setAttribute("aria-label", `射击${Defuse.cast[this.targetId].name}头部`);
        this.root.querySelector("[data-retake-target-name]").textContent = Defuse.cast[this.targetId].name;
      }
      if (phase !== this.lastPhase) {
        const previous = this.lastPhase;
        const entryFocused = document.activeElement === this.entry;
        this.lastPhase = phase;
        this.screen.dataset.phase = phase;
        this.root.querySelector(".retake-arena-label > span").textContent = phase === "waiting"
          ? `B 门 / 剩 ${state.remainingGuardIds.length} 名守包`
          : `B 点 / 剩 ${state.remainingGuardIds.length} 名 / 交叉枪线`;
        this.head.hidden = phase !== "exposed";
        this.head.disabled = phase !== "exposed";
        this.entry.hidden = phase !== "waiting";
        this.entry.disabled = phase !== "waiting";
        this.waiting.hidden = phase !== "waiting";
        this.shotClock.hidden = phase !== "exposed";
        if (phase === "waiting") this.live.textContent = "队友正在给闪。等闪光爆开，再点敌人头部。";
        if (phase === "exposed") {
          const second = state.shotsHit > 0;
          this.title.textContent = second ? "补防来了，保护钳手！" : "闪爆了，跟进补枪！";
          this.status.textContent = `${state.shotsHit + 1} / ${state.shotsRequired} 枪线`;
          this.command.textContent = second ? "另一边拉了！快补，别让他打掉带钳的。" : "近点白了，先打他！另一边有人看着。";
          this.enemyState.textContent = second ? "TRADE / 反拉" : "FLASHED / 致盲";
          this.head.classList.toggle("is-trade", second);
          this.head.querySelector(".retake-head-tag").textContent = second ? "补防" : "致盲";
          this.hint.textContent = "点头击杀 · 点空阵亡";
          this.actionTitle.textContent = "点中头部";
          this.actionDetail.textContent = second ? "1.5 秒内补枪保住钳手 · 超时仍可换掉敌人" : "先清近点，再转枪处理补防";
          this.supportLine.textContent = supportLines[this.supportId][second ? "trade" : "exposed"];
          this.arena.setAttribute("aria-label", `${second ? "另一侧敌人反拉" : "近点敌人已致盲"}，快速点击${Defuse.cast[this.targetId].name}头部`);
          this.progress.setAttribute("aria-label", second ? "补枪剩余时间" : "敌人致盲剩余时间");
          this.live.textContent = second ? "另一侧反拉！转枪保护带钳队友！" : "闪爆了！跟进补枪，点中头部！";
          if (previous === "waiting") this.audio("flashPop", .5);
          // Preserve keyboard flow without scrolling or moving the target.
          if (entryFocused || this.keyboardAim) this.head.focus({ preventScroll: true });
        } else if (phase === "trading") {
          this.title.textContent = "收一个，转枪！";
          this.status.textContent = "交叉枪线";
          this.hint.textContent = "换位中 · 等下一名敌人露头";
          this.actionTitle.textContent = "别连点，找下一颗头。";
          this.actionDetail.textContent = "队友正在掩护，准备补枪";
          this.audio("shot", .48);
        } else if (phase === "won") {
          this.title.textContent = "好补！接手拆包。";
          const left = state.remainingGuardIds.length;
          this.status.textContent = left ? "还剩 1 名守包者" : "守包者全清";
          this.command.textContent = state.supportAlive === false ? "人换掉了，但钳手没保住。钳子捡不到了，得拆十秒！" : left ? "补得好！外侧还有一个，队友架着。钳给你，五秒拆。" : "人全清了！钳给你，五秒拆，别松手。";
          this.hint.textContent = "HEADSHOT / 击杀确认";
          this.actionTitle.textContent = state.supportAlive === false ? "只剩你了，十秒强拆。" : "你拆，队友架枪。";
          this.actionDetail.textContent = "接下来完成两道拆包题";
          this.supportLine.textContent = state.supportAlive === false ? "我掉了，钳子在枪线外！你直接十秒强拆，别再绕了。" : supportLines[this.supportId].won;
          this.root.querySelector(".retake-support").classList.toggle("is-down", state.supportAlive === false);
          this.live.textContent = state.supportAlive === false ? "命中头部，钳手阵亡。守包者已清，十秒强拆。" : "命中头部。回防成功，队友掩护，准备拆包。";
          this.audio("shot", .48);
        } else if (phase === "failed") {
          this.title.textContent = "回防失败。";
          this.status.textContent = "CT DOWN";
          const reason = state.reason ?? state.failureReason ?? state.result?.reason;
          const early = ["early", "early-peek", "rushed", "premature"].includes(reason);
          this.actionTitle.textContent = early ? "闪还没爆，你先露了。" : "枪线没清，回防被截。";
          this.actionDetail.textContent = early ? "闪还没爆就拉出去，被他打掉了。" : state.shotsHit > 0 ? "没补上，另一边把你打掉了。" : "没打中，或者出手晚了，被他反杀。";
          this.live.textContent = this.actionTitle.textContent;
        }
      }
      if (phase === "exposed" && state.shotsHit > 0 && now >= state.supportDeadline && !this.carrierReported) {
        this.carrierReported = true;
        this.status.textContent = "钳手阵亡 / 继续补枪";
        this.actionDetail.textContent = "钳手倒了！补掉这枪，接着十秒强拆。";
        this.live.textContent = "钳手已阵亡，仍可补枪完成回防。";
      }
      if ((phase === "won" || phase === "failed") && !this.completed) {
        this.completed = true;
        if (phase === "won") this.onWin(state); else this.onFail(state);
      }
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.controller.abort();
      Defuse.audio?.stop("retake");
    }
  }
  Defuse.FlashRetakeUI = FlashRetakeUI;
})();
