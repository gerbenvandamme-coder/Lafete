(function () {
  'use strict';

  const LG = window.LG;
  const $ = LG.$, h = LG.h, store = LG.store, ui = LG.ui;

  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 12;
  const PAIRS = LG.data.golflengte;
  const ZONES = [[10, 'p2'], [6, 'p3'], [2, 'p4']]; // half-width in % of the bar, css class
  const VERDICT = { 4: 'BULLSEYE!', 3: 'BIJNA PERFECT', 2: 'DICHTBIJ', 0: 'MIS' };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  // Dial geometry in viewBox units (0 0 320 190): value 0 = far left, 100 = far right, over the top.
  const DIAL = { cx: 160, cy: 170, w: 320, h: 190, zoneIn: 84, zoneOut: 124, tickOut: 144, tickMin: 136, tickMaj: 128 };

  let cfg = null;
  let game = null;
  let dragId = null;
  let timers = [];
  let tickEls = [];
  let vTimer = 0;
  // Kanteling van de wijzerplaat (graden); houd gelijk aan --rx in golflengte.css. De aanwijsmeting corrigeert hiervoor.
  const TILT_X = 8;
  const TILT_COS = Math.cos((TILT_X * Math.PI) / 180);

  const later = (fn, ms) => { const id = LG.later(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(LG.cancel); timers = []; };
  const pointsFor = (d) => (d <= 2 ? 4 : d <= 6 ? 3 : d <= 10 ? 2 : 0);

  const HTML = ui.setupHtml('gl', 'GOLFLENGTE', '<div class="stack" id="gl-opts"></div>', 'START SPEL') + `
  <section class="screen" id="s-gl-play" aria-label="Golflengte">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="gl-pstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="gl-turn"></span>
        <span class="chip glass-lite" id="gl-score"></span>
      </header>
      <div class="center gl-center">
        <div class="gl-gids glass-lite" id="gl-gids"></div>
        <div class="gl-card glass" id="gl-card">
          <div class="gl-ends"><span class="gl-end l" id="gl-l"></span><span class="gl-end r" id="gl-r"></span></div>
          <div class="gl-wrap">
            <div class="gl-track" id="gl-track" role="slider" tabindex="-1" aria-label="Gok van de groep" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" aria-disabled="true">
              <svg class="gl-dial" id="gl-dial" viewBox="0 0 320 190" aria-hidden="true" focusable="false">
                <defs>
                  <radialGradient id="glFace" cx="160" cy="170" r="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity=".16"/><stop offset=".7" stop-color="#a5b4fc" stop-opacity=".07"/><stop offset="1" stop-color="#0b0b1e" stop-opacity=".38"/></radialGradient>
                  <linearGradient id="glBezel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".8"/><stop offset=".55" stop-color="#8b5cf6" stop-opacity=".4"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".55"/></linearGradient>
                  <linearGradient id="glGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".4"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
                  <radialGradient id="glHub" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c4b5fd"/><stop offset="1" stop-color="#4c1d95"/></radialGradient>
                  <filter id="glBlur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
                </defs>
                <ellipse class="gl-floor" cx="160" cy="177" rx="150" ry="9" fill="#000000" opacity=".5" filter="url(#glBlur)"/>
                <path class="gl-rim" d="M 5 170 A 155 155 0 0 1 315 170" fill="none" stroke="url(#glBezel)" stroke-width="9" stroke-linecap="round"/>
                <path class="gl-face" d="M 10 170 A 150 150 0 0 1 310 170 Z" fill="url(#glFace)"/>
                <path class="gl-inner" d="M 88 170 A 72 72 0 0 1 232 170"/>
                <g class="gl-zones" id="gl-zones"></g>
                <g class="gl-ticks" id="gl-ticks"></g>
                <line class="gl-base" x1="10" y1="170" x2="310" y2="170"/>
                <path class="gl-gloss" d="M 34 150 A 126 126 0 0 1 286 150 Q 160 104 34 150 Z" fill="url(#glGloss)"/>
                <g class="gl-ghost" id="gl-ghost">
                  <line x1="160" y1="170" x2="160" y2="58"/>
                </g>
                <g class="gl-needle" id="gl-needle">
                  <circle class="gl-aura" cx="160" cy="52" r="20" filter="url(#glBlur)"/>
                  <line class="shade" x1="160" y1="170" x2="160" y2="52" transform="translate(3 6)"/>
                  <line class="glow" x1="160" y1="170" x2="160" y2="52"/>
                  <line class="main" x1="160" y1="170" x2="160" y2="52"/>
                  <circle class="gl-tip" cx="160" cy="52" r="7"/>
                </g>
                <circle class="gl-hub" cx="160" cy="170" r="13" fill="url(#glHub)"/>
              </svg>
            </div>
          </div>
          <p class="gl-status" id="gl-status" aria-live="polite"></p>
        </div>
        <div class="gl-result" id="gl-result" hidden>
          <span class="gl-pts" id="gl-pts"></span>
          <span class="gl-verdict" id="gl-verdict"></span>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="gl-hide" hidden><svg class="ic" aria-hidden="true"><use href="#i-eye-off"/></svg>VERBERG DOEL</button>
        <button type="button" class="btn btn-primary" id="gl-reveal" hidden><svg class="ic" aria-hidden="true"><use href="#i-eye"/></svg>ONTHUL</button>
        <button type="button" class="btn btn-primary" id="gl-next" hidden><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg><span id="gl-nextlabel">VOLGENDE</span></button>
      </div>
    </div>
  </section>

  <section class="screen victory" id="s-gl-end" aria-label="Einde">
    <div class="wrap">
      <div class="vscroll">
        <div class="vhead">
          <svg class="ic" aria-hidden="true"><use href="#i-crown"/></svg>
          <h2 id="gl-etitle"></h2>
          <p class="eyebrow" id="gl-esub"></p>
        </div>
        <ul class="plist" id="gl-elist"></ul>
      </div>
      <div class="foot">
        <button type="button" class="btn" id="gl-ehome"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>HUB</button>
        <button type="button" class="btn btn-primary" id="gl-again" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>NIEUW POTJE</button>
      </div>
    </div>
  </section>`;

  /* The Gids is handed the phone through the shared pass screen, then sees the target. */
  const flow = LG.passflow.create('gl', {
    tag: 'GOLFLENGTE', eyebrow: 'DE GIDS', seeLabel: 'BEKIJK DOEL', seeIcon: 'target',
    onSee() {
      if (!game) return;
      game.phase = 'peek';
      renderPlay();
      ui.show('gl-play');
    },
    onStop() { LG.home(); }
  });

  /* ----- setup ----- */
  function loadCfg() { cfg = store.cfg('golflengte', { turns: 1 }); store.save(); }

  function renderSetup() {
    if (!cfg) loadCfg();
    ui.fillStrip('gl');
    const fresh = store.freshCount('golflengte', PAIRS);
    $('#gl-chip').textContent = fresh + ' KAARTEN';
    const box = $('#gl-opts');
    box.textContent = '';
    box.appendChild(h('p', { class: 'how glass-lite' },
      h('b', {}, 'HOE WERKT HET? '),
      'De Gids ziet waar het doel zit op de balk en geeft één hint. De groep sleept de marker naar de plek waar het doel volgens hen zit. Dichter bij = meer punten voor de Gids.'));
    box.appendChild(h('p', { class: 'sec' }, 'BEURTEN'));
    box.appendChild(ui.numStepper({
      label: 'PER SPELER', icon: 'wave', rgb: '232,121,249', minus: 'Minder beurten', plus: 'Meer beurten',
      obj: cfg, key: 'turns', min: 1, max: 3
    }).el);
  }

  /* ----- game flow ----- */
  function startGame() {
    const roster = store.active();
    if (roster.length < MIN_PLAYERS || roster.length > MAX_PLAYERS) {
      ui.toast('Golflengte is voor ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' spelers');
      LG.buzz(25);
      return;
    }
    if (!cfg) loadCfg();
    const order = LG.shuffle(roster.map((p, i) => i));
    const turns = [];
    for (let t = 0; t < cfg.turns; t++) order.forEach((i) => turns.push(i));
    game = {
      players: roster.map((p, i) => ({ id: i, pid: p.id, name: p.name, color: store.color(p.id) })),
      turns: turns, turn: 0, scores: {}, group: 0,
      pair: ['', ''], target: 50, guess: 50, gids: null, phase: 'idle', pts: 0
    };
    LG.buzz(20);
    beginTurn();
  }

  function beginTurn() {
    const g = game;
    const picked = store.draw('golflengte', PAIRS);
    const parts = String(picked.item).split('|');
    g.pair = [parts[0] || '', parts[1] || ''];
    g.target = 5 + LG.rand(91); // 5..95
    g.guess = 50;
    g.pts = 0;
    g.gids = g.players[g.turns[g.turn]];
    g.phase = 'gate';
    if (picked.recycled) ui.toast('Alle kaarten gehad — opnieuw geschud');
    flow.start([g.gids]);
    $('#gl-pcount').textContent = 'BEURT ' + (g.turn + 1) + ' / ' + g.turns.length;
    const pct = Math.round((g.turn / g.turns.length) * 100);
    $('#gl-pbar').style.width = pct + '%';
    $('#gl-pprog').setAttribute('aria-valuenow', String(pct));
  }

  /* ----- play screen ----- */
  const svgEl = (name, attrs) => {
    const el = document.createElementNS(SVG_NS, name);
    Object.keys(attrs).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  };
  const fmt = (n) => n.toFixed(2);

  function polar(r, v) {
    const a = Math.PI * (1 - v / 100);
    return [DIAL.cx + r * Math.cos(a), DIAL.cy - r * Math.sin(a)];
  }

  // Annular sector between two dial values (used for the scoring zones).
  function sectorPath(v1, v2) {
    const o1 = polar(DIAL.zoneOut, v1), o2 = polar(DIAL.zoneOut, v2);
    const i2 = polar(DIAL.zoneIn, v2), i1 = polar(DIAL.zoneIn, v1);
    return 'M' + fmt(o1[0]) + ' ' + fmt(o1[1]) +
      ' A' + DIAL.zoneOut + ' ' + DIAL.zoneOut + ' 0 0 1 ' + fmt(o2[0]) + ' ' + fmt(o2[1]) +
      ' L' + fmt(i2[0]) + ' ' + fmt(i2[1]) +
      ' A' + DIAL.zoneIn + ' ' + DIAL.zoneIn + ' 0 0 0 ' + fmt(i1[0]) + ' ' + fmt(i1[1]) + ' Z';
  }

  // Clock-style tick marks: one every 2 %, a longer one every 10 %.
  function buildDial() {
    const ticks = $('#gl-ticks');
    ticks.textContent = '';
    tickEls = [];
    for (let i = 0; i <= 50; i++) {
      const major = i % 5 === 0;
      const a = polar(major ? DIAL.tickMaj : DIAL.tickMin, i * 2);
      const b = polar(DIAL.tickOut, i * 2);
      const line = svgEl('line', {
        class: 'gl-tick' + (major ? ' maj' : ''),
        x1: fmt(a[0]), y1: fmt(a[1]), x2: fmt(b[0]), y2: fmt(b[1])
      });
      tickEls.push(line);
      ticks.appendChild(line);
    }
  }

  function renderZones(on) {
    const box = $('#gl-zones');
    box.textContent = '';
    if (!on) return;
    const t = game.target;
    ZONES.forEach((z) => {
      box.appendChild(svgEl('path', {
        class: 'gl-zone ' + z[1],
        d: sectorPath(Math.max(0, t - z[0]), Math.min(100, t + z[0]))
      }));
    });
  }

  function updateThumb() {
    const g = game ? game.guess : 50;
    const rot = 'rotate(' + ((g - 50) * 1.8).toFixed(2) + 'deg)';
    const dial = $('#gl-dial');
    $('#gl-needle').style.transform = rot;
    $('#gl-ghost').style.transform = rot;
    // De wijzerplaat helt licht mee, en de gloed kleurt van cyaan (links) naar roze (rechts).
    dial.style.setProperty('--ry', ((g - 50) * 0.06).toFixed(2) + 'deg');
    dial.style.setProperty('--gh', String(Math.round(190 + g * 1.2)));
    tickEls.forEach((t, i) => {
      const n = Math.max(0, 1 - Math.abs(i * 2 - g) / 9);
      t.style.setProperty('--n', n.toFixed(2));
    });
    $('#gl-track').setAttribute('aria-valuenow', String(Math.round(g)));
  }

  function renderPlay() {
    const g = game;
    const ph = g.phase;
    const dial = $('#gl-dial'), track = $('#gl-track'), card = $('#gl-card');
    const last = g.turn >= g.turns.length - 1;

    $('#gl-turn').textContent = 'BEURT ' + (g.turn + 1) + '/' + g.turns.length;
    $('#gl-score').textContent = g.group + ' PT';
    $('#gl-l').textContent = g.pair[0];
    $('#gl-r').textContent = g.pair[1];

    const box = $('#gl-gids');
    box.textContent = '';
    box.appendChild(ui.avatar(g.gids.pid, g.gids.name));
    box.appendChild(h('span', { class: 'gl-gtext' }, h('small', {}, 'DE GIDS'), h('b', {}, g.gids.name)));

    renderZones(ph === 'peek' || ph === 'revealing' || ph === 'revealed');
    dial.classList.toggle('peek', ph === 'peek');
    if (ph === 'peek' || ph === 'guess') dial.classList.remove('open');
    if (ph === 'revealed') dial.classList.add('open');

    // No inline visibility here: a forced "visible" would keep the gauge on screen after the game is left.
    track.setAttribute('aria-disabled', ph === 'guess' ? 'false' : 'true');
    track.setAttribute('tabindex', ph === 'guess' ? '0' : '-1');
    updateThumb();

    const status = { peek: 'ALLEEN VOOR DE GIDS · GEEF DAARNA 1 HINT', guess: 'SLEEP DE MARKER · GIDS, NIET PRATEN' };
    $('#gl-status').textContent = status[ph] || '';

    if (ph === 'revealed') card.setAttribute('data-pts', String(g.pts)); else card.removeAttribute('data-pts');
    $('#gl-result').hidden = ph !== 'revealed';
    $('#gl-hide').hidden = ph !== 'peek';
    $('#gl-reveal').hidden = ph !== 'guess';
    $('#gl-next').hidden = ph !== 'revealed';
    $('#gl-nextlabel').textContent = last ? 'EINDE' : 'VOLGENDE';
  }

  function hideTarget() {
    if (!game || game.phase !== 'peek') return;
    game.phase = 'guess';
    renderPlay();
    LG.buzz(12);
  }

  function reveal() {
    const g = game;
    if (!g || g.phase !== 'guess') return;
    dragId = null;
    $('#gl-track').classList.remove('drag');
    g.phase = 'revealing';
    renderPlay();
    $('#gl-reveal').hidden = true;
    later(() => { if (game === g) $('#gl-dial').classList.add('open'); }, 80);
    later(() => { if (game === g) showResult(); }, 1250);
    LG.buzz(15);
  }

  function showResult() {
    const g = game;
    const d = Math.round(Math.abs(g.guess - g.target) * 10) / 10;
    g.pts = pointsFor(d);
    g.phase = 'revealed';
    g.scores[g.gids.id] = (g.scores[g.gids.id] || 0) + g.pts;
    g.group += g.pts;
    if (g.pts > 0) store.addPoints(g.gids.pid, g.pts);
    renderPlay();
    const res = $('#gl-result');
    res.setAttribute('data-pts', String(g.pts));
    $('#gl-pts').textContent = g.pts > 0 ? '+' + g.pts : '0';
    $('#gl-verdict').textContent = VERDICT[g.pts];
    LG.restart(res, 'gl-pop-reset');
    res.classList.remove('gl-pop-reset');
    if (g.pts > 0) LG.restart($('#gl-card'), 'celebrate');
    if (g.pts >= 3) ui.confetti(['#5eead4', '#22d3ee', '#e879f9', '#f4f5ff']);
    LG.buzz(g.pts >= 3 ? [30, 40, 120] : g.pts > 0 ? 40 : 150);
  }

  function nextTurn() {
    if (!game || game.phase !== 'revealed') return;
    game.turn++;
    if (game.turn >= game.turns.length) endGame(); else beginTurn();
  }

  /* ----- slider ----- */
  function setGuess(v) {
    if (!game || game.phase !== 'guess') return;
    const old = game.guess;
    game.guess = LG.clamp(Math.round(v * 10) / 10, 0, 100);
    // Reactiviteit: snelheid stuurt de gloed, elke 5 % voelt als een klik.
    const dial = $('#gl-dial');
    dial.style.setProperty('--v', LG.clamp(Math.abs(game.guess - old) / 6, 0, 1).toFixed(2));
    clearTimeout(vTimer);
    vTimer = setTimeout(() => dial.style.setProperty('--v', '0'), 140);
    if (Math.floor(game.guess / 5) !== Math.floor(old / 5)) LG.buzz(4);
    updateThumb();
  }

  // Pointer position -> angle around the dial centre -> value 0..100.
  function fromPointer(e) {
    // Meten aan de (niet gekantelde) houder, en de kanteling van de plaat terugrekenen.
    const r = $('#gl-track').getBoundingClientRect();
    if (!r.width) return;
    const cx = r.left + r.width * (DIAL.cx / DIAL.w);
    const cy = r.top + r.height * (DIAL.cy / DIAL.h);
    const dx = e.clientX - cx;
    const dy = (cy - e.clientY) / TILT_COS;
    if (dy <= 0 && Math.abs(dx) < 8) return; // directly below the hub: keep the current guess
    const deg = dy <= 0 ? (dx < 0 ? 180 : 0) : (Math.atan2(dy, dx) * 180) / Math.PI;
    setGuess((180 - deg) / 1.8);
  }

  function bindSlider() {
    const track = $('#gl-track');
    track.addEventListener('pointerdown', (e) => {
      if (!game || game.phase !== 'guess') return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      dragId = e.pointerId;
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* niet ondersteund */ }
      track.classList.add('drag');
      fromPointer(e);
    });
    track.addEventListener('pointermove', (e) => { if (dragId === e.pointerId) fromPointer(e); });
    const stop = (e) => {
      if (dragId !== e.pointerId) return;
      dragId = null;
      track.classList.remove('drag');
      LG.buzz(8);
    };
    track.addEventListener('pointerup', stop);
    track.addEventListener('pointercancel', stop);
    $('#gl-track').addEventListener('keydown', (e) => {
      if (!game || game.phase !== 'guess') return;
      const step = e.shiftKey ? 10 : 2;
      let v = game.guess;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') v -= step;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') v += step;
      else if (e.key === 'Home') v = 0;
      else if (e.key === 'End') v = 100;
      else return;
      e.preventDefault();
      setGuess(v);
    });
  }

  /* ----- end ----- */
  function endGame() {
    const g = game;
    g.phase = 'done';
    const rows = g.players.map((p) => ({ p: p, pts: g.scores[p.id] || 0 })).sort((a, b) => b.pts - a.pts);
    const top = rows[0].pts;
    const winners = top > 0 ? rows.filter((r) => r.pts === top) : [];
    winners.forEach((r) => store.addWin(r.p.pid));

    $('#gl-etitle').textContent = winners.length === 1 ? winners[0].p.name.toUpperCase() + ' WINT'
      : winners.length > 1 ? 'GELIJK SPEL' : 'GEEN PUNTEN';
    $('#gl-esub').textContent = 'GROEP ' + g.group + ' / ' + (g.turns.length * 4) + ' PUNTEN';

    const list = $('#gl-elist');
    list.textContent = '';
    rows.forEach((r, i) => {
      const win = winners.indexOf(r) !== -1;
      list.appendChild(h('li', {}, h('div', { class: 'prow glass-lite' + (win ? ' win' : ''), style: '--i:' + i },
        h('span', { class: 'n', style: 'background:' + r.p.color + ';color:#050510' }, i + 1),
        h('span', { class: 'nm' }, r.p.name),
        h('b', { class: 'pts' }, r.pts),
        win ? LG.icon('crown') : null
      )));
    });
    list.scrollTop = 0;
    $('#s-gl-end').setAttribute('data-winner', 'civ');
    ui.show('gl-end');
    if (winners.length) ui.confetti(['#e879f9', '#22d3ee', '#fde047', '#f4f5ff']);
    LG.buzz([60, 40, 60, 40, 160]);
  }

  function cleanup() {
    clearTimers();
    flow.cancel();
    dragId = null;
    game = null;
    const trk = $('#gl-track'), dial = $('#gl-dial');
    clearTimeout(vTimer);
    if (trk) trk.classList.remove('drag');
    if (dial) { dial.classList.remove('peek', 'open'); dial.style.setProperty('--v', '0'); }
  }

  function mount() {
    ui.mount(HTML);
    flow.mount();
    buildDial();
    bindSlider();
    $('#gl-start').addEventListener('click', startGame);
    $('#gl-pstop').addEventListener('click', () => ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: () => LG.home() }));
    $('#gl-hide').addEventListener('click', hideTarget);
    $('#gl-reveal').addEventListener('click', reveal);
    $('#gl-next').addEventListener('click', nextTurn);
    $('#gl-again').addEventListener('click', () => { cleanup(); ui.show('gl-setup'); });
    $('#gl-ehome').addEventListener('click', () => LG.home());
    document.addEventListener('screenshow', (e) => { if (e.detail === 'gl-setup') renderSetup(); });
  }

  LG.registerGame({
    id: 'golflengte', title: 'GOLFLENGTE', tag: 'Lees elkaars gedachten',
    icon: 'wave', rgb: '232,121,249', min: MIN_PLAYERS, max: MAX_PLAYERS,
    mount: mount,
    open() { cleanup(); loadCfg(); ui.show('gl-setup'); },
    reset: cleanup
  });
})();