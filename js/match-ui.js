/* Match presentation only: the persistent series owns scores and promotions. */
(() => {
  const clean = value => Defuse.escapeHtml(String(value ?? ""));
  const integer = (value, fallback = 0) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback;
  const text = (node, value) => { if (node && node.textContent !== String(value)) node.textContent = String(value); };
  const rankAt = value => {
    const ranks = Defuse.RANKS || [];
    return ranks[Math.min(Math.max(0, integer(value)), Math.max(0, ranks.length - 1))] || { id: "unranked", name: "初始段位", icon: "" };
  };
  const iconMarkup = (rank, className) => {
    const icon = String(rank.icon || "");
    return /(?:\.(?:svg|png|webp|jpe?g)(?:[?#]|$)|^data:image\/)/i.test(icon)
      ? `<img class="${className}" src="${clean(icon)}" alt="" draggable="false">`
      : `<span class="${className}" aria-hidden="true">${clean(icon || "◆")}</span>`;
  };

  class MatchUI {
    constructor() {
      this.snapshot = { ct: 0, t: 0, target: 13, rankIndex: 0, matchesWon: 0, completed: false, winner: null };
      this.overlay = null;
      this.controller = null;
      this.onClose = null;
      this.header = document.querySelector(".masthead");
      if (!this.header) return;
      this.header.classList.add("has-match-score");
      this.scoreboard = this.header.querySelector(".match-scoreboard");
      if (!this.scoreboard) {
        this.scoreboard = document.createElement("div");
        this.scoreboard.className = "match-scoreboard";
        this.scoreboard.setAttribute("role", "group");
        this.scoreboard.innerHTML = `<div class="match-scoreline" aria-live="polite" aria-atomic="true"><span class="match-ct-label">CT</span><b class="match-ct-score" data-match-ct>0</b><i aria-hidden="true">:</i><b class="match-t-score" data-match-t>0</b><span class="match-t-label">T</span></div><span class="match-score-target" data-match-target>先到 13 分</span><span class="match-rank-badge" data-match-rank></span>`;
        const sound = this.header.querySelector(".sound-button");
        if (sound) this.header.insertBefore(this.scoreboard, sound); else this.header.append(this.scoreboard);
      }
      this.ctNode = this.scoreboard.querySelector("[data-match-ct]");
      this.tNode = this.scoreboard.querySelector("[data-match-t]");
      this.targetNode = this.scoreboard.querySelector("[data-match-target]");
      this.rankNode = this.scoreboard.querySelector("[data-match-rank]");
      this.update(this.snapshot);
    }

    update(snapshot, { screen } = {}) {
      if (!snapshot) return;
      this.snapshot = { ...this.snapshot, ...snapshot, ct: integer(snapshot.ct, this.snapshot.ct), t: integer(snapshot.t, this.snapshot.t), target: Math.max(1, integer(snapshot.target, 13)), rankIndex: integer(snapshot.rankIndex, this.snapshot.rankIndex) };
      if (!this.scoreboard) return;
      const current = this.snapshot, rank = rankAt(current.rankIndex);
      text(this.ctNode, current.ct);
      text(this.tNode, current.t);
      text(this.targetNode, `先到 ${current.target} 分`);
      this.scoreboard.setAttribute("aria-label", `本场比分，CT ${current.ct} 比 T ${current.t}，先到 ${current.target} 分。本地段位：${rank.name}`);
      this.scoreboard.title = `CT ${current.ct} : ${current.t} T · 先到 ${current.target} 分获胜 · ${rank.name}`;
      this.scoreboard.dataset.completed = String(!!current.completed);
      if (screen) this.scoreboard.dataset.screen = screen;
      const rankKey = `${rank.id}|${rank.name}|${rank.icon}`;
      if (this.rankKey !== rankKey) {
        this.rankKey = rankKey;
        this.rankNode.innerHTML = `${iconMarkup(rank, "match-rank-icon")}<span>${clean(rank.name)}</span>`;
        this.rankNode.title = `本地段位：${rank.name}`;
      }
    }

    showOutcome(outcome, { onClose = () => {} } = {}) {
      if (!outcome?.matchEnded) return;
      this.dismiss(false);
      this.onClose = onClose;
      const won = String(outcome.winner || this.snapshot.winner).toLowerCase() === "ct";
      const promoted = won && !!outcome.promoted;
      const from = rankAt(outcome.fromRank ?? this.snapshot.rankIndex);
      const to = rankAt(outcome.toRank ?? this.snapshot.rankIndex);
      const ct = integer(outcome.ct, this.snapshot.ct), t = integer(outcome.t, this.snapshot.t);
      const atTop = integer(outcome.toRank, this.snapshot.rankIndex) >= (Defuse.RANKS?.length || 1) - 1;
      const title = won ? "比赛胜利" : "本场落败";
      const rankTitle = promoted ? `晋级 ${to.name}` : won ? (atTop ? "已是最高段位" : "又拿下一场") : `本地段位 · ${to.name}`;
      const detail = won
        ? promoted ? "赢下整场，升一级。" : "这场赢了，段位保持不变。"
        : "这场输了，不掉段。下场再来。";
      this.previousFocus = document.activeElement;
      this.shell = document.querySelector(".site-shell");
      if (this.shell) this.shell.inert = true;
      for (const popover of document.querySelectorAll("[popover]")) {
        try { popover.hidePopover?.(); } catch { /* An already closed popover is harmless. */ }
      }
      this.controller = new AbortController();
      this.overlay = document.createElement("section");
      this.overlay.className = `match-outcome-overlay ${won ? "match-outcome-win" : "match-outcome-loss"}${promoted ? " match-promoted" : ""}`;
      this.overlay.setAttribute("role", "dialog");
      this.overlay.setAttribute("aria-modal", "true");
      this.overlay.setAttribute("aria-labelledby", "match-outcome-title");
      this.overlay.setAttribute("aria-describedby", "match-outcome-detail");
      this.overlay.innerHTML = `<div class="match-outcome-panel">
        <div class="match-outcome-top"><span>MATCH COMPLETE / 先到 ${this.snapshot.target} 分</span><button type="button" class="match-outcome-close" data-match-close aria-label="关闭比赛总结">${Defuse.icon("cross", "action-icon")}</button></div>
        <h1 id="match-outcome-title">${title}</h1>
        <p class="match-outcome-subtitle">${won ? "CT 反恐精英获胜" : "T 恐怖分子获胜"}</p>
        <div class="match-outcome-score" aria-label="最终比分 CT ${ct} 比 T ${t}"><span><small>CT</small><b>${ct}</b></span><i aria-hidden="true">:</i><span><b>${t}</b><small>T</small></span></div>
        ${won ? `<div class="match-rank-celebration" aria-hidden="true"><span class="match-rank-halo"></span>${iconMarkup(to, "match-rank-medal")}</div>` : ""}
        <div class="match-outcome-rank"><span>${promoted ? "RANK UP / 段位提升" : won ? "MATCH WON / 比赛胜利" : "下一场继续"}</span><h2>${clean(rankTitle)}</h2>${promoted ? `<p class="match-rank-path"><span>${clean(from.name)}</span><i aria-hidden="true">→</i><b>${clean(to.name)}</b></p>` : ""}</div>
        <p id="match-outcome-detail">${detail}</p>
        <button type="button" class="match-outcome-continue" data-match-continue>继续 ${Defuse.icon("arrowRight", "action-icon")}</button>
      </div>`;
      document.body.append(this.overlay);
      const close = this.overlay.querySelector("[data-match-close]"), next = this.overlay.querySelector("[data-match-continue]");
      const signal = this.controller.signal;
      close.addEventListener("click", () => this.close(), { signal });
      next.addEventListener("click", () => this.close(), { signal });
      this.overlay.addEventListener("keydown", event => {
        if (event.key === "Escape") { event.preventDefault(); this.close(); }
        else if (event.key === "Tab") {
          event.preventDefault();
          (document.activeElement === next ? close : next).focus({ preventScroll: true });
        }
      }, { signal });
      // A summary may finish underneath the mobile orientation dialog. Once
      // that guard closes, restore focus to this still-open summary.
      const keepFocus = () => {
        if (!document.hidden && !window.leienOrientation?.blocked && this.overlay && !this.overlay.contains(document.activeElement))
          next.focus({ preventScroll: true });
      };
      window.addEventListener("resize", keepFocus, { signal });
      window.addEventListener("orientationchange", keepFocus, { signal });
      screen.orientation?.addEventListener?.("change", keepFocus, { signal });
      document.addEventListener("visibilitychange", keepFocus, { signal });
      next.focus({ preventScroll: true });
    }

    close() { this.dismiss(true); }

    dismiss(notify) {
      if (!this.overlay) return;
      const callback = this.onClose;
      this.onClose = null;
      this.controller?.abort();
      this.controller = null;
      this.overlay.remove();
      this.overlay = null;
      // Orientation may have changed while this summary was open. Use the
      // current guard state rather than restoring a stale landscape lock.
      if (this.shell) this.shell.inert = !!window.leienOrientation?.blocked;
      if (this.previousFocus?.isConnected && !window.leienOrientation?.blocked)
        this.previousFocus.focus?.({ preventScroll: true });
      this.previousFocus = null;
      if (notify) callback?.();
    }
  }
  Defuse.MatchUI = MatchUI;
})();
