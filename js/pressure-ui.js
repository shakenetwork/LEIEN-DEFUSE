(() => {
  // Stable HUD text must not replace its DOM nodes on every animation frame.
  const text = (node, value) => {
    const next = String(value ?? "");
    if (node && node.textContent !== next) node.textContent = next;
  };
  const flag = (node, name, value) => { if (node && node[name] !== value) node[name] = value; };
  const attribute = (node, name, value) => {
    if (node.getAttribute(name) !== String(value)) node.setAttribute(name, value);
  };
  const style = (node, name, value) => {
    if (node && node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value);
  };
  const data = (node, name, value) => { if (node.dataset[name] !== value) node.dataset[name] = value; };
  const preferenceKey = "leien-soft-flash";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let soft = reduced.matches;
  try {
    soft = reduced.matches || localStorage.getItem(preferenceKey) === "true";
  } catch {}
  Defuse.flashPreference = {
    get soft() {
      return soft || reduced.matches;
    },
    set(value) {
      soft = value;
      try {
        localStorage.setItem(preferenceKey, String(value));
      } catch {}
    },
  };
  class PressureUI {
    static markup() {
      const initialEnemyId = Defuse.guardIds()[0] || Defuse.currentEnemyId();
      const initialEnemy = Defuse.cast[initialEnemyId];
      return `<section class="pressure-panel" data-state="clear" aria-label="队员与队内通讯">
        <div class="pressure-top"><span class="pressure-label"><i aria-hidden="true"></i> CT / 队内通讯</span><span class="enemy-contact" hidden><img alt="" aria-hidden="true"><span><small>T</small> <b></b></span></span><span class="combat-location">DUST II <b>/ B 点</b></span></div>
        <div class="operator-card">
          <div class="operator-portrait">${Defuse.playerAvatar()}<span class="operator-tag">CT</span></div>
          <div class="operator-info"><div class="operator-name">${Defuse.playerName()}<span>你</span></div><span class="operator-role">${Defuse.player.specialty} · 有拆弹钳</span><div class="operator-action"><i aria-hidden="true"></i><span data-player-action>准备拆包</span></div><div class="operator-progress" aria-hidden="true"><span></span></div></div>
          <div class="combat-vitals"><div class="vital-health"><span>✚ <small>生命</small></span><b data-hp>100</b><div class="vital-track" role="meter" aria-label="生命值" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" data-health-meter><i></i></div></div><div class="vital-armor"><span>⛨ <small>护甲</small></span><b data-armor>100</b><div class="vital-track" role="meter" aria-label="护甲值" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100" data-armor-meter><i></i></div></div></div>
        </div>
        <button type="button" class="mobile-comms-toggle" aria-expanded="false" aria-controls="mobile-radio">队内 ${Defuse.icon("chevronDown", "action-icon")}</button>
        <div class="radio-bubble" id="mobile-radio"><div class="radio-avatar"></div><div class="radio-copy"><span id="radio-label"></span><p id="radio-text" aria-live="polite"></p></div><span class="voice-bars" aria-hidden="true">▂▅▃▇▂</span></div>
        <div class="combat-team" aria-label="队友状态"></div>
      </section>
      <section class="field-narrator" data-state="clear" aria-label="队内提醒">
        <div class="narrator-heading"><span><i aria-hidden="true"></i> 队内提醒</span><span data-narrator-status>可以拆包</span></div>
        <div class="pressure-action"><div><strong id="threat-title">你拆，我架。</strong><span id="threat-detail">来枪先躲，来火先跑。</span></div><button class="evade-button" disabled>掩护中</button></div>
        <div class="tactical-actions"><button class="smoke-button" hidden>投烟灭火 <small>烟雾弹 × 1</small></button><button class="duel-button" hidden>拉枪反打 <small>打赢换 5 秒 · 失手阵亡</small></button></div>
        <div class="tactical-arena" hidden><div class="arena-heading"><b></b><span></span></div><div class="duel-opponent-card" hidden><img class="duel-opponent-avatar" src="${Defuse.enemyImage(initialEnemyId)}" alt="${initialEnemy.name}" aria-hidden="true"><div class="duel-opponent-copy"><span class="duel-opponent-kicker">${Defuse.enemyProfiles[initialEnemyId].kicker}</span><b class="duel-opponent-name">${initialEnemy.name}</b><span class="duel-opponent-meta"><span data-duel-role>${initialEnemy.specialty}</span> · <span data-duel-direction>B 洞</span> · <em data-duel-distance>约 12m</em></span></div><span class="duel-opponent-status" data-duel-status>CONTACT</span></div><div class="duel-field" hidden><button class="duel-target" aria-label="射击${initialEnemy.name}头部"><span class="enemy-head" aria-hidden="true"></span><span class="target-crosshair" aria-hidden="true">⌖</span></button></div><div class="fire-smoke-grid" hidden>${Array.from({ length: 9 }, (_, i) => `<button data-smoke-cell="${i}" aria-label="烟中包位 ${Math.floor(i / 3) + 1} 行 ${i % 3 + 1} 列">+</button>`).join("")}</div></div>
        <div class="threat-track" aria-hidden="true"><span></span></div>
      </section><div class="combat-overlay" aria-hidden="true"><div class="hit-vignette"></div><div class="hit-direction"></div><div class="damage-number"></div><div class="flash-veil"></div></div>`;
    }
    constructor(round, { radio, announce }) {
      this.round = round;
      // The opening owns this roster. Rendering a module must never roll it
      // again or bring a teammate back after their bodyguard sacrifice.
      if (!round.supportId) {
        round.supportId = Defuse.supportId(round);
        if (!Array.isArray(round.deadTeammates) || !round.deadTeammates.length)
          round.deadTeammates = [...Defuse.ctPlan().deadTeammates];
      }
      if (!Array.isArray(round.deadTeammates)) round.deadTeammates = [];
      this.supportId = Defuse.supportId(round);
      this.core = new Defuse.Pressure(round, {
        bodyguardAvailable: !round.deadTeammates.includes(this.supportId) && !round.allyBlocks,
        bodyguardName: this.supportId,
        guardIds: round.enemyGuardIds || Defuse.guardIds(),
        tacticalEvents: true,
        onBodyguard: who => {
          if (!round.deadTeammates.includes(who)) round.deadTeammates.push(who);
        },
      });
      this.radio = radio;
      this.announce = announce;
      this.controller = new AbortController();
      this.panel = document.querySelector(".pressure-panel");
      this.narrator = document.querySelector(".field-narrator");
      this.panel.querySelector(".operator-role").textContent = `${Defuse.player.specialty} · ${round.hasDefuseKit === false ? "无钳 · 拆除需 10 秒" : "有拆弹钳"}`;
      this.overlay = document.querySelector(".combat-overlay");
      const find = s => this.panel.querySelector(s) || this.narrator.querySelector(s);
      this.button = find(".evade-button");
      this.smokeButton = find(".smoke-button");
      this.duelButton = find(".duel-button");
      this.arena = find(".tactical-arena");
      this.duelOpponent = find(".duel-opponent-card");
      this.duelOpponentAvatar = find(".duel-opponent-avatar");
      this.duelDistance = find("[data-duel-distance]");
      this.duelStatus = find("[data-duel-status]");
      this.duelField = find(".duel-field");
      this.opponentId = this.core.currentGuardId();
      this.enemyContact = find(".enemy-contact");
      this.enemyContactAvatar = find(".enemy-contact img");
      this.target = find(".duel-target");
      this.smokeGrid = find(".fire-smoke-grid");
      this.title = find("#threat-title");
      this.detail = find("#threat-detail");
      this.track = find(".threat-track span");
      this.action = { text: "准备拆包", progress: null };
      this.actionText = find("[data-player-action]");
      this.actionTrack = find(".operator-progress");
      this.portraitTag = find(".operator-tag");
      this.healthMeter = find("[data-health-meter]");
      this.armorMeter = find("[data-armor-meter]");
      this.flashUntil = this.hitUntil = 0;
      this.memory = null;
      this.resizeObserver = new ResizeObserver(() => {
        const hud = document.querySelector(".game-status");
        const hudHeight = hud && getComputedStyle(hud).position === "sticky" ? hud.offsetHeight : 0;
        const game = this.panel.closest(".game-screen");
        game?.style.setProperty("--phone-hud-height", `${hudHeight || 62}px`);
        game?.style.setProperty("--comms-height", `${this.narrator.offsetHeight + hudHeight + 20}px`);
      });
      this.resizeObserver.observe(this.panel);
      this.resizeObserver.observe(this.narrator);
      const hud = document.querySelector(".game-status");
      if (hud) this.resizeObserver.observe(hud);
      this.duelOpponentAvatar?.addEventListener("error", () => {
        // A failed image request must not hide the timing or target controls.
        this.duelOpponentAvatar.hidden = true;
        this.duelOpponent.classList.add("avatar-fallback");
      }, { signal: this.controller.signal });
      this.enemyContactAvatar.addEventListener("error", () => {
        this.enemyContactAvatar.hidden = true;
      }, { signal: this.controller.signal });
      // A touch can dismiss this arena before its release click is delivered.
      // Consume only that gesture's click so it cannot hit the revealed keypad.
      let consumedPointer = false;
      document.addEventListener("pointerdown", () => { consumedPointer = false; }, {capture:true, signal:this.controller.signal});
      document.addEventListener("pointercancel", () => { consumedPointer = false; }, {capture:true, signal:this.controller.signal});
      document.addEventListener("click", e => {
        if (consumedPointer && e.detail > 0) {
          consumedPointer = false;
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      }, {capture:true, signal:this.controller.signal});
      const bindPress = (el, fn) => {
        const run = e => {
          if (e.type === "pointerdown" && e.button !== 0) return;
          if (e.type === "pointerdown") consumedPointer = true;
          // Physical gestures are handled on contact. Their release click
          // must never repeat an action, however long a finger was held.
          if (e.type === "click" && e.detail > 0) return;
          e.preventDefault();
          this.step();
          if (!["playing", "transition"].includes(this.round.state)) return;
          fn(e);
          this.step();
        };
        el.addEventListener("pointerdown", run, { signal: this.controller.signal });
        el.addEventListener("click", run, { signal: this.controller.signal });
      };
      bindPress(this.button, () => {
        const kind = this.core.event?.kind;
        if (!this.core.evade()) return;
        this.interrupt();
        if (kind === "flank") this.radio("收得好！他这枪空了，接着拆。", false, this.supportId);
        else if (kind === "double-flash") this.radio(this.core.event.stage === 1 ? "背住了！还有一颗，先别回头。" : "好，第二颗也背了！等它爆完接着拆。", false, this.supportId);
        else this.supportRadio(kind === "fire" ? "evade-fire" : kind === "flash" ? "evade-flash" : "evade-shots");
        this.announce(kind === "fire" ? "已离开火区，包点仍被火封锁" : "已躲避，长按进度清零");
      });
      bindPress(this.smokeButton, () => {
        if (!this.core.smoke()) return;
        this.interrupt();
        this.startMemory();
      });
      bindPress(this.duelButton, () => {
        if (!this.core.beginDuel()) return;
        this.interrupt();
        this.announce(`${Defuse.cast[this.opponentId].name}拉出来了，点中头部，点空或超时阵亡`);
        this.paint();
        this.revealArena();
      });
      bindPress(this.duelField, e => {
        if (!this.core.event?.duel) return;
        this.core.shoot(!!e.target.closest(".duel-target"));
      });
      bindPress(this.smokeGrid, e => {
        const cell = e.target.closest("[data-smoke-cell]");
        if (!cell || !this.memory || !this.core.smokeSearch || Date.now() < this.memory.revealUntil) return;
        if (Number(cell.dataset.smokeCell) === this.memory.target) {
          if (this.core.confirmSmoke()) {
            this.memory = null;
            Defuse.audio.play("pass", { group: "pressure", volume: .35 });
            this.radio("摸到包了！火灭了，接着拆。", false, "commander");
          }
        } else if (this.round.mistake(this.round.moduleId, { cause: "smoke-position" })) {
          if (this.round.result?.deathCause === "smoke-crossfire") return;
          cell.classList.add("incorrect");
          Defuse.audio.play("error", { group: "pressure" });
          this.supportRadio("smoke-wrong", {}, true);
        }
      });
      this.paint();
    }
    supportRadio(kind, params = {}, error = false) {
      const line = Defuse.supportComms(kind, this.round, params);
      this.radio(line, error, this.supportId);
      return line;
    }
    interrupt() {
      document.dispatchEvent(new Event("defuse-evade"));
      Defuse.audio.stop("module");
      this.action = { text: "先停一下，躲过这枪再拆", progress: null };
      Defuse.audio.vibrate(20);
    }
    revealArena() {
      // Commit the compact arena layout before scrolling. Instant scrolling
      // keeps the entire reaction window available for the actual head tap.
      void this.arena.offsetHeight;
      this.narrator.scrollIntoView({ block: "start", behavior: "instant" });
    }
    startMemory() {
      this.memory = { target: Math.floor(Math.random() * 9), revealUntil: Date.now() + 1000 };
      this.smokeGrid.querySelectorAll("button").forEach(el => el.classList.remove("incorrect"));
      this.paint();
      this.revealArena();
    }
    setAction(text, progress = null) { this.action = { text, progress }; }
    reset() {
      this.core.reset();
      this.flashUntil = this.hitUntil = 0;
      Defuse.audio.stop("pressure-ring");
      this.paint();
    }
    step() {
      if (document.hidden || this.stepping) return;
      this.stepping = true;
      try {
        let newWarning = false;
        // A dead voice may still call positions, but cannot absorb a bullet.
        if (this.round.deadTeammates.includes(this.supportId)) this.core.bodyguardAvailable = false;
        for (const e of this.core.tick()) {
          if (e.type === "warning") {
            newWarning = true;
            document.dispatchEvent(new Event("defuse-threat-start"));
            const line = e.kind === "double-flash" ? (e.stage === 1 ? "连闪！先背第一颗，别急着回头！" : "第二颗来了！再背一下，背完就拆！") : e.kind === "flank" ? "B 洞脚步！他绕你后面了，先收一下！" : this.supportRadio(`warning-${e.kind}`, {
              direction: e.direction, pairedGrenade: e.pairedGrenade,
              lethal: this.core.shotRounds > 1 || !this.core.bodyguardAvailable,
              bodyguardAvailable: this.core.bodyguardAvailable,
            });
            if (["flank", "double-flash"].includes(e.kind)) this.radio(line, false, this.supportId);
            this.announce(line);
            if (["fire", "double-flash"].includes(e.kind)) this.interrupt();
            if (["flash", "grenade", "double-flash"].includes(e.kind)) Defuse.audio.play("flashPin", { group: "pressure", volume: .28 });
          }
          if (e.type === "opening") {
            this.radio("他退回去换弹了！别追，赶紧拆！", false, this.supportId);
            this.announce("他回去换弹了，抓紧接着拆。");
          }
          if (e.type === "bodyguard") {
            if (!this.round.deadTeammates.includes(this.supportId)) this.round.deadTeammates.push(this.supportId);
            this.interrupt();
            this.supportRadio("bodyguard");
            this.announce(`${Defuse.supportName(this.round)}为你挡枪阵亡，下一轮未躲避将致命`);
            Defuse.audio.play("death", { group: "pressure", volume: .3 });
          }
          if (e.type === "hit") {
            if (e.kind === "flank") {
              this.interrupt();
              this.radio(this.round.health > 0 ? "中枪了！还活着，别慌，包还来得及！" : "B 洞绕过来了……这枪没躲掉。", true, this.supportId);
            }
            this.hitUntil = Date.now() + 500;
            this.overlay.querySelector(".damage-number").textContent = `−${e.healthLoss} HP`;
            this.overlay.querySelector(".hit-direction").textContent = `${e.direction || "包点"} · 受击`;
            this.overlay.dataset.direction = e.direction === "B 洞" ? "left" : e.direction === "狗洞" ? "right" : "front";
            if (e.kind !== "fire") Defuse.audio.play(e.kind === "grenade" ? "explosion" : "shot", { group: "pressure", volume: .3 });
            Defuse.audio.vibrate(35);
          }
          if (e.type === "fire") { this.interrupt(); this.announce("脚下燃烧，立刻跑或投烟！"); }
          if (e.type === "smoked") {
            Defuse.audio.play("smoke", { group: "pressure" });
            this.radio("火灭了，记好亮格。烟一起来，点回那个包位。", false, "commander");
            if (!this.memory) this.startMemory();
          }
          if (e.type === "duel-win") {
            Defuse.audio.play("shot", { group: "pressure", volume: .4 });
            const defeated = Defuse.cast[e.opponentId || this.opponentId];
            this.supportRadio("duel-win", { enemyName: defeated.name, guardsCleared: e.guardsCleared });
            this.announce(e.guardsCleared ? "守包敌人已清空，炸弹仍在倒计时，继续拆除" : "反打成功，获得五秒安全可以拆包");
          }
          if (e.type === "flash-dodged") {
            this.flashUntil = e.until;
            Defuse.audio.play("flashPop", { group: "pressure", volume: .15 });
          }
          if (e.type === "flash") {
            this.flashUntil = e.until;
            Defuse.audio.play("flashPop", { group: "pressure", volume: .27 });
            Defuse.audio.play("flashRing", { group: "pressure-ring", volume: .1 });
            this.supportRadio("flashed");
          }
          if (e.type === "clear") Defuse.audio.stop("pressure-ring");
        }
        this.paint();
        if (newWarning && ["playing", "transition"].includes(this.round.state)) {
          // At the top of a short landscape screen the narrator can still be
          // below the fold. Bring the actual actions into view once, rather
          // than requiring a scroll during the 1.2-second reaction window.
          const viewport = window.visualViewport;
          const top = viewport?.offsetTop || 0, bottom = top + (viewport?.height || innerHeight);
          const controls = [this.button, this.smokeButton, this.duelButton].filter(el => !el.hidden && !el.disabled);
          if (controls.some(el => {
            const r = el.getBoundingClientRect();
            const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return r.top < top || r.bottom > bottom || !el.contains(hit);
          })) this.revealArena();
        }
      } finally { this.stepping = false; }
    }
    paint() {
      const now = Date.now(), e = this.core.event;
      const duel = e?.duel && !e.duel.resolved ? e.duel : null;
      const hit = Math.max(0, (this.hitUntil - now) / 500);
      const blind = Math.max(0, Math.min(1, (this.flashUntil - now) / 1900));
      const search = !!this.core.smokeSearch;
      const fire = !!this.round.fireBlocked;
      const blocked = this.core.isBlocking(this.round.moduleId);
      style(this.overlay, "--hit", hit.toFixed(3));
      style(this.overlay, "--blind", blind.toFixed(3));
      this.overlay.classList.toggle("soft-flash", Defuse.flashPreference.soft);
      this.overlay.classList.toggle("burning", fire && !!e?.ignited && !e?.evaded);
      style(document.querySelector(".play-console"), "--blind-blur", `${(blind * 12).toFixed(1)}px`);
      const screen = this.panel.closest(".game-screen");
      screen.classList.toggle("low-health", this.round.health <= 30);
      screen.classList.toggle("fire-blocked", fire);
      screen.classList.toggle("tactical-blocked", blocked);
      const root = document.querySelector("#module-root");
      flag(root, "inert", blocked || this.round.state !== "playing");
      const passwordState = root?.querySelector("#password-state");
      text(passwordState, blocked ? "● 先处理事件" : "● 待解除");
      text(this.panel.querySelector("[data-hp]"), this.round.health);
      text(this.panel.querySelector("[data-armor]"), this.round.armor);
      for (const [meter, value] of [[this.healthMeter, this.round.health], [this.armorMeter, this.round.armor]]) {
        attribute(meter, "aria-valuenow", value);
        style(meter, "--vital", `${value}%`);
      }
      const signature = this.round.deadTeammates.join(",") + this.round.smokes;
      if (signature !== this.teamSignature) {
        this.teamSignature = signature;
        this.panel.querySelector(".combat-team").innerHTML = Defuse.roundTeamIds(this.round).map(who => {
          const dead = this.round.deadTeammates.includes(who);
          return `<span class="teammate-chip ${dead ? "is-dead" : ""}" data-teammate="${who}" title="${Defuse.cast[who].name} · ${dead ? "阵亡" : "存活"}">${Defuse.portrait(who)}<span>${dead ? "×" : "●"}</span></span>`;
        }).join("") + `<span>烟雾弹 × ${this.round.smokes}</span>`;
      }
      let action = this.action.text, motion = this.action.progress !== null ? "working" : "ready", tag = "CT";
      if (fire) { action = "包点被火封锁 · 暂停拆除"; motion = "hit"; tag = "火"; }
      else if (duel) { action = "正在对枪 · 点中头部"; motion = "hit"; tag = "反打"; }
      else if (search) { action = "封烟成功 · 找回包位"; motion = "cover"; tag = "烟"; }
      else if (hit > 0) { action = "受击 · 注意血量"; motion = "hit"; tag = "受击"; }
      else if (blind > 0) { action = "闪光致盲 · 视野恢复中"; motion = "blind"; tag = "致盲"; }
      else if (this.round.state === "transition") { action = "模块完成 · 准备下一步"; motion = "passed"; tag = "✓"; }
      text(this.actionText, action);
      data(this.panel, "motion", motion);
      text(this.portraitTag, tag);
      flag(this.actionTrack, "hidden", this.action.progress === null || motion !== "working");
      style(this.actionTrack.firstElementChild, "width", `${Math.max(0, Math.min(100, this.action.progress ?? 0))}%`);
      const alone = Defuse.roundTeamIds(this.round).every(who => this.round.deadTeammates.includes(who));
      const kitTime = this.round.hasDefuseKit === false ? "无钳，拆除要 10 秒" : "有钳，拆除要 5 秒";
      let title = alone ? "就你一个了，稳住。" : "包还在滴，抓紧拆。", detail = alone ? "先活着，再找拆包的空档。" : "暂时没有来枪，先做眼前这一步。", label = alone ? "独自拆包" : "警戒中", state = "clear", disabled = true, progress = 0;
      if (this.core.entryWhiffPending && !this.core.guardsCleared) {
        title = "队友空枪掉了，B 门没清。";
        detail = "枪线还在 · 来枪先收身，再继续拆";
        label = "进点失利";
      } else if (this.round.moduleId === "fake" && !this.core.guardsCleared) {
        title = "先骗他探头，再接着拆。";
        detail = this.round.variation === "deagle" ? "沙鹰在手 · 露头 2.4 秒内命中一枪" : "摸包出声 → 松手架枪 → 露头反打";
        label = "诱敌中";
      } else if (this.core.guardsCleared) {
        title = this.round.rescueCleared ? "枪线清了，包交给你。" : "守包的全清了，拆！";
        detail = "炸弹还在倒计时 · 完成剩余拆除";
        label = "敌方清空";
      } else if (this.round.fakeCleared && now < this.round.fakeQuietUntil && !e) {
        title = "这条枪线清了，接着拆！";
        detail = "还有守包者，留意下一次来枪。";
        label = "可以拆包";
      } else if (!alone && this.round.entryCleared && now < this.round.retakeQuietUntil && !e) {
        title = "队友架住了，抓紧拆。";
        detail = `有人架枪。${kitTime}。`;
        label = "掩护中";
      }
      flag(this.smokeButton, "hidden", !fire);
      flag(this.smokeButton, "disabled", this.round.smokes <= 0 || !["playing", "transition"].includes(this.round.state));
      const smokeLabel = `投烟灭火 <small>${this.round.smokes ? "烟雾弹 × 1 · 灭火后摸包" : "烟雾弹已用完 · 先跑等火灭"}</small>`;
      if (this.smokeButton.innerHTML !== smokeLabel) this.smokeButton.innerHTML = smokeLabel;
      flag(this.duelButton, "hidden", !this.core.canDuel());
      flag(this.enemyContact, "hidden", !e?.opponentId || !!duel || !!e.evaded || !!e.resolved);
      if (e?.opponentId) {
        // Keep one identity per engagement; the next enemy takes over only
        // after a successful elimination, never halfway through a shot.
        if (this.renderedOpponent !== e.opponentId) {
          this.opponentId = e.opponentId;
          this.renderedOpponent = e.opponentId;
          const opponent = Defuse.cast[this.opponentId];
          const profile = Defuse.enemyProfiles[this.opponentId];
          const enemyImage = Defuse.enemyImage(this.opponentId);
          this.duelOpponentAvatar.src = enemyImage;
          this.duelOpponentAvatar.alt = opponent.name;
          this.duelOpponentAvatar.hidden = false;
          this.duelOpponent.classList.remove("avatar-fallback");
          this.narrator.querySelector(".duel-opponent-name").textContent = opponent.name;
          this.narrator.querySelector(".duel-opponent-kicker").textContent = profile.kicker;
          this.narrator.querySelector("[data-duel-role]").textContent = opponent.specialty;
          this.target.setAttribute("aria-label", '射击' + opponent.name + '头部');
          this.target.style.setProperty("--enemy-image", 'url("' + new URL(enemyImage, document.baseURI).href + '")');
          this.target.style.setProperty("--enemy-position", profile.headPosition);
          this.enemyContactAvatar.src = enemyImage;
          this.enemyContactAvatar.hidden = false;
          this.enemyContact.querySelector("b").textContent = opponent.name;
          this.enemyContact.dataset.enemy = this.opponentId;
          this.enemyContact.setAttribute("aria-label", `守包敌人：${opponent.name}`);
        }
        text(this.narrator.querySelector("[data-duel-direction]"), e.direction);
      }
      if (e) {
        const warning = now < e.impactAt;
        const seconds = Math.max(0, (e.impactAt - now) / 1000).toFixed(1);
        progress = warning ? (e.impactAt - now) / (e.impactAt - e.warnedAt) : (e.endAt - now) / Math.max(1, e.endAt - e.impactAt);
        if (e.kind === "double-flash") {
          state = e.resolved ? "evaded" : "flash-warning";
          title = e.resolved ? "闪爆完了，接着拆！" : e.stage === 1 ? "连闪！先背第一颗" : "第二颗来了，再背一次！";
          detail = e.resolved ? "队友架住了，这会儿能拆。" : e.stageDodged || e.stageResolved ? (e.stage === 1 ? "等第二颗，别急着回头。" : "背住了，等它爆。") : `${seconds} 秒爆闪 · 点「背闪」· ${e.stage} / 2`;
          label = e.resolved ? "继续拆" : e.stageDodged || e.stageResolved ? "保持背身" : `背闪 ${e.stage} / 2`;
          disabled = e.resolved || e.stageDodged || e.stageResolved || !warning;
          progress = e.resolved || e.stageResolved ? 0 : (e.impactAt - now) / 1800;
        } else if (e.kind === "reload") {
          state = "opportunity";
          title = `他退了，抓紧拆 · ${Math.max(0, (e.endAt - now) / 1000).toFixed(1)} 秒`;
          detail = "他在换弹，接着拆。";
          progress = (e.endAt - now) / (e.endAt - e.warnedAt);
        } else if (e.kind === "flank") {
          state = e.evaded || e.resolved ? "evaded" : "flank";
          title = e.evaded ? "躲过这枪，接着拆！" : e.resolved ? "挨了一枪，稳住！" : "B 洞脚步！有人绕后！";
          detail = e.evaded || e.resolved ? "对手缩回去了 · 抓紧拆包" : `${seconds} 秒后开枪 · 点「收身」躲开，残血别硬吃`;
          label = "收身 ↘";
          disabled = e.evaded || e.resolved || !warning;
        } else if (e.kind === "fire" && fire) {
          state = warning ? "fire-warning" : "fire";
          title = e.evaded ? "人出来了，包上还有火" : warning ? "包上来火了！" : "脚下起火！马上跑！";
          detail = e.evaded ? `投烟灭火后摸包，或等火熄灭 · ${Math.max(0, (e.endAt - now) / 1000).toFixed(1)} 秒` : warning ? `${seconds} 秒落地 · 不处理会烧死，不能强拆` : "立刻跑开或投烟 · 火区内无法拆除";
          if (e.ignited && !e.evaded) {
            progress = (e.fireDeadline - now) / (e.fireDeadline - e.impactAt);
            detail = "持续灼烧 · 立即跑开或投烟灭火";
          }
          label = e.evaded ? "已跑开" : "快跑 ↘";
          disabled = !!e.evaded;
        } else if (e.evaded || e.resolved) {
          state = e.bodyguard ? "bodyguard" : "evaded";
          const eliminated = e.opponentId && this.round.defeatedEnemyIds.includes(e.opponentId);
          title = e.bodyguard ? `${Defuse.supportName(this.round)}挡枪阵亡` : eliminated ? this.core.guardsCleared ? "守包的全清了，拆！" : `${Defuse.cast[e.opponentId].name}已击杀` : "躲过去了，接着拆！";
          detail = e.bodyguard ? "这次他替你挡，下轮不躲直接阵亡。" : this.core.guardsCleared ? "炸弹还在倒计时 · 完成剩余拆除" : "包还在滴，抓紧这个空档。";
          label = "继续拆";
        } else if (e.kind === "shots") {
          const lethal = this.core.shotRounds > 1 || !this.core.bodyguardAvailable;
          state = "warning";
          title = e.pairedGrenade ? "来枪了，还有雷！" : `${e.direction}拉枪！${lethal ? "致命" : "第一轮"}`;
          detail = `${seconds} 秒后命中 · ${lethal ? "不躲直接阵亡" : this.round.health <= 44 ? "你已残血，队友挡枪也救不了" : e.pairedGrenade ? "满血吃满也只剩一丝血" : "漏躲：队友阵亡，满血降至 56"}`;
          label = "躲枪 ↘"; disabled = !warning;
        } else if (e.kind === "grenade") {
          state = "grenade"; title = "包点有雷！";
          detail = `${seconds} 秒引爆 · 站着吃雷会被打残`;
          label = "躲雷 ↘"; disabled = !warning;
        } else if (e.kind === "flash") {
          state = warning ? "flash-warning" : "blinded";
          title = warning ? `${e.direction}飞闪！` : "全白了！别乱点。";
          detail = warning ? `${seconds} 秒爆闪 · 立即背闪` : "视野恢复中，倒计时不停。";
          label = warning ? "背闪 ↶" : "致盲中"; disabled = !warning;
        }
      }
      flag(this.arena, "hidden", !duel && !search);
      flag(this.duelOpponent, "hidden", !duel);
      flag(this.duelField, "hidden", !duel);
      flag(this.smokeGrid, "hidden", !search);
      if (duel) {
        state = "duel"; title = "拉出来了！点他头！";
        detail = "点他头！打空或拖太久都会死。";
        label = "对枪中"; disabled = true;
        style(this.target, "--target-x", `${duel.x * 100}%`);
        style(this.target, "--target-y", `${duel.y * 100}%`);
        const distance = Math.round(8 + Math.abs(duel.x - 0.5) * 10 + Math.abs(duel.y - 0.5) * 8);
        text(this.duelDistance, `约 ${distance}m`);
        text(this.duelStatus, now >= duel.deadline - 350 ? "FIRE" : "CONTACT");
        data(this.duelStatus, "state", now >= duel.deadline - 350 ? "urgent" : "live");
        text(this.arena.querySelector("b"), "反打 · 命中头部");
        text(this.arena.querySelector(".arena-heading > span"), `${Math.max(0, (duel.deadline - now) / 1000).toFixed(2)}s`);
        progress = Math.max(0, (duel.deadline - now) / 1000);
      } else if (search && this.memory) {
        state = "smoke"; title = "火灭了，烟里找包";
        detail = "记住亮格，烟起后点回去。摸错算一次失误。";
        label = "烟里找包"; disabled = true;
        const revealing = now < this.memory.revealUntil;
        this.smokeGrid.classList.toggle("covered", !revealing);
        this.smokeGrid.querySelectorAll("button").forEach(cell => {
          const marked = revealing && Number(cell.dataset.smokeCell) === this.memory.target;
          cell.classList.toggle("remember", marked);
          text(cell, marked ? "⌖" : "+");
          flag(cell, "disabled", revealing);
        });
        text(this.arena.querySelector("b"), revealing ? "先记住亮格" : "烟起了，点回包位");
        text(this.arena.querySelector(".arena-heading > span"), revealing ? `${Math.max(0, (this.memory.revealUntil - now) / 1000).toFixed(1)}s` : "错一次 +1 失误");
      }
      data(this.panel, "state", state);
      if (this.round.teamplayActive) {
        title = "队友在拆，帮他架住！"; detail = "看住门和窗口，露头就点。";
      } else if (this.round.moduleId === 'listen') {
        title = "先别拆，听脚步。"; detail = "选方向架住，露头再打。选错还能换。";
      }
      data(this.narrator, "state", state);
      data(this.narrator, "tactic", e?.kind === "flank" || e?.kind === "reload" ? e.kind : "");
      text(this.narrator.querySelector("[data-narrator-status]"),
        this.round.teamplayActive ? "掩护拆包" : this.round.moduleId === 'listen' ? "听脚步" :
        state === "flank" ? "突发 · 绕后" : state === "opportunity" ? "机会 · 对手换弹" :
        ["clear", "evaded"].includes(state) ? "可以拆包" : state === "bodyguard" ? "队友阵亡" :
        state === "duel" ? "正在交火" : state === "smoke" ? "烟里找包" : "先躲一下");
      text(this.title, title);
      text(this.detail, detail);
      // Update only when the label changes; keep the SVG stable during rAF.
      if (this.lastButtonLabel !== label) {
        const symbol = label.endsWith("↘") ? "arrowDownRight" : label.endsWith("↶") ? "turnBack" : "";
        const copy = label.replace(/ [↘↶]$/, "");
        this.button.innerHTML = Defuse.escapeHtml(copy) + (symbol ? " " + Defuse.icon(symbol, "action-icon") : "");
        this.lastButtonLabel = label;
      }
      flag(this.button, "disabled", disabled);
      flag(this.button, "hidden", disabled);
      style(this.track, "width", `${Math.max(0, Math.min(1, progress)) * 100}%`);
    }
    dispose() {
      this.controller.abort();
      this.resizeObserver.disconnect();
      this.flashUntil = this.hitUntil = 0;
      Defuse.audio.stop("pressure");
      Defuse.audio.stop("pressure-ring");
      this.overlay.remove();
    }
  }
  Defuse.PressureUI = PressureUI;
})();
