/* Presentation-only agent directory. Browsing never draws a match or an enemy. */
(() => {
  const ctMain = Object.freeze(["player", "lead", "goggles", "rookie", "coconut"]);
  const ctSupport = Object.freeze(["commander", "ricksaw"]);
  const shortNames = {
    player: "你", lead: "雷恩", goggles: "戴劳", rookie: "迈克", coconut: "椰子C",
    commander: "爱娃特工", ricksaw: "里克索尔", planter: "克拉斯沃特", opponent: "穆哈里克",
    rebel: "地面叛军", sallie: "萨莉", daryl: "达里尔爵士", solman: "索尔曼", vypa: "薇帕姐", romanov: "罗曼诺夫",
  };
  const descriptions = {
    player: { role: "补枪手 · 你来拆包", quote: "我有钳，我拆。你们帮我看一下。" },
    lead: { role: "自由人", quote: "等我绕一下……算了，你们先打。" },
    goggles: { role: "道具手", quote: "烟闪我给。等闪爆了再进，别抢跑。" },
    rookie: { role: "狙击手", quote: "枪线我盯着。你有钳，你拆。" },
    coconut: { role: "突破手", quote: "你拆！我不说话了……快啊！" },
    commander: { role: "场外战术指挥", quote: "都少说两句，让他拆。" },
    ricksaw: { role: "王牌步枪手", quote: "你先缩着，我来清。清完你拆。" },
  };
  const idsFor = side => side === "ct" ? [...ctMain, ...ctSupport] : [...(Defuse.enemyShowcaseIds || Defuse.enemyIds)];
  const esc = value => Defuse.escapeHtml(value);
  const rare = id => id === "ricksaw" || id === "romanov";
  const member = id => id === "player" ? Defuse.player : Defuse.cast[id];
  const portrait = id => id === "player" ? Defuse.playerImage("roster-avatar") : Defuse.portrait(id);
  const info = (id, side) => side === "ct" ? descriptions[id] : {
    role: Defuse.cast[id].specialty,
    quote: Defuse.enemyProfiles[id].homeLine,
  };
  const profileKind = id => id === "player" ? "emblem" : Defuse.cast[id].avatar ? "avatar" : "cutout";
  function secret(id) {
    const title = Defuse.homeTitles[id];
    if (!title) return "";
    return `<button type="button" class="role-reveal roster-secret" data-role-reveal="${id}" aria-expanded="false" aria-controls="${title.targetId}" aria-label="${esc(Defuse.homeTitleLabel(id))}"><span class="roster-secret-label">点开彩蛋</span><span class="role-secret" id="${title.targetId}" aria-hidden="true">${esc(title.title)}</span><span aria-hidden="true">＋</span></button>`;
  }
  function focus(id, side) {
    const actor = member(id), meta = info(id, side), ids = idsFor(side);
    return `<div class="roster-focus-art"><span class="roster-watermark" aria-hidden="true">${side.toUpperCase()}</span><div class="roster-focus-portrait">${portrait(id)}</div><span class="roster-index">${String(ids.indexOf(id) + 1).padStart(2, "0")} / ${String(ids.length).padStart(2, "0")}</span></div><div class="roster-focus-info"><div class="roster-name-row"><h2${id === "player" ? " data-player-name" : ""}>${esc(actor.name)}</h2><span class="roster-rarity"${rare(id) ? "" : " hidden"}><span aria-hidden="true">◇</span> 稀有</span></div><p class="roster-role">${esc(meta.role)}</p><p class="roster-quote">「${esc(meta.quote)}」</p>${secret(id)}</div>`;
  }
  function pick(id, selected, side) {
    const meta = info(id, side);
    const label = id === "player" ? "查看你的档案" : `查看${member(id).name}${rare(id) ? "，稀有探员" : ""}`;
    const cardRole = id === "player" ? "补枪手" : id === "ricksaw" ? "稀有支援" : meta.role;
    return `<button type="button" class="roster-pick" data-roster-pick="${id}" data-rarity="${rare(id) ? "rare" : "standard"}" data-profile-kind="${profileKind(id)}" aria-label="${esc(label)}" aria-pressed="${id === selected}" aria-controls="roster-focus-${side}">${portrait(id)}<span class="roster-pick-name">${esc(shortNames[id])}</span><span class="roster-pick-role">${esc(cardRole)}</span>${rare(id) ? '<span class="roster-mini-badge" aria-hidden="true">◇</span>' : ""}</button>`;
  }
  function panel(side) {
    const id = side === "ct" ? "goggles" : "planter";
    const selectors = side === "ct"
      ? `<div class="roster-group-label"><b>常规小队</b><span>4 名队友 ＋ 你</span></div><div class="roster-grid roster-ct-grid" role="group" aria-label="常规小队成员">${ctMain.map(who => pick(who, id, side)).join("")}</div><div class="roster-support-grid" role="group" aria-label="场外指挥与稀有支援">${ctSupport.map(who => pick(who, id, side)).join("")}</div>`
      : `<div class="roster-group-label"><b>对手档案</b><span>点头像查看</span></div><div class="roster-grid roster-t-grid" role="group" aria-label="守包对手档案">${idsFor(side).map(who => pick(who, id, side)).join("")}</div>`;
    return `<section class="roster-panel" data-roster-side="${side}" aria-label="${side === "ct" ? "CT 回防小队档案" : "T 守包对手档案"}"><header class="roster-panel-header">${Defuse.teamMark(side.toUpperCase())}<div><span class="roster-overline">${side === "ct" ? "COUNTER-TERRORISTS" : "TERRORISTS"}</span><b>${side === "ct" ? "回防小队" : "守包对手"}</b></div><span class="roster-count">${side === "ct" ? "5 人协作" : "每局随机遭遇"}</span></header><div id="roster-focus-${side}" class="roster-focus" data-roster-focus data-id="${id}" data-side="${side}" data-rarity="standard" data-profile-kind="${profileKind(id)}" role="region" aria-label="探员档案">${focus(id, side)}</div><div class="roster-selectors">${selectors}</div></section>`;
  }
  Defuse.rosterShowcase = {
    markup() {
      return `<div class="home-visual roster-browser"><nav class="mobile-squad-nav roster-faction-tabs" aria-label="查看阵营"><button type="button" data-squad-view="ct" aria-pressed="true">${Defuse.teamMark("CT")}<b>CT <span>你的队伍</span></b><small>回防 · 拆包</small></button><button type="button" data-squad-view="t" aria-pressed="false">${Defuse.teamMark("T")}<b>T <span>守包对手</span></b><small>进攻 · 守点</small></button></nav>${panel("ct")}${panel("t")}<span class="sr-only" data-roster-announcement aria-live="polite"></span></div>`;
    },
    mount(root) {
      const browser = root.querySelector(".roster-browser");
      if (!browser) return { dispose() {} };
      const controller = new AbortController(), { signal } = controller;
      function select(button, keyboard = false) {
        const pane = button.closest("[data-roster-side]"), side = pane?.dataset.rosterSide, id = button.dataset.rosterPick;
        if (!side || !idsFor(side).includes(id)) return;
        const stage = pane.querySelector("[data-roster-focus]");
        if (stage.dataset.id === id) return;
        stage.dataset.id = id;
        stage.dataset.rarity = rare(id) ? "rare" : "standard";
        stage.dataset.profileKind = profileKind(id);
        stage.innerHTML = focus(id, side);
        pane.querySelectorAll("[data-roster-pick]").forEach(p => p.setAttribute("aria-pressed", String(p === button)));
        browser.querySelector("[data-roster-announcement]").textContent = `${member(id).name}，${info(id, side).role}${rare(id) ? "，稀有探员" : ""}`;
        if (keyboard) Defuse.uiFeedback?.play('select');
      }
      browser.addEventListener("click", event => {
        const pick = event.target.closest("[data-roster-pick]");
        if (pick) select(pick);
      }, { signal });
      browser.addEventListener("keydown", event => {
        const button = event.target.closest("[data-roster-pick]");
        if (!button || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const group = button.parentElement, buttons = [...group.querySelectorAll("[data-roster-pick]")];
        const columns = Math.max(1, getComputedStyle(group).gridTemplateColumns.split(" ").length);
        const index = buttons.indexOf(button), step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns }[event.key];
        const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + step + buttons.length) % buttons.length;
        buttons[next].focus({ preventScroll: true });
        select(buttons[next], true);
      }, { signal });
      return { dispose() { controller.abort(); Defuse.audio.stop("roster"); } };
    },
  };
})();
