/* Short encounters share the planted bomb's clock; neither model grants time. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else Object.assign(root.Defuse, api);
})(typeof window === "undefined" ? globalThis : window, function () {
  "use strict";
  const DIRECTIONS = Object.freeze(["door", "tunnel", "window"]);
  const PEEKS = Object.freeze([{ at: 350, end: 2150 }, { at: 2600, end: 4400 }]);
  const id = value => typeof value === "string" && value.length > 0;
  const finite = value => Number.isFinite(value);
  const copy = values => Object.freeze([...values]);
  function validateListenProof(proof) {
    return !!proof && proof.kind === "listen" && proof.state === "won" && id(proof.enemyId) &&
      DIRECTIONS.includes(proof.direction) && finite(proof.startedAt) && finite(proof.finishedAt) &&
      finite(proof.elapsed) && proof.elapsed === proof.finishedAt - proof.startedAt &&
      proof.elapsed >= 1200 && proof.elapsed < 4000 && proof.shotAt === proof.finishedAt;
  }
  class ListenEncounter {
    constructor({ now = () => Date.now(), random = Math.random, enemyId } = {}) {
      this.now = now; this.random = random; this.enemyId = enemyId;
      this.state = "idle"; this.selected = null; this.direction = null;
    }
    start() {
      if (!["idle", "retry"].includes(this.state) || !id(this.enemyId)) return false;
      const raw = Number(this.random());
      this.direction = DIRECTIONS[Math.min(2, Math.max(0, Math.floor((finite(raw) ? raw : 0) * 3)))];
      this.selected = null; this.startedAt = this.now(); this.finishedAt = null;
      this.state = "cue"; return true;
    }
    tick() {
      if (!["cue", "exposed"].includes(this.state)) return this.state;
      const elapsed = this.now() - this.startedAt;
      if (elapsed >= 4000) this.state = "retry";
      else if (elapsed >= 1200) this.state = "exposed";
      return this.state;
    }
    choose(direction) {
      this.tick();
      if (!["cue", "exposed"].includes(this.state) || !DIRECTIONS.includes(direction)) return false;
      this.selected = direction; return true;
    }
    shoot() {
      this.tick();
      if (this.state !== "exposed" || this.selected !== this.direction) return false;
      this.finishedAt = this.now(); this.state = "won"; return true;
    }
    snapshot() {
      this.tick(); const elapsed = this.state === "idle" ? 0 : (this.finishedAt ?? this.now()) - this.startedAt;
      return Object.freeze({ state: this.state, direction: this.direction, selected: this.selected,
        enemyId: this.enemyId, elapsed, remaining: this.state === "cue" ? Math.max(0, 1200 - elapsed) : this.state === "exposed" ? Math.max(0, 4000 - elapsed) : 0 });
    }
    proof() {
      if (this.state !== "won") return null;
      return Object.freeze({ kind: "listen", state: "won", enemyId: this.enemyId, direction: this.direction,
        startedAt: this.startedAt, finishedAt: this.finishedAt, shotAt: this.finishedAt, elapsed: this.finishedAt - this.startedAt });
    }
  }
  function validateTeamCoverAttempt(proof) {
    if (!proof || proof.kind !== "team-cover" || !["running", "retreated", "won"].includes(proof.state) ||
        !id(proof.teammateId) || !Array.isArray(proof.enemyIds) || proof.enemyIds.length !== 2 ||
        !proof.enemyIds.every(id) || new Set(proof.enemyIds).size !== 2 ||
        !finite(proof.startedAt) || !finite(proof.elapsed) || proof.elapsed < 0 ||
        !finite(proof.finishedAt) || proof.finishedAt - proof.startedAt !== proof.elapsed ||
        !Array.isArray(proof.hits) || proof.hits.length > 2 ||
        !Array.isArray(proof.defeatedEnemyIds) || proof.defeatedEnemyIds.length !== proof.hits.length) return false;
    return proof.hits.every((hit, index) => hit?.peekIndex === index && hit.enemyId === proof.enemyIds[index] &&
      proof.defeatedEnemyIds[index] === hit.enemyId && finite(hit.at) &&
      hit.at - proof.startedAt >= PEEKS[index].at && hit.at - proof.startedAt < PEEKS[index].end && hit.at <= proof.finishedAt);
  }
  function validateTeamCoverProof(proof) {
    return validateTeamCoverAttempt(proof) && proof.state === "won" && proof.elapsed >= 5000 && proof.hits.length === 2;
  }
  class TeamCoverEncounter {
    constructor({ now = () => Date.now(), enemyIds = [], teammateId, startedAt } = {}) {
      this.now = now; this.enemyIds = [...enemyIds]; this.teammateId = teammateId;
      this.initialStartedAt = startedAt; this.state = "idle"; this.hits = []; this.reason = "";
    }
    start() {
      if (this.state !== "idle" || !id(this.teammateId) || this.enemyIds.length !== 2 || !this.enemyIds.every(id) || new Set(this.enemyIds).size !== 2) return false;
      this.startedAt = finite(this.initialStartedAt) ? this.initialStartedAt : this.now();
      if (this.startedAt > this.now()) return false;
      this.state = "running"; this.tick(); return true;
    }
    tick() {
      if (this.state !== "running") return this.state;
      const elapsed = this.now() - this.startedAt;
      for (let i = 0; i < 2; i++) {
        if (elapsed >= PEEKS[i].end && !this.hits[i]) { this.retreat("missed"); return this.state; }
      }
      if (elapsed >= 5000 && this.hits.length === 2) { this.state = "won"; this.finishedAt = this.now(); }
      return this.state;
    }
    shoot(enemyId) {
      this.tick(); if (this.state !== "running") return false;
      const index = this.hits.length, elapsed = this.now() - this.startedAt, peek = PEEKS[index];
      if (!peek || enemyId !== this.enemyIds[index] || elapsed < peek.at || elapsed >= peek.end) return false;
      this.hits.push(Object.freeze({ enemyId, peekIndex: index, at: this.now() })); return true;
    }
    retreat(reason = "interrupted") {
      if (this.state !== "running") return false;
      this.finishedAt = this.now(); this.state = "retreated"; this.reason = String(reason); return true;
    }
    snapshot() {
      this.tick(); const elapsed = this.state === "idle" ? 0 : (this.finishedAt ?? this.now()) - this.startedAt;
      const index = this.hits.length, slot = PEEKS[index];
      const visible = this.state === "running" && slot && elapsed >= slot.at && elapsed < slot.end;
      const peek = visible ? Object.freeze({ enemyId: this.enemyIds[index], index, opensAt: this.startedAt + slot.at, closesAt: this.startedAt + slot.end }) : null;
      return Object.freeze({ state: this.state, teammateId: this.teammateId, enemyId: peek?.enemyId || null,
        peekIndex: visible ? index : -1, peek, enemyIds: copy(this.enemyIds), defeatedEnemyIds: copy(this.hits.map(hit => hit.enemyId)),
        progress: Math.max(0, Math.min(1, elapsed / 5000)), remaining: Math.max(0, 5000 - elapsed), elapsed, reason: this.reason });
    }
    proof() {
      this.tick(); if (this.state === "idle") return null;
      const finishedAt = this.finishedAt ?? this.now();
      return Object.freeze({ kind: "team-cover", state: this.state, teammateId: this.teammateId,
        enemyIds: copy(this.enemyIds), defeatedEnemyIds: copy(this.hits.map(hit => hit.enemyId)), hits: copy(this.hits),
        startedAt: this.startedAt, finishedAt, elapsed: finishedAt - this.startedAt, reason: this.reason });
    }
  }
  return { ListenEncounter, TeamCoverEncounter, validateListenProof, validateTeamCoverProof, validateTeamCoverAttempt };
});
