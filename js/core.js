/* Pure state machine; the same file is exercised in Node tests. */
(function (root) {
  const MODULE_IDS = ["password", "hold", "wires", "tools", "smoke", "circuit", "fake", "suppression", "listen"];
  const DIRECT_MODULE_IDS = MODULE_IDS.filter(id => !["fake", "suppression", "listen"].includes(id));
  const ONSITE_IDS = ["lead", "goggles", "rookie", "coconut", "ricksaw"];
  const teamplayApi = () => typeof module === "object" && module.exports ? require("./teamplay-core.js") : root.Defuse;
  function freezeTeamProof(proof) {
    return Object.freeze({ ...proof, ...(proof.enemyIds ? { enemyIds: Object.freeze([...proof.enemyIds]) } : {}),
      ...(proof.defeatedEnemyIds ? { defeatedEnemyIds: Object.freeze([...proof.defeatedEnemyIds]) } : {}),
      ...(proof.hits ? { hits: Object.freeze(proof.hits.map(hit => Object.freeze({ ...hit }))) } : {}) });
  }
  function shuffle(items, random = Math.random) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  // A round owns the exposed positions; UI refreshes and threats never reroll them.
  function makePasswordReveal(random = Math.random) {
    const count = Math.min(7, Math.max(0, Math.floor(random() * 8)));
    const positions = shuffle([0, 1, 2, 3, 4, 5, 6], random).slice(0, count);
    return Object.freeze(Array.from({ length: 7 }, (_, i) => positions.includes(i)));
  }
  function passwordGuidance(round) {
    const initial = round?.passwordReveal?.filter(Boolean).length || 0;
    const count = Math.min(7, initial + Math.floor(Math.max(0, round?.passwordWipeMs || 0) * 7 / 2400 + 1e-9));
    if (count === 7) return "七位都看得清，照着输就行。有枪先躲，别贪。";
    if (!count) return "纸条全蒙住了。先按住擦灰，看清再输；盲猜错了直接炸。";
    return `露出 ${count} 位了，剩下 ${7 - count} 位还蒙着灰。按住擦清再输，别把残字当答案。`;
  }
  function streakDifficulty(streak = 0) {
    const value = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
    const level = value >= 13 ? 3 : value >= 8 ? 2 : value >= 4 ? 1 : 0;
    return Object.freeze({ streak: value, level, label: ['常规回合','对手加压','高压残局','极限交锋'][level],
      smokeTargets: level >= 3 ? 3 : level >= 2 ? 2 : 1,
      smokePreview: level >= 3 ? 2600 : level >= 2 ? 1900 : 1500,
      tacticalBudget: level >= 2 ? 2 : 1,
      fakeExposure: Math.max(3000,3200-level*80), flashExposure: 3000-level*200 });
  }
  class Round {
    constructor({
      now = () => Date.now(),
      random = Math.random,
      duration = 40000,
      maxErrors = 3,
    } = {}) {
      this.now = now;
      this.random = random;
      this.duration = duration;
      this.maxErrors = maxErrors;
      this.state = "idle";
      this.queue = [];
      this.index = 0;
      this.errors = 0;
      this.remaining = duration;
      this.completed = [];
      this.result = null;
      this.lastErrorAt = -Infinity;
    }
    start({ plantedAt = this.now(), enemyGuardIds = null, appearedEnemyIds = null, planterId = null, supportId = null, deadTeammates = [], opening = "direct", variation = "standard", streak = 0, listenEncounter = false, teammateKits = [], onsiteTeammateIds = null } = {}) {
      this.difficulty = streakDifficulty(streak);
      this.suppression = null;
      this.opening = ["flash", "rescue"].includes(opening) ? opening : "direct";
      this.variation = this.opening === "direct" && ["entry-whiff", "deagle", "suppression"].includes(variation) ? variation : "standard";
      const retakeModules = ["tools", "wires", "hold"];
      this.queue = this.opening === "rescue"
        ? ["rescue", shuffle(["circuit", "wires"], this.random)[0], "hold"]
        : this.opening === "flash"
        ? ["entry", shuffle(retakeModules.slice(0, 2), this.random)[0], "smoke", "hold"]
        : Array.isArray(enemyGuardIds) && enemyGuardIds.length && (this.variation === "deagle" || this.variation !== "entry-whiff" && this.random() < 0.34)
          ? ["fake", ...shuffle(["circuit", "tools", "wires"], this.random).slice(0, 2), "hold"]
          : [...shuffle(DIRECT_MODULE_IDS.filter(id => id !== "hold"), this.random).slice(0, 3), "hold"];
      // Combat-heavy openings use two short puzzles; the authored rescue keeps
      // three tasks. No queue can randomly omit the final five/ten-second defuse.
      if (this.variation === 'suppression') this.queue = ['suppression', ...shuffle(['wires','circuit','tools'], this.random).slice(0, 2), 'hold'];
      // The application rolls the encounter once. This replaces a puzzle; it
      // cannot add a fifth task or overwrite an authored combat opening.
      if (listenEncounter === true && this.opening === "direct" && this.variation === "standard" &&
          !this.queue.includes("fake") && Array.isArray(enemyGuardIds) && enemyGuardIds.length)
        this.queue = ["listen", ...this.queue.slice(0, 2), "hold"];
      this.listenProof = null;
      this.coverProof = null;
      this.coverAttempt = null;
      this.coverAttempted = false;
      this.teamplayActive = false;
      this.teamCoverStartedAt = null;
      this.teamCoverEnemyIds = [];
      this.teamCoverTeammateId = null;
      this.defuserId = "player";
      const defaultSquad = ["lead", "goggles", supportId === "ricksaw" ? "ricksaw" : "rookie", "coconut"];
      this.onsiteTeammateIds = [...new Set(Array.isArray(onsiteTeammateIds) ? onsiteTeammateIds : defaultSquad)].filter(id => ONSITE_IDS.includes(id));
      this.teammateKits = [...new Set(Array.isArray(teammateKits) ? teammateKits : [])].filter(id => this.onsiteTeammateIds.includes(id));
      this.fakeCleared = false;
      this.fakeTargetId = null;
      this.fakeQuietUntil = 0;
      this.entryCleared = false;
      this.rescueCleared = false;
      this.rescueKills = 0;
      this.rescueElapsed = 0;
      this.hasDefuseKit = this.opening === "direct";
      this.retakeQuietUntil = 0;
      this.index = 0;
      this.errors = 0;
      this.completed = [];
      this.health = 100;
      this.armor = 100;
      this.hitsTaken = 0;
      this.dodges = 0;
      this.flashes = 0;
      this.smokes = 1;
      this.allyBlocks = 0;
      this.duels = 0;
      this.grenades = 0;
      this.fires = 0;
      this.smokeCoverUntil = 0;
      this.fireBlocked = false;
      this.deathDetail = "";
      this.deathCause = "";
      this.deathKillerId = null;
      this.deathCompanionId = null;
      this.deathHealthBefore = null;
      this.supportId = supportId;
      this.deadTeammates = Array.isArray(deadTeammates) ? [...new Set(deadTeammates)] : [];
      this.enemyGuardIds = Array.isArray(enemyGuardIds) ? [...new Set(enemyGuardIds)] : null;
      this.appearedEnemyIds = [...new Set([...(appearedEnemyIds || enemyGuardIds || []), ...(planterId ? [planterId] : [])])];
      this.planterId = planterId || this.appearedEnemyIds[0] || null;
      this.defeatedEnemyIds = [];
      this.lastMistakeSafe = false;
      // A fresh seven-digit note every round; keypad guesses are still valid.
      const previousCode = this.passwordCode;
      this.passwordCode = String(1000000 + Math.floor(this.random() * 9000000));
      if (this.passwordCode === previousCode)
        this.passwordCode = String(1000000 + ((Number(this.passwordCode) - 999999) % 9000000));
      this.passwordReveal = makePasswordReveal(this.random);
      if (this.difficulty.level) { let count=0; const cap=7-this.difficulty.level; this.passwordReveal=Object.freeze(this.passwordReveal.map(v=>v && ++count<=cap)); }
      this.passwordWipeMs = 0;
      this.passwordMemo = null;
      this.wireRule = null;
      this.wireOrder = null;
      this.remaining = this.duration;
      this.deadline = plantedAt + this.duration;
      this.plantedAt = plantedAt;
      this.state = "playing";
      this.result = null;
      this.lastErrorAt = -Infinity;
      this.tick();
      return this;
    }
    get moduleId() {
      return this.queue[this.index];
    }
    get defuseDuration() { return this.hasDefuseKit ? 5000 : 10000; }
    completeListen(proof) {
      this.tick();
      if (this.state !== "playing" || this.moduleId !== "listen" || this.listenProof ||
          !teamplayApi().validateListenProof(proof) || proof.startedAt < this.plantedAt ||
          proof.finishedAt > this.now() || !this.enemyGuardIds?.includes(proof.enemyId) ||
          this.defeatedEnemyIds.includes(proof.enemyId)) return false;
      this.listenProof = freezeTeamProof(proof);
      this.defeatedEnemyIds.push(proof.enemyId); this.duels++;
      return this.complete("listen");
    }
    beginTeamCover(teammateId) {
      this.tick();
      const alive = this.enemyGuardIds?.filter(id => !this.defeatedEnemyIds.includes(id)) || [];
      if (this.state !== "playing" || this.moduleId !== "hold" || this.opening !== "direct" ||
          this.variation !== "standard" || this.queue.some(id => ["fake", "suppression"].includes(id)) ||
          this.remaining < 16000 || this.coverAttempted || alive.length < 2 ||
          !this.onsiteTeammateIds.includes(teammateId) || !this.teammateKits.includes(teammateId) ||
          this.deadTeammates.includes(teammateId)) return false;
      this.coverAttempted = true; this.teamplayActive = true;
      this.teamCoverStartedAt = this.now(); this.teamCoverEnemyIds = alive.slice(0, 2);
      this.teamCoverTeammateId = teammateId;
      return true;
    }
    validTeamCoverAttempt(proof) {
      return this.state === "playing" && this.moduleId === "hold" && this.teamplayActive &&
        teamplayApi().validateTeamCoverAttempt(proof) && proof.teammateId === this.teamCoverTeammateId &&
        proof.startedAt === this.teamCoverStartedAt && proof.finishedAt <= this.now() &&
        proof.enemyIds.every((id, index) => id === this.teamCoverEnemyIds[index]) &&
        proof.defeatedEnemyIds.every(id => this.enemyGuardIds.includes(id) && !this.defeatedEnemyIds.includes(id)) &&
        this.onsiteTeammateIds.includes(proof.teammateId) && this.teammateKits.includes(proof.teammateId) &&
        !this.deadTeammates.includes(proof.teammateId);
    }
    completeTeamCover(proof) {
      this.tick();
      if (!this.validTeamCoverAttempt(proof) || !teamplayApi().validateTeamCoverProof(proof)) return false;
      this.coverProof = freezeTeamProof(proof); this.coverAttempt = this.coverProof;
      this.defeatedEnemyIds.push(...proof.defeatedEnemyIds); this.duels += proof.defeatedEnemyIds.length;
      this.defuserId = proof.teammateId; this.teamplayActive = false;
      return this.complete("hold");
    }
    retreatTeamCover(proof) {
      this.tick();
      if (!this.validTeamCoverAttempt(proof) || proof.state === "won") return false;
      this.coverAttempt = freezeTeamProof(proof);
      this.defeatedEnemyIds.push(...proof.defeatedEnemyIds); this.duels += proof.defeatedEnemyIds.length;
      this.teamplayActive = false;
      return true;
    }
    completeEntry(outcome) {
      this.tick();
      if (this.state !== "playing" || this.moduleId !== "entry" || outcome?.phase !== "won" ||
          !Array.isArray(outcome.defeatedEnemyIds) || !Array.isArray(outcome.remainingGuardIds)) return false;
      const guards = this.enemyGuardIds || [];
      const defeated = [...new Set(outcome.defeatedEnemyIds || [])];
      const remaining = [...new Set(outcome.remainingGuardIds || [])];
      const noEnemies = guards.length === 0 && outcome.targetId === null;
      if ((!noEnemies && (!guards.includes(outcome.targetId) || !defeated.includes(outcome.targetId))) || remaining.length > 1 ||
          [...defeated, ...remaining].some(id => !guards.includes(id)) ||
          guards.some(id => defeated.includes(id) === remaining.includes(id))) return false;
      this.defeatedEnemyIds = defeated;
      this.entryCleared = true;
      this.hasDefuseKit = outcome.supportAlive !== false;
      if (!this.hasDefuseKit) {
        if (this.supportId && !this.deadTeammates.includes(this.supportId)) this.deadTeammates.push(this.supportId);
        // The carrier's equipment is outside the safe route. Do not offer a
        // contradictory "pick up pliers" task after the ten-second branch.
        this.queue[1] = "wires";
      }
      if (!noEnemies) this.duels += Number.isInteger(outcome.shotsHit) ? Math.max(1, Math.min(2, outcome.shotsHit)) : 1;
      // A surviving carrier holds the final angle for the rest of this short
      // defuse route. The puzzle and original bomb deadline still apply.
      this.retakeQuietUntil = this.hasDefuseKit ? this.deadline : this.now() + 650 + 5000;
      return this.complete("entry");
    }
    completeRescue(outcome) {
      this.tick();
      const guards = this.enemyGuardIds || [];
      if (this.state !== "playing" || this.moduleId !== "rescue" || this.rescueCleared ||
          outcome?.phase !== "won" || !Number.isFinite(outcome.elapsed) || outcome.elapsed < 6200 || outcome.elapsed > this.now() - this.plantedAt ||
          !Number.isFinite(outcome.startedAt) || outcome.startedAt < this.plantedAt ||
          outcome.elapsed > this.now() - outcome.startedAt ||
          ![3,4].includes(guards.length) || !Array.isArray(outcome.defeatedEnemyIds) ||
          outcome.defeatedEnemyIds.length !== guards.length || new Set(outcome.defeatedEnemyIds).size !== guards.length ||
          !guards.every(id => outcome.defeatedEnemyIds.includes(id)) || outcome.remainingGuardIds?.length !== 0 ||
          !Number.isInteger(outcome.health) || outcome.health < 1 || outcome.health > 28) return false;
      if (this.health > outcome.health) this.takeDamage(this.health - outcome.health, { bypassArmor: true });
      this.defeatedEnemyIds = [...guards];
      this.rescueCleared = true;
      this.rescueKills = guards.length;
      this.rescueElapsed = outcome.elapsed;
      this.supportId = "ricksaw";
      this.hasDefuseKit = true;
      this.retakeQuietUntil = this.deadline;
      return this.complete("rescue");
    }
    takeFakeCounterfire(amount) {
      this.tick();
      if (this.state !== "playing" || this.moduleId !== "fake" || this.fakeCleared ||
          !Number.isInteger(amount) || amount < 60 || amount > 90) return null;
      // Aggregate duel loss requested for this mini-game, not single-bullet CS2 damage.
      // The indicated amount is HP loss; armor does not make its display misleading.
      if (this.health <= amount) this.deathDetail = "假拆反打失败：被守包者的枪线击倒。";
      const loss = this.takeDamage(amount, { bypassArmor: true });
      return loss ? { ...loss, health: this.health, dead: this.health === 0 } : null;
    }
    recordFakeElimination(id) {
      this.tick();
      if (this.state !== "playing" || this.moduleId !== "fake" || this.fakeCleared || !Array.isArray(this.enemyGuardIds)) return false;
      const alive = this.enemyGuardIds.filter(guard => !this.defeatedEnemyIds.includes(guard));
      if (id === null ? alive.length !== 0 : !alive.includes(id)) return false;
      if (id !== null) { this.defeatedEnemyIds.push(id); this.duels++; }
      this.fakeTargetId = id;
      this.fakeCleared = true;
      this.fakeQuietUntil = this.now() + 650 + 6500;
      return true;
    }
    tick() {
      if (this.state !== "playing" && this.state !== "transition") return;
      this.remaining = Math.max(0, this.deadline - this.now());
      if (this.remaining <= 0) {
        this.finish(false, "timeout");
        return;
      }
      if (this.state === "transition" && this.now() >= this.transitionUntil) {
        this.index++;
        this.state = "playing";
      }
    }
    complete(id) {
      this.tick();
      if (this.state !== "playing" || id !== this.moduleId || this.teamplayActive ||
          (id === "listen" && !this.listenProof) || (id === "suppression" && (!this.suppression?.cleared || this.suppression.hits.size < 15)) || (id === "fake" && !this.fakeCleared) || (id === "rescue" && !this.rescueCleared)) return false;
      this.completed.push(id);
      if (this.completed.length === this.queue.length)
        this.finish(true, "complete");
      else {
        this.state = "transition";
        this.transitionUntil = this.now() + 650;
      }
      return true;
    }
    mistake(id, { fatal = false, cause = null } = {}) {
      this.tick();
      if (
        this.state !== "playing" ||
        id !== this.moduleId ||
        this.now() - this.lastErrorAt < 450
      )
        return false;
      this.lastErrorAt = this.now();
      this.lastMistakeSafe = false;
      const smokePosition = (id === "smoke" || cause === "smoke-position") && !fatal;
      const livingGuards = this.enemyGuardIds?.filter(guard => !this.defeatedEnemyIds.includes(guard)) || [];
      // Finding the wrong patch of smoke cannot detonate C4, nor resurrect a
      // cleared opponent. With nobody left to shoot, lose time but keep playing.
      if (smokePosition && livingGuards.length === 0) {
        this.errors = Math.min(this.maxErrors - 1, this.errors + 1);
        this.lastMistakeSafe = true;
        return true;
      }
      this.errors++;
      if (fatal || this.errors >= this.maxErrors) {
        const killer = smokePosition
          ? livingGuards[Math.min(livingGuards.length - 1, Math.max(0, Math.floor(this.random() * livingGuards.length)))]
          : null;
        if (killer) {
          // Only the already-fatal memory mistake changes presentation. Earlier
          // misses retain their existing tolerance; cleared guards cannot shoot.
          this.deathCause = "smoke-crossfire";
          this.deathKillerId = killer;
          this.deathHealthBefore = this.health;
          this.deathDetail = "摸错包位，守包者循声穿烟扫射，回防队员被击倒。";
          if (["lead", "goggles", "rookie", "coconut", "ricksaw"].includes(this.supportId) &&
              !this.deadTeammates.includes(this.supportId)) {
            this.deathCompanionId = this.supportId;
            this.deadTeammates.push(this.supportId);
          }
          this.health = 0;
          this.hitsTaken++; // One terminal firefight, not a fabricated per-bullet model.
          this.finish(false, "eliminated");
        } else this.finish(false, fatal ? "blind-password" : "errors");
      }
      return true;
    }
    takeDamage(amount, { bypassArmor = false } = {}) {
      this.tick();
      if (!["playing", "transition"].includes(this.state) || !Number.isFinite(amount) || amount <= 0)
        return null;
      // Deliberately simple toy-game armor; this is not CS2 weapon damage.
      const armorLoss = bypassArmor ? 0 : Math.min(this.armor, Math.floor(amount / 3));
      const healthLoss = Math.min(this.health, amount - armorLoss);
      this.armor -= armorLoss;
      this.health -= healthLoss;
      this.hitsTaken++;
      if (this.health === 0) this.finish(false, "eliminated");
      return { healthLoss, armorLoss };
    }
    finish(success, reason) {
      if (this.state === "ended") return;
      this.state = "ended";
      this.teamplayActive = false;
      if (!success && reason === "eliminated" && !this.deathKillerId) {
        const living = this.enemyGuardIds?.filter(id => !this.defeatedEnemyIds.includes(id)) || [];
        this.deathKillerId = living[Math.min(living.length - 1, Math.max(0, Math.floor(this.random() * living.length)))] || null;
      }
      this.result = Object.freeze({
        success,
        reason,
        terminalKind: success ? "defused" : reason === "eliminated" ? "eliminated" : "bomb",
        opening: this.opening,
        variation: this.variation,
        difficulty: this.difficulty,
        rulesVersion: 2,
        moduleCount: this.queue.length,
        plannedModules: Object.freeze([...this.queue]),
        suppression: this.suppression?.proof() || null,
        listenProof: this.listenProof,
        coverProof: this.coverProof,
        coverAttempt: this.coverAttempt,
        coverAttempted: this.coverAttempted,
        defuserId: success ? this.defuserId : null,
        teammateKits: Object.freeze([...this.teammateKits]),
        onsiteTeammateIds: Object.freeze([...this.onsiteTeammateIds]),
        entryCleared: this.entryCleared,
        rescueCleared: this.rescueCleared,
        rescueKills: this.rescueKills,
        rescueElapsed: this.rescueElapsed,
        fakeCleared: this.fakeCleared,
        fakeTargetId: this.fakeTargetId,
        hasDefuseKit: this.hasDefuseKit,
        module: this.moduleId,
        remaining: this.remaining,
        errors: this.errors,
        health: this.health,
        armor: this.armor,
        hitsTaken: this.hitsTaken,
        dodges: this.dodges,
        flashes: this.flashes,
        smokes: this.smokes,
        allyBlocks: this.allyBlocks,
        duels: this.duels,
        grenades: this.grenades,
        fires: this.fires,
        deathDetail: this.deathDetail,
        deathCause: this.deathCause,
        deathKillerId: this.deathKillerId,
        deathCompanionId: this.deathCompanionId,
        deathHealthBefore: this.deathHealthBefore,
        supportId: this.supportId,
        planterId: this.planterId,
        appearedEnemyIds: Object.freeze([...this.appearedEnemyIds]),
        deadTeammates: Object.freeze([...this.deadTeammates]),
        enemyGuardIds: this.enemyGuardIds ? Object.freeze([...this.enemyGuardIds]) : null,
        defeatedEnemyIds: Object.freeze([...this.defeatedEnemyIds]),
        completed: Object.freeze([...this.completed]),
      });
    }
  }
  // Round modifiers never apply to authored rare/flash openings. One draw gives
  // at most one modifier, so a small-target duel cannot stack with the casualty.
  function rollRoundVariation(plan, random = Math.random) {
    if (plan?.opening !== "direct") return { variation: "standard", whiffActorId: null };
    const raw = Number(random()), roll = Number.isFinite(raw) ? Math.max(0, Math.min(1, raw)) : 1;
    if (roll < .18 && plan.mode === "fake") {
      const eligible = ["lead", "goggles", "rookie", "coconut"].filter(id => id !== plan.supportId);
      const value = Number(random());
      return { variation: "entry-whiff", whiffActorId: eligible[Math.min(eligible.length - 1, Math.max(0, Math.floor((Number.isFinite(value) ? value : 0) * eligible.length)))] };
    }
    return { variation: roll >= .18 && roll < .38 ? 'deagle' : roll >= .38 && roll < .60 ? 'suppression' : 'standard', whiffActorId: null };
  }
  function makeWireRule(random = Math.random, { advanced = false, level = 0 } = {}) {
    if (advanced) {
      const pair = shuffle(["red", "blue", "yellow", "green"], random).slice(0, 2);
      const names = { red: "红", blue: "蓝", yellow: "黄", green: "绿" };
      const roll = random();
      const dualChance = Math.min(.8, 1 / 3 + Math.max(0, level) * .15);
      const type = level > 0 ? (roll < dualChance ? 2 : roll < (1 + dualChance) / 2 ? 0 : 1) : Math.min(2, Math.max(0, Math.floor(roll * 3)));
      const digit = Math.min(9, Math.max(0, Math.floor(random() * 10)));
      const lit = random() >= .5;
      const odd = digit % 2 === 1;
      // Higher streaks change the condition, never a rule already on screen.
      const operator = type === 2 && level >= 2 ? ["and", "or", ...(level >= 3 ? ["xor"] : [])][Math.min(level >= 3 ? 2 : 1, Math.floor(random() * (level >= 3 ? 3 : 2)))] : "and";
      const match = type === 0 ? odd : type === 1 ? lit : operator === "or" ? lit || odd : operator === "xor" ? lit !== odd : lit && odd;
      const condition = operator === "or" ? "灯亮或末位奇数（满足一个就行）" : operator === "xor" ? "灯亮、末位奇数（只满足一个）" : "灯亮且末位奇数";
      return {
        type: ["serial", "light", "dual"][type], value: type === 1 ? lit : digit, lit, operator,
        label: type === 1 ? `红色指示灯：${lit ? "亮" : "灭"}` : `序列号：LE-${7350 + digit}${type === 2 ? `，红灯${lit ? "亮" : "灭"}` : ""}`,
        text: type === 0 ? `末位为奇数 → 剪${names[pair[0]]}线；偶数 → 剪${names[pair[1]]}线。` : type === 1 ? `红灯亮 → 剪${names[pair[0]]}线；红灯灭 → 剪${names[pair[1]]}线。` : `${condition} → ${names[pair[0]]}线；否则 → ${names[pair[1]]}线。`,
        answer: match ? pair[0] : pair[1], choices: pair,
      };
    }
    if (random() < 0.5) {
      const digit = Math.floor(random() * 10);
      return {
        type: "serial",
        value: digit,
        label: `序列号：LE-${7350 + digit}`,
        text: "末位为偶数 → 剪蓝线；末位为奇数 → 剪黄线。",
        answer: digit % 2 === 0 ? "blue" : "yellow",
      };
    }
    const lit = random() >= 0.5;
    return {
      type: "light",
      value: lit,
      label: `红色指示灯：${lit ? "亮" : "灭"}`,
      text: "红灯亮 → 剪绿线；红灯灭 → 剪红线。",
      answer: lit ? "green" : "red",
    };
  }
  const api = { streakDifficulty, Round, shuffle, MODULE_IDS, DIRECT_MODULE_IDS, makeWireRule, makePasswordReveal, passwordGuidance, rollRoundVariation };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.Defuse = { ...api, modules: {} };
})(typeof window !== "undefined" ? window : globalThis);
