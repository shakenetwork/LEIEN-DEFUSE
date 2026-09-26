/* Offer one role swap, then retire all handlers before the ordinary hold mounts. */
(() => {
  Defuse.mountTeamCoverOffer = (ctx, mountNormal) => {
    const teammateId = ctx.canTeamCover?.();
    if (!teammateId) return false;
    const name = Defuse.cast[teammateId]?.name || "队友";
    const enemyIds = (ctx.round.enemyGuardIds || []).filter(id =>
      !(ctx.round.defeatedEnemyIds || []).includes(id) && Defuse.cast[id]).slice(0, 2);
    if (enemyIds.length < 2) return false;
    if (Defuse.audio?.ctx && Defuse.assets.sounds.footstep) Defuse.audio.buffer(Defuse.assets.sounds.footstep).catch(() => {});
    ctx.root.innerHTML = `<section class="team-cover-unit teamplay-unit" data-state="offer" aria-label="掩护队友拆包"><div class="teamplay-field team-cover-field"><div class="teamplay-strip"><span>你架枪，我来拆</span><b data-cover-status>队友有钳</b></div><div class="teamplay-ready"><div class="team-cover-friend">${Defuse.portrait(teammateId)}<span><b>${Defuse.escapeHtml(name)}</b><small>带有拆弹器</small></span></div><b>我有钳，我来！</b><p>你看住门，别让他过来。</p><button class="button primary" type="button" data-cover-start>让队友拆，我架枪 ${Defuse.icon("target")}</button><span class="team-cover-offer-note">点掉两次探头 · 拆除需要 5 秒</span></div><div class="team-cover-targets">${enemyIds.map((id, index) => `<button class="teamplay-target team-cover-target" data-enemy-id="${id}" data-peek-index="${index}" type="button" hidden disabled aria-label="射击${Defuse.escapeHtml(Defuse.cast[id].name)}"><img src="${Defuse.escapeHtml(Defuse.enemyImage(id))}" alt="" draggable="false"><span class="teamplay-reticle" aria-hidden="true"></span><b>${Defuse.escapeHtml(Defuse.cast[id].name)}</b></button>`).join("")}</div><div class="team-cover-defuser" hidden><span>${Defuse.escapeHtml(name)}正在拆包</span><b data-cover-progress>0%</b><div class="progress-track" role="progressbar" aria-label="队友拆除进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div></div><div class="teamplay-radio" role="status" aria-live="polite"><span data-cover-call>我有钳，我来！你帮我看住门！</span></div><div class="teamplay-window" aria-hidden="true"><i></i></div></div><button class="team-cover-exit" type="button">我自己拆</button></section>`;
    const unit = ctx.root.querySelector(".team-cover-unit"), field = unit.querySelector(".team-cover-field");
    const ready = unit.querySelector(".teamplay-ready"), start = unit.querySelector("[data-cover-start]");
    const targets = [...unit.querySelectorAll(".team-cover-target")];
    const exit = unit.querySelector(".team-cover-exit"), progress = unit.querySelector("[data-cover-progress]");
    const defuser = unit.querySelector(".team-cover-defuser"), track = defuser.querySelector(".progress-track");
    const call = unit.querySelector("[data-cover-call]"), status = unit.querySelector("[data-cover-status]");
    const bar = unit.querySelector(".teamplay-window i");
    let model = null, finished = false, lastPeek = -2, lastHits = 0;
    const available = () => !finished && unit.isConnected && !document.hidden && !window.leienOrientation?.blocked && ctx.active();
    const artReady = () => targets.every(button => {
      const img = button.querySelector("img");
      return img.hidden || img.complete && img.naturalWidth > 0;
    });
    function normal(text) {
      if (finished) return;
      finished = true;
      ctx.stopSound();
      mountNormal();
      if (text) ctx.banter(text, teammateId);
    }
    function retreat(reason = "interrupted") {
      if (finished || !model || model.snapshot().state === "won") return;
      model.retreat(reason);
      const proof = model.proof();
      if (ctx.retreatTeamCover(proof, "我松手了！你接着拆，我帮你架。") !== false)
        normal("我松手了！你接着拆，我帮你架。");
      else finished = true;
    }
    function paint() {
      if (finished) return;
      if (!model) {
        start.disabled = !artReady();
        return;
      }
      const s = model.snapshot();
      unit.dataset.state = s.state;
      ready.hidden = true;
      defuser.hidden = false;
      const percent = Math.max(0, Math.min(100, Math.floor(s.progress * 100)));
      progress.textContent = `${percent}%`;
      track.setAttribute("aria-valuenow", percent);
      track.firstElementChild.style.width = `${percent}%`;
      status.textContent = `已挡住 ${s.defeatedEnemyIds.length} / 2`;
      exit.textContent = "松手，我来拆";
      targets.forEach(button => {
        const exposed = s.state === "running" && button.dataset.enemyId === s.enemyId;
        button.hidden = !exposed;
        button.disabled = !exposed;
      });
      const peek = s.peekIndex;
      const text = s.enemyId ? peek === 0 ? "门口拉了！点他！" : "窗口还有一个！" : s.defeatedEnemyIds.length === 2 ? "都掉了，再帮我看一眼！" : s.defeatedEnemyIds.length === 1 ? "好枪！别松，窗口还没清。" : "我拆了，你看门！";
      if (call.textContent !== text) call.textContent = text;
      if (peek !== lastPeek) {
        lastPeek = peek;
        if (s.enemyId) ctx.sound("footstep", { volume: .46, pan: peek === 0 ? -.65 : .65 });
      }
      if (s.defeatedEnemyIds.length !== lastHits) {
        lastHits = s.defeatedEnemyIds.length;
        ctx.action(`掩护队友 · ${lastHits} / 2`);
      }
      const peekRemaining = s.peek ? Math.max(0, s.peek.closesAt - ctx.round.now()) : 0;
      bar.style.transform = `scaleX(${s.enemyId ? Math.min(1, peekRemaining / 1800) : 0})`;
      if (s.state === "retreated") { retreat("missed"); return; }
      if (s.state === "won") {
        if (ctx.completeTeamCover(model.proof(), "拆掉了！好架！") !== false) finished = true;
      }
    }
    targets.forEach(button => {
      const img = button.querySelector("img");
      ctx.listen(img, "load", paint);
      ctx.listen(img, "error", () => { img.hidden = true; button.classList.add("art-unavailable"); paint(); });
      ctx.listen(button, "click", () => {
        if (!available() || !model || button.hidden) return;
        model.shoot(button.dataset.enemyId);
        const after = model.snapshot();
        if (after.defeatedEnemyIds.includes(button.dataset.enemyId)) {
          ctx.sound("shot", { volume: .7, group: "teamplay-shot" });
          ctx.sound("teamHit", { volume: .16, group: "teamplay-shot", delay: .03, fallback: false });
          field.classList.add("teamplay-hit");
          ctx.after(100, () => field.classList.remove("teamplay-hit"));
        }
        paint();
      });
    });
    ctx.listen(start, "click", () => {
      if (!available() || !artReady() || model) return;
      if (!ctx.beginTeamCover(teammateId)) { normal("来不及换了，你直接拆，我架着。"); return; }
      model = new Defuse.TeamCoverEncounter({
        now: () => ctx.round.now(),
        enemyIds: ctx.round.teamCoverEnemyIds || enemyIds,
        teammateId,
        startedAt: ctx.round.teamCoverStartedAt,
      });
      model.start();
      ctx.sound("teamHandoff", { volume: .26, fallback: false });
      ctx.sound("defuse", { volume: .65 });
      ctx.banter("我拆了，你看门！", teammateId);
      ctx.action("掩护队友 · 0 / 2");
      const title = document.querySelector("#module-title");
      if (title) title.textContent = "你架枪，我来拆";
      paint();
    });
    ctx.listen(exit, "click", () => {
      if (!available()) return;
      ctx.sound("tap", { volume: .4 });
      if (model) retreat("player-takeover");
      else normal();
    });
    ctx.listen(window, "blur", () => { if (model) retreat("interrupted"); });
    ctx.listen(document, "visibilitychange", () => { if (document.hidden && model) retreat("interrupted"); });
    ctx.listen(document, "defuse-orientation-block", () => { if (model) retreat("interrupted"); });
    ctx.listen(document, "defuse-evade", () => { if (model) retreat("interrupted"); });
    ctx.frame(() => {
      if (finished || !unit.isConnected) return;
      if (!model) {
        // The clock and combat keep moving while the player decides. Retire
        // a stale offer before its scene could conceal an incoming warning.
        if (ctx.canTeamCover?.() !== teammateId) normal("先不换了，你拆，我架着。");
        return;
      }
      model.tick();
      paint();
    });
    paint();
    return true;
  };
})();
