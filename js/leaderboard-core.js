/* Toy stores each player's highest absolute integer score. Never submit deltas.
 * Board numbers are a persistent public schema: do not reuse them for new rules. */
(function (root, factory) {
  const rush = typeof module === "object" && module.exports ? require("./rush-defense-core.js") : root.Defuse;
  const crossfire = typeof module === "object" && module.exports ? require("./crossfire-core.js") : root.Defuse;
  const teamplay = typeof module === "object" && module.exports ? require("./teamplay-core.js") : root.Defuse;
  const api = factory(rush, crossfire, teamplay);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Defuse.Leaderboard = api;
})(typeof window === "undefined" ? globalThis : window, function (rush, crossfire, teamplay) {
  "use strict";
  const STORAGE_KEY = "leien-records-v1";
  const BOARDS = Object.freeze([
    { id: 1, title: "连胜回合榜", unit: "回合", description: "连续赢下的回合数，拆包与守点胜利都计入。失败、退出未完回合或刷新会断连胜；历史最高保留，整场比分与段位不参与排名。" },
  ]);
  const count = n => Number.isSafeInteger(n) && n >= 0 ? Math.min(n, 16777215) : 0;
  function validScore(board, score) {
    return board === 1 && Number.isInteger(score) && score >= 1 && score <= 16777215;
  }
  function formatScore(board, score) {
    if (!validScore(board, score)) return "—";
    return String(score);
  }
  function cleanRow(row, board) {
    if (!row || !Number.isInteger(row.rank) || row.rank < 1 || !validScore(board, row.score)) return null;
    const nickname = typeof row.nickname === "string" ? Array.from(row.nickname.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, "").trim()).slice(0, 40).join("") : "";
    let avatar = "assets/factions/ct.svg";
    try {
      const url = new URL(row.avatar?.startsWith("//") ? "https:" + row.avatar : row.avatar);
      if (url.protocol === "https:" && !url.username && !url.password && !url.port &&
        (url.hostname === "hdslb.com" || url.hostname.endsWith(".hdslb.com"))) avatar = url.href;
    } catch (_) { /* Keep the local fallback. */ }
    return { rank: row.rank, score: row.score, nickname: nickname || "回防队员", avatar };
  }
  function validRescue(result, ids, duration) {
    return result.rescueCleared === true &&
      result.supportId === "ricksaw" &&
      result.hasDefuseKit === true &&
      result.rescueElapsed >= 6200 &&
      Number.isFinite(result.rescueElapsed) &&
      result.rescueElapsed <= duration - result.remaining &&
      result.health <= 28 &&
      ids[0] === "rescue" &&
      ["circuit", "wires"].includes(ids[1]) &&
      ids[2] === "hold" &&
      Array.isArray(result.enemyGuardIds) &&
      [3,4].includes(result.enemyGuardIds.length) &&
      new Set(result.enemyGuardIds).size === result.enemyGuardIds.length &&
      result.rescueKills === result.enemyGuardIds.length &&
      Array.isArray(result.defeatedEnemyIds) &&
      result.defeatedEnemyIds.length === result.enemyGuardIds.length &&
      result.enemyGuardIds.every(id => result.defeatedEnemyIds.includes(id));
  }
  function validTeamplay(result, ids, duration) {
    const elapsed = duration - result.remaining;
    const guards = result.enemyGuardIds || [], defeated = result.defeatedEnemyIds || [];
    if (!Array.isArray(guards) || !Array.isArray(defeated)) return false;
    if (ids.includes("listen")) {
      const proof = result.listenProof;
      if (result.opening !== "direct" || result.variation !== "standard" || ids[0] !== "listen" ||
          ids.slice(1, -1).some(id => !["password", "wires", "tools", "smoke", "circuit"].includes(id)) ||
          !teamplay.validateListenProof(proof) || proof.elapsed > elapsed ||
          !guards.includes(proof.enemyId) || !defeated.includes(proof.enemyId)) return false;
    } else if (result.listenProof != null) return false;
    const covered = result.coverProof;
    const attempt = result.coverAttempt;
    if (attempt || covered || result.coverAttempted) {
      if (result.coverAttempted !== true || !teamplay.validateTeamCoverAttempt(attempt) ||
          attempt.elapsed > elapsed || result.opening !== "direct" || result.variation !== "standard" ||
          ids.some(id => ["fake", "suppression"].includes(id)) ||
          !Array.isArray(result.onsiteTeammateIds) || !result.onsiteTeammateIds.includes(attempt.teammateId) ||
          !["lead", "goggles", "rookie", "coconut", "ricksaw"].includes(attempt.teammateId) ||
          !Array.isArray(result.teammateKits) || !result.teammateKits.includes(attempt.teammateId) ||
          !Array.isArray(result.deadTeammates) || result.deadTeammates.includes(attempt.teammateId) ||
          !attempt.enemyIds.every(id => guards.includes(id)) ||
          !attempt.defeatedEnemyIds.every(id => defeated.includes(id)) ||
          (result.listenProof && attempt.enemyIds.includes(result.listenProof.enemyId))) return false;
      if (covered) {
        if (!teamplay.validateTeamCoverProof(covered) || covered.elapsed > elapsed ||
            result.defuserId !== covered.teammateId || JSON.stringify(attempt) !== JSON.stringify(covered)) return false;
      } else if (attempt.state === "won") return false;
    }
    return covered ? true : result.defuserId == null || result.defuserId === "player";
  }
  function createRecords(storage) {
    let totals = { wins: 0, bestStreak: 0 }, streak = 0, active = false, last = null;
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
      if (saved) totals = { wins: count(saved.wins), bestStreak: count(saved.bestStreak) };
    } catch (_) { /* Storage is optional in private browsing and Toy frames. */ }
    const save = () => { try { storage?.setItem(STORAGE_KEY, JSON.stringify(totals)); } catch (_) {} };
    return {
      begin() { if (active) streak = 0; active = true; last = null; },
      abandon() { if (active) streak = 0; active = false; },
      surrender() { streak = 0; active = false; last = null; },
      finish(result, duration = 40000) {
        if (!active) return last;
        active = false;
        const ids = result?.completed;
        const defused = result?.success === true && result.reason === "complete" && duration === 40000 &&
          Number.isFinite(result.remaining) && result.remaining > 0 && result.remaining < duration &&
          Number.isFinite(result.health) && result.health > 0 && result.health <= 100 && Number.isInteger(result.errors) && result.errors >= 0 && result.errors < 3 &&
          ["direct", "flash", "rescue"].includes(result.opening) && validTaskSequence(result) &&
          (result.opening === "rescue" ? validRescue(result, ids, duration) : result.opening === "flash" ? result.entryCleared && ids[0] === "entry" && ids.at(-1) === "hold" && ["tools", "wires"].includes(ids[1]) : ids.every(id => ["password", "hold", "wires", "tools", "smoke", "circuit", "fake", "suppression", "listen"].includes(id)) && (!ids.includes("fake") || (result.fakeCleared === true && ids[0] === "fake" && ids.at(-1) === "hold" && ids.slice(1,-1).every(id => ["circuit", "tools", "wires"].includes(id)) && Array.isArray(result.enemyGuardIds) && Array.isArray(result.defeatedEnemyIds) && (result.fakeTargetId === null ? result.enemyGuardIds.every(id => result.defeatedEnemyIds.includes(id)) : result.enemyGuardIds.includes(result.fakeTargetId) && result.defeatedEnemyIds.includes(result.fakeTargetId)))));
        const suppressionValid = !ids?.includes('suppression') || (ids[0] === 'suppression' && ids.at(-1) === 'hold' && ids.slice(1,-1).every(id => ['wires','circuit','tools'].includes(id)) && crossfire.validCrossfireProof(result.suppression) && result.suppression.elapsed <= duration-result.remaining);
        const complete = (defused && suppressionValid && validTeamplay(result, ids, duration)) || rush?.validRushDefenseResult?.(result) === true;
        if (!complete) { streak = 0; last = null; return null; }
        streak = count(streak + 1);
        totals.wins = count(totals.wins + 1);
        totals.bestStreak = Math.max(totals.bestStreak, streak);
        save();
        // One absolute streak score for either opening. Retired speed boards
        // 2 and 3 are never read, written, or reused for a different rule.
        last = Object.freeze({ streak,
          scores: Object.freeze([Object.freeze({ board: 1, score: streak })]) });
        return last;
      },
      get stats() { return { ...totals, streak }; },
      get last() { return last; },
    };
  }
  function validTaskSequence(result) {
    const ids = result.completed;
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length) return false;
    // Keep previous V0.5 result consumers compatible, but a new four-step
    // round cannot be scored after only three steps or reordered completions.
    if (result.rulesVersion == null) return ids.length === 3;
    const count = result.opening === "rescue" ? 3 : 4;
    return result.rulesVersion === 2 && result.moduleCount === count && ids.length === count &&
      Array.isArray(result.plannedModules) && result.plannedModules.length === count &&
      ids.every((id, i) => id === result.plannedModules[i]) && ids.at(-1) === "hold" &&
      (result.opening !== "flash" || ids[2] === "smoke");
  }
  function errorText(error) {
    if (error?.code === 307044) return "B站请求较多，请稍后再试。";
    switch (error?.type) {
      case "not_logged_in": return "请先在 B站登录，再回来连接账号。";
      case "user_denied": return "你取消了授权，成绩未提交；可以继续玩。";
      case "unsupported": return "请在 B站 Toy 页面或 B站 App 内打开排行榜。";
      case "timeout": return "连接超时，尚未确认结果；稍后重试同一成绩即可。";
      default: return "暂时连不上 B站，请稍后重试。";
    }
  }
  return { BOARDS, STORAGE_KEY, createRecords, formatScore, validScore, cleanRow, errorText };
});
