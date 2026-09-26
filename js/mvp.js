/* Official Valve reason strings; this toy resolves its own simplified rounds.
 * Winner selection is made once per immutable result, never once per render. */
(() => {
  const cache = new WeakMap();
  const reasons = Object.freeze({
    kills: { reason: "消灭了最多敌人", token: "winpanel_mvp_award_kills" },
    bombplant: { reason: "安放了炸弹", token: "winpanel_mvp_award_bombplant" },
    bombdefuse: { reason: "拆除了炸弹", token: "winpanel_mvp_award_bombdefuse" },
  });
  const pick = (items, random) => {
    const value = Number(random());
    return items[Math.floor((Number.isFinite(value) ? Math.min(1 - Number.EPSILON, Math.max(0, value)) : 0) * items.length)];
  };
  Defuse.resolveMvp = (result, random = Math.random) => {
    if (!result || typeof result !== "object") return null;
    if (cache.has(result)) return cache.get(result);
    const isT = id => (Defuse.enemyShowcaseIds || Defuse.enemyIds || []).includes(id) && !!Defuse.cast?.[id];
    const appeared = [...new Set([...(result.appearedEnemyIds || result.enemyGuardIds || []), ...(result.planterId ? [result.planterId] : [])])].filter(isT);
    let id, reasonCode;
    if (result.success) {
      if (result.opening === "rush-defense") {
        // This opening records its kills, so use those facts instead of giving
        // the cameo an automatic MVP. Ties favour the participating player.
        const proof = result.rushProof || {};
        const teammates = (proof.ctIds || []).filter(id => ["lead", "goggles", "rookie", "coconut", "ricksaw"].includes(id) && Defuse.cast[id]);
        const kills = new Map([["player", 0], ...teammates.map(id => [id, 0])]);
        const add = id => { if (kills.has(id)) kills.set(id, kills.get(id) + 1); };
        if (proof.openingKill) add(teammates[0]);
        for (const weak of proof.weak || []) {
          if (weak.method === "player") add("player");
          else if (weak.method === "teammate") add(teammates[0]);
        }
        if ((result.defeatedEnemyIds || []).includes("romanov"))
          add(result.rushEncounter && result.encounterWinner === "ricksaw" ? "ricksaw" : "player");
        id = [...kills].reduce((best, entry) => entry[1] > best[1] ? entry : best)[0];
        reasonCode = "kills";
      } else {
        const teammate = result.defuserId;
        id = ['lead', 'goggles', 'rookie', 'coconut', 'ricksaw'].includes(teammate) && Defuse.cast?.[teammate] &&
          Defuse.validateTeamCoverProof?.(result.coverProof) && result.coverProof.teammateId === teammate &&
          result.onsiteTeammateIds?.includes(teammate) && result.teammateKits?.includes(teammate) &&
          !result.deadTeammates?.includes(teammate) ? teammate : "player";
        reasonCode = "bombdefuse";
      }
    } else if (result.reason === "eliminated" || result.terminalKind === "eliminated") {
      const living = appeared.filter(id => !(result.defeatedEnemyIds || []).includes(id));
      id = living.includes(result.deathKillerId) ? result.deathKillerId : pick(living, random);
      reasonCode = "kills";
    } else {
      // A dead planter can still receive the plant MVP. Never award a random
      // guard a planting citation for a bomb someone else demonstrably planted.
      id = appeared.includes(result.planterId) ? result.planterId : appeared[0];
      reasonCode = "bombplant";
    }
    const winner = id ? Object.freeze({
      id, side: result.success ? "CT" : "T", reasonCode, ...reasons[reasonCode],
      // Player getters allow late Bilibili authorization without rerolling MVP.
      get name() { return id === "player" ? Defuse.player?.name || "回防队员" : Defuse.cast[id].name; },
      get portrait() { return id === "player" ? Defuse.player?.image : Defuse.cast[id].image; },
    }) : null;
    cache.set(result, winner);
    return winner;
  };
  Defuse.mvpMarkup = result => {
    const mvp = Defuse.resolveMvp(result);
    if (!mvp) return "";
    const esc = Defuse.escapeHtml;
    const image = mvp.id === "player" ? Defuse.playerAvatar() : `<span class="player-avatar">${Defuse.portrait(mvp.id)}</span>`;
    const name = mvp.id === "player" ? Defuse.playerName() : `<b>${esc(mvp.name)}</b>`;
    return `<div class="rank-card mvp-card" data-mvp-side="${mvp.side}" data-mvp-id="${esc(mvp.id)}">${image}<div><span>★ 本回合 MVP / ${name}</span><b>${mvp.reason}</b></div></div>`;
  };
})();
