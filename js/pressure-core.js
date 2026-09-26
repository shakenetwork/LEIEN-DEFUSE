/* Deterministic combat pressure. Rendering owns the presentation; this file owns
 * timing, damage and the small defensive actions used by the round UI. */
(function (root) {
  class Pressure {
    constructor(
      round,
      {
        now = () => Date.now(),
        random = Math.random,
        bodyguardAvailable = true,
        bodyguardName = null,
        onBodyguard = null,
        guardIds = null,
        tacticalEvents = false,
      } = {},
    ) {
      this.round = round;
      this.now = now;
      this.random = random;
      this.bodyguardAvailable = bodyguardAvailable;
      this.bodyguardName = bodyguardName;
      this.onBodyguard = typeof onBodyguard === "function" ? onBodyguard : null;
      // A round may provide its surviving T roster. Keep legacy consumers
      // without a roster unchanged; never invent another copy of a dead T.
      this.guardIds = Array.isArray(guardIds) ? [...new Set(guardIds)] : null;
      this.round.defeatedEnemyIds = Array.isArray(round.defeatedEnemyIds) ? [...new Set(round.defeatedEnemyIds)] : [];
      this.event = null;
      this.lastEnd = -Infinity;
      this.lastTick = this.now();
      this.shotRounds = 0;
      this.pending = [];
      this.entryWhiffPending = round.variation === "entry-whiff";
      this.nextKind = this.entryWhiffPending ? "shots" : this.pickKind();
      this.setSchedule(this.lastTick, true);
      this.smokeSearch = false;
      this.recoveryUntil = 0;
      this.quietUntil = round.entryCleared ? round.retakeQuietUntil : 0;
      this.hasWarned = false;
      this.tacticalEvents = tacticalEvents;
      this.tacticRolled = false;
      this.tacticAttempts = 0;
      this.lastTactic = null;
    }

    pickKind() {
      const roll = this.random();
      if (roll < 0.25) return "shots";
      if (roll < 0.5) return "flash";
      if (roll < 0.75) return "fire";
      return "grenade";
    }

    get guardsCleared() {
      return this.guardIds !== null && this.guardIds.every(id => this.round.defeatedEnemyIds.includes(id));
    }

    currentGuardId() {
      return this.guardIds?.find(id => !this.round.defeatedEnemyIds.includes(id)) ?? null;
    }

    setSchedule(now, first = false) {
      if (this.guardsCleared) {
        this.nextAt = Infinity;
        this.graceUntil = now;
        return;
      }
      const clearedEntry = this.round.entryCleared;
      // Read the first task before the first warning. Later warnings leave
      // enough room for a five-second defuse plus repositioning on a phone.
      const base = first ? this.entryWhiffPending ? 1800 : 2400 : Math.max(this.round.defuseDuration + 1200, 6500 - (this.round.difficulty?.level || 0) * 250) + this.random() * 1000;
      const coverUntil = Math.max(clearedEntry ? this.round.retakeQuietUntil : 0, this.round.fakeQuietUntil || 0);
      this.nextAt = Math.max(now + base, coverUntil, this.lastEnd + (first ? 0 : 1500));
      this.graceUntil = Math.max(coverUntil, first ? now + base : now);
    }

    reset() {
      // Compatibility hook for the old UI. A reset never erases shot rounds,
      // smoke inventory, an active threat or its already scheduled successor.
      this.lastTick = this.now();
      return this;
    }

    activeRound() {
      // Pointer/keyboard actions may arrive before the next animation frame.
      // The bomb deadline must still win over every combat action.
      this.round.tick();
      return this.round.state === "playing" || this.round.state === "transition";
    }

    holdStarted() {
      // Starting the correct action never brings a threat forward.
      // Keep the compatibility hook for hold controls.
    }

    isBlocking(moduleId) {
      if (this.round.teamplayActive || moduleId === 'listen') return false;
      const now = this.now();
      if (this.smokeSearch) return true;
      if (this.recoveryUntil > now) return true;
      const e = this.event;
      if (!e) return false;
      if (e.kind === "double-flash" && !e.resolved) return true;
      if (e.duel && !e.duel.resolved) return true;
      if (e.kind === "fire" && !e.smokeConfirmed && now < e.endAt) return true;
      // Password input must yield even during the warning phase. An evaded
      // threat may leave a result banner, but the normal recovery timer wins.
      if (moduleId === "password" && !e.evaded && !e.resolved) return true;
      return false;
    }

    canDuel() {
      if (!this.activeRound()) return false;
      const e = this.event,
        now = this.now();
      return Boolean(
        ["playing", "transition"].includes(this.round.state) &&
        e &&
          e.kind === "shots" &&
          !e.pairedGrenade &&
          !e.resolved &&
          !e.evaded &&
          !e.duel &&
          now < e.impactAt,
      );
    }

    beginDuel() {
      if (!this.canDuel()) return false;
      const e = this.event,
        now = this.now();
      e.duel = {
        x: 0.15 + this.random() * 0.7,
        y: 0.15 + this.random() * 0.7,
        deadline: now + 1000,
        resolved: false,
      };
      e.impactAt = e.duel.deadline;
      e.endAt = Math.max(e.endAt, e.duel.deadline + 1800);
      return true;
    }

    shoot(hit) {
      if (!this.activeRound()) return false;
      const e = this.event,
        now = this.now();
      if (!["playing", "transition"].includes(this.round.state) || !e || !e.duel || e.duel.resolved) return false;
      if (!hit || now >= e.duel.deadline) {
        e.duel.resolved = true;
        e.resolved = true;
        this.kill(now >= e.duel.deadline ? "对枪超时：没能先手命中。" : "对枪点空：被守包敌人击杀。");
        this.pending.push({ type: "duel-loss", direction: e.direction });
        return false;
      }
      e.duel.resolved = true;
      e.duel = null;
      e.resolved = true;
      e.evaded = true;
      this.round.duels = (this.round.duels || 0) + 1;
      if (e.opponentId && !this.round.defeatedEnemyIds.includes(e.opponentId))
        this.round.defeatedEnemyIds.push(e.opponentId);
      this.quietUntil = now + 6500;
      this.recoveryUntil = now + 450;
      this.pending.push({ type: "duel-win", direction: e.direction, opponentId: e.opponentId, guardsCleared: this.guardsCleared });
      e.endAt = now + 450;
      return true;
    }

    evade() {
      if (!this.activeRound()) return false;
      const e = this.event,
        now = this.now();
      if (!e || e.evaded || e.resolved || e.duel || e.smoked) return false;
      if (e.kind === "double-flash") {
        if (e.stageDodged || e.stageResolved || now >= e.impactAt) return false;
        e.stageDodged = true;
        e.dodged++;
        this.round.dodges = (this.round.dodges || 0) + 1;
        this.pending.push({ type: "dodge", kind: "flash", direction: e.direction });
        return true;
      }
      if (e.kind === "fire" && now >= e.impactAt) this.resolveFire(e, now);
      if (!this.activeRound()) return false;
      if (e.kind === "fire" && e.ignited) {
        if (now >= e.fireDeadline) return false;
        e.evaded = true;
        e.ran = true;
        this.recoveryUntil = now + 600;
        this.round.dodges = (this.round.dodges || 0) + 1;
        this.pending.push({ type: "fire-run", direction: e.direction });
        return true;
      }
      if (now >= e.impactAt || now >= e.endAt) return false;
      e.evaded = true;
      this.round.dodges = (this.round.dodges || 0) + 1;
      this.recoveryUntil = now + 600;
      if (e.kind === "fire") {
        // Running avoids the instant burn, but the molotov still blocks the
        // site until its flames die or a smoke is thrown.
        this.round.fireBlocked = true;
        this.pending.push({ type: "fire-run", direction: e.direction });
      } else {
        this.pending.push({ type: "dodge", kind: e.kind, direction: e.direction });
        if (e.kind === "flank") {
          this.quietUntil = Math.max(this.quietUntil, now + this.round.defuseDuration + 1200);
          e.endAt = now + 800;
        }
      }
      return true;
    }

    smoke() {
      if (!this.activeRound()) return false;
      const e = this.event,
        now = this.now();
      if (!["playing", "transition"].includes(this.round.state) || !e || e.kind !== "fire" || e.smoked || e.smokeConfirmed || !this.round.smokes || now >= e.endAt)
        return false;
      // Resolve any elapsed burn window before consuming the smoke. Otherwise
      // a late input after a suspended frame can extinguish already-lethal fire.
      if (now >= e.impactAt) this.resolveFire(e, now);
      if (!this.activeRound()) return false;
      this.round.smokes--;
      e.smoked = true;
      this.smokeSearch = true;
      // The smoke puts the flames out immediately. The short locate step is
      // still blocking so the module cannot resume half-way through deploying it.
      this.round.fireBlocked = false;
      this.pending.push({ type: "smoked", direction: e.direction, searching: true });
      return true;
    }

    confirmSmoke() {
      if (!this.activeRound()) return false;
      const e = this.event;
      if (!["playing", "transition"].includes(this.round.state) || !this.smokeSearch || !e || e.kind !== "fire" || !e.smoked) return false;
      this.smokeSearch = false;
      e.smokeConfirmed = true;
      e.evaded = true;
      e.resolved = true;
      e.endAt = this.now() + 350;
      this.round.fireBlocked = false;
      this.round.smokeCoverUntil = this.now() + 6500;
      this.quietUntil = Math.max(this.quietUntil, this.round.smokeCoverUntil);
      this.recoveryUntil = this.now();
      this.pending.push({ type: "smoke-confirmed", until: this.round.smokeCoverUntil });
      return true;
    }

    warn(kind, now) {
      if (this.guardsCleared || this.round.teamplayActive || ["fake", "suppression", "listen"].includes(this.round.moduleId)) return null;
      const entryWhiff = this.entryWhiffPending;
      if (entryWhiff) { kind = "shots"; this.entryWhiffPending = false; }
      const directions = ["B 洞", "B 门", "狗洞"];
      const direction = directions[Math.floor(this.random() * directions.length)];
      const e = {
        kind,
        opponentId: this.currentGuardId(),
        direction,
        warnedAt: now,
        impactAt: now + (entryWhiff ? 2200 : 1200),
        endAt: now + (kind === "fire" ? 8200 : kind === "flash" ? 3400 : kind === "grenade" ? 2200 : entryWhiff ? 4000 : 3000),
        evaded: false,
        resolved: false,
        hits: 0,
        detonated: false,
        ignited: false,
        smokeConfirmed: false,
        pairedGrenade: false,
      };
      if (kind === "shots") {
        this.shotRounds++;
        // An occasional HE lands with the first burst, making a successful
        // bodyguard trade survivable but critical.
        e.pairedGrenade = !entryWhiff && this.shotRounds === 1 && this.random() < 0.08;
      }
      if (kind === "fire") this.round.fireBlocked = true;
      this.event = e;
      this.hasWarned = true;
      this.pending.push({ type: "warning", ...e });
      return e;
    }

    // Replace one scheduled threat, never stack another deadline on top of it.
    // The UI opts in; older deterministic consumers keep their original rolls.
    tryTactic(now) {
      const work = { password: 6500, wires: 3500, tools: 2000, circuit: 5500,
        smoke: (this.round.difficulty?.smokePreview || 1500) + (this.round.difficulty?.smokeTargets || 1) * 600 + 500,
        hold: this.round.defuseDuration + 500 };
      const reserve = this.round.queue.slice(this.round.index).reduce((ms, id) => ms + (work[id] || 6000) + 650, 0);
      if (this.entryWhiffPending || !this.tacticalEvents || this.tacticAttempts >= (this.round.difficulty?.tacticalBudget || 1) || this.event || this.guardsCleared ||
          this.round.state !== "playing" || this.round.teamplayActive || ["fake", "entry", "rescue", "suppression", "listen"].includes(this.round.moduleId) ||
          now < this.quietUntil || now < this.nextAt ||
          this.round.deadline - now < Math.max(this.round.defuseDuration + 9000, reserve + 6500)) return false;
      this.tacticRolled = true;
      this.tacticAttempts++;
      const roll = this.random();
      if (roll >= Math.min(.60, .36 + (this.round.difficulty?.level || 0) * .08)) return false;
      let kind = roll < .20 ? "flank" : roll < .36 ? "reload" : "double-flash";
      if (kind === this.lastTactic && (this.round.difficulty?.level || 0) >= 2) kind = kind === "double-flash" ? "reload" : "double-flash";
      this.lastTactic = kind;
      const e = { kind, opponentId: this.currentGuardId(), direction: "B 洞", warnedAt: now,
        impactAt: now + 3000, endAt: now + 4100, evaded: false, resolved: false };
      if (kind === "reload") {
        // Pulling back, reloading and reacquiring the angle creates this whole
        // opening. This is not a claim that a CS2 weapon reload takes 8–12 s.
        e.endAt = now + (this.round.hasDefuseKit === false ? 12000 : 8000);
        e.impactAt = now;
        e.resolved = true;
        this.quietUntil = e.endAt;
      }
      if (kind === "double-flash") {
        Object.assign(e, { stage: 1, dodged: 0, stageDodged: false, stageResolved: false,
          impactAt: now + 1800, endAt: Infinity, nextStageAt: Infinity });
      }
      this.event = e;
      this.pending.push({ type: kind === "reload" ? "opening" : "warning", ...e });
      return true;
    }

    resolveDoubleFlash(e, now) {
      if (e.resolved) return;
      if (!e.stageResolved && now >= e.impactAt) {
        e.stageResolved = true;
        if (!e.stageDodged) {
          this.round.flashes = (this.round.flashes || 0) + 1;
          this.pending.push({ type: "flash", until: now + 1100, direction: e.direction });
        } else this.pending.push({ type: "flash-dodged", until: now + 150, direction: e.direction });
        if (e.stage === 1) e.nextStageAt = now + (e.stageDodged ? 500 : 1400);
        else {
          e.resolved = true;
          e.evaded = e.dodged === 2;
          e.endAt = now + (e.stageDodged ? 450 : 1100);
          this.recoveryUntil = e.endAt;
          // Even a missed flash costs visibility/time, never an invented kill.
          // A correct response always leaves a full uninterrupted kit window.
          this.quietUntil = Math.max(this.quietUntil, e.endAt + this.round.defuseDuration + 1200);
        }
      }
      if (e.stage === 1 && e.stageResolved && now >= e.nextStageAt) {
        Object.assign(e, { stage: 2, stageDodged: false, stageResolved: false,
          warnedAt: now, impactAt: now + 1800, nextStageAt: Infinity });
        // A delayed frame starts the next visible warning now, not in the past.
        this.pending.push({ type: "warning", ...e });
      }
    }

    resolveFlank(e, now) {
      if (e.evaded || e.resolved) return;
      e.resolved = true;
      const healthLoss = 60 - Math.min(this.round.armor, 20);
      if (this.round.health <= healthLoss) {
        this.round.deathDetail = "绕后交火：没有及时收身，被 B 洞敌人击杀。";
        this.round.deathKillerId = e.opponentId;
      }
      const damage = this.round.takeDamage(60);
      this.recoveryUntil = now + 600;
      this.quietUntil = now + this.round.defuseDuration + 1200;
      e.endAt = now + 800;
      this.pending.push({ type: "hit", kind: "flank", direction: e.direction, ...damage });
    }

    markBodyguard(e) {
      const teammate = this.bodyguardName;
      this.bodyguardAvailable = false;
      this.round.allyBlocks = (this.round.allyBlocks || 0) + 1;
      if (teammate && Array.isArray(this.round.deadTeammates) && !this.round.deadTeammates.includes(teammate))
        this.round.deadTeammates.push(teammate);
      if (this.onBodyguard) this.onBodyguard(teammate || "CT队友");
      const armorLoss = Math.min(this.round.armor, Math.floor(66 / 3));
      if (this.round.health - (66 - armorLoss) <= 0)
        this.round.deathDetail = "交火命中：队友没能挡住全部子弹。";
      const damage = this.round.takeDamage(66);
      e.bodyguard = true;
      this.pending.push({ type: "bodyguard", teammate: teammate || "CT队友", direction: e.direction, ...damage });
      this.pending.push({ type: "hit", kind: "shots", bodyguard: true, direction: e.direction, ...damage });
      return damage;
    }

    kill(detail) {
      if (!this.activeRound()) return null;
      this.round.deathDetail = detail;
      return this.round.takeDamage(9999, { bypassArmor: true });
    }

    resolveShots(e) {
      if (e.resolved || e.evaded || e.duel) return;
      e.resolved = true;
      if (this.shotRounds === 1 && this.bodyguardAvailable) {
        this.markBodyguard(e);
        e.hits = 1;
        if (e.pairedGrenade && this.round.state !== "ended") {
          this.round.grenades = (this.round.grenades || 0) + 1;
          const armorLoss = Math.min(this.round.armor, Math.floor(66 / 3));
          if (this.round.health - (66 - armorLoss) <= 0)
            this.round.deathDetail = "交火与手雷同时命中。";
          const damage = this.round.takeDamage(66);
          this.pending.push({ type: "grenade", paired: true, direction: e.direction, ...damage });
          this.pending.push({ type: "hit", kind: "grenade", paired: true, direction: e.direction, ...damage });
        }
        return;
      }
      const damage = this.kill(this.shotRounds > 1 ? "第二轮起的交火：未躲枪，强拆被击杀。" : "无人掩护：未躲枪，强拆被击杀。");
      this.pending.push({ type: "hit", fatal: true, direction: e.direction, ...damage });
    }

    resolveGrenade(e) {
      if (e.resolved || e.evaded) return;
      e.resolved = true;
      this.round.grenades = (this.round.grenades || 0) + 1;
      const armorLoss = Math.min(this.round.armor, Math.floor(84 / 3));
      if (this.round.health - (84 - armorLoss) <= 0)
        this.round.deathDetail = "高爆手雷命中：没有及时躲开。";
      const damage = this.round.takeDamage(84);
      this.pending.push({ type: "grenade", direction: e.direction, ...damage });
      this.pending.push({ type: "hit", kind: "grenade", direction: e.direction, ...damage });
    }

    resolveFire(e, now) {
      if (this.round.state === "ended" || e.resolved || e.evaded || e.smokeConfirmed || e.smoked) return;
      if (!e.ignited) {
        e.ignited = true;
        // Ramp 1..8 HP at 0.2 s intervals, then 40 HP/s. From 100 HP
        // uninterrupted exposure is lethal at 3.0 s; armor never absorbs fire.
        e.fireDeadline = e.impactAt + 3000;
        e.nextBurnAt = e.impactAt;
        e.burnTicks = 0;
        this.round.fireBlocked = true;
        this.round.fires = (this.round.fires || 0) + 1;
        this.pending.push({ type: "fire", direction: e.direction });
      }
      while (now >= e.nextBurnAt && !e.resolved) {
        const amount = Math.min(8, ++e.burnTicks);
        e.nextBurnAt += 200;
        if (this.round.health <= amount) this.round.deathDetail = "燃烧弹持续灼烧：没有及时跑出火区。";
        const damage = this.round.takeDamage(amount, { bypassArmor: true });
        this.pending.push({ type: "hit", kind: "fire", direction: e.direction, ...damage });
        if (this.round.state === "ended") {
          e.resolved = true;
          this.pending.push({ type: "fire-kill", direction: e.direction, fatal: true, ...damage });
          return;
        }
      }
    }

    resolveFlash(e) {
      if (e.detonated || e.evaded) return;
      e.detonated = true;
      this.round.flashes = (this.round.flashes || 0) + 1;
      this.pending.push({ type: "flash", until: e.endAt, direction: e.direction });
    }

    drain() {
      const out = this.pending;
      this.pending = [];
      return out;
    }

    tick() {
      const now = this.now();
      const out = this.drain();
      this.round.tick();
      if (this.round.state === "ended") {
        this.lastTick = now;
        return out;
      }
      // Fake defuse owns the visible engagement. Do not queue hidden utility
      // or fire a long-overdue warning when the next puzzle appears.
      if (this.round.teamplayActive || ["fake", "suppression", "listen"].includes(this.round.moduleId)) {
        this.fakeActive = true;
        this.lastTick = now;
        return out;
      }
      if (this.fakeActive) {
        this.fakeActive = false;
        this.quietUntil = Math.max(this.quietUntil, this.round.fakeQuietUntil || 0);
        this.setSchedule(now, false);
      }
      // A suspended browser tab must not replay every missed bullet. Resolve
      // the current threat once at its present deadline, then continue.
      this.lastTick = now;
      if (!this.event && !this.guardsCleared && now >= this.nextAt && now >= this.quietUntil) {
        if (!this.tryTactic(now)) {
          const kind = this.nextKind;
          this.nextKind = this.pickKind();
          this.warn(kind, now);
        }
      }
      const e = this.event;
      if (!e) return out;
      if (e.duel && !e.duel.resolved && now >= e.duel.deadline) this.shoot(false);
      if (e.kind === "shots" && now >= e.impactAt) this.resolveShots(e);
      else if (e.kind === "grenade" && now >= e.impactAt) this.resolveGrenade(e);
      else if (e.kind === "fire" && now >= e.impactAt) this.resolveFire(e, now);
      else if (e.kind === "flash" && now >= e.impactAt) this.resolveFlash(e);
      else if (e.kind === "flank" && now >= e.impactAt) this.resolveFlank(e, now);
      else if (e.kind === "double-flash") this.resolveDoubleFlash(e, now);
      if (e.kind === "fire" && e.smokeConfirmed) this.round.fireBlocked = false;
      if (now >= e.endAt && !this.smokeSearch) {
        if (e.kind === "fire") this.round.fireBlocked = false;
        out.push(...this.drain());
        out.push({ type: "clear", kind: e.kind, evaded: e.evaded, smoked: e.smokeConfirmed });
        this.event = null;
        this.smokeSearch = false;
        this.lastEnd = now;
        if (this.round.state !== "ended") {
          // The second gunfight is the advertised strong push. Utility still
          // appears between later fights, but the first and second shot rounds
          // are deterministic so a missed second dodge is always lethal.
          if ((e.kind === "shots" && this.shotRounds === 1) ||
              (e.kind !== "shots" && this.shotRounds === 0))
            this.nextKind = "shots";
          this.setSchedule(now, false);
          if (e.kind === "reload") this.nextAt = now;
        }
      }
      out.push(...this.drain());
      return out;
    }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { Pressure };
  root.Defuse = root.Defuse || {};
  root.Defuse.Pressure = Pressure;
})(typeof window !== "undefined" ? window : globalThis);
