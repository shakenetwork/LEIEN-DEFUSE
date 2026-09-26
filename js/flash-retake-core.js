/* Follow the teammate's flash, then trade the blinded defender.
 * These short timings are game balancing values, not CS2's visibility model. */
(function (root) {
  class FlashRetake {
    constructor({ now = () => Date.now(), random = Math.random, enemyIds = [], supportId = null, exposure = 3000 } = {}) {
      this.exposure = Number.isFinite(exposure) ? Math.max(2400,Math.min(3000,exposure)) : 3000;
      this.now = now;
      this.random = random;
      this.enemyIds = Array.isArray(enemyIds)
        ? [...new Set(enemyIds.filter(id => typeof id === "string" && id.length > 0))]
        : [];
      this.supportId = supportId;
      this.phase = "waiting";
      this.reason = null;
      this.started = false;
      this.flashAt = null;
      this.deadline = null;
      this.targetId = this.enemyIds[0] ?? null;
      this.targetPosition = { x: .5, y: .4 };
      this.remainingGuardIds = [...this.enemyIds];
      this.defeatedEnemyIds = [];
      this.endedAt = null;
      this.shotsRequired = Math.min(2, this.enemyIds.length);
      this.shotsHit = 0;
      this.supportAlive = true;
    }

    unit() {
      const value = Number(this.random());
      return Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0;
    }

    start(at = this.now()) {
      if (!Number.isFinite(at)) throw new TypeError("FlashRetake start time must be finite");
      this.started = true;
      this.startedAt = at;
      this.phase = "waiting";
      this.reason = null;
      this.endedAt = null;
      this.shotsHit = 0;
      this.supportAlive = true;
      this.flashAt = at + 1600 + Math.floor(this.unit() * 601);
      this.deadline = this.flashAt + this.exposure;
      this.targetAt = this.flashAt;
      this.supportDeadline = Infinity;
      this.targetId = this.enemyIds[0] ?? null;
      this.targetPosition = { x: .2 + this.unit() * .6, y: .25 + this.unit() * .35 };
      this.remainingGuardIds = [...this.enemyIds];
      this.defeatedEnemyIds = [];
      // An empty roster is already clear; do not manufacture a replacement T.
      if (this.targetId === null) {
        this.phase = "won";
        this.endedAt = at;
      }
      return this;
    }

    advance(at) {
      if (!this.started || this.phase === "won" || this.phase === "failed") return;
      // The deadline takes priority even if a background tab skips the burst.
      if (at >= this.deadline) {
        this.phase = "failed";
        this.reason = "late";
        this.endedAt = this.deadline;
      } else if (at >= this.targetAt) {
        this.phase = "exposed";
      }
    }

    step() {
      this.advance(this.now());
      return this.snapshot();
    }

    attempt(hit) {
      const at = this.now();
      this.advance(at);
      if (!this.started || this.phase === "won" || this.phase === "failed") return this.snapshot();
      if (this.phase === "trading") return this.snapshot();
      if (this.phase === "waiting") {
        this.phase = "failed";
        this.reason = "early";
      } else if (hit !== true) {
        this.phase = "failed";
        this.reason = "miss";
      } else {
        this.shotsHit++;
        this.defeatedEnemyIds.push(this.targetId);
        this.remainingGuardIds = this.enemyIds.filter(id => !this.defeatedEnemyIds.includes(id));
        if (this.shotsHit < this.shotsRequired) {
          this.phase = "trading";
          this.targetId = this.remainingGuardIds[Math.floor(this.unit() * this.remainingGuardIds.length)];
          // A short recoil/transfer beat ignores repeat taps; the next head
          // appears on the other side and has its own fixed deadline.
          this.targetPosition = { x: this.targetPosition.x < .5 ? .65 + this.unit() * .15 : .2 + this.unit() * .15, y: .25 + this.unit() * .35 };
          this.targetAt = at + 280;
          this.supportDeadline = this.targetAt + 1500;
          this.deadline = this.targetAt + 2200;
        } else {
          this.phase = "won";
          this.supportAlive = at < this.supportDeadline;
          const others = [...this.remainingGuardIds];
          this.remainingGuardIds = others.length && this.supportAlive && this.unit() < .65
            ? [others[Math.floor(this.unit() * others.length)]] : [];
          // The teammate covers the other angles. A slow trade costs the
          // carrier, but the attacker is killed by this player's second shot.
          this.defeatedEnemyIds = this.enemyIds.filter(id => !this.remainingGuardIds.includes(id));
        }
      }
      if (this.phase === "won" || this.phase === "failed") this.endedAt = at;
      return this.snapshot();
    }

    snapshot() {
      const at = this.endedAt ?? this.now();
      return {
        phase: this.phase,
        startedAt: this.startedAt,
        flashAt: this.flashAt,
        deadline: this.deadline,
        remaining: this.started ? Math.max(0, this.deadline - at) : 0,
        reason: this.reason,
        targetId: this.targetId,
        targetAt: this.targetAt,
        shotsRequired: this.shotsRequired,
        shotsHit: this.shotsHit,
        supportAlive: this.supportAlive,
        supportDeadline: this.supportDeadline,
        supportId: this.supportId,
        remainingGuardIds: [...this.remainingGuardIds],
        defeatedEnemyIds: [...this.defeatedEnemyIds],
        targetPosition: { ...this.targetPosition },
      };
    }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { FlashRetake };
  root.Defuse = root.Defuse || {};
  root.Defuse.FlashRetake = FlashRetake;
})(typeof globalThis !== "undefined" ? globalThis : this);
