(function () {
  'use strict';

  const LG = window.LG;

  // Back to the hub from anywhere: stops timers, closes modals and lets every game clean up.
  LG.home = function () {
    LG.cancelAll();
    LG.ui.closeAll();
    LG.games.forEach((g) => { if (g.reset) g.reset(); });
    LG.hub.render();
    LG.ui.show('hub');
  };

  // Back to the welcome portal (the LaFête home screen), with the same clean-up as LG.home.
  LG.toWelcome = function () {
    LG.cancelAll();
    LG.ui.closeAll();
    LG.games.forEach((g) => { if (g.reset) g.reset(); });
    LG.welcome.show();
  };

  // Every LaFête logo (.logo) is a button that leads back to the home screen.
  function bindBrandLinks() {
    document.querySelectorAll('.logo').forEach((el) => {
      el.classList.add('brand-link');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', '0');
      el.setAttribute('aria-label', 'LaFête, terug naar het beginscherm');
      el.addEventListener('click', () => LG.toWelcome());
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); LG.toWelcome(); }
      });
    });
  }

  LG.ui.init();
  LG.hub.build();
  LG.games.forEach((g) => g.mount());
  LG.settings.build();
  LG.welcome.build();
  LG.groups.build();
  bindBrandLinks();
  LG.hub.render();
  LG.welcome.show();
})();