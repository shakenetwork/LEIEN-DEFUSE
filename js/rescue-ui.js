/* The rare Ricksaw sequence is a visible, fixed-duration opening, not a QTE. */
(() => {
  const clean = value => Defuse.escapeHtml(String(value ?? ''));
  const copy = {
    pinched: ['交叉枪线，先活下来！', '别探头！B 门和包点都有人，先贴住掩体。', '遭遇夹击'],
    critical: ['血线见底，援手到了。', '只剩这点血了……B 门有脚步，自己人！', '残血 / 等待接应'],
    arriving: ['里克索尔，接管枪线。', '你先缩着，别出来。这几个人我来打。', '王牌步枪手'],
    clearing: ['别急，这一波我来。', '门口一个……掉了。先别出来，点里还有。', '清理守包者'],
    won: ['枪线全清。你来拆包。', '清了清了，你来拆。有钳，最后按住五秒。', '守包者全清'],
  };
  class RescueUI {
    constructor(root, { model, round, onProgress = () => {}, onWin = () => {}, onFail = () => {} }) {
      this.root = root; this.model = model; this.round = round;
      this.onProgress = onProgress; this.onWin = onWin; this.onFail = onFail;
      this.disposed = false; this.completed = false; this.lastPhase = null;
      this.lastDamage = 0; this.lastKills = 0; this.lastProgress = '';
      this.lastRenderedAt = this.model.now();
      const initial = model.snapshot();
      const ricksaw = Defuse.cast.ricksaw;
      if (!ricksaw?.image) throw new Error('Ricksaw artwork must be registered before mounting the rescue');
      this.guardIds = [...initial.remainingGuardIds];
      const target = initial.targetId ? Defuse.cast[initial.targetId] : null;
      this.guardIds.forEach(id => { if (!Defuse.cast[id]?.image) throw new Error('Missing rescue guard: ' + id); });
      root.innerHTML = '<section class="rescue-screen" data-phase="pinched" aria-label="里克索尔救场">' +
        '<div class="rescue-strip"><span>CT / B 门回防</span><span class="rescue-hp" data-rescue-hp>生命 <b>' + initial.health + '</b></span><span>C4 <b data-rescue-clock>00:40</b></span></div>' +
        '<div class="rescue-heading"><div><span class="rescue-kicker">LAST STAND / 绝境回防</span><h1 data-rescue-title>交叉枪线，先活下来！</h1></div><span class="rescue-episode">稀有遭遇</span></div>' +
        '<div class="rescue-arena" role="img" aria-label="沙二 B 门，队友正在回防接应">' +
          '<div class="rescue-crossfire" aria-hidden="true"><i></i><i></i></div>' +
          '<div class="rescue-vignette" aria-hidden="true"></div><div class="rescue-muzzle" aria-hidden="true"></div><div class="rescue-dust" aria-hidden="true"></div>' +
          '<div class="rescue-roster">' + this.guardIds.map(id => '<span class="rescue-guard" data-rescue-guard="' + clean(id) + '" title="' + clean(Defuse.cast[id].name) + '"><img src="' + clean(Defuse.enemyImage(id)) + '" alt="' + clean(Defuse.cast[id].name) + '" draggable="false"><i aria-hidden="true"></i></span>').join('') + '<b data-rescue-left>' + initial.remainingGuardIds.length + ' 名守包</b></div>' +
          (target ? '<img class="rescue-opponent" src="' + clean(Defuse.enemyImage(initial.targetId)) + '" alt="" draggable="false">' : '') +
          '<img class="rescue-hero" src="' + clean(ricksaw.image) + '" alt="海军上尉里克索尔" draggable="false">' +
          '<div class="rescue-cover" aria-hidden="true"></div>' +
          '<div class="rescue-killfeed" aria-label="本次回防击杀" data-rescue-killfeed></div>' +
          '<div class="rescue-arena-caption"><span data-rescue-stage>遭遇夹击</span><b>回防演出 · 无需点击</b></div>' +
        '</div>' +
        '<div class="rescue-command"><span class="rescue-command-badge" aria-hidden="true">CT</span><div><b data-rescue-speaker>队内无线电</b><p data-rescue-line>别探头！B 门和包点都有人，先贴住掩体。</p></div></div>' +
        '<div class="rescue-progress" role="progressbar" aria-label="队友回防进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>' +
        '<p class="rescue-handoff">队友清枪线 → 你解开面板 → 按住拆包</p>' +
        '<span class="sr-only" data-rescue-live aria-live="polite" aria-atomic="true"></span></section>';
      const find = selector => root.querySelector(selector);
      this.screen = find('.rescue-screen'); this.arena = find('.rescue-arena');
      this.hp = find('[data-rescue-hp] b'); this.clock = find('[data-rescue-clock]');
      this.title = find('[data-rescue-title]'); this.stage = find('[data-rescue-stage]');
      this.line = find('[data-rescue-line]'); this.speaker = find('[data-rescue-speaker]');
      this.feed = find('[data-rescue-killfeed]'); this.left = find('[data-rescue-left]');
      this.progress = find('.rescue-progress'); this.live = find('[data-rescue-live]');
      this.step();
    }
    sound(name) {
      // Re-entry from a background tab settles state without replaying a burst.
      if (document.hidden || window.leienOrientation?.blocked) return;
      Defuse.audio?.play(name, { group: 'rescue', volume: name === 'distant' ? .2 : .27 });
    }
    step() {
      if (this.disposed || this.completed) return;
      this.round.tick();
      if (this.round.state === 'ended') {
        this.completed = true;
        this.onFail({ ...this.model.snapshot(), phase: 'failed', reason: this.round.result?.reason || 'timeout' });
        return;
      }
      const state = this.model.step();
      const signature = [state.health, ...state.defeatedEnemyIds].join('|');
      if (signature !== this.lastProgress) { this.lastProgress = signature; this.onProgress(state); }
      const seconds = Math.ceil(Math.max(0, this.round.remaining) / 1000);
      const clock = String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0');
      if (this.clock.textContent !== clock) this.clock.textContent = clock;
      const fresh = !document.hidden && !window.leienOrientation?.blocked && this.model.now() - this.lastRenderedAt < 650;
      if (!document.hidden) this.lastRenderedAt = this.model.now();
      const damaged = state.damageTaken > this.lastDamage;
      const killed = state.killCount > this.lastKills;
      if (damaged) { this.hp.textContent = state.health; if (fresh) this.sound('distant'); }
      else if (killed && fresh) this.sound('shot');
      this.lastDamage = state.damageTaken; this.lastKills = state.killCount;
      this.screen.classList.toggle('is-critical', state.health <= 28);
      this.screen.classList.toggle('is-cleared', state.remainingGuardIds.length === 0);
      this.screen.classList.toggle('is-hit', state.elapsed >= 700 && state.elapsed < 1040 || state.elapsed >= 2100 && state.elapsed < 2440);
      const lastKillAt = 3650 + Math.max(0, state.killCount - 1) * 500;
      this.screen.classList.toggle('is-firing', state.killCount > 0 && state.elapsed - lastKillAt < 110);
      this.screen.dataset.phase = state.phase;
      if (state.phase !== this.lastPhase) {
        this.lastPhase = state.phase;
        const [title, line, tag] = copy[state.phase] || copy.pinched;
        this.title.textContent = title; this.line.textContent = line; this.stage.textContent = tag;
        this.speaker.textContent = ['arriving', 'clearing', 'won'].includes(state.phase) ? '海军上尉里克索尔 · 回防核心' : '队内无线电';
        this.live.textContent = title + ' ' + line;
      }
      if (killed) {
        const down = new Set(state.defeatedEnemyIds);
        this.root.querySelectorAll('[data-rescue-guard]').forEach(el => {
          const dead = down.has(el.dataset.rescueGuard);
          el.classList.toggle('is-down', dead);
          el.setAttribute('aria-label', Defuse.cast[el.dataset.rescueGuard].name + (dead ? ' 已击杀' : ' 守包中'));
        });
        this.feed.innerHTML = state.defeatedEnemyIds.map(id => '<div><b>里克索尔</b><span>M4A1-S</span><strong>' + clean(Defuse.cast[id].name) + '</strong></div>').join('');
        this.left.textContent = state.remainingGuardIds.length ? '还剩 ' + state.remainingGuardIds.length + ' 名' : '守包者全清';
      }
      const percent = Math.min(100, Math.floor(state.elapsed / state.duration * 100));
      this.progress.firstElementChild.style.transform = 'scaleX(' + percent / 100 + ')';
      this.progress.setAttribute('aria-valuenow', String(percent));
      if (state.phase === 'won') { this.completed = true; this.onWin(state); }
    }
    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      Defuse.audio?.stop('rescue');
    }
  }
  Defuse.RescueUI = RescueUI;
})();
