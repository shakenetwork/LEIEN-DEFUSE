(() => {
  const app = document.querySelector("#app"),
    surrenderDialog = document.querySelector("#surrender-dialog"),
    soundButton = document.querySelector(".sound-button");
  const moduleSpeakers = {
    password: "commander",
    hold: "commander",
    wires: "commander",
    tools: "commander",
    smoke: "commander",
    circuit: "goggles",
    fake: "commander", suppression: "commander", listen: "commander",
  };
  let round = null,
    training = null,
    homeShowcase = null,
    pressure = null,
    retake = null,
    rescue = null,
    rushDefense = null,
    smokeDeath = null,
    screen = "home",
    resultMusicAt = null,
    resultMusicTimer = 0,
    audioRecovery = null,
    audioRecoveryAt = 0,
    controller = null,
    timers = [],
    frameTasks = [],
    mountedIndex = -1,
    alarmAt = 0,
    animation = 0,
    shakeTimer = 0,
    introStarted = 0,
    introStep = -1,
    ambientAt = 0,
    radioAt = 0,
    miscallAt = 0,
    miscallShown = false,
    lastInputAt = 0,
    heldInputs = new Set(),
    supportCues = new Set(),
    previousPassword = "";
  let matchStorage;
  try { matchStorage = window.localStorage; } catch (_) {}
  const match = Defuse.Match.create(matchStorage), matchUI = new Defuse.MatchUI();
  const trainingModel = Defuse.Training.create(matchStorage);
  let matchToken = null, matchOutcome = null, surrenderRequest = null;
  const surrenderScreens = ["home", "game", "intro", "retake", "rescue", "rush-defense", "result"];
  function paintMatch() {
    const state = match.snapshot;
    matchUI.update(state, { screen });
    const available = state.canSurrender && surrenderScreens.includes(screen);
    document.querySelectorAll("[data-open-surrender]").forEach(button => { button.hidden = !available; });
    const lobbyMode = app.querySelector(".lobby-mode");
    if (lobbyMode) lobbyMode.hidden = available;
    const rank = Defuse.RANKS[state.rankIndex];
    const label = app.querySelector('[data-match-rank-name]');
    if (label) label.textContent = rank.name;
    const icon = app.querySelector('[data-match-rank-icon]');
    if (icon) { icon.src = rank.icon; icon.alt = rank.name; }
    const next = app.querySelector('.start-game');
    if (next && ['home', 'result'].includes(screen)) {
      const text = state.completed ? '开始新一场' : state.ct + state.t > 0 ? '下一回合' : '开始游戏';
      next.innerHTML = text + ' ' + Defuse.icon("arrowUpRight", "action-icon");
      next.setAttribute('aria-label', text);
    }
    const hint = app.querySelector('.restart-hint');
    if (hint) hint.textContent = state.completed ? '这场结束了。新一场从 0 : 0 开始，保留段位和最高连胜。' : '比分已更新，下回合继续。';
  }
  function makeRound(plantedAt = Date.now()) {
    const ct = Defuse.ctPlan();
    const next = new Defuse.Round().start({ plantedAt, enemyGuardIds: Defuse.guardIds(),
      planterId: Defuse.currentEnemyId(), appearedEnemyIds: [...new Set([Defuse.currentEnemyId(), ...Defuse.guardIds()])],
      supportId: ct.supportId, deadTeammates: ct.deadTeammates, opening: Defuse.matchPlan?.opening, variation: Defuse.matchPlan?.variation, streak: Defuse.matchPlan?.difficulty?.streak || 0,
      listenEncounter: Math.random() < .25,
      onsiteTeammateIds: Defuse.roundTeamIds({ opening: Defuse.matchPlan?.opening }),
      teammateKits: Defuse.matchPlan?.opening === 'direct' && !ct.deadTeammates.includes(ct.supportId) ? [ct.supportId] : [] });
    if (next.passwordCode === previousPassword)
      next.passwordCode = String(1000000 + ((Number(next.passwordCode) - 999999) % 9000000));
    previousPassword = next.passwordCode;
    return next;
  }
  const announce = (text) => {
    document.querySelector("#announcer").textContent = text;
  };
  const later = (delay, fn) => {
    const id = setTimeout(fn, delay);
    timers.push(id);
    return id;
  };
  function cleanup() {
    clearTimeout(resultMusicTimer);
    resultMusicTimer = 0;
    controller?.abort();
    controller = null;
    timers.forEach(clearTimeout);
    timers = [];
    frameTasks = [];
    miscallAt = 0;
    clearTimeout(shakeTimer);
    Defuse.audio.stop("module");
  }
  function stopScreen() {
    Defuse.audio.stop('teamplay-shot');
    document.body.classList.remove("combat-screen-active");
    training?.dispose();
    training = null;
    closeSurrender();
    matchUI.close();
    smokeDeath?.dispose();
    smokeDeath = null;
    Defuse.rankings?.close();
    rescue?.dispose();
    rescue = null;
    rushDefense?.dispose();
    rushDefense = null;
    retake?.dispose();
    retake = null;
    homeShowcase?.dispose();
    homeShowcase = null;
    pressure?.dispose();
    pressure = null;
    cleanup();
    cancelAnimationFrame(animation);
    Defuse.audio.stopAll();
    Defuse.music.stop();
  }
  function soundIcon() {
    soundButton.innerHTML = Defuse.icon(Defuse.audio.muted && Defuse.audio.musicMuted ? "mute" : "sound");
    document.querySelector("[data-audio-effects]").checked = !Defuse.audio.muted;
    document.querySelector("[data-audio-music]").checked = !Defuse.audio.musicMuted && Defuse.music.selected !== "off";
    document.querySelector("#soft-flash").checked = Defuse.flashPreference.soft;
  }
  document.querySelector("#audio-settings").addEventListener("toggle", e => {
    soundButton.setAttribute("aria-expanded", String(e.newState === "open"));
  });
  document.querySelector("[data-audio-effects]").addEventListener("change", e => {
    Defuse.audio.unlock();
    Defuse.audio.setMuted(!e.target.checked);
    soundIcon();
  });
  document.querySelector("[data-audio-music]").addEventListener("change", e => {
    Defuse.audio.unlock();
    if (e.target.checked && Defuse.music.selected === "off") Defuse.music.select("bright");
    Defuse.audio.setMusicMuted(!e.target.checked);
    Defuse.music.stop();
    if (["game", "intro", "retake", "rescue"].includes(screen)) Defuse.music.sync(round);
    if (screen === "result" && !Defuse.audio.musicMuted) cueResultMusic();
    Defuse.music.refresh();
    soundIcon();
  });
  soundIcon();
  function openTraining(replay = false) {
    if (!["home", "training"].includes(screen)) return;
    stopScreen();
    screen = "training";
    paintMatch();
    training = new Defuse.TrainingUI(app, { model: trainingModel, replay, onExit: home, onPlay: start });
  }
  function home() {
    stopScreen();
    Defuse.rankings?.abandon();
    if (matchToken) match.abandonRound(matchToken);
    matchToken = null;
    round = null;
    screen = "home";
    document.body.classList.remove("critical", "boom-flash");
    app.innerHTML = Defuse.screens.home();
    Defuse.music.refresh();
    Defuse.applyAssets(app);
    homeShowcase = Defuse.rosterShowcase.mount(app);
    paintMatch();
    window.scrollTo(0, 0);
  }
  function openSurrender() {
    if (!surrenderDialog || surrenderDialog.open || !surrenderScreens.includes(screen) || !match.snapshot.canSurrender) return;
    // Settle an expired bomb before permitting a surrender of that round.
    if (round?.state === "playing" || round?.state === "transition") {
      round.tick();
      if (round.state === "ended") { finish(); return; }
    }
    const state = match.snapshot;
    surrenderRequest = { token: state.activeRoundId, ct: state.ct, t: state.t, count: state.surrenderCount };
    surrenderDialog.querySelector("[data-surrender-ct]").textContent = state.ct;
    surrenderDialog.querySelector("[data-surrender-t]").textContent = state.t;
    surrenderDialog.querySelector("[data-surrender-penalty]").textContent = state.nextSurrenderPenalty
      ? "本次投降：会降一级段位（最低白银一级）。"
      : "本次投降：首次免费，不扣段位。";
    surrenderDialog.querySelector("[data-surrender-detail]").textContent = state.activeRoundId
      ? "比分归零，当前连胜中断。确认期间对局照常进行。"
      : "比分归零，当前连胜中断。历史最高连胜保留。";
    try { document.querySelector("#audio-settings").hidePopover(); } catch (_) {}
    surrenderDialog.showModal();
    surrenderDialog.querySelector("[data-surrender-cancel]").focus({ preventScroll: true });
  }
  function confirmSurrender() {
    if (!surrenderDialog?.open || !surrenderRequest || !surrenderScreens.includes(screen)) return;
    if (round?.state === "playing" || round?.state === "transition") {
      round.tick();
      if (round.state === "ended") { finish(); return; }
    }
    const state = match.snapshot;
    if (!state.canSurrender || state.activeRoundId !== surrenderRequest.token ||
        state.ct !== surrenderRequest.ct || state.t !== surrenderRequest.t ||
        state.surrenderCount !== surrenderRequest.count) { closeSurrender(); return; }
    const outcome = match.surrenderMatch(surrenderRequest.token);
    if (!outcome.accepted) { closeSurrender(); return; }
    Defuse.rankings?.surrender();
    matchToken = null;
    matchOutcome = null;
    closeSurrender();
    heldInputs.clear();
    home();
    const rank = Defuse.RANKS[outcome.toRank].name;
    const message = outcome.demoted ? `比分已归零 · 段位降至${rank}` :
      outcome.penalized ? "比分已归零 · 已在最低段位" : "比分已归零 · 首次投降，段位保留";
    app.querySelector(".lobby-objective").textContent = message;
    announce(message);
    app.querySelector(".start-game").focus({ preventScroll: true });
  }
  function closeSurrender() {
    surrenderRequest = null;
    if (surrenderDialog?.open) surrenderDialog.close();
  }
  function leaderboard() {
    const fromResult = screen === "result";
    stopScreen();
    screen = "leaderboard";
    document.body.classList.remove("critical", "boom-flash");
    app.innerHTML = Defuse.rankings.viewMarkup();
    if (fromResult) {
      const back = app.querySelector(".go-home");
      back.classList.replace("go-home", "return-result");
      back.textContent = "返回结算";
    }
    Defuse.rankings.mount();
    paintMatch();
    window.scrollTo(0, 0);
    document.querySelector("#leaderboard-title").focus({ preventScroll: true });
  }
  function radio(
    text,
    error = false,
    who = moduleSpeakers[round?.moduleId] || "commander",
  ) {
    if (round?.rescueCleared && who === "commander") who = "ricksaw";
    const p = document.querySelector("#radio-text");
    if (!p) return;
    document.querySelector(".radio-miscall")?.remove();
    radioAt = Date.now();
    p.textContent = Defuse.radioLine(text, who, round);
    const bubble = document.querySelector(".radio-bubble");
    bubble.classList.toggle("radio-error", error);
    const dead = Defuse.isTeammateDead(who, round);
    bubble.classList.toggle("radio-dead", !!dead);
    const member = Defuse.cast[who];
    bubble.classList.toggle("radio-command", !!member.offsite);
    document.querySelector(".radio-avatar").innerHTML = Defuse.portrait(who);
    document.querySelector("#radio-label").innerHTML =
      `${member.name} <i>${dead ? "阵亡 / 报点频道" : error ? "队内 / 别急" : member.role}</i>`;
    Defuse.audio.play("radio", { volume: 0.14, group: "module" });
  }
  function radioExchange(exchange) {
    if (!exchange) return;
    radio(exchange.text, false, "commander");
    const copy = document.querySelector(".radio-copy");
    if (!copy) return;
    const quote = document.createElement("div");
    quote.className = "radio-miscall";
    const dead = Defuse.isTeammateDead("lead", round);
    quote.classList.toggle("miscall-dead", dead);
    quote.innerHTML = `${Defuse.portrait("lead")}<p><b>CSGO雷恩 🤡<em class="role-secondary">（自由人）</em>${dead ? " · 阵亡频道" : ""}</b><span></span></p>`;
    quote.querySelector("span").textContent = exchange.mislead;
    copy.prepend(quote);
    miscallShown = true;
  }
  function teammateExchange() {
    // One paired exchange per module, only after the real instruction has
    // been visible. Never compete with a threat, smoke search or final seconds.
    if (round?.rescueCleared || ["fake", "suppression"].includes(round?.moduleId) || miscallShown || !miscallAt || Date.now() < miscallAt ||
        screen !== "game" || round.state !== "playing" || document.hidden ||
        round.remaining <= 10000 || pressure?.core.event ||
        pressure?.core.isBlocking() || heldInputs.size ||
        Date.now() - lastInputAt < 3000 || Date.now() - radioAt < 3000) return;
    radioExchange(Defuse.leienExchange(round.moduleId));
  }
  function mountModule() {
    cleanup();
    document.body.classList.add("combat-screen-active");
    miscallShown = false;
    miscallAt = Date.now() + 3800;
    mountedIndex = round.index;
    controller = new AbortController();
    const signal = controller.signal,
      id = round.moduleId,
      mod = Defuse.modules[id],
      root = document.querySelector("#module-root");
    pressure?.setAction(
      {
        password: "准备输密码",
        hold: "等待按住拆除",
        wires: "看灯号，准备剪线",
        tools: "找拆弹钳",
        smoke: "正在记忆包位",
        circuit: "接通电路",
        fake: "摸包骗枪 · 等守包者探头", suppression: "划动 C4 · 压住交叉枪线", listen: "听脚步 · 先架住来人的方向",
      }[id],
    );
    document.querySelector("#module-title").textContent = mod.title;
    document.querySelector("#module-english").textContent = mod.english + (round.difficulty.level ? " / " + round.difficulty.label : "");
    document.querySelector("#module-instruction").textContent = id === "smoke" && round.difficulty.smokeTargets > 1 ? `记住 ${['①','②','③'].slice(0,round.difficulty.smokeTargets).join(' → ')}，烟起后按顺序点回去。` : mod.instruction;
    document.querySelector("#module-id").textContent = String(
      round.index + 1,
    ).padStart(2, "0");
    document.querySelector(".play-console").classList.remove("module-passed");
    document.querySelector(".game-screen").dataset.module = id;
    root.inert = false;
    Defuse.sceneDirector?.applyGame(document.querySelector(".game-screen"));
    const opening = Defuse.moduleOpening(id, round);
    const threat = pressure?.core.event;
    if (!threat || threat.evaded || threat.resolved) {
      if (opening?.mislead && round.remaining > 10000 && !pressure?.core.isBlocking()) radioExchange(opening);
      else radio(
        opening?.text || mod.banter,
        false,
        opening?.who || moduleSpeakers[id],
      );
    }
    const active = () => {
      if (signal.aborted || screen !== "game") return false;
      round.tick();
      // Resolve the incoming threat before accepting a last-millisecond tap.
      pressure?.step();
      return (
        !window.leienOrientation?.blocked &&
        round.state === "playing" &&
        round.moduleId === id &&
        Date.now() - round.lastErrorAt >= 450 &&
        !pressure?.core.isBlocking(id)
      );
    };
    let coverOffered;
    const passed = (text, who = 'commander') => {
      Defuse.audio.stop('module');
      if (round.state !== 'ended') Defuse.audio.play('pass');
      Defuse.audio.vibrate(30);
      root.inert = true;
      document.querySelector('.play-console').classList.add('module-passed');
      radio(text, false, who);
      announce('模块完成');
    };
    const coverCandidate = () => {
      if (round.moduleId !== 'hold' || round.state !== 'playing' || round.coverAttempted || round.remaining < 16000 ||
          round.opening !== 'direct' || round.variation !== 'standard' || round.queue.includes('fake') ||
          (round.enemyGuardIds || []).filter(enemy => !round.defeatedEnemyIds.includes(enemy)).length < 2 ||
          pressure?.core.event || pressure?.core.isBlocking(id) || pressure?.flashUntil > Date.now()) return null;
      return (round.teammateKits || []).find(who => round.onsiteTeammateIds.includes(who) && !round.deadTeammates.includes(who)) || null;
    };
    const ctx = {
      root,
      round,
      active,
      canTeamCover() {
        if (coverOffered === undefined) coverOffered = Math.random() < .15 ? coverCandidate() : null;
        return coverOffered && coverCandidate() === coverOffered ? coverOffered : null;
      },
      beginTeamCover(who) {
        if (!active() || who !== coverOffered || coverCandidate() !== who || !round.beginTeamCover(who)) return false;
        pressure?.step();
        return true;
      },
      completeListen(proof, text) {
        if (!active() || document.hidden || !round.completeListen(proof)) return false;
        passed(text || '掉了，回去拆。');
        return true;
      },
      completeTeamCover(proof, text) {
        if (!active() || document.hidden || !round.completeTeamCover(proof)) return false;
        passed(text || '拆掉了！好架！', proof.teammateId);
        return true;
      },
      retreatTeamCover(proof, text) {
        if (signal.aborted || screen !== 'game' || !round.retreatTeamCover(proof)) return false;
        Defuse.audio.stop('module');
        if (pressure) {
          // A miss leaves a real, uninterrupted window to take the bomb back.
          pressure.core.quietUntil = Math.max(pressure.core.quietUntil, Date.now() + round.defuseDuration + 1800);
          pressure.core.setSchedule(Date.now(), false);
          pressure.paint();
        }
        radio(text || '有人拉！我松了，你来拆，我架。', false, proof.teammateId);
        announce('队友已退回掩体，按住拆除可以接手');
        return true;
      },
      canSee: (element) => {
        if (document.hidden || pressure?.flashUntil > Date.now()) return false;
        // Include each row so pinned HUDs, dialogs and the phone viewport
        // cannot cover a possible target while its preview timer runs.
        return [...element.children].every(cell => {
          const r = cell.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
          if (!r.width || !r.height || x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
          const top = document.elementFromPoint(x, y);
          return top && cell.contains(top);
        });
      },
      action: (text, progress = null) => {
        if (!signal.aborted && round.state === "playing")
          pressure?.setAction(text, progress);
      },
      counterfire: (damage) => {
        if (!active()) return null;
        const hit = round.takeFakeCounterfire(damage);
        if (!hit) return null;
        if (pressure) { pressure.hitUntil = Date.now() + 500; pressure.paint(); }
        Defuse.audio.play("shot", { group: "pressure", volume: 0.3 });
        Defuse.audio.vibrate([35, 40, 35]);
        announce(hit.dead ? "反打失败，已阵亡" : "反打失败，损失 " + hit.healthLoss + " 生命，剩余 " + hit.health);
        return hit;
      },
      defeatEnemy: (enemyId) => {
        if (!active() || !round.recordFakeElimination(enemyId)) return false;
        if (pressure) {
          pressure.core.quietUntil = Math.max(pressure.core.quietUntil, round.fakeQuietUntil);
          pressure.core.setSchedule(Date.now(), false);
          pressure.paint();
        }
        return true;
      },
      holdStarted: () => pressure?.core.holdStarted(),
      sound: (name, opts = {}) =>
        Defuse.audio.play(name, { group: "module", ...opts }),
      stopSound: () => Defuse.audio.stop("module"),
      banter: (text, who) => {
        const threat = pressure?.core.event;
        // A module's casual encouragement must not talk over an active warning.
        if (threat && !threat.evaded && !threat.resolved) return;
        radio(text, false, who);
      },
      listen: (el, type, fn) => el.addEventListener(type, fn, { signal }),
      after: (delay, fn) =>
        later(delay, () => {
          if (!signal.aborted) fn();
        }),
      frame: (fn) => frameTasks.push(fn),
      complete(text) {
        if (!active() || !round.complete(id)) return;
        passed(text);
      },
      error(text, { fatal = false, cause = null } = {}) {
        if (!active() || !round.mistake(id, { fatal, cause })) return;
        if (round.result?.deathCause === "smoke-crossfire") { finish(); return; }
        Defuse.audio.play("error");
        Defuse.audio.vibrate([35, 45, 35]);
        const lastChance = !fatal && !round.lastMistakeSafe && round.errors === 2;
        radio(
          lastChance
            ? `${text} ${Defuse.supportComms("lastChance", round)}`
            : text,
          true,
          lastChance ? Defuse.supportId(round) : "commander",
        );
        announce(text);
        const panel = document.querySelector(".play-console");
        panel.classList.remove("shake");
        void panel.offsetWidth;
        panel.classList.add("shake");
        clearTimeout(shakeTimer);
        shakeTimer = setTimeout(() => panel.classList.remove("shake"), 350);
      },
    };
    mod.mount(ctx);
    // A threat may already be active when a transition mounts this module.
    pressure?.paint();
    document.querySelector("#module-title").focus({ preventScroll: true });
    if (round.index > 0 && !pressure?.core.isBlocking(id)) {
      // Both the mobile workspace and desktop columns start below this HUD.
      // Scrolling the heading to the top hides the score after a tall module.
      window.scrollTo(0, 0);
    }
    announce(`第 ${round.index + 1} 个模块，${mod.title}。${mod.instruction}`);
  }
  function formatTime(ms) {
    const cents = Math.ceil(ms / 10);
    return {
      main: `00:${String(Math.floor(cents / 100)).padStart(2, "0")}`,
      fraction: "." + String(cents % 100).padStart(2, "0"),
    };
  }
  function hud() {
    const t = formatTime(round.remaining);
    const main = document.querySelector("#timer-main"), fraction = document.querySelector("#timer-fraction");
    if (main.textContent !== t.main) main.textContent = t.main;
    if (fraction.textContent !== t.fraction) fraction.textContent = t.fraction;
    const errors = document.querySelector("#error-count"), count = document.querySelector("#module-count");
    if (errors.dataset.value !== String(round.errors)) {
      errors.innerHTML = `${round.errors} <small>/ 3</small>`;
      errors.dataset.value = String(round.errors);
    }
    document
      .querySelector("#error-count")
      .classList.toggle("text-red", round.errors > 0);
    if (count.dataset.value !== String(round.index)) {
      count.innerHTML = `${round.index + 1} <small>/ ${round.queue.length}</small>`;
      count.dataset.value = String(round.index);
    }
    const progress = document.querySelector(".round-progress");
    if (progress.children.length !== round.queue.length) progress.innerHTML = round.queue.map(() => "<span></span>").join("");
    progress.setAttribute("aria-label", `已完成 ${round.completed.length} / ${round.queue.length} 步`);
    document.querySelectorAll(".round-progress span").forEach((el, i) => {
      el.classList.toggle("done", i < round.completed.length);
      el.classList.toggle(
        "current",
        i === round.index && round.state === "playing",
      );
    });
    document.body.classList.toggle("critical", round.remaining <= 10000);
  }
  function beep() {
    Defuse.music.sync(round);
    if (!round || round.state === "ended" || document.hidden) return;
    if (Date.now() >= alarmAt) {
      Defuse.audio.play(round.remaining <= 10000 ? "urgent" : "alarm", {
        group: "bomb",
      });
      alarmAt = Date.now() + Math.max(220, 250 + round.remaining / 40);
    }
  }
  function supportCountdown() {
    // Only use quiet gaps; incoming fire, flash warnings and fresh hints win.
    if (
      round.state !== "playing" || round.moduleId === "fake" ||
      document.hidden ||
      round.remaining > 20000 ||
      pressure?.core.event ||
      Date.now() - radioAt < 3000
    )
      return;
    const cue =
      round.remaining <= 5000
        ? "five"
        : round.remaining <= 10000
          ? "ten"
          : "twenty";
    if (supportCues.has(cue)) return;
    supportCues.add(cue);
    radio(Defuse.supportComms(cue, round), false, Defuse.supportId(round));
  }
  function finish() {
    if (!round?.result || !matchToken || ["home", "death", "result"].includes(screen)) return;
    const result = round.result;
    stopScreen();
    const record = Defuse.rankings?.recordResult(round);
    matchOutcome = match.finishRound(matchToken, !!record);
    matchToken = null;
    paintMatch();
    if (result?.deathCause === "smoke-crossfire" && Defuse.SmokeDeathUI && !document.hidden) {
      screen = "death";
      paintMatch();
      document.body.classList.remove("critical", "boom-flash");
      smokeDeath = new Defuse.SmokeDeathUI({ root: app, result, audio: Defuse.audio,
        onComplete: () => { if (screen === "death" && round?.result === result) showResult(); } });
      window.scrollTo(0, 0);
      smokeDeath.start();
      return;
    }
    showResult();
  }
  function cueResultMusic() {
    clearTimeout(resultMusicTimer);
    resultMusicTimer = 0;
    if (screen !== "result" || !round?.result || document.hidden || Defuse.audio.musicMuted) return;
    const delay = Math.max(0, resultMusicAt - Date.now());
    if (delay > 0) { resultMusicTimer = later(delay, cueResultMusic); return; }
    Defuse.music.playMvp(resultMusicAt);
  }
  function recoverAudio(gesture = false) {
    if (document.hidden || !Defuse.audio.ctx || Defuse.audio.ctx.state === "running") return false;
    const now = Defuse.audio.clock();
    // Some WebKit versions leave resume() pending indefinitely. A later user
    // gesture may retry, at most once per second; no automatic context loop.
    if (audioRecovery && (!gesture || now - audioRecoveryAt < 1000)) return true;
    const retry = !!audioRecovery;
    // An interrupted context can retain frozen gunshots. Drop those voices;
    // only current music may resume, at its original place in the round.
    Defuse.audio.stopAll();
    Defuse.music.stop();
    const task = Promise.resolve(Defuse.audio.unlock({ retry }));
    audioRecovery = task;
    audioRecoveryAt = now;
    task.then(() => {
      if (audioRecovery !== task || document.hidden || Defuse.audio.ctx?.state !== "running") return;
      if (screen === "result") cueResultMusic();
      else if (["intro", "game", "retake", "rescue"].includes(screen)) Defuse.music.sync(round);
    }).catch(() => {}).finally(() => { if (audioRecovery === task) audioRecovery = null; });
    return true;
  }
  function showResult() {
    stopScreen();
    screen = "result";
    document.body.classList.remove("critical", "boom-flash");
    const r = round.result;
    resultMusicAt = Date.now() + (r.success ? 850 : r.reason === "eliminated" ? 500 : 2300);
    app.innerHTML = Defuse.screens.result(r);
    Defuse.rankings?.sync();
    paintMatch();
    if (r.success) {
      if (matchOutcome?.promoted) Defuse.audio.play('rankup', { group: 'promotion' });
      else Defuse.audio.play("finish");
      Defuse.audio.play("ctwin", { group: "announcer", delay: 0.85 });
    } else if (r.reason === "eliminated") {
      Defuse.audio.playDefeat(r);
      Defuse.audio.vibrate([60, 40, 60]);
    } else {
      Defuse.audio.playDefeat(r);
      document.body.classList.add("boom-flash");
      Defuse.audio.vibrate([70, 50, 130]);
      later(600, () => document.body.classList.remove("boom-flash"));
    }
    cueResultMusic();
    window.scrollTo(0, 0);
    app.querySelector("h1").focus({ preventScroll: true });
    announce(
      r.opening === "rush-defense" ? (r.success ? "反恐精英胜利，进攻已阻止，炸弹未安放" : "恐怖分子胜利，防线被击穿") : r.success
        ? "反恐精英胜利，炸弹已拆除"
        : "恐怖分子胜利，" +
            (r.reason === "eliminated"
              ? "血量耗尽，回防失败"
              : r.reason === "blind-password"
                ? "未擦净纸条就盲输错误，炸弹直接引爆"
              : r.reason === "timeout"
                ? "40 秒起爆"
                : "失误达到三次"),
    );
    if (matchOutcome?.accepted && matchOutcome.matchEnded) {
      matchUI.showOutcome(matchOutcome);
    }
  }
  function loop(now) {
    if (screen !== "game") return;
    round.tick();
    if (round.state === "ended") {
      finish();
      return;
    }
    if (mountedIndex !== round.index) mountModule();
    pressure?.step();
    if (round.state === "ended") {
      finish();
      return;
    }
    hud();
    for (const fn of frameTasks) fn(now);
    beep();
    const teamplayBusy = round.moduleId === 'listen' || round.teamplayActive;
    if (!teamplayBusy) { teammateExchange(); supportCountdown(); }
    if (!teamplayBusy && Date.now() > ambientAt && !document.hidden) {
      Defuse.audio.play("distant", { group: "ambience" });
      ambientAt = Date.now() + 11000;
    }
    animation = requestAnimationFrame(loop);
  }
  function enterRescue(at = Date.now()) {
    cleanup();
    cancelAnimationFrame(animation);
    Defuse.audio.stop("intro");
    screen = "rescue";
    paintMatch();
    const model = new Defuse.RescueOpening({ guardIds: round.enemyGuardIds, initialHealth: round.health });
    model.start(at);
    rescue = new Defuse.RescueUI(app, { model, round,
      onProgress: outcome => {
        round.tick();
        if (round.state !== "playing" || round.moduleId !== "rescue") return;
        if (Number.isInteger(outcome.health) && outcome.health > 0 && outcome.health < round.health)
          round.takeDamage(round.health - outcome.health, { bypassArmor: true });
        for (const id of outcome.defeatedEnemyIds)
          if (round.enemyGuardIds.includes(id) && !round.defeatedEnemyIds.includes(id)) round.defeatedEnemyIds.push(id);
      },
      onWin: outcome => {
        if (round.completeRescue(outcome)) announce("里克索尔清完枪线。钳给你了，完成检修后按住五秒拆包。");
      },
      onFail: () => { round.tick(); },
    });
    window.scrollTo(0, 0);
    Defuse.music.sync(round);
    rescueFrame();
  }
  function rescueFrame() {
    if (screen !== "rescue") return;
    round.tick();
    if (round.state === "ended") { finish(); return; }
    rescue.step();
    if (round.state === "ended") { finish(); return; }
    if (round.state === "playing" && round.rescueCleared) { enterGame(); return; }
    beep();
    animation = requestAnimationFrame(rescueFrame);
  }
  function enterRetake(at = Date.now()) {
    cleanup();
    cancelAnimationFrame(animation);
    Defuse.audio.stop("intro");
    screen = "retake";
    paintMatch();
    const model = new Defuse.FlashRetake({ enemyIds: round.enemyGuardIds, supportId: round.supportId, exposure: round.difficulty.flashExposure });
    model.start(at);
    retake = new Defuse.FlashRetakeUI(app, { model, round,
      onWin: (outcome) => {
        round.tick();
        if (round.state === "ended") return;
        if (round.completeEntry(outcome)) {
          Defuse.audio.play("tap", { group: "intro" });
          announce(outcome.supportAlive === false ? "钳手阵亡，接下来需要十秒强拆。" : "补枪成功！钳给你，队友架枪，接着拆包。");
        }
      },
      onFail: (outcome) => {
        round.tick();
        if (round.state === "ended") return;
        round.deathDetail = {
          early: "抢跑了：闪还没爆，守包敌人沿枪线将你击倒。",
          miss: "补枪打空：没命中头部，被恢复视野的守包敌人反杀。",
          late: "补枪太慢：闪光效果消退，守包敌人恢复视野后反杀。",
        }[outcome.reason] || "跟闪回防失败，被守包敌人击倒。";
        round.takeDamage(100, { bypassArmor: true });
      },
    });
    window.scrollTo(0, 0);
    Defuse.music.sync(round);
    retakeFrame();
  }
  function retakeFrame() {
    if (screen !== "retake") return;
    round.tick();
    if (round.state === "ended") { finish(); return; }
    retake.step();
    if (round.state === "ended") { finish(); return; }
    if (round.state === "playing" && round.entryCleared) { enterGame(); return; }
    beep();
    animation = requestAnimationFrame(retakeFrame);
  }
  function enterGame() {
    cleanup();
    cancelAnimationFrame(animation);
    Defuse.audio.stop("intro");
    Defuse.audio.stop("announcer");
    if (!round) {
      const plantedAt =
        screen === "intro" && Date.now() - introStarted >= 2800
          ? introStarted + 2800
          : Date.now();
      round = makeRound(plantedAt);
    }
    round.tick();
    if (round.state === "ended") {
      finish();
      return;
    }
    if (round.opening === "rescue" && !round.rescueCleared) {
      if (screen !== "rescue") enterRescue();
      return;
    }
    rescue?.dispose();
    rescue = null;
    // Skipping the cinematic never skips the playable opening challenge.
    if (round.opening === "flash" && !round.entryCleared) {
      if (screen !== "retake") enterRetake();
      return;
    }
    retake?.dispose();
    retake = null;
    screen = "game";
    paintMatch();
    mountedIndex = -1;
    ambientAt = Date.now() + 9000;
    app.innerHTML = Defuse.screens.game();
    pressure = new Defuse.PressureUI(round, { radio, announce });
    window.scrollTo(0, 0);
    mountModule();
    if (round.variation === "entry-whiff") {
      const ct = Defuse.ctPlan();
      radio(ct.killLine, true, ct.actorId);
      announce("队友进点失利，守包者仍在。来枪先躲避。");
    }
    if (round.rescueCleared) radio(Defuse.supportComms(round.moduleId, round), false, "ricksaw");
    if (round.entryCleared) radio(
      !round.hasDefuseKit ? "人换掉了，钳手没保住。别绕路捡装备，完成线路后连续拆十秒。" : round.enemyGuardIds.some(id => !round.defeatedEnemyIds.includes(id))
        ? `补得好！最多还有一个。${Defuse.supportName(round)}架枪，你接着拆。`
        : "人清了，包还没拆。稳住，把剩下两步做完。",
      false, "commander");
    hud();
    Defuse.music.sync(round);
    animation = requestAnimationFrame(loop);
  }
  function introFrame() {
    if (screen !== "intro") return;
    const elapsed = Date.now() - introStarted;
    if (elapsed >= 2800 && !round) {
      round = makeRound(introStarted + 2800);
      alarmAt = 0;
    }
    if (round?.opening === "rescue" && elapsed >= 3650) {
      enterRescue(introStarted + 3650);
      return;
    }
    if (round?.opening === "flash" && elapsed >= 3650) {
      // Anchored to the original intro clock, including time spent in background.
      enterRetake(introStarted + 3650);
      return;
    }
    if (round) {
      round.tick();
      if (round.state === "ended") {
        finish();
        return;
      }
      document.querySelector("#intro-clock").textContent = formatTime(
        round.remaining,
      ).main;
      beep();
    }
    document.querySelector(".intro-progress>span").style.width =
      Math.min(100, elapsed / 28) + "%";
    const step =
      elapsed < 2800 ? 0 : elapsed < 3650 ? 1 : elapsed < 4400 ? 2 : 3;
    if (step !== introStep) {
      introStep = step;
      const arena = document.querySelector(".intro-arena");
      arena.dataset.step = step;
      if (step === 0) {
        document.querySelector("#intro-dialogue").textContent =
          Defuse.matchPlan?.plant || "我下包，你们看 B 门和狗洞。";
        Defuse.audio.play("plant", { group: "intro" });
        Defuse.audio.play("initiate", { group: "intro", delay: 0.5 });
      }
      if (step === 1) {
        document.querySelector("#intro-status").textContent =
          "BOMB HAS BEEN PLANTED";
        document.querySelector("#intro-title").textContent = "炸弹已安放";
        document.querySelector("#intro-dialogue").textContent =
          Defuse.matchPlan?.scene || "包下 B 了，回 B 洞守包。别送。";
        Defuse.audio.play("planted", { group: "announcer" });
        announce("炸弹已安放，40 秒后爆炸");
      }
      if (step >= 2) {
        const whiff = Defuse.matchPlan?.variation === "entry-whiff";
        const rush = Defuse.matchPlan?.mode === "rush" || whiff;
        const ct = Defuse.ctPlan();
        const ctName = Defuse.escapeHtml(Defuse.ctActorName());
        const enemyName = Defuse.escapeHtml(Defuse.cast[Defuse.currentEnemyId()].name);
        arena.classList.toggle("planter-down", !rush);
        arena.classList.toggle("ct-down", rush);
        if (rush) arena.querySelector(".intro-location").innerHTML = "CT<span>DUST II / 出生点回 B</span>";
        document.querySelector(".kill-feed").innerHTML = rush
          ? `<span class="t-text" title="${enemyName}">${enemyName}</span><b>${Defuse.killWeapon("AK-47")}</b><span class="ct-text" title="${ctName}">${ctName}</span>`
          : `<span class="ct-text" title="${ctName}">${ctName}</span><b>${Defuse.killWeapon(ct.weapon)}</b><span class="t-text" title="${enemyName}">${enemyName}</span>`;
        document.querySelector("#intro-status").textContent = rush
          ? "CT DOWN / 回防中"
          : "ENEMY ELIMINATED";
        document.querySelector("#intro-title").textContent = rush
          ? whiff ? "没换到人，队友先掉了。" : "B 点掉三个，得打回防了。"
          : "下包的掉了！进点摸包。";
        document.querySelector("#intro-speaker").textContent = `${Defuse.ctActorName()} / ${rush ? "阵亡报点" : "CT 现场频道"}`;
        document.querySelector(".intro-command-portrait").innerHTML = Defuse.ctActorPortrait();
        document.querySelector(".intro-command-portrait").classList.toggle("is-dead", rush);
        document.querySelector("#intro-dialogue").textContent = ct.killLine;
        if (step === 2) {
          Defuse.audio.play("shot", { group: "intro" });
          if (whiff) Defuse.audio.play("shot", { group: "intro", delay: .14, volume: .18 });
          Defuse.audio.play("death", { group: "intro", delay: 0.12 });
        }
      }
      if (step === 3) {
        const ct = Defuse.ctPlan();
        arena.classList.add("handoff");
        document.querySelector(".intro-friend").hidden = false;
        document.querySelector("#intro-status").textContent =
          "YOUR TURN / 接管拆弹";
        document.querySelector("#intro-title").textContent =
          ct.handoffTitle;
        document.querySelector("#intro-speaker").textContent =
          `${Defuse.cast.commander.name} / CT 指挥频道`;
        document.querySelector(".intro-command-portrait").innerHTML = Defuse.portrait("commander");
        document.querySelector(".intro-command-portrait").classList.remove("is-dead");
        document.querySelector("#intro-dialogue").textContent =
          Defuse.matchPlan?.handoff || ct.handoff;
        document.querySelector(".intro-friend p").textContent =
          ct.supportLine;
        Defuse.audio.play("radio", { group: "intro" });
      }
      document
        .querySelectorAll(".intro-steps>span")
        .forEach((el, i) =>
          el.classList.toggle(
            "active",
            i === (step >= 3 ? 2 : step >= 2 ? 1 : 0),
          ),
        );
    }
    if (elapsed >= 5800) {
      enterGame();
      return;
    }
    animation = requestAnimationFrame(introFrame);
  }
  function enterRushDefense() {
    screen = "rush-defense";
    paintMatch();
    const plan = Defuse.matchPlan;
    const model = new Defuse.RushDefense({ enemyIds: plan.rushEnemyIds,
      ctIds: plan.rushCTIds, openingEnemyId: plan.rushOpeningEnemyId, encounter: !!plan.rushEncounter, level: plan.difficulty?.level || 0 });
    rushDefense = new Defuse.RushDefenseUI(app, { model,
      onComplete: result => {
        if (screen !== "rush-defense" || !result) return;
        round = { result, duration: result.elapsed, state: "ended", opening: "rush-defense" };
        finish();
      },
    });
    window.scrollTo(0, 0);
    announce("稀有遭遇：罗曼诺夫。炸弹尚未安放，先背闪，再反打。");
  }
  function start() {
    stopScreen();
    Defuse.rankings?.begin();
    matchToken = match.beginRound();
    matchOutcome = null;
    Defuse.rollMatchPlan?.();
    Defuse.audio.unlock();
    round = null;
    supportCues = new Set();
    radioAt = 0;
    document.body.classList.remove("boom-flash", "critical");
    if (Defuse.matchPlan?.opening === "rush-defense") {
      enterRushDefense();
      return;
    }
    screen = "intro";
    paintMatch();
    introStarted = Date.now();
    introStep = -1;
    alarmAt = 0;
    document.body.classList.remove("boom-flash", "critical");
    app.innerHTML = Defuse.screens.intro();
    if (Defuse.matchPlan?.opening === "flash") {
      document.querySelector(".take-over").innerHTML = '接管回防 ' + Defuse.icon("arrowUpRight", "action-icon");
      const steps = document.querySelectorAll(".intro-steps>span");
      steps[1].textContent = "02 跟闪进点";
      steps[2].textContent = "03 掩护拆包";
    }
    window.scrollTo(0, 0);
    document.querySelector("#intro-title").focus({ preventScroll: true });
    introFrame();
  }
  document.addEventListener("click", (e) => {
    const secret = e.target.closest("[data-role-reveal]");
    if (secret && screen === "home") {
      const who = secret.dataset.roleReveal;
      if (!Defuse.homeTitles[who]) return;
      const reveal = secret.getAttribute("aria-expanded") !== "true";
      secret.setAttribute("aria-expanded", String(reveal));
      secret.setAttribute("aria-label", Defuse.homeTitleLabel(who, reveal));
      secret.querySelector(".role-secret").setAttribute("aria-hidden", String(!reveal));
      return;
    }
    const choice = e.target.closest("[data-music-choice]");
    if (choice && screen === "home")
      Defuse.music.select(choice.dataset.musicChoice);
    if (e.target.closest(".start-game") && ["home", "result"].includes(screen)) start();
    if (e.target.closest("[data-open-surrender]")) openSurrender();
    if (e.target.closest("[data-confirm-surrender]")) confirmSurrender();
    if (e.target.closest("[data-surrender-cancel]")) closeSurrender();
    if (e.target.closest(".take-over") && screen === "intro") {
      Defuse.audio.unlock();
      enterGame();
    }
    if (e.target.closest(".go-home")) home();
    if (e.target.closest(".return-result") && screen === "leaderboard" && round?.result) {
      stopScreen();
      screen = "result";
      app.innerHTML = Defuse.screens.result(round.result);
      Defuse.rankings?.sync();
      paintMatch();
      window.scrollTo(0, 0);
      app.querySelector("h1").focus({ preventScroll: true });
      cueResultMusic();
    }
    if (e.target.closest(".show-leaderboard") && ["home", "result"].includes(screen)) leaderboard();
    if (e.target.closest(".show-training") && screen === "home") openTraining(true);
    if (e.target.closest(".wordmark")) {
      e.preventDefault();
      if (["home", "result", "leaderboard"].includes(screen)) home();
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.matches("#soft-flash"))
      Defuse.flashPreference.set(e.target.checked);
  });
  surrenderDialog?.addEventListener("click", (e) => {
    if (e.target !== surrenderDialog) return;
    const r = surrenderDialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeSurrender();
  });
  surrenderDialog?.addEventListener("close", () => { surrenderRequest = null; });
  // Native-dialog keyboard input must not reach the active module's shortcuts.
  surrenderDialog?.addEventListener("keydown", e => e.stopPropagation());
  surrenderDialog?.addEventListener("keyup", e => e.stopPropagation());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      heldInputs.clear();
      Defuse.audio.stopAll();
      Defuse.music.stop();
      return;
    }
    if (screen === "result") {
      if (!recoverAudio()) cueResultMusic();
      return;
    }
    recoverAudio();
    if (screen === "game" && round) {
      round.tick();
      pressure?.step();
      if (round.state === "ended") finish();
    }
    if (screen === "rescue" && round) {
      round.tick();
      if (round.state !== "ended") rescue?.step();
      if (round.state === "ended") finish();
    }
    if (screen === "retake" && round) {
      round.tick();
      if (round.state !== "ended") retake?.step();
      if (round.state === "ended") finish();
    }
  });
  // Do not expand an idle conversation under a finger or between keypad taps.
  const input = (e, down) => {
    if (down && !e.repeat) recoverAudio(true);
    lastInputAt = Date.now();
    const key = e.type.startsWith("pointer") ? `pointer:${e.pointerId}` : `key:${e.code}`;
    if (down) heldInputs.add(key); else heldInputs.delete(key);
  };
  document.addEventListener("pointerdown", e => input(e, true), true);
  document.addEventListener("keydown", e => input(e, true), true);
  for (const type of ["pointerup", "pointercancel", "keyup"])
    document.addEventListener(type, e => input(e, false), true);
  window.addEventListener("blur", () => heldInputs.clear());
  document.addEventListener("defuse-orientation-block", () => {
    heldInputs.clear();
    Defuse.audio.stop("module");
  });
  if (trainingModel.required) openTraining();
  else home();
})();
