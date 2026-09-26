/* A readable sound cue: selecting the wrong lane never locks the player out. */
Defuse.modules.listen = {
  title: "先听一下",
  english: "HOLD THE ANGLE",
  instruction: "看脚步提示，选方向架枪；敌人露头后点掉。选错可以换。",
  banter: "停，先别拆……有人摸过来了。",
  mount(ctx) {
    const lanes = { door: "B 门", tunnel: "B 洞", window: "窗口" };
    const enemyId = (ctx.round.enemyGuardIds || []).find(id =>
      !(ctx.round.defeatedEnemyIds || []).includes(id) && Defuse.cast[id]);
    const model = new Defuse.ListenEncounter({ now: () => ctx.round.now(), enemyId });
    if (Defuse.audio?.ctx && Defuse.assets.sounds.footstep) Defuse.audio.buffer(Defuse.assets.sounds.footstep).catch(() => {});
    ctx.root.innerHTML = `<section class="listen-unit teamplay-unit" data-state="idle" aria-label="听脚步架枪"><div class="teamplay-field listen-field"><div class="teamplay-strip"><span>听脚步 / 架枪</span><b data-listen-status>先听动静</b></div><div class="listen-lanes" aria-hidden="true"><span data-lane="door">B 门</span><span data-lane="tunnel">B 洞</span><span data-lane="window">窗口</span></div><div class="teamplay-ready"><b>先别拆，听一下。</b><p>看脚步提示，选方向。露头再打。</p><button class="button primary" type="button" data-listen-start>架住，听脚步 ${Defuse.icon("arrowRight")}</button></div><button class="teamplay-target listen-target" type="button" hidden disabled><img alt="" draggable="false"><span class="teamplay-reticle" aria-hidden="true"></span><b data-target-name></b></button><div class="teamplay-radio" role="status" aria-live="polite"><span data-listen-call>停，先别拆……有人摸过来了。</span></div><div class="teamplay-window" aria-hidden="true"><i></i></div></div><div class="listen-controls" aria-label="选择架枪方向">${Object.entries(lanes).map(([id, label]) => `<button type="button" data-direction="${id}" aria-pressed="false"><span class="listen-cue" aria-hidden="true"></span><b>${label}</b><small>架枪</small></button>`).join("")}</div></section>`;
    const unit = ctx.root.querySelector(".listen-unit"), field = unit.querySelector(".listen-field");
    const ready = unit.querySelector(".teamplay-ready"), start = unit.querySelector("[data-listen-start]");
    const target = unit.querySelector(".listen-target"), art = target.querySelector("img");
    const call = unit.querySelector("[data-listen-call]"), status = unit.querySelector("[data-listen-status]");
    const buttons = [...unit.querySelectorAll("[data-direction]")];
    const bar = unit.querySelector(".teamplay-window i");
    const name = Defuse.cast[enemyId]?.name || "守包者";
    target.setAttribute("aria-label", `射击${name}`);
    unit.querySelector("[data-target-name]").textContent = name;
    if (enemyId) art.src = Defuse.enemyImage(enemyId);
    let finished = false, lastState = "", lastDirection = null, readyToStart = art.complete && art.naturalWidth > 0;
    const available = () => !finished && unit.isConnected && !document.hidden && !window.leienOrientation?.blocked && ctx.active();
    const panelOpen = () => {
      const audio = document.querySelector("#audio-settings");
      try { return !!audio?.matches(":popover-open") || !!document.querySelector("#instructions[open]"); }
      catch { return !!audio?.classList.contains("is-open"); }
    };
    function paint() {
      const s = model.snapshot(), activeLane = lanes[s.direction];
      unit.dataset.state = s.state;
      unit.dataset.selected = s.selected || "none";
      const correct = s.selected === s.direction;
      target.hidden = !(s.state === "exposed" && correct);
      target.disabled = target.hidden;
      target.dataset.lane = s.direction || "door";
      ready.hidden = !["idle", "retry"].includes(s.state);
      start.disabled = !readyToStart;
      start.firstChild.textContent = !readyToStart ? "探员准备中… " : s.state === "retry" ? "再听一次 " : "架住，听脚步 ";
      ready.querySelector("b").textContent = s.state === "retry" ? "他缩回去了。" : "先别拆，听一下。";
      ready.querySelector("p").textContent = s.state === "retry" ? "没打着，再听脚步。包还在滴。" : "看脚步提示，选方向。露头再打。";
      buttons.forEach(button => {
        const lane = button.dataset.direction;
        button.disabled = !["cue", "exposed"].includes(s.state);
        button.setAttribute("aria-pressed", String(s.selected === lane));
        button.classList.toggle("has-footsteps", ["cue", "exposed"].includes(s.state) && s.direction === lane);
        button.querySelector("small").textContent = s.selected === lane ? "已架住" : "架枪";
      });
      [...unit.querySelectorAll("[data-lane]")].forEach(marker => marker.classList.toggle("has-footsteps", ["cue", "exposed"].includes(s.state) && marker.dataset.lane === s.direction));
      const text = s.state === "cue" ? `${activeLane}有脚步，架住！` : s.state === "exposed" ? correct ? "出来了！点他！" : `${activeLane}露了！换过去，快！` : s.state === "retry" ? "他缩回去了。再听一次，别追。" : s.state === "won" ? "掉了！回去拆。" : "停，先别拆……有人摸过来了。";
      if (call.textContent !== text) call.textContent = text;
      status.textContent = s.state === "exposed" ? `${activeLane}露头` : s.state === "cue" ? `${activeLane}有脚步` : s.state === "retry" ? "可以再架一次" : s.state === "won" ? "枪线已清" : "选方向，再点敌人";
      bar.style.transform = `scaleX(${s.state === "exposed" ? Math.max(0, s.remaining / 2800) : 0})`;
      if (s.direction !== lastDirection) { lastDirection = s.direction; }
      if (lastState !== s.state) {
        lastState = s.state;
        ctx.action(status.textContent);
        if (s.state === "cue") {
          ctx.sound("footstep", { volume: .68, pan: { door: -.65, tunnel: 0, window: .65 }[s.direction] });
          ctx.banter(`${activeLane}有脚步！先架一下。`, Defuse.supportId?.(ctx.round) || "coconut");
        }
      }
    }
    function begin() {
      if (!available() || !readyToStart || panelOpen()) return;
      model.start();
      ctx.sound("tap", { volume: .4 });
      paint();
    }
    ctx.listen(art, "load", () => { readyToStart = true; paint(); });
    ctx.listen(art, "error", () => {
      // A local portrait failing must not remove the visible/clickable target.
      readyToStart = true; art.hidden = true; target.classList.add("art-unavailable"); paint();
    });
    ctx.listen(start, "click", begin);
    buttons.forEach(button => ctx.listen(button, "click", () => {
      if (!available() || !["cue", "exposed"].includes(model.snapshot().state)) return;
      model.choose(button.dataset.direction);
      ctx.sound("tap", { volume: .3 });
      paint();
    }));
    ctx.listen(target, "click", () => {
      if (!available() || panelOpen() || target.hidden) return;
      const s = model.snapshot();
      if (s.state !== "exposed" || s.selected !== s.direction) return;
      model.shoot();
      if (model.snapshot().state === "won") {
        ctx.sound("shot", { volume: .7, group: "teamplay-shot" });
        ctx.sound("teamHit", { volume: .16, group: "teamplay-shot", delay: .03, fallback: false });
        field.classList.add("teamplay-hit");
        if (ctx.completeListen(model.proof(), "掉了！回来把包拆了。") !== false) finished = true;
      }
      paint();
    });
    ctx.frame(() => {
      if (finished || !unit.isConnected) return;
      // Wall-clock progress remains honest when a window hides the encounter.
      model.tick();
      paint();
    });
    paint();
  },
};
