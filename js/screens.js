Defuse.screens = {
  home: () => `<section class="home-screen screen-enter" data-home-view="play" data-squad-view="ct">
    <nav class="mobile-home-nav" aria-label="首页页面">
      <button type="button" data-home-view="play" aria-pressed="true">开局</button>
      <button type="button" data-home-view="squad" aria-pressed="false">阵容</button>
      <button type="button" data-home-view="music" aria-pressed="false">音乐盒</button>
      <button type="button" data-home-view="record" aria-pressed="false">账号 / 榜单</button>
    </nav>
    <div class="home-copy map-lobby">
      <header class="lobby-heading"><div><span>PLAY / 回防模式</span><h1>选择地图</h1></div><span class="lobby-mode">单人</span><button type="button" class="surrender-button lobby-surrender" data-open-surrender hidden>投降重开</button></header>
      <div class="lobby-map-pool" role="radiogroup" aria-label="挑战地图">
        <label class="map-card">
          <input type="radio" name="challenge-map" value="dust2" checked aria-label="炙热沙城 II，B点，已选择">
          <img class="map-media" src="assets/scenes/dust2-lobby.webp" alt="" width="1280" height="775" fetchpriority="high">
          <span class="map-location">MAP / 地图预览</span>
          <span class="map-selected">${Defuse.icon("check", "action-icon")} 已选择</span>
          <span class="map-caption"><img class="map-badge" src="assets/ui/dust2-map-badge.png" alt="炙热沙城 II地图徽章" width="256" height="198"><span><small>DUST II</small><b>炙热沙城 II</b><span>B 点回防</span></span></span>
        </label>
      </div>
      <div class="lobby-bottom"><p class="lobby-objective">${Defuse.rankings?.stats?.streak ? `当前 ${Defuse.rankings.stats.streak} 连胜 · ${Defuse.rankings.stats.streak >= 13 ? "三处记位，别点乱了" : Defuse.rankings.stats.streak >= 8 ? "留意连闪，剪线看清条件" : Defuse.rankings.stats.streak >= 4 ? "对面会补闪，别急着回头" : "这把继续"}` : "包在 B 点，准备回防。"}</p><div class="lobby-rules"><span>${Defuse.icon("clock")}<b>40 秒</b> · 4 步拆包</span><span>${Defuse.teamMark("CT")}CT 回防</span><span>先到 <b>13 分</b></span></div>
      <div class="home-actions"><button class="button primary start-game">开始游戏 ${Defuse.icon("arrowUpRight", "action-icon")}</button><button class="button secondary show-training">新手训练</button></div></div>
    </div>
    ${Defuse.rosterShowcase.markup()}
    ${Defuse.rankings?.homeMarkup() || ""}
    ${Defuse.music.panel()}

    </section>`,
  intro: () =>
    `<section class="intro-screen screen-enter intro-plan-${Defuse.matchPlan?.mode || "fake"}" data-enemy="${Defuse.currentEnemyId()}"><div class="match-ribbon"><span>${Defuse.planLabel()}</span><b>B 包点</b><span>LEIEN / DEFUSE</span></div><div class="intro-arena"><div class="scene-haze"></div><div class="intro-location">B<span>DUST II / B 包点</span></div><div class="kill-feed" aria-live="polite"></div><div class="intro-character">${Defuse.enemyPortrait(Defuse.currentEnemyId())}<span class="eliminated-stamp">ELIMINATED</span></div><div class="intro-bomb">${Defuse.device()}</div><div class="intro-ct"><div class="intro-squad-card" data-ct-actor="${Defuse.ctPlan().actorId}">${Defuse.ctActorPortrait()}<span><b class="ct-actor-name"${Defuse.ctPlan().actorId === "player" ? " data-player-name" : ""}>${Defuse.escapeHtml(Defuse.ctActorName())}</b><small>${Defuse.ctActorSpecialty()}</small></span></div></div><div class="intro-callout"><div class="intro-command-portrait">${Defuse.portrait("commander")}</div><span id="intro-speaker">${Defuse.cast[Defuse.currentEnemyId()].name} / ${Defuse.enemyProfiles[Defuse.currentEnemyId()].homeRole}</span><p id="intro-dialogue">${Defuse.matchPlan?.plant || "我下包，你们看 B 门和狗洞。"}</p></div></div><div class="intro-lower"><div><span class="eyebrow" id="intro-status">PLANTING THE BOMB</span><h2 id="intro-title" tabindex="-1">正在 B 点下包…</h2></div><b class="intro-clock" id="intro-clock">--:--</b></div><div class="intro-progress"><span></span></div><div class="intro-steps"><span>01 ${Defuse.planLabel()}</span><span>02 击杀</span><span>03 回防拆包</span></div><div class="intro-friend" data-support="${Defuse.ctPlan().supportId}" hidden>${Defuse.portrait(Defuse.ctPlan().supportId)}<div><span>${Defuse.escapeHtml(Defuse.supportName())} <small>友方频道</small></span><p>${Defuse.escapeHtml(Defuse.ctPlan().supportLine)}</p></div></div>${Defuse.music.bar()}<button class="button secondary take-over">直接接管 ${Defuse.icon("arrowUpRight", "action-icon")}</button><p class="intro-note">下包后 40 秒起爆 · 回防途中也在计时</p></section>`,
  game: () =>
    `<section class="game-screen screen-enter"><div class="match-ribbon"><span class="ct-text">CT / 补枪手</span><b>沙二 / B 包点</b><span class="t-text">T / 已下包</span></div><div class="game-status"><div class="game-hud"><div class="timer-block"><div class="module-heading"><div><span class="eyebrow" id="module-english"></span><h2 id="module-title" tabindex="-1"></h2></div><span class="module-id" id="module-id">01</span></div><div class="timer" role="timer" aria-label="剩余时间"><span id="timer-main">00:40</span><small id="timer-fraction">.00</small></div></div><div class="hud-stats"><div><span>失误</span><b id="error-count">0 <small>/ 3</small></b></div><div><span>进度</span><b id="module-count">1 <small>/ 4</small></b></div></div></div><div class="round-progress" aria-label="模块完成进度"><span></span><span></span><span></span></div></div>${Defuse.music.bar()}<p class="module-instruction" id="module-instruction"></p>${Defuse.PressureUI.markup()}<div class="play-console"><span class="console-corner cc1"></span><span class="console-corner cc2"></span><span class="console-corner cc3"></span><span class="console-corner cc4"></span><div id="module-root" aria-describedby="module-instruction"></div><div id="pass-stamp" aria-hidden="true">MODULE CLEARED <b>✓</b></div></div></section>`,
  result: (r) => {
    if (r.opening === "rush-defense") return Defuse.screens.rushResult(r);
    const eliminated = r.reason === "eliminated";
    const smokeDeath = eliminated && r.deathCause === "smoke-crossfire";
    const smokeRadio = smokeDeath && Defuse.smokeDeathDialogue ? `<div class="smoke-result-radio" aria-label="赛后队内语音">${Defuse.smokeDeathDialogue(r).map(line => `<div class="smoke-result-line"><b>${Defuse.escapeHtml(Defuse.cast[line.who]?.name || "队内")}<small>${line.who === r.deathCompanionId ? "阵亡语音" : "场外指挥"}</small></b><p>${Defuse.escapeHtml(line.text)}</p></div>`).join("")}</div>` : "";
    const blind = r.reason === "blind-password";
    const side = r.success ? "CT" : "T";
    const suppressionHits = r.success && r.suppression?.cleared ? r.suppression.hits.length : null;
    const suppressionGrade = suppressionHits >= 40 ? "火力全开" : suppressionHits >= 30 ? "强势压制" : "压制成功";
    const resultEnemyId = Defuse.resultEnemyId(r);
    const guardsCleared = !r.success && resultEnemyId === null;
    const winningSupport = r.rescueCleared ? "ricksaw" : "commander";
    const resultPortrait = r.success ? Defuse.portrait(winningSupport)
      : guardsCleared ? `<div class="result-bomb-mark" aria-hidden="true">${Defuse.teamMark("T")}<b>C4</b></div>`
      : Defuse.enemyPortrait(resultEnemyId);
    const resultSpeech = r.success ? (r.rescueCleared ? "「好拆。这分拿了。」" : "「Nice！包拆了，这分拿下。」")
      : guardsCleared ? (eliminated ? "人清了，可惜没能活着拆包。" : "人清了，<b>包没来得及拆。</b>")
      : `「${Defuse.escapeHtml(Defuse.enemyProfiles[resultEnemyId].loss[eliminated ? "eliminated" : "bomb"])}」`;
    const defeatSubtitle = eliminated ? (r.deathDetail || "血量归零，回防失败。来枪先躲，来火先跑。")
      : blind ? "纸条还没擦净就盲猜，错一位直接炸。下把先看密码。"
      : r.reason === "timeout" ? (guardsCleared ? "人清了，包还得拆。40 秒到了，这分还是没拿到。" : "40 秒到了，包先响了。下把处理快一点。")
      : "第三次失误，包炸了。下把看准了再点。";
    return `<section class="result-screen screen-enter ${r.success ? "victory" : "defeat"} ${eliminated ? "eliminated" : ""} ${smokeDeath ? "smoke-elimination" : ""}"><div class="match-ribbon"><span>ROUND OVER</span><b>DUST II / B 点</b><span>${side} WIN</span></div><div class="victory-banner ${r.success ? "ct-banner" : "t-banner"}">${Defuse.teamMark(side)}<span>${r.success ? "COUNTER-TERRORISTS WIN" : "TERRORISTS WIN"}</span><h1 tabindex="-1">${r.success ? "反恐精英胜利" : "恐怖分子胜利"}</h1><p>${r.success ? (suppressionHits !== null ? `炸弹已拆除 · ${suppressionGrade}` : "CT 阵营胜利 · 炸弹已拆除") : eliminated ? (smokeDeath ? "摸错包位 · 被守包者穿烟击倒" : "T 阵营胜利 · 回防队员被击倒") : "T 阵营胜利 · 炸弹已引爆"}</p>${!r.success ? `<div class="result-audio-cue">${eliminated ? (smokeDeath ? "穿烟扫射 · 回防失败" : "阵亡 · 回防失败") : "C4 起爆回放"} <span>· 可直接开始下一局</span></div>` : ""}</div><div class="result-scene ${guardsCleared ? "result-cleared" : ""}" data-result-enemy="${r.success ? winningSupport : resultEnemyId || "none"}">${resultPortrait}<div class="result-speech">${resultSpeech}</div><strong>${r.success ? "DEFUSED" : eliminated ? "ELIMINATED" : "BOOM."}</strong></div><p class="result-subtitle">${r.success ? (r.suppression?.cleared ? `交火压制 · ${r.suppression.hits.length} / 50 · ${r.suppression.hits.length >= 40 ? "火力全开" : r.suppression.hits.length >= 30 ? "强势压制" : "压制成功"}` : r.errors === 0 ? "好拆，一步没错。" : "差点，好在拆掉了。") : defeatSubtitle}</p>${Defuse.mvpMarkup(r)}${Defuse.resolveMvp(r) ? Defuse.music.mvpBanner(r) : ""}<div class="result-stats"><div><span>剩余时间</span><b>${(r.remaining / 1000).toFixed(2)}<small>s</small></b></div><div><span>完成步骤</span><b>${r.completed.length}<small>/ ${r.moduleCount || 3}</small></b></div><div><span>${suppressionHits !== null ? "压制命中" : "操作失误"}</span><b>${suppressionHits ?? r.errors}<small>/ ${suppressionHits !== null ? 50 : 3}</small></b></div></div><div class="combat-summary"><span>剩余血量 <b>${r.health ?? 100}</b></span><span>受击 <b>${r.hitsTaken ?? 0}</b> 次</span><span>躲避 <b>${r.dodges ?? 0}</b> 次</span><span>反打 <b>${r.duels ?? 0}</b> 次</span><span>队友挡枪 <b>${r.allyBlocks ?? 0}</b> 次</span>${r.rescueCleared ? `<span>里克索尔清场 <b>${r.rescueKills}</b> 人</span>` : ""}</div>${smokeDeath ? smokeRadio : Defuse.supportReaction(r)}${Defuse.rankings?.resultMarkup() || ""}<div class="result-actions"><button class="button primary start-game restart-game" aria-label="点击开始新一局">点击开始 ${Defuse.icon("play", "action-icon")}</button><button class="button secondary go-home">返回首页</button></div><p class="restart-hint">${r.success ? "点击开始可跳过 MVP 音乐，直接进入下一局。" : "点击开始重新挑战。"}</p><p class="result-footnote">下把继续。</p></section>`;
  },
};

