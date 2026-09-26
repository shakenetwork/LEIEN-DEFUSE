/* Official Toy SDK only. No credentials, private API, invented rows or polling. */
(() => {
  "use strict";
  const D = Defuse, C = D.Leaderboard, esc = D.escapeHtml;
  let storage;
  try { storage = window.localStorage; } catch (_) {}
  const records = C.createRecords(storage), cache = new Map(), inflight = new Map();
  const board = 1, period = "all";
  let root = null, viewId = 0, cacheEpoch = 0, apiTask = null, cooldownUntil = 0, current = null;
  const loginMarkup = () => `<a data-profile-login hidden href="https://passport.bilibili.com/login" target="_blank" rel="noopener noreferrer">去 B站登录 ${Defuse.icon("arrowUpRight", "action-icon")}</a>`;
  const profileMarkup = () => `<div class="profile-controls" data-profile-controls hidden><button type="button" data-profile-connect>连接 B站账号</button><span data-profile-status role="status"></span>${loginMarkup()}</div><p class="profile-offline" data-profile-offline>游客可直接玩 · 在 B站内连接账号、提交成绩</p>`;
  const homeMarkup = () => `<section class="online-panel" aria-label="账号与排行榜"><div class="local-rank"><img data-match-rank-icon alt="" width="56" height="22"><div><small>本地段位</small><b data-match-rank-name></b></div><small>本机保存</small></div><div class="online-account"><span class="online-label">B站账号</span><b data-player-name>${esc(D.player.name)}</b>${profileMarkup()}</div><button type="button" class="leaderboard-entry show-leaderboard"><span><b>连胜回合榜</b><small>查看最高连胜</small></span>${Defuse.icon("arrowUpRight", "action-icon")}</button></section>`;
  const personalMarkup = () => `<div class="record-local"><span>当前连胜回合 <b>${records.stats.streak}<small>回合</small></b></span><span>本机最高连胜回合 <b>${records.stats.bestStreak}<small>回合</small></b></span></div>`;
  const viewMarkup = () => `<section class="leaderboard-screen screen-enter" aria-labelledby="leaderboard-title"><div class="leaderboard-top"><div><span class="eyebrow">LEIEN / WIN STREAK</span><h1 id="leaderboard-title" tabindex="-1">连胜回合榜</h1></div><button class="button secondary go-home" type="button">返回首页</button></div><p class="leaderboard-intro">比一比，谁能连赢更多回合。</p>${personalMarkup()}<div class="leaderboard-shell"><div class="leaderboard-toolbar"><div><b>历史最高</b><span>TOP 50</span></div><button type="button" data-rank-refresh aria-label="刷新连胜回合榜">刷新</button></div><p class="leaderboard-rule" data-rank-rule></p><div class="leaderboard-mine" data-rank-mine aria-live="polite" hidden></div><div data-rank-content aria-live="polite" aria-busy="true"></div><p class="leaderboard-footnote">按最高连胜回合排名 · 同分先达成者在前</p></div><div class="leaderboard-account">${profileMarkup()}</div><p class="leaderboard-disclaimer">本机纪录仅存在此浏览器；通关后点击提交，B站保存该账号的最高连胜回合。</p></section>`;
  function resultMarkup() {
    if (!current) return `<div class="result-ranking"><p>连胜已中断，下把重新来。</p><button type="button" class="show-leaderboard">查看排行榜 ${Defuse.icon("arrowUpRight", "action-icon")}</button></div>`;
    return `<section class="result-ranking" aria-label="本回合连胜成绩"><div class="result-record"><span>当前连胜回合 <b>${current.record.streak}<small>回合</small></b></span><span class="streak-quip">${current.record.streak === 1 ? (current.result.opening === "rush-defense" ? "B 点守住了，拿下一分。" : "包拆了，拿下一分。") : "这分拿了，下把继续。"}</span></div><div class="result-rank-actions"><button type="button" data-rank-submit>提交连胜回合</button><button type="button" class="show-leaderboard">查看连胜回合榜 ${Defuse.icon("arrowUpRight", "action-icon")}</button></div><p data-rank-submit-status role="status">提交至 B站，保留最高连胜回合。</p><div data-rank-result-profile>${profileMarkup()}</div></section>`;
  }
  function updateSubmission() {
    const button = document.querySelector("[data-rank-submit]"), status = document.querySelector("[data-rank-submit-status]");
    if (!button || !current) return;
    const connected = D.profile?.state.connected, eligible = D.profile?.state.eligible;
    const done = current.accepted.size === 1;
    button.hidden = !connected || !eligible;
    button.disabled = current.busy || done;
    button.innerHTML = done ? "已提交 " + D.icon("check", "action-icon") : current.busy ? "正在提交…" : current.message ? "重试提交" : "提交连胜回合";
    status.textContent = current.message || (!eligible ? "本局已计入本机战绩；在 B站内打开可上榜。" : !connected ? "先连接 B站账号，再点击提交本局成绩。" : "点击提交至 B站，保留你的最好成绩。");
    // Profile controls handle login/retry; hide redundant connected status here.
    const account = document.querySelector("[data-rank-result-profile]");
    if (account) account.hidden = !!connected;
  }
  function bounded(promise, ms = 12000) {
    let timer;
    return Promise.race([Promise.resolve(promise), new Promise((_, reject) => {
      timer = setTimeout(() => reject({ type: "timeout" }), ms);
    })]).finally(() => clearTimeout(timer));
  }
  function handleError(error) {
    if (error?.code === 307044 && !error.cooldown) cooldownUntil = Date.now() + 60000;
    if (error?.type === "not_logged_in") D.profile?.requireLogin();
    return C.errorText(error);
  }
  async function getApi() {
    await D.profile?.init();
    const sdk = D.profile?.sdk;
    if (!sdk) throw { type: "unsupported" };
    if (!apiTask) apiTask = (async () => {
      for (const method of ["getRankList", "getMyRank", "submitScore"])
        if (typeof sdk[method] !== "function") throw { type: "unsupported" };
      const supported = await bounded(Promise.all([sdk.isSupport("getRankList"), sdk.isSupport("getMyRank"), sdk.isSupport("submitScore")]));
      if (!supported.every(Boolean)) throw { type: "unsupported" };
      return sdk;
    })().catch(error => { apiTask = null; throw error; });
    return apiTask;
  }
  function close() { root = null; viewId++; }
  function showData(data, targetBoard) {
    const list = root.querySelector("[data-rank-content]"), mine = root.querySelector("[data-rank-mine]");
    const selected = C.BOARDS.find(b => b.id === targetBoard);
    mine.hidden = false;
    mine.textContent = data.mineError || (!data.mine ? "连接 B站账号，看看自己排第几。" :
      data.mine.ranked ? `我的排名 #${data.mine.rank} · 最高 ${C.formatScore(targetBoard, data.mine.score)} 连胜回合` : "还没上榜，赢一回合后提交成绩。");
    if (!data.rows.length) list.innerHTML = '<div class="leaderboard-empty"><b>榜上还没人。</b><p>赢一回合后，就能提交成绩。</p></div>';
    else list.innerHTML = `<div class="leaderboard-columns" aria-hidden="true"><span>排名 / 队员</span><span>最高连胜回合</span></div><ol class="leaderboard-list">${data.rows.map(row => `<li${row.rank <= 3 ? ' class="rank-top"' : ""}><span class="rank-number">${row.rank}</span><img data-rank-avatar src="${esc(row.avatar)}" alt="" width="34" height="34" loading="lazy" referrerpolicy="no-referrer"><b class="rank-player-name">${esc(row.nickname)}</b><span class="rank-value">${C.formatScore(targetBoard, row.score)}<small>${selected.unit}</small></span></li>`).join("")}</ol>`;
  }
  async function load() {
    if (!root?.isConnected) return;
    const target = root, id = ++viewId, targetBoard = board, targetPeriod = period;
    const key = `${cacheEpoch}:${board}:${period}:${!!D.profile?.state.connected}`;
    target.querySelector("[data-rank-rule]").textContent = C.BOARDS.find(b => b.id === board).description;
    const content = target.querySelector("[data-rank-content]"), refresh = target.querySelector("[data-rank-refresh]");
    refresh.disabled = true; content.setAttribute("aria-busy", "true");
    content.innerHTML = '<p class="leaderboard-empty">正在读取 B站榜单…</p>';
    target.querySelector("[data-rank-mine]").textContent = "";
    target.querySelector("[data-rank-mine]").hidden = true;
    const alive = () => root === target && target.isConnected && id === viewId;
    try {
      let data = cache.get(key);
      // Manual refresh also observes a shared 30-second cache to avoid rate limits.
      if (data && Date.now() - data.at < 30000) {
        if (alive()) showData(data, targetBoard);
        return;
      }
      if (Date.now() < cooldownUntil) throw { code: 307044, cooldown: true };
      if (!inflight.has(key)) inflight.set(key, (async () => {
        const sdk = await getApi();
        const connected = key.endsWith(":true");
        const result = await Promise.allSettled([
          bounded(sdk.getRankList({ board: targetBoard, period: targetPeriod, limit: 50 })),
          connected ? bounded(sdk.getMyRank({ board: targetBoard, period: targetPeriod })) : Promise.resolve(null),
        ]);
        const mineError = result[1].status === "rejected" ? handleError(result[1].reason) : "";
        if (result[0].status === "rejected") throw result[0].reason;
        if (!Array.isArray(result[0].value)) throw new Error("invalid_rank_list");
        const rows = result[0].value.slice(0, 50).map(r => C.cleanRow(r, targetBoard)).filter(Boolean);
        let mine = result[1].status === "fulfilled" ? result[1].value : null;
        if (mine && (typeof mine.ranked !== "boolean" || (mine.ranked && (!Number.isInteger(mine.rank) || mine.rank < 1 || !C.validScore(targetBoard, mine.score))))) mine = null;
        const value = { rows, mine, mineError, at: Date.now() };
        cache.set(key, value);
        return value;
      })().finally(() => inflight.delete(key)));
      data = await inflight.get(key);
      if (alive()) showData(data, targetBoard);
    } catch (error) {
      const message = handleError(error);
      if (alive()) content.innerHTML = `<div class="leaderboard-empty"><b>${esc(message)}</b><p>战绩仍保存在本机，不影响继续游戏。</p></div>`;
    } finally {
      if (alive()) { refresh.disabled = false; content.setAttribute("aria-busy", "false"); }
    }
  }
  async function submit(event) {
    const item = current, sdk = D.profile?.sdk;
    if (!event.isTrusted || !item || item.busy || item.accepted.size === 1 || !D.profile?.state.connected) return;
    if (Date.now() < cooldownUntil) { item.message = C.errorText({ code: 307044 }); updateSubmission(); return; }
    if (typeof sdk?.submitScore !== "function") { item.message = C.errorText({ type: "unsupported" }); updateSubmission(); return; }
    item.busy = true; item.message = "由 B站确认并保存成绩…"; updateSubmission();
    try {
      for (const score of item.record.scores) {
        if (item.accepted.has(score.board)) continue;
        // First call stays inside the click. SDK owns first-submit consent.
        const result = await bounded(sdk.submitScore({ ...score }), 120000);
        if (!C.validScore(score.board, result?.score) || result.score < score.score) throw new Error("invalid_submit_response");
        item.accepted.add(score.board);
        cacheEpoch++; cache.clear();
      }
      item.message = "已提交至连胜回合榜；B站保留你的历史最好成绩。";
    } catch (error) {
      item.message = handleError(error);
    } finally {
      item.busy = false;
      if (current === item) updateSubmission();
      if (item.accepted.size && root?.isConnected) load();
    }
  }
  document.addEventListener("click", event => {
    if (event.target.closest("[data-rank-refresh]")) load();
    if (event.target.closest("[data-rank-submit]")) submit(event);
  });
  document.addEventListener("error", event => {
    const img = event.target;
    if (img.matches?.("[data-rank-avatar]") && img.getAttribute("src") !== "assets/factions/ct.svg") img.src = "assets/factions/ct.svg";
  }, true);
  window.addEventListener("defuse-profile-change", () => {
    cacheEpoch++; cache.clear(); updateSubmission();
    // A pending private-rank read must settle before a login-expired notification.
    if (root?.isConnected && D.profile.state.connected) load();
  });
  D.rankings = {
    get stats() { return records.stats; },
    homeMarkup, viewMarkup, resultMarkup, close,
    begin() { records.begin(); current = null; },
    abandon() { records.abandon(); },
    surrender() { records.surrender(); current = null; },
    recordResult(round) {
      if (current?.result === round.result) return current.record;
      const record = records.finish(round.result, round.duration);
      current = record ? { record, result: round.result, accepted: new Set(), busy: false, message: "" } : null;
      return record;
    },
    mount() { root = document.querySelector(".leaderboard-screen"); load(); D.profile?.sync(); },
    sync: updateSubmission,
  };
})();
