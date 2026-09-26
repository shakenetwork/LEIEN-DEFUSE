/* Authored pre-plant encounter. Milliseconds and damage below are toy balancing
 * values, not claims about CS2 weapon damage or flash duration. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else Object.assign(root.Defuse ||= {}, api);
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const RUSH_DEFENSE_RULES = Object.freeze({
    opening: 700, firstFlash: 1500, laterFlash: 1350, recovery: 250,
    weak: 1800, transition: 280, teamfall: 900, firstBoss: 2200,
    relocation: 350, secondBoss: 1900, shotCooldown: 250, assistDamage: 20, encounter: 1300,
  });
  const RULE = RUSH_DEFENSE_RULES;
  const WEAK_IDS = Object.freeze(["planter", "opponent", "rebel", "sallie", "daryl", "solman", "vypa"]);
  const CT_IDS = Object.freeze(["lead", "goggles", "rookie", "coconut", "ricksaw"]);
  const LIVE_PHASES = new Set(["flash", "weak", "boss"]);
  const terminal = phase => phase === "won" || phase === "failed";
  const unit = random => { const n = Number(random()); return Number.isFinite(n) ? Math.min(1 - Number.EPSILON, Math.max(0, n)) : 0; };
  const finite = n => Number.isFinite(n) && n >= 0;
  const distinct = (values, count) => Array.isArray(values) && values.length === count && new Set(values).size === count;
  const copy = value => JSON.parse(JSON.stringify(value));
  const freezeDeep = value => {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      for (const child of Object.values(value)) freezeDeep(child);
      Object.freeze(value);
    }
    return value;
  };
  class RushDefense {
    constructor({ now = () => typeof performance !== "undefined" ? performance.now() : Date.now(), random = Math.random,
      enemyIds = ["romanov", "planter", "opponent"], ctIds = ["lead", "goggles", "coconut"], health = 100, encounter = false, openingEnemyId, level = 0 } = {}) {
      if (!distinct(enemyIds, 3) || enemyIds[0] !== "romanov" || !enemyIds.slice(1).every(id => WEAK_IDS.includes(id))) throw new TypeError("RushDefense needs Romanov and two distinct normal T agents");
      if (!distinct(ctIds, 3) || !ctIds.every(id => CT_IDS.includes(id))) throw new TypeError("RushDefense needs three distinct on-site CT teammates");
      if (typeof encounter !== "boolean" || encounter !== ctIds.includes("ricksaw")) throw new TypeError("RushDefense encounter must match the Ricksaw roster");
      if (!Number.isInteger(health) || health < 1 || health > 100) throw new TypeError("RushDefense health must be 1..100");
      this.level = Number.isFinite(level) ? Math.max(0,Math.min(3,level)) : 0;
      this.now = now; this.random = random; this.enemyIds = [...enemyIds]; this.ctIds = [...ctIds];
      this.openingEnemyId = openingEnemyId ?? WEAK_IDS.find(id => !enemyIds.includes(id));
      if (!WEAK_IDS.includes(this.openingEnemyId) || enemyIds.includes(this.openingEnemyId)) throw new TypeError("RushDefense opening enemy must be a distinct normal T");
      this.health = this.startingHealth = health;
      this.phase = "idle"; this.phaseToken = 0; this.phaseStartedAt = null; this.deadline = null;
      this.phaseDuration = 0; this.awaitingDisplay = false; this.startedAt = null;
      this.endedAt = null; this.lastAt = 0; this.pauseAt = null; this.pausedTotal = 0;
      this.flashCount = 0; this.flashIndex = 0; this.flashSlot = -1; this.targetSlot = -1;
      this.flashesDodged = 0; this.weakCleared = 0; this.bossHits = 0; this.teamfallKills = 0;
      this.shotsFired = 0; this.shotsMissed = 0; this.lastShotAt = -Infinity;
      this.openingKill = false; this.reason = null; this.defeatedEnemyIds = [];
      this.deadTeammates = []; this.flashes = []; this.weak = []; this.boss = [];
      this.teamFallStartedAt = null; this.teamFellAt = null; this.finished = null;
      this.encounter = encounter; this.encounterWinner = null; this.encounterStartedAt = null; this.encounterEndedAt = null;
    }
    time(at = this.now()) {
      if (!finite(at)) throw new TypeError("RushDefense time must be a finite nonnegative number");
      return Math.max(this.lastAt, at);
    }
    elapsedAt(at) {
      if (this.startedAt === null) return 0;
      return Math.max(0, (this.endedAt ?? this.pauseAt ?? at) - this.startedAt - this.pausedTotal);
    }
    slotExcept(previous) {
      const slots = [0, 1, 2].filter(slot => slot !== previous);
      return slots[Math.floor(unit(this.random) * slots.length)];
    }
    enter(phase, at, duration = 0) {
      this.phase = phase; this.phaseToken++;
      this.phaseDuration = duration;
      this.awaitingDisplay = LIVE_PHASES.has(phase);
      this.phaseStartedAt = this.awaitingDisplay ? null : at;
      this.deadline = this.awaitingDisplay || terminal(phase) ? null : at + duration;
      this.lastAt = at;
    }
    start(at = this.now()) {
      if (this.phase !== "idle") return this.snapshot();
      at = this.time(at); this.startedAt = at;
      this.flashCount = this.level >= 2 ? 4 : unit(this.random) < .5 ? 3 : 4;
      this.enter("opening", at, RULE.opening);
      return this.snapshot();
    }
    nextFlash(at) {
      this.flashIndex++;
      this.flashSlot = this.slotExcept(this.flashSlot);
      this.enter("flash", at, this.flashIndex === 1 ? RULE.firstFlash : RULE.laterFlash);
    }
    nextBoss(at) {
      this.targetSlot = this.slotExcept(this.targetSlot);
      this.enter("boss", at, this.bossHits ? RULE.secondBoss : RULE.firstBoss);
    }
    finalDuel(at) {
      if (this.encounter && this.encounterWinner === null) {
        this.encounterStartedAt = this.elapsedAt(at);
        this.enter("encounter", at, RULE.encounter);
      } else this.nextBoss(at);
    }
    acknowledge(token, at = this.now()) {
      if (token !== this.phaseToken || !this.awaitingDisplay || this.pauseAt !== null || terminal(this.phase)) return this.snapshot();
      at = this.time(at); this.lastAt = at;
      this.awaitingDisplay = false; this.phaseStartedAt = at; this.deadline = at + this.phaseDuration;
      return this.snapshot();
    }
    advance(at = this.now()) {
      at = this.time(at);
      if (this.phase === "idle" || this.pauseAt !== null || terminal(this.phase)) return this.snapshot();
      this.lastAt = at;
      if (this.phase === "teamfall") {
        const ordinary = this.ctIds.filter(id => id !== "ricksaw");
        this.teamfallKills = Math.min(ordinary.length, Math.floor((at - this.phaseStartedAt) / (RULE.teamfall / ordinary.length)));
        this.deadTeammates = ordinary.slice(0, this.teamfallKills);
      }
      if (this.awaitingDisplay || at < this.deadline) return this.snapshot();
      // At most one new phase per rendered update: a stalled frame cannot
      // consume a reaction window which the player has never seen.
      switch (this.phase) {
        case "opening": this.openingKill = true; this.nextFlash(at); break;
        case "flash": this.fail("flash-missed", at); break;
        case "flash-recover":
          if (this.flashIndex <= 2) {
            this.targetSlot = this.slotExcept(this.targetSlot);
            this.enter("weak", at, RULE.weak);
          } else if (this.flashIndex === 3) {
            this.teamFallStartedAt = this.elapsedAt(at);
            this.enter("teamfall", at, RULE.teamfall);
          } else this.finalDuel(at);
          break;
        case "weak": this.clearWeak(false, at, "timeout"); break;
        case "transition": this.nextFlash(at); break;
        case "teamfall":
          this.deadTeammates = this.ctIds.filter(id => id !== "ricksaw"); this.teamfallKills = this.deadTeammates.length; this.teamFellAt = this.elapsedAt(at);
          if (this.flashCount === 4) this.nextFlash(at); else this.finalDuel(at);
          break;
        case "encounter":
          this.encounterWinner = unit(this.random) < .5 ? "ricksaw" : "romanov";
          this.encounterEndedAt = this.elapsedAt(at);
          if (this.encounterWinner === "ricksaw") { this.defeatedEnemyIds.push("romanov"); this.finish(true, at); }
          else { this.deadTeammates.push("ricksaw"); this.teamfallKills = this.deadTeammates.length; this.nextBoss(at); }
          break;
        case "boss": this.fail("boss-timeout", at); break;
        case "boss-relocate": this.nextBoss(at); break;
      }
      return this.snapshot();
    }
    step() { return this.advance(); }
    canAct(token, at) {
      this.advance(at);
      return token === this.phaseToken && !this.awaitingDisplay && this.pauseAt === null && !terminal(this.phase);
    }
    backflash(token, at = this.now()) {
      at = this.time(at);
      if (!this.canAct(token, at) || this.phase !== "flash") return this.snapshot();
      this.flashes.push({ index: this.flashIndex, slot: this.flashSlot, appearedAt: this.elapsedAt(this.phaseStartedAt), answeredAt: this.elapsedAt(at) });
      this.flashesDodged++;
      this.enter("flash-recover", at, RULE.recovery);
      return this.snapshot();
    }
    clearWeak(hit, at, why) {
      const id = this.enemyIds[this.weakCleared + 1];
      this.weak.push({ id, method: hit ? "player" : "teammate", reason: hit ? "hit" : why,
        appearedAt: this.elapsedAt(this.phaseStartedAt), clearedAt: this.elapsedAt(at), damage: hit ? 0 : Math.min(RULE.assistDamage, this.health - 1) });
      if (!hit) this.health = Math.max(1, this.health - RULE.assistDamage);
      this.defeatedEnemyIds.push(id); this.weakCleared++;
      this.enter("transition", at, RULE.transition);
    }
    shoot({ hit, phaseToken } = {}, at = this.now()) {
      at = this.time(at);
      if (typeof hit !== "boolean" || !this.canAct(phaseToken, at) || !["weak", "boss"].includes(this.phase) || at - this.lastShotAt < RULE.shotCooldown) return this.snapshot();
      this.lastShotAt = at; this.shotsFired++;
      if (!hit) this.shotsMissed++;
      if (this.phase === "weak") this.clearWeak(hit, at, "miss");
      else if (hit) {
        this.boss.push({ slot: this.targetSlot, appearedAt: this.elapsedAt(this.phaseStartedAt), hitAt: this.elapsedAt(at) });
        this.bossHits++;
        if (this.bossHits === 2) {
          this.defeatedEnemyIds.push("romanov"); this.finish(true, at);
        } else this.enter("boss-relocate", at, RULE.relocation);
      }
      return this.snapshot();
    }
    pause(at = this.now()) {
      at = this.time(at);
      if (this.pauseAt !== null || this.phase === "idle" || terminal(this.phase)) return this.snapshot();
      this.advance(at);
      if (!terminal(this.phase)) this.pauseAt = at;
      return this.snapshot();
    }
    resume(at = this.now()) {
      at = this.time(at);
      if (this.pauseAt === null) return this.snapshot();
      const gap = at - this.pauseAt;
      this.pausedTotal += gap;
      if (this.phaseStartedAt !== null) this.phaseStartedAt += gap;
      if (this.deadline !== null) this.deadline += gap;
      if (Number.isFinite(this.lastShotAt)) this.lastShotAt += gap;
      this.pauseAt = null; this.lastAt = at;
      return this.snapshot();
    }
    fail(reason, at) {
      this.reason = reason; this.health = 0;
      if (reason === "flash-missed") { this.deadTeammates = [...this.ctIds]; this.teamfallKills = 3; }
      this.finish(false, at);
    }
    finish(success, at) {
      if (terminal(this.phase)) return;
      this.endedAt = at;
      this.enter(success ? "won" : "failed", at);
      const elapsed = this.elapsedAt(at), deathCause = success ? null : this.reason === "flash-missed" ? "rush-flash" : "rush-boss";
      this.finished = freezeDeep({
        success, reason: success ? "prevented-plant" : "eliminated", opening: "rush-defense", bombPlanted: false,
        module: "rush-defense", remaining: 0, elapsed, health: this.health, armor: 100,
        errors: 0, completed: [], hasDefuseKit: false, supportId: this.ctIds[0],
        enemyGuardIds: [...this.enemyIds], defeatedEnemyIds: [...this.defeatedEnemyIds], deadTeammates: [...this.deadTeammates],
        deathCause, deathKillerId: success ? null : "romanov", deathCompanionId: null,
        deathDetail: success ? null : this.reason === "flash-missed" ? "没能及时背闪，罗曼诺夫趁你失去视野击倒了回防队伍。" : "补枪窗口结束，罗曼诺夫先开了这一枪。",
        flashesDodged: this.flashesDodged, flashCount: this.flashCount, weakCleared: this.weakCleared, bossHits: this.bossHits,
        rushEncounter: this.encounter, encounterWinner: this.encounterWinner, rushOpeningEnemyId: this.openingEnemyId,
        shotsFired: this.shotsFired, shotsMissed: this.shotsMissed,
        hitsTaken: this.weak.filter(item => item.method === "teammate").length + (success ? 0 : 1),
        dodges: 0, flashes: this.flashesDodged, smokes: 0, allyBlocks: 0, duels: this.weakCleared + (success ? 1 : 0), grenades: 0, fires: 0,
        rushProof: { version: 2, openingKill: this.openingKill, openingEnemyId: this.openingEnemyId, startingHealth: this.startingHealth, ctIds: [...this.ctIds],
          flashCount: this.flashCount, flashes: copy(this.flashes), weak: copy(this.weak), boss: copy(this.boss),
          encounter: this.encounter, encounterWinner: this.encounterWinner, encounterStartedAt: this.encounterStartedAt, encounterEndedAt: this.encounterEndedAt,
          teamFallStartedAt: this.teamFallStartedAt, teamFellAt: this.teamFellAt, finishedAt: elapsed },
      });
    }
    result() { return this.finished; }
    snapshot() {
      let at;
      try { at = this.time(); } catch (_) { at = this.lastAt; }
      at = this.endedAt ?? this.pauseAt ?? at;
      const phaseElapsed = this.phaseStartedAt === null ? 0 : Math.max(0, at - this.phaseStartedAt);
      const targetId = this.phase === "weak" ? this.enemyIds[this.weakCleared + 1] : ["boss", "boss-relocate"].includes(this.phase) ? "romanov" : null;
      return {
        phase: this.phase, phaseToken: this.phaseToken, phaseStartedAt: this.phaseStartedAt,
        phaseDuration: this.phaseDuration, phaseElapsed, awaitingDisplay: this.awaitingDisplay,
        deadline: this.deadline, remaining: this.awaitingDisplay ? this.phaseDuration : this.deadline === null ? 0 : Math.max(0, this.deadline - at),
        now: at, startedAt: this.startedAt, elapsed: this.elapsedAt(at), paused: this.pauseAt !== null,
        flashIndex: this.flashIndex, flashCount: this.flashCount, flashSlot: this.flashSlot, flashesDodged: this.flashesDodged,
        targetId, targetSlot: this.targetSlot, bossHits: this.bossHits, weakCleared: this.weakCleared,
        teamfallKills: this.teamfallKills, ctAlive: this.health > 0 ? 4 - this.teamfallKills : 0,
        tAlive: 4 - (this.openingKill ? 1 : 0) - this.defeatedEnemyIds.length,
        enemyIds: [...this.enemyIds], defeatedEnemyIds: [...this.defeatedEnemyIds], deadTeammates: [...this.deadTeammates],
        health: this.health, startingHealth: this.startingHealth, openingKill: this.openingKill,
        shotsFired: this.shotsFired, shotsMissed: this.shotsMissed, reason: this.reason,
        encounter: this.encounter, encounterWinner: this.encounterWinner, openingEnemyId: this.openingEnemyId,
      };
    }
  }
  function validRushDefenseResult(result) {
    if (!result || result.success !== true || result.reason !== "prevented-plant" || result.opening !== "rush-defense" || result.bombPlanted !== false || result.module !== "rush-defense" || result.remaining !== 0 || !Array.isArray(result.completed) || result.completed.length !== 0 || result.errors !== 0 || !Number.isInteger(result.health) || result.health < 1 || result.health > 100 || !finite(result.elapsed)) return false;
    const p = result.rushProof, guards = result.enemyGuardIds;
    if (!p || p.version !== 2 || p.openingKill !== true || ![3, 4].includes(p.flashCount) || result.flashCount !== p.flashCount || result.flashesDodged !== p.flashCount || result.weakCleared !== 2 || !Number.isInteger(p.startingHealth) || p.startingHealth < 1 || p.startingHealth > 100 || !distinct(p.ctIds, 3) || !p.ctIds.every(id => CT_IDS.includes(id)) || !distinct(guards, 3) || guards[0] !== "romanov" || !guards.slice(1).every(id => WEAK_IDS.includes(id)) || !distinct(result.defeatedEnemyIds, 3) || !guards.every(id => result.defeatedEnemyIds.includes(id))) return false;
    if (typeof p.encounter !== "boolean" || p.encounter !== p.ctIds.includes("ricksaw") || p.encounter !== result.rushEncounter || result.encounterWinner !== p.encounterWinner) return false;
    if (!WEAK_IDS.includes(p.openingEnemyId) || guards.includes(p.openingEnemyId) || result.rushOpeningEnemyId !== p.openingEnemyId) return false;
    const allyWon = p.encounter && p.encounterWinner === "ricksaw", bossHitCount = allyWon ? 0 : 2;
    const expectedDead = p.ctIds.filter(id => !allyWon || id !== "ricksaw");
    if (!distinct(result.deadTeammates, expectedDead.length) || !expectedDead.every(id => result.deadTeammates.includes(id)) || result.bossHits !== bossHitCount) return false;
    if (!Array.isArray(p.flashes) || p.flashes.length !== p.flashCount || !Array.isArray(p.weak) || p.weak.length !== 2 || !Array.isArray(p.boss) || p.boss.length !== bossHitCount || p.finishedAt !== result.elapsed || !finite(p.teamFallStartedAt) || !finite(p.teamFellAt)) return false;
    const slot = n => Number.isInteger(n) && n >= 0 && n < 3;
    const window = (appeared, resolved, duration) => finite(appeared) && finite(resolved) && resolved >= appeared && resolved - appeared < duration;
    for (let i = 0; i < p.flashes.length; i++) {
      const f = p.flashes[i];
      if (!f || f.index !== i + 1 || !slot(f.slot) || (i && f.slot === p.flashes[i - 1].slot) || !window(f.appearedAt, f.answeredAt, i ? RULE.laterFlash : RULE.firstFlash)) return false;
      if (i === 0 && f.appearedAt < RULE.opening) return false;
      if (i > 0 && f.appearedAt < p.flashes[i - 1].answeredAt + RULE.recovery) return false;
    }
    let health = p.startingHealth;
    for (let i = 0; i < 2; i++) {
      const w = p.weak[i];
      if (!w || w.id !== guards[i + 1] || !["player", "teammate"].includes(w.method) || !finite(w.appearedAt) || !finite(w.clearedAt) || w.appearedAt < p.flashes[i].answeredAt + RULE.recovery || w.clearedAt < w.appearedAt || p.flashes[i + 1].appearedAt < w.clearedAt + RULE.transition) return false;
      if (w.method === "player") {
        if (w.reason !== "hit" || w.damage !== 0 || w.clearedAt - w.appearedAt >= RULE.weak) return false;
      } else {
        if (!["miss", "timeout"].includes(w.reason) || w.damage !== Math.min(RULE.assistDamage, health - 1) || (w.reason === "timeout" ? w.clearedAt - w.appearedAt < RULE.weak : w.clearedAt - w.appearedAt >= RULE.weak)) return false;
        health = Math.max(1, health - RULE.assistDamage);
      }
    }
    if (result.health !== health || p.teamFallStartedAt < p.flashes[2].answeredAt + RULE.recovery || p.teamFellAt < p.teamFallStartedAt + RULE.teamfall || (p.flashCount === 4 && p.flashes[3].appearedAt < p.teamFellAt)) return false;
    let bossReady = p.flashCount === 4 ? p.flashes[3].answeredAt + RULE.recovery : p.teamFellAt;
    if (p.encounter) {
      if (!["ricksaw", "romanov"].includes(p.encounterWinner) || !finite(p.encounterStartedAt) || !finite(p.encounterEndedAt) || p.encounterStartedAt < bossReady || p.encounterEndedAt < p.encounterStartedAt + RULE.encounter) return false;
      bossReady = p.encounterEndedAt;
    } else if (p.encounterWinner !== null || p.encounterStartedAt !== null || p.encounterEndedAt !== null) return false;
    if (allyWon) { if (p.finishedAt !== p.encounterEndedAt) return false; }
    else {
      const first = p.boss[0], second = p.boss[1];
      if (!first || !second || !slot(first.slot) || !slot(second.slot) || first.slot === second.slot || !window(first.appearedAt, first.hitAt, RULE.firstBoss) || !window(second.appearedAt, second.hitAt, RULE.secondBoss) || first.appearedAt < bossReady || second.appearedAt < first.hitAt + RULE.relocation || p.finishedAt !== second.hitAt) return false;
    }
    const hits = p.weak.filter(w => w.method === "player").length + bossHitCount;
    if (!Number.isInteger(result.shotsFired) || result.shotsFired < hits || !Number.isInteger(result.shotsMissed) || result.shotsMissed < 0 || result.shotsFired - result.shotsMissed !== hits) return false;
    return true;
  }
  return { RushDefense, RUSH_DEFENSE_RULES, validRushDefenseResult };
});
