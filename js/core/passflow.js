(function () {
  'use strict';

  /* Reusable "geef de telefoon door" flow: a pass screen per player and an optional
     secret reveal screen. The reveal is either a flip card (Saboteur) or, with `hold: true`,
     a press-and-hold shutter (Undercover). Het Dilemma and Kameleon use their own screen via onSee. */
  const LG = window.LG;
  const $ = LG.$;

  LG.passflow = {
    create(p, o) {
      const opts = Object.assign({
        eyebrow: 'GEEF AAN', tag: '', seeLabel: 'BEKIJK', seeIcon: 'eye', flip: false, hold: false,
        nextLabel: 'VERBERG & VOLGENDE', lastLabel: 'VERBERG & START',
        fill: function () {}, onSee: function () {}, onDone: function () {}, onStop: function () {}
      }, o);
      const id = (s) => p + '-' + s;
      const el = (s) => $('#' + id(s));
      let players = [];
      let idx = 0;
      let flipTimer = null;
      let holdCtl = null;

      const flipReveal = `
      <section class="screen" id="s-${p}-reveal" aria-label="Geheim">
        <div class="wrap">
          <div class="center">
            <p class="eyebrow" id="${p}-who"></p>
            <div class="flip" id="${p}-flip">
              <div class="flip-inner">
                <div class="face front" aria-hidden="true"><span class="q">?</span></div>
                <div class="face back" id="${p}-back"></div>
              </div>
            </div>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-primary" id="${p}-hide" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-eye-off"/></svg><span id="${p}-hidelabel"></span></button>
          </div>
        </div>
      </section>`;

      // Same glow and gradient for every role, so a screen reflection never gives a role away.
      const holdReveal = `
      <section class="screen" id="s-${p}-reveal" aria-label="Geheim">
        <div class="wrap">
          <div class="center">
            <p class="eyebrow" id="${p}-who"></p>
            <div class="hold-card" id="${p}-flip">
              <div class="hold-glyph" aria-hidden="true"><span class="q">?</span></div>
              <div class="secret shutter-closed" id="${p}-back" aria-hidden="true"></div>
            </div>
          </div>
          <div class="actions hold-actions">
            <button type="button" class="btn btn-primary hold-btn" id="btnHoldReveal" aria-pressed="false" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-eye"/></svg>HOUD INGEDRUKT VOOR WOORD</button>
            <button type="button" class="btn" id="btnNextPlayer" disabled><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg><span id="${p}-hidelabel"></span></button>
          </div>
        </div>
      </section>`;

      const html = `
      <section class="screen" id="s-${p}-pass" aria-label="Doorgeven">
        <div class="wrap">
          <header class="top">
            <button type="button" class="icon-btn glass" id="${p}-stop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
            <span class="chip glass-lite">${opts.tag}</span>
          </header>
          <div class="center">
            <p class="eyebrow">${opts.eyebrow}</p>
            <div class="avatar glass" id="${p}-pavatar" aria-hidden="true"></div>
            <h2 class="big-name" id="${p}-pname"></h2>
            <div class="progress" id="${p}-pprog" role="progressbar" aria-label="Voortgang" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i id="${p}-pbar"></i></div>
            <p class="count" id="${p}-pcount"></p>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-primary" id="${p}-see" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-${opts.seeIcon}"/></svg>${opts.seeLabel}</button>
          </div>
        </div>
      </section>
      ${opts.flip ? (opts.hold ? holdReveal : flipReveal) : ''}`;

      function showPass(i) {
        idx = i;
        const pl = players[i], n = players.length;
        const av = el('pavatar');
        av.textContent = LG.initial(pl.name);
        av.style.setProperty('--pc', pl.color || '#8b5cf6');
        el('pname').textContent = pl.name;
        const pct = Math.round((i / n) * 100);
        el('pbar').style.width = pct + '%';
        el('pprog').setAttribute('aria-valuenow', String(pct));
        el('pcount').textContent = (i + 1) + ' / ' + n;
        LG.ui.show(id('pass'));
      }

      function nextText() {
        const last = idx === players.length - 1;
        if (opts.hold) return last ? 'START DE RONDE' : 'DOORGEVEN AAN ' + players[idx + 1].name.toUpperCase();
        return last ? opts.lastLabel : opts.nextLabel;
      }

      function reveal() {
        const pl = players[idx];
        el('who').textContent = pl.name;
        el('back').textContent = '';
        opts.fill(el('back'), pl, idx);
        el('hidelabel').textContent = nextText();
        LG.ui.show(id('reveal'));
        if (opts.hold) {
          if (holdCtl) holdCtl.arm();
        } else {
          const flip = el('flip');
          flip.classList.remove('flipped');
          LG.cancel(flipTimer);
          flipTimer = LG.later(() => flip.classList.add('flipped'), 450);
        }
        LG.buzz(15);
      }

      // Wipes anything secret from the DOM before the phone moves on.
      function clear() {
        LG.cancel(flipTimer);
        if (opts.hold && holdCtl) holdCtl.reset();
        if (opts.flip && el('back')) {
          el('back').textContent = '';
          if (!opts.hold) el('flip').classList.remove('flipped');
        }
      }

      function next() {
        clear();
        if (idx + 1 < players.length) showPass(idx + 1); else opts.onDone();
      }

      const ctrl = {
        html: html,
        mount() {
          LG.ui.mount(html);
          el('see').addEventListener('click', () => {
            if (LG.ui.current() !== id('pass')) return;
            if (opts.flip) reveal(); else opts.onSee(idx, players[idx]);
          });
          if (opts.flip) {
            if (opts.hold) {
              const nextBtn = $('#btnNextPlayer');
              holdCtl = LG.shield.hold({
                button: $('#btnHoldReveal'),
                root: () => el('flip'),
                minMs: 600,
                onLock() { nextBtn.disabled = true; },
                onUnlock() { nextBtn.disabled = false; LG.buzz(8); }
              });
              nextBtn.addEventListener('click', () => {
                if (LG.ui.current() === id('reveal') && holdCtl.isUnlocked()) next();
              });
            } else {
              el('hide').addEventListener('click', () => {
                if (LG.ui.current() === id('reveal')) next();
              });
            }
          }
          // Audio + privacy-shield toggles are also reachable from the hold-to-reveal pass screen.
          if (opts.hold) {
            const top = $('#s-' + p + '-pass .top');
            if (top) top.appendChild(LG.sysBar(false));
          }
          el('stop').addEventListener('click', () => {
            LG.ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: opts.onStop });
          });
          // Anti-spy: never leave a secret on screen when the page goes to the background.
          document.addEventListener('visibilitychange', () => {
            if (!document.hidden || !players.length) return;
            if (opts.flip && LG.ui.current() === id('reveal')) { clear(); showPass(idx); }
          });
        },
        start(list) { players = list; showPass(0); },
        next: next,
        clear: clear,
        index: () => idx,
        cancel() { clear(); players = []; idx = 0; }
      };
      return ctrl;
    }
  };
})();