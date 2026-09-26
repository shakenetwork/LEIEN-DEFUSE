/* A defense victory is a won round, never a fabricated defuse. */
(() => {
  const esc = value => Defuse.escapeHtml(String(value ?? ""));
  Defuse.screens.rushResult = r => {
    const won = !!r.success, side = won ? "CT" : "T";
    const proof = r.rushProof || {};
    const flashed = r.deathCause === "rush-flash";
    const allyWon = r.rushEncounter && r.encounterWinner === "ricksaw";
    const title = won ? (allyWon ? "两人守住，B 点不丢。" : r.rushEncounter ? "大哥倒了，这分你兜住了。" : "这波 Rush，止步 B 点。") : flashed ? "一眼没背，全队白给。" : r.bossHits > 0 ? "第二枪，慢了半拍。" : "这一枪，他先开了。";
    const detail = won ? (allyWon ? "你守住前点，里克索尔补掉核心。炸弹未能安放。" : "敌人全清，炸弹未能安放。这分记给 CT。")
      : flashed ? "闪光爆开时没有背身，罗曼诺夫趁致盲反清。下次先点背闪。"
      : "罗曼诺夫先开枪了。第一枪命中后，等他换位再补第二枪。";
    return `<section class="result-screen rush-result ${won ? "victory" : "defeat eliminated"}" aria-label="防守回合结算">
      <div class="match-ribbon"><span>HOLD B / 稀有遭遇</span><b>炸弹未安放</b><span>${side} WIN</span></div>
      <div class="victory-banner ${won ? "ct-banner" : "t-banner"}">${Defuse.teamMark(side)}<h1 tabindex="-1">${won ? "反恐精英胜利" : "恐怖分子胜利"}</h1><p>${won ? "守住 B 点 · CT +1" : "防线失守 · T +1"}</p></div>
      <div class="rush-debrief"><img src="${esc(Defuse.enemyImage('romanov'))}" alt="罗曼诺夫" width="960" height="960"><div><span>罗曼诺夫 / 核心步枪手</span><h2>${title}</h2><p>${detail}</p></div></div>
      <div class="rush-result-facts"><span>背闪 <b>${r.flashesDodged ?? proof.flashesDodged ?? 0} / ${r.flashCount ?? proof.flashCount ?? '—'}</b></span><span>${allyWon ? '核心击杀' : '关键命中'} <b>${allyWon ? '里克索尔' : (r.bossHits ?? proof.bossHits ?? 0) + ' / 2'}</b></span><span>存活 <b>${r.health ?? 0} HP</b></span></div>
      ${Defuse.mvpMarkup?.(r) || ""}
      <p class="rush-result-radio"><b>爱娃</b> ${won ? "「好枪！包都没让他下，省下钳子钱了。」" : "「防线丢了……没事，下把先背闪，再接枪。」"}</p>
      ${Defuse.rankings?.resultMarkup() || ""}
      <div class="result-actions"><button class="button primary start-game restart-game">下一回合 ${Defuse.icon("arrowUpRight", "action-icon")}</button><button class="button secondary go-home">返回首页</button></div>
      <p class="restart-hint">回合已计分。下一回合继续挑战。</p>
    </section>`;
  };
})();
