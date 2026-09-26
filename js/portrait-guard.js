/* Runs in <head>: use device orientation, not the shorter Toy iframe shape. */
(() => {
  const root = document.documentElement;
  const touch = matchMedia('(pointer: coarse) and (hover: none)');
  const mobile = () => navigator.userAgentData?.mobile === true || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    (touch.matches && Math.min(screen.width, screen.height) > 0 && Math.min(screen.width, screen.height) < 600);
  let blocked = false, guard = null, lockRequested = false;
  let restoreFocus = null;
  function landscape() {
    const type = screen.orientation?.type;
    if (/^(portrait|landscape)-/.test(type || '')) return type.startsWith('landscape');
    if (typeof window.orientation === 'number') return Math.abs(window.orientation) % 180 === 90;
    if (screen.width && screen.height) return screen.width > screen.height;
    return innerWidth > innerHeight;
  }
  function update() {
    const next = mobile() && landscape(), changed = next !== blocked;
    blocked = next;
    root.dataset.portraitBlocked = String(blocked);
    const shell = document.querySelector('.site-shell');
    if (shell) shell.inert = blocked || !!document.querySelector(".match-outcome-overlay");
    if (!guard) return;
    if (blocked) {
      if (changed) {
        restoreFocus = document.activeElement;
        document.dispatchEvent(new Event('defuse-orientation-block'));
      }
      for (const panel of document.querySelectorAll('[popover]')) {
        try { panel.hidePopover?.(); } catch {}
      }
      if (!guard.open) {
        try { guard.showModal(); } catch { guard.setAttribute('open', ''); }
      }
    } else if (guard.open) {
      guard.close?.();
      guard.removeAttribute('open');
      if (restoreFocus?.isConnected && restoreFocus.getClientRects().length) restoreFocus.focus({preventScroll:true});
      restoreFocus = null;
    }
  }
  function tryNativeLock() {
    if (!mobile() || lockRequested || !screen.orientation?.lock) return;
    lockRequested = true;
    // Embedded browsers may reject the native lock. The non-dismissible
    // overlay and input gate remain authoritative without fullscreen access.
    try { Promise.resolve(screen.orientation.lock('portrait')).catch(() => {}); } catch {}
  }
  window.leienOrientation = { get blocked() { return blocked; }, refresh:update };
  update();
  addEventListener('resize', update);
  addEventListener('orientationchange', update);
  screen.orientation?.addEventListener?.('change', update);
  touch.addEventListener?.('change', update);
  document.addEventListener('visibilitychange', update);
  // Capture at window level before any game or dialog listeners.
  for (const type of ['pointerdown','pointerup','click','dblclick','keydown','keyup','touchstart','touchmove','wheel','contextmenu'])
    addEventListener(type, event => {
      if (!blocked) { if (type === 'pointerdown') tryNativeLock(); return; }
      if (event.cancelable) event.preventDefault();
      event.stopImmediatePropagation();
    }, {capture:true, passive:false});
  document.addEventListener('DOMContentLoaded', () => {
    guard = document.querySelector('#portrait-guard');
    guard.addEventListener('cancel', event => event.preventDefault());
    guard.addEventListener('close', () => { if (blocked) update(); });
    update();
  }, {once:true});
})();
