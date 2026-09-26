/* Button-based phone pages. Existing nodes stay mounted: no duplicate music,
 * account requests or lost password/round state when switching a view. */
(() => {
  const closeComms = () => document.querySelector('.mobile-comms-toggle')?.setAttribute('aria-expanded', 'false');
  document.addEventListener('click', event => {
    const home = event.target.closest('.home-screen');
    const page = event.target.closest('button[data-home-view]');
    if (home && page) {
      home.dataset.homeView = page.dataset.homeView;
      home.querySelectorAll('button[data-home-view]').forEach(b => b.setAttribute('aria-pressed', String(b === page)));
      window.scrollTo(0, 0);
    }
    const team = event.target.closest('button[data-squad-view]');
    if (home && team) {
      home.dataset.squadView = team.dataset.squadView;
      home.querySelectorAll('button[data-squad-view]').forEach(b => b.setAttribute('aria-pressed', String(b === team)));
    }
    const toggle = event.target.closest('.mobile-comms-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(toggle.getAttribute('aria-expanded') !== 'true'));
    else if (!event.target.closest('.pressure-panel')) closeComms();
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeComms(); });
  document.addEventListener('defuse-threat-start', closeComms);
})();
