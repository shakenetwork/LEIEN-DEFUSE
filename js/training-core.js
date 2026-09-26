/* Training owns only this preference. No match, rank or leaderboard writes. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Defuse.Training = api;
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const KEY = "leien-training-v1";
  const STEPS = Object.freeze(["clock", "wires", "password", "danger", "hold"]);
  function create(storage) {
    let record = null;
    try { record = JSON.parse(storage?.getItem(KEY) || "null"); } catch {}
    if (record?.version !== 1 || !["learning", "completed", "skipped"].includes(record.status)) record = null;
    let status = record?.status || "new";
    let index = Number.isInteger(record?.index) ? Math.max(0, Math.min(STEPS.length - 1, record.index)) : 0;
    let solved = false;
    const save = () => { try { storage?.setItem(KEY, JSON.stringify({ version: 1, status, index })); } catch {} };
    return {
      get required() { return !["completed", "skipped"].includes(status); },
      get status() { return status; },
      get index() { return index; },
      get step() { return STEPS[index]; },
      get solved() { return solved; },
      start(replay = false) {
        if (replay || status !== "learning") index = 0;
        status = "learning"; solved = false; save();
        return STEPS[index];
      },
      solve(step) {
        if (status !== "learning" || step !== STEPS[index] || solved) return false;
        solved = true; return true;
      },
      next() {
        if (status !== "learning" || !solved) return null;
        solved = false;
        if (index === STEPS.length - 1) { status = "completed"; save(); return "done"; }
        index++; save(); return STEPS[index];
      },
      skip() { status = "skipped"; solved = false; save(); },
    };
  }
  return { KEY, STEPS, create };
});
