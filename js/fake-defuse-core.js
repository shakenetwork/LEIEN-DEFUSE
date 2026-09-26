/* Game-design timings and damage. This is not CS2's weapon damage model. */
(function(root) {
  const cleanIds = ids => [...new Set((Array.isArray(ids) ? ids : []).filter(id => typeof id === "string" && id.length))];
  class FakeDefuse {
    constructor({ now = () => Date.now(), random = Math.random, enemyIds = [], peekDelay = 1100, exposure = null, weapon = "rifle" } = {}) {
      this.now = now; this.random = random;
      this.weapon = weapon === "deagle" ? "deagle" : "rifle";
      this.peekDelay = Number.isFinite(peekDelay) ? Math.max(800, peekDelay) : 1100;
      this.exposure = Number.isFinite(exposure) ? Math.max(this.weapon === "deagle" ? 2400 : 3000, exposure) : this.weapon === "deagle" ? 2400 : 3200;
      this.failures = 0; this.attempts = 0; this.targetId = null;
      this.damage = 0; this.shotsLeft = 2; this.misses = 0;
      this.cancel(enemyIds);
    }
    time() { const at = this.now(); if (!Number.isFinite(at)) throw new TypeError("FakeDefuse clock must be finite"); return at; }
    cancel(enemyIds = this.enemyIds) {
      this.enemyIds = cleanIds(enemyIds);
      if (!this.enemyIds.includes(this.targetId)) this.targetId = this.enemyIds[0] ?? null;
      this.phase = this.targetId ? "ready" : "clear";
      this.reason = null; this.pressedAt = this.peekAt = this.deadline = null;
      this.shotsLeft = 2; this.misses = 0;
      return this.snapshot();
    }
    reconcile(enemyIds) {
      const live = cleanIds(enemyIds);
      if (!live.includes(this.targetId)) return this.cancel(live);
      this.enemyIds = live; return this.snapshot();
    }
    press() {
      if (!["ready", "retry"].includes(this.phase)) return this.snapshot();
      this.pressedAt = this.time();
      const roll = Number(this.random());
      this.damage = 60 + Math.min(30, Math.floor((Number.isFinite(roll) ? Math.min(1,Math.max(0,roll)) : 0) * 31));
      this.phase = "touching"; this.reason = null; this.shotsLeft = 2; this.misses = 0;
      this.attempts++; return this.snapshot();
    }
    release() {
      if (this.phase !== "touching") return this.snapshot();
      this.phase = "armed"; this.peekAt = this.time() + this.peekDelay; this.deadline = this.peekAt + this.exposure;
      return this.snapshot();
    }
    fail(reason) {
      if (!["armed", "exposed"].includes(this.phase)) return;
      this.phase = "retry"; this.reason = reason; this.failures++;
    }
    step() {
      const at = this.time();
      if (this.phase === "armed" || this.phase === "exposed") {
        if (at >= this.deadline) this.fail("late");
        else if (at >= this.peekAt) this.phase = "exposed";
      }
      return this.snapshot();
    }
    shoot(hit) {
      this.step();
      if (!["armed", "exposed"].includes(this.phase)) return this.snapshot();
      this.shotsLeft--;
      if (this.phase === "exposed" && hit === true) this.phase = "won";
      else {
        this.misses++; this.reason = this.phase === "armed" ? "early" : "miss";
        if (this.shotsLeft === 0) this.fail(this.reason);
      }
      return this.snapshot();
    }
    snapshot() {
      const elapsed = this.phase === "exposed" ? Math.max(0,this.time() - this.peekAt) : 0;
      const aimX = elapsed <= 300 ? .5 : .5 + .2 * Math.sin((elapsed - 300) / 700);
      return { phase:this.phase, weapon:this.weapon, targetId:this.targetId, enemyIds:[...this.enemyIds], attempts:this.attempts,
        failures:this.failures, reason:this.reason, pressedAt:this.pressedAt, peekAt:this.peekAt, deadline:this.deadline,
        remaining:this.phase === "exposed" ? Math.max(0,this.deadline-this.time()) : 0,
        damage:this.damage, shotsLeft:this.shotsLeft, misses:this.misses, aimX };
    }
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { FakeDefuse };
  root.Defuse = Object.assign(root.Defuse || {}, { FakeDefuse });
})(typeof globalThis !== "undefined" ? globalThis : this);
