/* A short, cancellable epilogue. The round has already ended before this starts. */
(() => {
  const DURATION = 3100;
  const GROUP = "smoke-death";
  const clean = value => Defuse.escapeHtml(String(value ?? ""));
  const impact = (x, y, angle) => `<span class="smoke-death-impact" style="--impact-x:${x}%;--impact-y:${y}%;--impact-angle:${angle}deg" aria-hidden="true"><svg viewBox="0 0 120 120" fill="none"><path d="M60 60 42 47 34 23 17 12M43 47 18 49 6 39M60 60 79 37 78 16M79 37 104 29 115 13M60 60 90 70 111 91M89 70 112 64M60 60 55 91 35 112M55 90 72 114M60 60 29 79 12 99"/><path class="smoke-death-crack-fine" d="m60 60-8-17 7-15m1 32 22-6 16 4M60 60l12 21-1 13m-11-34-27-1-9 7"/></svg><i></i></span>`;

  class SmokeDeathUI {
    constructor({ root, result, audio = Defuse.audio, onComplete = () => {} }) {
      this.root = root;
      this.result = result || {};
      this.audio = audio;
      this.onComplete = onComplete;
      this.started = this.completed = this.disposed = false;
      this.frameId = null;
      this.nextEvent = 0;
      this.lastKeyCueAt = -Infinity;
      this.controller = new AbortController();
      this.savedChildren = [];
      this.healthBefore = Number.isFinite(this.result.deathHealthBefore) ? Math.max(0, Math.min(100, this.result.deathHealthBefore)) : 100;
      this.crossfire = (this.result.enemyGuardIds || []).filter(id => !(this.result.defeatedEnemyIds || []).includes(id)).length > 1;
      this.soft = !!Defuse.flashPreference?.soft || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      this.dialogue = typeof Defuse.smokeDeathDialogue === "function" ? Defuse.smokeDeathDialogue(this.result).slice(0, 2) : [
        this.result.deathCompanionId
          ? { who: this.result.deathCompanionId, text: "烟里别乱摸啊……我也被穿了。", tone: "complaint" }
          : { who: "commander", text: "摸错包位，敌人循声穿烟了。", tone: "report" },
        { who: "commander", text: "没事，下把记住包位。我们再来。", tone: "comfort" },
      ];
      this.events = [
        { at: 100, apply: () => this.hit(1) },
        { at: 380, apply: () => this.hit(2), sound: "distant", volume: .10 },
        { at: 620, apply: () => this.hit(3) },
        { at: 660, apply: () => this.fall(), sound: "death", volume: .24 },
        { at: 1050, apply: () => this.showLine(0), sound: "radio", volume: .055 },
        { at: 1700, apply: () => this.showLine(1), sound: "radio", volume: .055 },
      ];
    }

    start() {
      if (this.started || this.disposed) return;
      this.started = true;
      if (!this.root || document.hidden || window.leienOrientation?.blocked) { this.complete(); return; }
      this.previousFocus = document.activeElement;
      // Keep the final smoke frame in place beneath the epilogue, but make its
      // controls inaccessible until the owning app replaces it with the result.
      this.savedChildren = [...this.root.children].map(node => ({ node, inert: node.inert, hidden: node.getAttribute("aria-hidden") }));
      for (const { node } of this.savedChildren) { node.inert = true; node.setAttribute("aria-hidden", "true"); }
      this.root.classList.add("smoke-death-running");
      const companion = Defuse.cast?.[this.result.deathCompanionId];
      const killer = Defuse.cast?.[this.result.deathKillerId];
      this.element = document.createElement("section");
      this.element.className = "smoke-death-screen" + (this.soft ? " smoke-death-soft" : "");
      this.element.dataset.phase = "contact";
      this.element.dataset.hit = "0";
      this.element.setAttribute("role", "dialog");
      this.element.setAttribute("aria-modal", "true");
      this.element.setAttribute("aria-label", "烟中遭遇" + (this.crossfire ? "交叉枪线" : "穿烟扫射") + "，回合结束过场");
      this.element.innerHTML = `<div class="smoke-death-scene" aria-hidden="true"><div class="smoke-death-haze"></div><div class="smoke-death-sight"><i></i><i></i><i></i><i></i></div></div>
        <div class="smoke-death-edge" aria-hidden="true"></div>
        <div class="smoke-death-impacts" aria-hidden="true">${impact(20, 35, -17)}${impact(77, 28, 23)}${impact(55, 48, -46)}</div>
        <div class="smoke-death-content">
          <header class="smoke-death-top"><span>B 点 / 封烟强拆</span><button type="button" class="smoke-death-skip" data-smoke-death-skip>跳过 <span aria-hidden="true">›</span></button></header>
          <div class="smoke-death-message"><span class="smoke-death-kicker">${this.crossfire ? "CROSSFIRE / 交叉枪线" : "THROUGH SMOKE / 穿烟扫射"}</span><h1 data-smoke-death-title>位置暴露</h1><p data-smoke-death-detail>摸错包位，敌方正在穿烟扫射。</p><div class="smoke-death-health" aria-label="生命值"><span>HP</span><b data-smoke-death-health>${Math.ceil(this.healthBefore)}</b><i><em></em></i></div><div class="smoke-death-casualties"><span data-smoke-death-player-state>枪线已锁定你的位置</span><span data-smoke-death-companion-state>${companion ? clean(companion.name) + "还在烟里" : "烟雾中失去视野"}</span></div></div>
          <div class="smoke-death-radio" aria-label="队内语音" aria-live="polite" aria-relevant="additions text">${this.dialogue.map((line, index) => `<div class="smoke-death-radio-line" data-smoke-death-line="${index}" aria-hidden="true"><div class="smoke-death-radio-heading"><b>${clean(Defuse.cast?.[line.who]?.name || "队友")}</b><span>${line.who === this.result.deathCompanionId ? "阵亡语音" : "场外指挥"}</span><i aria-hidden="true">▂▅▃</i></div><p>${clean(line.text)}</p></div>`).join("")}</div>
          <footer class="smoke-death-footer"><span>${killer ? clean(killer.name) + " · 穿烟击杀" : "敌方枪线 · 穿烟击杀"}</span><span>正在结算 <i aria-hidden="true">···</i></span></footer>
        </div>`;
      this.root.append(this.element);
      this.impacts = [...this.element.querySelectorAll(".smoke-death-impact")];
      this.lines = [...this.element.querySelectorAll(".smoke-death-radio-line")];
      this.health = this.element.querySelector("[data-smoke-death-health]");
      this.healthBar = this.element.querySelector(".smoke-death-health em");
      this.healthBar.style.width = this.healthBefore + "%";
      const skip = this.element.querySelector("[data-smoke-death-skip]");
      const signal = this.controller.signal;
      skip.addEventListener("click", () => this.complete(), { signal });
      this.element.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); this.complete(); }
        else if (event.key === "Tab") { event.preventDefault(); skip.focus({ preventScroll: true }); }
      }, { signal });
      document.addEventListener("visibilitychange", () => { if (document.hidden) this.complete(); }, { signal });
      document.addEventListener("defuse-orientation-block", () => this.complete(), { signal });
      window.addEventListener("pagehide", () => this.complete(), { signal });
      skip.focus({ preventScroll: true });
      this.audio?.stop?.(GROUP);
      this.startedAt = performance.now();
      // Start the gunfire before waiting for a frame: a busy mobile renderer
      // can miss the first few impact frames without losing the opening cue.
      this.play("shot", .17, this.startedAt);
      this.frameId = requestAnimationFrame(now => this.tick(now));
    }

    hit(count) {
      this.element.dataset.hit = String(count);
      this.impacts[count - 1]?.classList.add("is-visible");
      const remaining = count >= 3 ? 0 : Math.ceil(this.healthBefore * (count === 1 ? .57 : .24));
      this.health.textContent = String(remaining);
      this.healthBar.style.width = remaining + "%";
    }

    fall() {
      this.element.dataset.phase = "fallen";
      this.element.querySelector("[data-smoke-death-title]").textContent = "你已阵亡";
      this.element.querySelector("[data-smoke-death-detail]").textContent = this.crossfire ? "交叉枪线穿过烟雾，回防被截。" : "守包者循声穿烟扫射，回防被截。";
      this.element.querySelector("[data-smoke-death-player-state]").textContent = "你 · 已阵亡";
      const companion = Defuse.cast?.[this.result.deathCompanionId];
      this.element.querySelector("[data-smoke-death-companion-state]").textContent = companion ? companion.name + " · 同时阵亡" : "回防枪线已失守";
    }

    showLine(index) {
      const line = this.lines[index];
      if (!line) return;
      line.classList.add("is-visible");
      line.removeAttribute("aria-hidden");
      // Both lines stay visible. The full exchange also remains on the result.
      if (index > 0) this.lines[index - 1]?.classList.add("is-previous");
    }

    play(name, volume, now = performance.now()) {
      if (this.disposed || document.hidden || this.audio?.muted || this.audio?.isMuted?.(GROUP)) return;
      // A late radio tick is optional; let the preceding gun/death cue speak.
      if (name === "radio" && now - this.lastKeyCueAt < 220) return;
      // One current cue, with only the mixer's short release overlapping it.
      // stop() also invalidates decoding requests from an earlier impact.
      this.audio?.stop?.(GROUP);
      try {
        const task = this.audio?.play?.(name, { group: GROUP, volume, fallback: false });
        if (name === "shot" || name === "death") this.lastKeyCueAt = now;
        task?.catch?.(() => {});
      } catch { /* The visual timeline never depends on available audio. */ }
    }

    tick(now) {
      this.frameId = null;
      if (this.disposed || this.completed) return;
      if (document.hidden || window.leienOrientation?.blocked) { this.complete(); return; }
      const elapsed = Math.max(0, now - this.startedAt);
      if (elapsed >= DURATION) { this.complete(); return; }
      let cue = null;
      while (this.nextEvent < this.events.length && elapsed >= this.events[this.nextEvent].at) {
        const event = this.events[this.nextEvent++];
        event.apply();
        // Coalesce a stalled frame into one sound. Collapse is essential and
        // wins over radio ticks; stale optional cues are discarded entirely.
        if (event.sound === "death") cue = event;
        else if (event.sound && elapsed - event.at < 300 && cue?.sound !== "death") cue = event;
      }
      if (cue) this.play(cue.sound, cue.volume, now);
      this.frameId = requestAnimationFrame(next => this.tick(next));
    }

    complete() {
      if (this.completed || this.disposed) return;
      this.completed = true;
      this.dispose();
      this.onComplete();
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      if (this.frameId !== null) cancelAnimationFrame(this.frameId);
      this.frameId = null;
      this.controller.abort();
      this.audio?.stop?.(GROUP);
      this.element?.remove();
      this.root?.classList.remove("smoke-death-running");
      for (const { node, inert, hidden } of this.savedChildren) {
        node.inert = inert;
        if (hidden === null) node.removeAttribute("aria-hidden"); else node.setAttribute("aria-hidden", hidden);
      }
      this.savedChildren = [];
      if (this.previousFocus?.isConnected && !document.hidden && !window.leienOrientation?.blocked)
        this.previousFocus.focus?.({ preventScroll: true });
    }
  }
  Defuse.SmokeDeathUI = SmokeDeathUI;
})();
