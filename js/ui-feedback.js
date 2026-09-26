/* Menu feedback only. A click is heard once, after synchronous page cleanup. */
(() => {
  const audio = Defuse.audio;
  let pending = 0, serial = 0, lastAt = -Infinity;
  const levels = { tap: .18, select: .22, confirm: .28, back: .15 };
  function prepare() {
    audio.unlock();
    if (audio.ctx && !audio.muted) audio.buffer(Defuse.assets.sounds.uiTap).catch(() => {});
  }
  function cancel() { clearTimeout(pending); pending = 0; serial++; }
  function play(kind = 'tap') {
    if (document.hidden || audio.muted) return;
    prepare();
    const requestedAt = audio.clock();
    // Fast repeat input stays tactile without stacking a chorus of clicks.
    if (requestedAt - lastAt < 65) return;
    lastAt = requestedAt;
    cancel();
    const request = serial, epoch = audio.effectEpoch;
    pending = setTimeout(() => {
      pending = 0;
      if (request !== serial || document.hidden || audio.muted || audio.effectEpoch !== epoch || audio.clock() - requestedAt > 180) return;
      // Start after click handlers finish replacing the page and stopping its
      // old sounds. The gesture already unlocked audio synchronously above.
      audio.play('uiTap', { group: 'ui', volume: levels[kind] ?? levels.tap, fallback: false });
    }, 0);
  }
  function eligible(target) {
    const control = target?.closest?.('button,a,input');
    if (!control || control.disabled || control.getAttribute('aria-disabled') === 'true' || control.closest('[inert]') || !control.getClientRects().length) return null;
    if (control.matches('input')) return control.matches('.home-screen input[name="challenge-map"]') ? control : null;
    if (control.matches('.wordmark') && !document.querySelector('.home-screen,.leaderboard-screen,.result-screen')) return null;
    return control.matches('.sound-button,.wordmark') || control.closest('.home-screen,.leaderboard-screen,#audio-settings,#surrender-dialog,.training-skip-dialog') || control.matches('[data-training]') ? control : null;
  }
  document.addEventListener('click', event => {
    const control = eligible(event.target);
    if (!control) return;
    const kind = control.matches('.start-game,.show-training,[data-training="begin"],[data-training="play"],[data-confirm-surrender]') ? 'confirm'
      : control.matches('.go-home,.wordmark,[data-surrender-cancel],[popovertargetaction="hide"],[data-training="exit"],[data-keep-training]') ? 'back'
      : control.matches('[data-roster-pick],[data-music-choice],[data-role-reveal],[data-squad-view],input[name="challenge-map"]') ? 'select' : 'tap';
    play(kind);
  }, true);
  // A label forwards a native click to its input. Listening to change (only)
  // prevents doubled clicks, and reads the final mute setting after its handler.
  document.addEventListener('change', event => {
    if (event.target.matches('#audio-settings input[type="checkbox"]')) play('select');
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  Defuse.uiFeedback = { play, cancel };
})();
