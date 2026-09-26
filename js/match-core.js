/* Local match progress. This never reads or writes the public streak leaderboard. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else (root.Defuse ||= {}).Match = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const STORAGE_KEY = "leien-match-v1";
  const VERSION = 1, TARGET = 13, RANK_COUNT = 18, MAX_COUNT = 16777215;
  const integer = (n, max) => Number.isSafeInteger(n) && n >= 0 && n <= max;
  const count = n => integer(n, MAX_COUNT) ? n : 0;
  const bump = n => Math.min(MAX_COUNT, n + 1);
  const tokenValid = token => typeof token === "string" && /^round-[a-z0-9-]{6,100}$/.test(token);
  function fresh() {
    return { version: VERSION, ct: 0, t: 0, rankIndex: 0, matchesWon: 0,
      matchesPlayed: 0, serial: 0, completed: false, winner: null,
      activeRoundId: null, surrenderCount: 0, lastOutcome: null };
  }
  function read(storage) {
    const state = fresh();
    try {
      const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || "null");
      if (!saved || saved.version !== VERSION || Array.isArray(saved)) return state;
      state.rankIndex = integer(saved.rankIndex, RANK_COUNT - 1) ? saved.rankIndex : 0;
      state.matchesWon = count(saved.matchesWon);
      state.matchesPlayed = Math.max(state.matchesWon, count(saved.matchesPlayed));
      state.serial = count(saved.serial);
      state.surrenderCount = count(saved.surrenderCount);
      // Never let malformed/incompatible partial state award a win or strand the match.
      if (!integer(saved.ct, TARGET) || !integer(saved.t, TARGET) ||
          (saved.ct === TARGET && saved.t === TARGET)) return state;
      const winner = saved.ct === TARGET ? "ct" : saved.t === TARGET ? "t" : null;
      if (saved.completed !== Boolean(winner) || saved.winner !== winner) return state;
      state.ct = saved.ct; state.t = saved.t;
      state.completed = Boolean(winner); state.winner = winner;
      state.activeRoundId = !state.completed && tokenValid(saved.activeRoundId) ? saved.activeRoundId : null;
    } catch (_) { /* Private browsing and embedded frames may deny storage. */ }
    return state;
  }
  function create(storage) {
    const state = read(storage);
    function save() {
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* The current match still works in memory. */ }
    }
    function reject(reason) {
      return Object.freeze({ accepted: false, reason, matchEnded: false, promoted: false,
        fromRank: state.rankIndex, toRank: state.rankIndex, winner: state.winner,
        ct: state.ct, t: state.t, target: TARGET, surrenderCount: state.surrenderCount,
        penalized: false, demoted: false });
    }
    function canSurrender() {
      // An active first round is a real match; an idle 0:0 lobby is not.
      return !state.completed && Boolean(state.ct || state.t || state.activeRoundId);
    }
    function finishRound(token, success, reason = "result") {
      if (!token || token !== state.activeRoundId || state.completed) return reject("stale-round");
      if (typeof success !== "boolean") return reject("invalid-result");
      const fromRank = state.rankIndex;
      state.activeRoundId = null;
      if (success) state.ct += 1; else state.t += 1;
      state.completed = state.ct === TARGET || state.t === TARGET;
      state.winner = state.completed ? (success ? "ct" : "t") : null;
      if (state.completed) {
        state.matchesPlayed = bump(state.matchesPlayed);
        if (success) {
          state.matchesWon = bump(state.matchesWon);
          state.rankIndex = Math.min(RANK_COUNT - 1, state.rankIndex + 1);
        }
      }
      state.lastOutcome = Object.freeze({ accepted: true, roundId: token, success, reason,
        matchEnded: state.completed, promoted: state.rankIndex > fromRank,
        fromRank, toRank: state.rankIndex, winner: state.winner,
        ct: state.ct, t: state.t, target: TARGET, surrenderCount: state.surrenderCount });
      save();
      return state.lastOutcome;
    }
    function surrenderMatch(token = null) {
      if (state.completed) return reject("match-complete");
      // A delayed confirmation from an old round must not forfeit a later one.
      // Between rounds only a tokenless request belongs to the lobby.
      if (token !== state.activeRoundId) return reject("stale-round");
      if (!canSurrender()) return reject("no-match");
      const fromRank = state.rankIndex;
      state.activeRoundId = null;
      state.ct = 0;
      state.t = 0;
      state.completed = false;
      state.winner = null;
      state.surrenderCount = bump(state.surrenderCount);
      state.matchesPlayed = bump(state.matchesPlayed);
      const penalized = state.surrenderCount > 1;
      if (penalized) state.rankIndex = Math.max(0, state.rankIndex - 1);
      // The reset lobby must not replay the surrendered round's result or promotion.
      state.lastOutcome = null;
      const outcome = Object.freeze({ accepted: true, roundId: token, success: false,
        reason: "surrender", surrendered: true, penalty: penalized ? "rank-down" : "none",
        penalized, demoted: state.rankIndex < fromRank,
        matchEnded: false, promoted: false, fromRank, toRank: state.rankIndex,
        winner: null, ct: 0, t: 0, target: TARGET, surrenderCount: state.surrenderCount });
      save();
      return outcome;
    }
    // Persist the recovered loss immediately, so later reloads cannot count it twice.
    if (state.activeRoundId) finishRound(state.activeRoundId, false, "interrupted");
    return Object.freeze({
      beginRound() {
        // Repeated start input belongs to the same round until it is settled.
        if (state.activeRoundId) return state.activeRoundId;
        if (state.completed) {
          state.ct = 0; state.t = 0; state.completed = false; state.winner = null;
        }
        state.lastOutcome = null;
        state.serial = bump(state.serial);
        state.activeRoundId = "round-" + state.serial.toString(36) + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 12);
        save();
        return state.activeRoundId;
      },
      finishRound(token, success) { return finishRound(token, success); },
      abandonRound(token) { return finishRound(token, false, "abandoned"); },
      surrenderMatch(token) { return surrenderMatch(token); },
      get snapshot() {
        return Object.freeze({ ct: state.ct, t: state.t, target: TARGET,
          rankIndex: state.rankIndex, matchesWon: state.matchesWon,
          matchesPlayed: state.matchesPlayed, matchesLost: state.matchesPlayed - state.matchesWon,
          completed: state.completed, winner: state.winner, activeRoundId: state.activeRoundId,
          surrenderCount: state.surrenderCount, canSurrender: canSurrender(),
          nextSurrenderPenalty: state.surrenderCount > 0 ? 1 : 0,
          lastOutcome: state.lastOutcome ? Object.freeze({ ...state.lastOutcome }) : null });
      },
    });
  }
  return Object.freeze({ STORAGE_KEY, VERSION, TARGET, RANK_COUNT, create });
});
