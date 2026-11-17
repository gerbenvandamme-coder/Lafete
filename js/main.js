(function () {
  'use strict';

  const LG = window.LG;

  // Back to the game list from anywhere: stops timers, closes sheets and lets every game clean up.
  LG.home = function () {
    LG.cancelAll();
    LG.ui.closeAll();
    LG.games.forEach((g) => { if (g.reset) g.reset(); });
    LG.hub.render();
    LG.ui.show('hub', { back: true });
  };

  LG.ui.init();
  LG.hub.build();
  LG.games.forEach((g) => g.mount());
  LG.hub.render();
  LG.ui.show('welcome');
})();
