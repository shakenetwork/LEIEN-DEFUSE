/* A six-second authored opening. The bomb's clock remains owned by Round.
 * This module never chooses a random loss, resets time, or resurrects guards. */
(function (root) {
  const RESCUE_DURATION = 6200;
  class RescueOpening {
    constructor({ now = () => Date.now(), random = Math.random, guardIds = [], defeatedEnemyIds = [], initialHealth = 100 } = {}) {
      if (!Array.isArray(guardIds) || ![3, 4].includes(guardIds.length) ||
          guardIds.some(id => typeof id !== 'string' || !id.trim()) || new Set(guardIds).size !== guardIds.length) {
        throw new TypeError('Rescue requires a real roster of three or four different guards');
      }
      this.now = now;
      this.guardIds = [...guardIds];
      this.previouslyDefeated = this.guardIds.filter(id => Array.isArray(defeatedEnemyIds) && defeatedEnemyIds.includes(id));
      this.liveGuardIds = this.guardIds.filter(id => !this.previouslyDefeated.includes(id));
      const h = Number(initialHealth);
      if (!Number.isFinite(h) || h <= 0) throw new TypeError('A rescue cannot revive an already dead player');
      this.initialHealth = Math.max(1, Math.min(100, Math.floor(h)));
      const r = Number(random());
      const unit = Number.isFinite(r) ? Math.min(1 - Number.EPSILON, Math.max(0, r)) : 0;
      this.finalHealth = Math.min(this.initialHealth, 18 + Math.floor(unit * 11));
      if (!this.liveGuardIds.length) this.finalHealth = this.initialHealth;
      this.duration = RESCUE_DURATION;
      this.startedAt = null;
      this.elapsed = 0;
      this.phase = 'idle';
      this.health = this.initialHealth;
      this.defeatedEnemyIds = [];
    }
    start(at = this.now()) {
      if (!Number.isFinite(at)) throw new TypeError('Rescue start time must be finite');
      if (this.startedAt !== null) return this.snapshot();
      this.startedAt = at;
      this.phase = 'pinched';
      return this.step();
    }
    step() {
      if (this.startedAt === null || this.phase === 'won') return this.snapshot();
      const current = Number(this.now());
      if (Number.isFinite(current)) this.elapsed = Math.min(this.duration, Math.max(this.elapsed, current - this.startedAt, 0));
      const t = this.elapsed;
      if (this.liveGuardIds.length) {
        if (t >= 700) this.health = Math.min(this.initialHealth, Math.max(this.finalHealth, 62));
        if (t >= 2100) this.health = this.finalHealth;
      }
      const kills = t < 3650 ? 0 : Math.min(this.liveGuardIds.length, 1 + Math.floor((t - 3650) / 500));
      this.defeatedEnemyIds = this.liveGuardIds.slice(0, kills);
      this.phase = t >= this.duration ? 'won' : t >= 3650 ? 'clearing' : t >= 3000 ? 'arriving' : t >= 2100 ? 'critical' : 'pinched';
      return this.snapshot();
    }
    snapshot() {
      const remainingGuardIds = this.liveGuardIds.filter(id => !this.defeatedEnemyIds.includes(id));
      return {
        phase: this.phase, startedAt: this.startedAt, elapsed: this.elapsed, duration: this.duration,
        health: this.health, initialHealth: this.initialHealth, damageTaken: this.initialHealth - this.health,
        defeatedEnemyIds: [...this.defeatedEnemyIds], remainingGuardIds,
        targetId: remainingGuardIds[0] || null, killCount: this.defeatedEnemyIds.length,
        supportId: 'ricksaw', hasDefuseKit: true,
      };
    }
  }
  const api = { RescueOpening, RESCUE_DURATION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Defuse = Object.assign(root.Defuse || {}, api);
})(typeof window !== 'undefined' ? window : globalThis);
