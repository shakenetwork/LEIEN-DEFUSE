/* One audible tap, one deliberately readable peek, then the real defuse. */
Defuse.modules.fake = {
  title: "假拆骗枪",
  english: "TAP THE BOMB. HOLD THE ANGLE.",
  instruction: "点包松手，等他露头。两发机会，失手会掉血。",
  banter: "摸一下就松！骗他出来，别把自己骗进去了。",
  mount(ctx) {
    const liveIds = () => (ctx.round.enemyGuardIds || []).filter(id =>
      !(ctx.round.defeatedEnemyIds || []).includes(id) && Defuse.cast[id]);
    const deagle = ctx.round.variation === "deagle";
    const game = new Defuse.FakeDefuse({ enemyIds: liveIds(), weapon: deagle ? "deagle" : "rifle", exposure: deagle ? 2400 : ctx.round.difficulty?.fakeExposure });
    ctx.root.innerHTML = '<section class="fake-unit" data-phase="ready" aria-label="假拆骗枪"><div class="fake-strip"><span>B 门 / 听拆反拉</span><span class="fake-ammo" aria-label="剩余子弹 2 发"><i></i><i></i></span><b data-fake-status>枪线未清</b></div><div class="fake-field" role="group" aria-label="等敌人露头，再点击头部"><span class="fake-angle" aria-hidden="true">B 门枪线</span><div class="fake-wait"><b data-fake-hint>摸一下包，把他骗出来。</b><span data-fake-detail>松手切枪 · 露头再点</span></div><div class="fake-enemy" hidden><img class="fake-enemy-body" alt="" draggable="false"><button type="button" class="fake-head" disabled aria-label="射击守包者头部"><span class="fake-head-art" aria-hidden="true"></span><span class="fake-crosshair" aria-hidden="true">+</span></button><span class="fake-enemy-name"></span></div><div class="fake-window" aria-hidden="true"><i></i></div></div><button type="button" class="fake-action"><span data-fake-button>点包，松手掏枪</span><span class="fake-action-icon" aria-hidden="true">' + Defuse.icon("target") + '</span></button><p class="fake-footnote">先骗枪，再拆包。倒计时不会停。</p><span class="sr-only" data-fake-live aria-live="polite" aria-atomic="true"></span></section>';
    const find = s => ctx.root.querySelector(s);
    const unit = find('.fake-unit'), field = find('.fake-field'), button = find('.fake-action');
    unit.dataset.weapon = game.weapon;
    if (deagle) {
      find('.fake-strip>span').textContent = '沙鹰 / 2.4 秒反打';
      find('.fake-footnote').textContent = '沙鹰 · 目标更小 · 命中一枪即可';
      ctx.banter('这把沙鹰。等他露头再点，别甩飞了。', Defuse.supportId?.(ctx.round) || 'coconut');
    }
    const head = find('.fake-head'), enemy = find('.fake-enemy'), art = find('.fake-enemy-body');
    const status = find('[data-fake-status]'), hint = find('[data-fake-hint]'), detail = find('[data-fake-detail]');
    const buttonText = find('[data-fake-button]'), windowBar = find('.fake-window i'), live = find('[data-fake-live]');
    let phase = null, enemyId, pointer = null, keyHeld = false, keyboardAim = false;
    let ready = false, completed = false, reportedFailures = 0, lastPercent = -1, renderedKey = null, lastAim = -1, shotAt = -Infinity;
    const covered = () => !!document.querySelector('#audio-settings.is-open, #audio-settings:not([hidden])[data-open="true"], #instructions[open]') || (() => { try { return !!document.querySelector('#audio-settings:popover-open'); } catch { return false; } })();
    const available = () => !completed && !document.hidden && !window.leienOrientation?.blocked && !covered() && ctx.active();
    function paint() {
      const state = game.snapshot();
      if (enemyId !== state.targetId) {
        enemyId = state.targetId;
        ready = !enemyId;
        if (enemyId) {
          const member = Defuse.cast[enemyId];
          art.src = Defuse.enemyImage(enemyId);
          ready = art.complete && art.naturalWidth > 0;
          head.style.setProperty('--fake-enemy-image', 'url("' + new URL(art.src, document.baseURI).href + '")');
          head.style.setProperty('--fake-enemy-position', Defuse.enemyProfiles[enemyId]?.headPosition || '55% 12%');
          head.setAttribute('aria-label', '射击' + member.name + '头部');
          find('.fake-enemy-name').textContent = member.name;
        }
      }
      const copy = {
        ready: ['枪线未清', '摸一下包，把他骗出来。', deagle ? '沙鹰在手 · 露头后 2.4 秒 · 两发机会' : '松手切枪 · 露头再点', '点包，松手掏枪'],
        touching: ['拆包声已响', '他听到了！松手掏枪。', '不需要长按到底', '松手，架住 B 门'],
        armed: ['听到脚步', 'B 门有动静，架住！', '等他露头 · 别提前开枪', '已切枪 · 等他露头'],
        exposed: ['敌人露头', state.shotsLeft === 1 ? '还剩一发，跟住他！' : '露头了，跟住他的头！', deagle ? '沙鹰 · 2.4 秒 · 命中一枪即可' : '两发机会 · 他会横向移动', '点击移动的敌人头部'],
        retry: ['被反打了', state.reason === 'late' ? '犹豫太久，被他打中了！' : state.reason === 'early' ? '提前打空，被他反拉了！' : '两发空了，被他反打了！', '这轮失手掉血，倒计时不停', '再摸一下包'],
        won: ['枪线已清', '好枪！回来拆包。', '人打掉了，包还得拆。', '枪线已清'],
        clear: ['枪线已清', '这边没人了，接着拆。', '回包，别耗时间。', '继续拆包']
      }[state.phase];
      const key = [state.phase, state.targetId, ready, state.reason, state.shotsLeft].join('|');
      if (key !== renderedKey) {
        renderedKey = key;
        unit.dataset.phase = state.phase;
        enemy.hidden = !['exposed', 'won'].includes(state.phase);
        head.disabled = state.phase !== 'exposed';
        button.disabled = !ready || ['armed', 'exposed', 'won'].includes(state.phase);
        status.textContent = copy[0]; hint.textContent = copy[1]; detail.textContent = copy[2];
        const ammo = find('.fake-ammo');
        ammo.setAttribute('aria-label', '剩余子弹 ' + state.shotsLeft + ' 发');
        [...ammo.children].forEach((dot, index) => dot.classList.toggle('is-spent', index >= state.shotsLeft));
        buttonText.textContent = ready ? copy[3] : '探员准备中…';
      }
      if (phase !== state.phase) {
        phase = state.phase;
        live.textContent = copy[1];
        ctx.action(copy[0]);
        if (phase === 'exposed' && keyboardAim) head.focus({ preventScroll: true });
      }
      const percent = state.phase === 'exposed' ? Math.ceil(state.remaining / game.exposure * 100) : 0;
      if (lastPercent !== percent) { lastPercent = percent; windowBar.style.transform = 'scaleX(' + percent / 100 + ')'; }
      const aim = Math.round(state.aimX * 1000) / 10;
      if (aim !== lastAim) { lastAim = aim; enemy.style.left = aim + '%'; }
      if (state.failures > reportedFailures) {
        reportedFailures = state.failures;
        ctx.stopSound();
        ctx.counterfire(state.damage);
        detail.textContent = '受到 ' + state.damage + ' 点伤害 · 剩余 ' + Math.max(0,ctx.round.health) + ' HP';
        live.textContent = copy[1] + detail.textContent;
        button.disabled = ctx.round.health <= 0;
      }
      field.classList.toggle('fake-shot', performance.now() - shotAt < 110);
    }
    function sync() {
      const state = game.snapshot();
      const ids = liveIds();
      if (state.phase !== 'won' && (!ids.includes(state.targetId) || state.phase === 'clear' && ids.length)) game.reconcile(ids);
    }
    function completeClear() {
      if (!available()) return;
      sync();
      if (game.phase !== 'clear') { paint(); return; }
      if (ctx.defeatEnemy(null) !== true) return;
      completed = true;
      ctx.complete('枪线已经清了，回来把包拆掉。');
    }
    function begin() {
      if (!available() || !ready) return;
      sync();
      if (game.phase === 'clear') { completeClear(); return; }
      if (!['ready', 'retry'].includes(game.phase)) return;
      game.press();
      ctx.sound('defuse');
      paint();
    }
    function release() {
      if (game.phase !== 'touching') return;
      // This is a short start cue, not the final hold loop. Let a quick tap be audible.
      if (!available()) { ctx.stopSound(); game.cancel(liveIds()); paint(); return; }
      game.release();
      paint();
    }
    function cancel() {
      pointer = null; keyHeld = false;
      if (completed || game.phase === 'won') return;
      ctx.stopSound();
      game.cancel(liveIds());
      paint();
    }
    function shoot(hit) {
      if (!available()) return;
      sync();
      const before = game.step();
      // Render the peek before accepting a coincident touch on the scenery.
      if (before.phase === 'exposed' && phase !== 'exposed') { paint(); return; }
      if (!['armed', 'exposed'].includes(before.phase)) { paint(); return; }
      game.shoot(hit);
      shotAt = performance.now();
      // The hit sound must survive module completion on this same input frame.
      if (deagle || game.phase !== 'retry') ctx.sound(deagle ? 'deagle' : 'shot', { group: 'combat-shot' });
      paint();
      if (game.phase !== 'won') return;
      if (ctx.defeatEnemy(game.targetId) !== true) { game.cancel(liveIds()); paint(); return; }
      completed = true;
      ctx.complete('骗出来了，好枪！先检修，再回来拆包。');
    }
    ctx.listen(art, 'load', () => { ready = true; paint(); });
    ctx.listen(art, 'error', () => { ready = true; unit.classList.add('fake-art-fallback'); paint(); });
    ctx.listen(button, 'pointerdown', e => {
      if (!e.isPrimary || e.button !== 0 || pointer !== null || button.disabled) return;
      e.preventDefault(); e.stopPropagation();
      keyboardAim = false;
      pointer = e.pointerId;
      button.setPointerCapture(e.pointerId);
      begin();
    });
    ctx.listen(button, 'pointerup', e => {
      if (e.pointerId !== pointer) return;
      e.preventDefault(); e.stopPropagation();
      pointer = null; release();
    });
    ctx.listen(button, 'pointercancel', cancel);
    ctx.listen(button, 'lostpointercapture', () => { if (pointer !== null) cancel(); });
    ctx.listen(button, 'keydown', e => {
      if (![' ', 'Enter'].includes(e.key)) return;
      e.preventDefault();
      if (e.repeat || pointer !== null) return;
      keyHeld = true; keyboardAim = true; begin();
    });
    ctx.listen(button, 'keyup', e => {
      if (!keyHeld || ![' ', 'Enter'].includes(e.key)) return;
      e.preventDefault(); keyHeld = false; release();
    });
    ctx.listen(button, 'click', e => {
      e.preventDefault(); e.stopPropagation();
      // Pointer and key releases already handled the tap. AT clicks have no press.
      if (e.detail || !['ready', 'retry', 'clear'].includes(game.phase)) return;
      keyboardAim = true; begin(); release();
    });
    ctx.listen(field, 'pointerdown', e => {
      if (!e.isPrimary || e.button !== 0 || pointer !== null) return;
      if (!['armed', 'exposed'].includes(game.phase)) return;
      e.preventDefault(); e.stopPropagation();
      keyboardAim = false; shoot(!!e.target.closest('.fake-head'));
    });
    ctx.listen(head, 'click', e => {
      e.preventDefault(); e.stopPropagation();
      if (e.detail !== 0) return;
      keyboardAim = true; shoot(true);
    });
    ctx.listen(unit, 'contextmenu', e => e.preventDefault());
    ctx.listen(window, 'blur', cancel);
    ctx.listen(document, 'visibilitychange', () => { if (document.hidden) cancel(); });
    ctx.listen(document, 'defuse-orientation-block', cancel);
    ctx.frame(() => {
      if (covered() && ['touching','armed','exposed'].includes(game.phase)) { cancel(); return; }
      if (!available()) return;
      sync();
      game.step();
      paint();
    });
    paint();
  }
};
