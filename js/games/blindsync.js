(function () {
  'use strict';

  /* BLIND SYNC: twee spelers antwoorden in het geheim op dezelfde vraag en proberen identiek te denken. */
  const LG = window.LG;
  const $ = LG.$, h = LG.h, store = LG.store, ui = LG.ui;

  const DATA = (LG.data && LG.data.blindsync) || { numbers: [], words: [], spectra: [] };
  const ROUNDS = 6;
  const MAX_PTS = 3;
  const ORDER = ['numbers', 'words', 'spectra'];
  const STYLES = {
    numbers: { tag: 'DE GETALLEN-GOK' },
    words: { tag: 'DE WOORD-MATCH' },
    spectra: { tag: 'DE SPECTRUM-SYNC' }
  };
  const VERDICTS = ['GEEN VERBINDING', 'IN DE BUURT', 'BIJNA GEDACHTENLEZEN', 'TELEPATHIE!'];

  let game = null;
  let duo = null;

  const sfx = (name) => { try { if (LG.sound && LG.sound[name]) LG.sound[name](); } catch (e) { /* geen geluid */ } };

  const norm = (v) => String(v == null ? '' : v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const head = (p) => `
      <header class="top">
        <button type="button" class="icon-btn glass" id="sy-${p}stop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="sy-${p}round"></span>
        <span class="chip glass-lite" id="sy-${p}score"></span>
      </header>`;

  const HTML = ui.setupHtml('sy', 'BLIND SYNC', `
      <div class="how glass-lite">
        Jullie krijgen zes vragen. Antwoord om de beurt <b>in het geheim</b> en probeer precies hetzelfde te denken als de ander.
        Hoe dichter jullie antwoorden bij elkaar liggen, hoe meer punten (max. 3 per ronde).
      </div>
      <div id="sy-duo"></div>
      <div class="how glass-lite">
        <b>3 VRAAGSOORTEN</b><br>
        Getallen-Gok: kies een getal van 1 tot 10<br>
        Woord-Match: typ \u00e9\u00e9n woord<br>
        Spectrum-Sync: schuif op een schaal
      </div>`, 'START SYNC') + `
  <section class="screen" id="s-sy-pass" aria-label="Geef de telefoon door">
    <div class="wrap">${head('p')}
      <div class="center sy-center">
        <p class="eyebrow">GEEF DE TELEFOON AAN</p>
        <div id="sy-pavatar"></div>
        <h2 class="kf-pname" id="sy-pname"></h2>
        <span class="chip glass-lite sy-style" id="sy-ptag"></span>
        <p class="kf-note" id="sy-pnote"></p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="sy-pgo" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-eye"/></svg><span id="sy-pgolabel"></span></button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-sy-ask" aria-label="Geheim antwoord">
    <div class="wrap">${head('a')}
      <div class="center sy-center">
        <p class="eyebrow">JOUW GEHEIME ANTWOORD &middot; <span id="sy-awho"></span></p>
        <span class="chip glass-lite sy-style" id="sy-atag"></span>
        <p class="sy-prompt" id="sy-prompt"></p>
        <div class="sy-input" id="sy-input"></div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="sy-lock" aria-disabled="true"><svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg><span id="sy-locklabel">VERGRENDEL</span></button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-sy-reveal" aria-label="De onthulling">
    <div class="wrap">${head('r')}
      <div class="center sy-center">
        <p class="eyebrow" id="sy-rprompt"></p>
        <div class="sy-pair" id="sy-pair"></div>
        <div class="sy-scale" id="sy-scale" hidden></div>
        <div class="sy-result" id="sy-result" data-pts="0">
          <b class="sy-pts" id="sy-pts">0</b>
          <span class="sy-verdict" id="sy-verdict"></span>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="sy-next"><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg><span id="sy-nextlabel">VOLGENDE RONDE</span></button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-sy-end" aria-label="Eindstand">
    <div class="wrap">
      <div class="center sy-center">
        <p class="eyebrow">EINDSTAND</p>
        <h2 class="kf-etitle" id="sy-etitle"></h2>
        <p class="stage-note" id="sy-esub"></p>
        <ol class="vscroll kf-list" id="sy-elist"></ol>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="sy-again"><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>OPNIEUW SPELEN</button>
        <button type="button" class="btn btn-block" id="sy-ehome"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>NAAR DE HUB</button>
      </div>
    </div>
  </section>`;

  /* ----- helpers ----- */
  const playerAt = (step) => game.p[(game.first + step) % 2];
  const total = () => game.history.reduce((n, r) => n + r.pts, 0);

  function stamp(prefix) {
    $('#sy-' + prefix + 'round').textContent = 'RONDE ' + (game.round + 1) + '/' + ROUNDS;
    $('#sy-' + prefix + 'score').textContent = 'SYNC ' + total() + '/' + ROUNDS * MAX_PTS;
  }

  function pointsFor(style, a, b) {
    if (style === 'numbers') {
      const d = Math.abs(a - b);
      return d === 0 ? 3 : d === 1 ? 2 : d === 2 ? 1 : 0;
    }
    if (style === 'words') {
      const x = norm(a), y = norm(b);
      if (!x || !y) return 0;
      if (x === y) return 3;
      if (Math.min(x.length, y.length) >= 3 && (x.indexOf(y) !== -1 || y.indexOf(x) !== -1)) return 2;
      return 0;
    }
    const d = Math.abs(a - b);
    return d <= 6 ? 3 : d <= 15 ? 2 : d <= 30 ? 1 : 0;
  }

  function nextItem(style) {
    const g = game;
    if (!g.queues[style] || !g.queues[style].length) g.queues[style] = LG.shuffle(DATA[style]);
    return g.queues[style].pop();
  }

  const show = (style, v) => (style === 'spectra' ? Math.round(v) + '%' : String(v));

  /* ----- spelverloop ----- */
  function startGame() {
    const pair = duo.pair();
    if (!pair) { ui.toast('Voeg minstens twee spelers toe'); return; }
    game = { p: pair, round: 0, first: 0, step: 0, style: 'numbers', item: null, draft: null, ans: [null, null], queues: {}, history: [] };
    LG.buzz(20);
    beginRound();
  }

  function beginRound() {
    const g = game;
    g.style = ORDER[g.round % ORDER.length];
    g.item = nextItem(g.style);
    g.first = g.round % 2;
    g.step = 0;
    g.draft = null;
    g.ans = [null, null];
    showPass();
  }

  function showPass() {
    const g = game;
    const p = playerAt(g.step);
    stamp('p');
    const av = $('#sy-pavatar');
    av.textContent = '';
    av.appendChild(ui.avatar(p.id, p.name));
    $('#sy-pname').textContent = p.name;
    $('#sy-ptag').textContent = STYLES[g.style].tag;
    $('#sy-pnote').textContent = g.step === 0
      ? 'Antwoord in het geheim. De ander kijkt weg.'
      : 'Nu jij. Denk aan wat de ander zou kiezen.';
    $('#sy-pgolabel').textContent = 'IK BEN ' + p.name.toUpperCase();
    ui.show('sy-pass');
  }

  function setLockReady(ready) {
    $('#sy-lock').setAttribute('aria-disabled', ready ? 'false' : 'true');
  }

  function setDraft(v) {
    game.draft = v;
    setLockReady(v !== null && v !== '');
  }

  function buildInput() {
    const g = game, it = g.item;
    const box = $('#sy-input');
    box.textContent = '';
    if (g.style === 'numbers') {
      box.appendChild(h('div', { class: 'sy-ends' }, h('span', {}, it.lo), h('span', {}, it.hi)));
      const grid = h('div', { class: 'sy-nums', role: 'group', 'aria-label': 'Kies een getal van 1 tot 10' });
      for (let n = 1; n <= 10; n++) {
        grid.appendChild(h('button', {
          type: 'button', class: 'sy-num', 'aria-pressed': 'false', 'aria-label': String(n),
          onclick: (e) => {
            Array.prototype.forEach.call(grid.children, (b) => b.setAttribute('aria-pressed', 'false'));
            e.currentTarget.setAttribute('aria-pressed', 'true');
            setDraft(n);
            LG.buzz(8);
            sfx('tap');
          }
        }, String(n)));
      }
      box.appendChild(grid);
    } else if (g.style === 'words') {
      const input = h('input', {
        type: 'text', class: 'input sy-word', maxlength: '24', autocomplete: 'off', autocapitalize: 'none',
        spellcheck: 'false', placeholder: 'Eén woord', 'aria-label': 'Jouw woord', enterkeyhint: 'done'
      });
      input.addEventListener('input', () => setDraft(input.value.trim().slice(0, 24)));
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); lock(); } });
      box.appendChild(input);
    } else {
      box.appendChild(h('div', { class: 'sy-ends' }, h('span', {}, it.l), h('span', {}, it.r)));
      const range = h('input', {
        type: 'range', class: 'sy-range', min: '0', max: '100', step: '1', value: '50', 'aria-label': 'Schuif tussen ' + it.l + ' en ' + it.r
      });
      range.style.setProperty('--v', '0.5');
      range.addEventListener('input', () => {
        const v = Number(range.value);
        range.style.setProperty('--v', (v / 100).toFixed(3));
        range.classList.add('touched');
        setDraft(v);
      });
      box.appendChild(range);
      box.appendChild(h('p', { class: 'stage-note' }, 'SCHUIF OM TE ANTWOORDEN'));
    }
  }

  function showAsk() {
    const g = game;
    g.draft = null;
    stamp('a');
    $('#sy-awho').textContent = playerAt(g.step).name.toUpperCase();
    $('#sy-atag').textContent = STYLES[g.style].tag;
    $('#sy-prompt').textContent = g.item.q;
    $('#sy-locklabel').textContent = g.step === 0 ? 'VERGRENDEL & GEEF DOOR' : 'VERGRENDEL & ONTHUL';
    buildInput();
    setLockReady(false);
    ui.show('sy-ask');
  }

  function lock() {
    const g = game;
    if (!g) return;
    if (g.draft === null || g.draft === '') { ui.toast('Geef eerst een antwoord'); LG.buzz(25); return; }
    g.ans[g.step] = g.draft;
    g.draft = null;
    $('#sy-input').textContent = '';
    LG.buzz(14);
    if (g.step === 0) { g.step = 1; showPass(); } else reveal();
  }

  function reveal() {
    const g = game;
    const a = g.ans[0], b = g.ans[1];
    const pts = pointsFor(g.style, a, b);
    g.history.push({ q: g.item.q, style: g.style, a: show(g.style, a), b: show(g.style, b), who: [playerAt(0).name, playerAt(1).name], pts: pts });
    g.p.forEach((p) => store.addPoints(p.id, pts));

    stamp('r');
    $('#sy-rprompt').textContent = g.item.q;
    const pair = $('#sy-pair');
    pair.textContent = '';
    [0, 1].forEach((step) => {
      const pl = playerAt(step);
      pair.appendChild(h('div', { class: 'sy-ans glass-lite', style: '--i:' + step },
        ui.avatar(pl.id, pl.name),
        h('small', {}, pl.name),
        h('b', {}, show(g.style, g.ans[step]))));
    });

    const scale = $('#sy-scale');
    scale.textContent = '';
    scale.hidden = g.style !== 'spectra';
    if (g.style === 'spectra') {
      scale.appendChild(h('div', { class: 'sy-track' },
        [0, 1].map((step) => h('i', {
          class: 'sy-mark m' + step, style: 'left:' + g.ans[step] + '%', 'aria-hidden': 'true'
        }, playerAt(step).name.charAt(0).toUpperCase()))));
      scale.appendChild(h('div', { class: 'sy-ends' }, h('span', {}, g.item.l), h('span', {}, g.item.r)));
    }

    const res = $('#sy-result');
    res.setAttribute('data-pts', String(pts));
    LG.restart(res, 'pop');
    $('#sy-pts').textContent = '+' + pts;
    $('#sy-verdict').textContent = VERDICTS[pts];
    $('#sy-nextlabel').textContent = g.round + 1 >= ROUNDS ? 'EINDSTAND' : 'VOLGENDE RONDE';
    ui.show('sy-reveal');
    if (pts === MAX_PTS) { sfx('victory'); ui.confetti(['#22d3ee', '#ec4899', '#fbbf24', '#f4f5ff']); LG.buzz([40, 30, 80]); }
    else { sfx('tap'); LG.buzz(pts ? 20 : 35); }
  }

  function nextRound() {
    const g = game;
    if (!g) return;
    if (g.round + 1 >= ROUNDS) { endGame(); return; }
    g.round += 1;
    beginRound();
  }

  function endGame() {
    const g = game;
    const sum = total();
    const max = ROUNDS * MAX_PTS;
    const ratio = max ? sum / max : 0;
    $('#sy-etitle').textContent = ratio >= 0.8 ? '\u00c9\u00c9N BREIN' : ratio >= 0.5 ? 'OP \u00c9\u00c9N GOLFLENGTE' : ratio >= 0.25 ? 'AAN HET WARMLOPEN' : 'TWEE WERELDEN';
    $('#sy-esub').textContent = g.p[0].name + ' & ' + g.p[1].name + ' \u00b7 SYNC ' + sum + ' / ' + max;
    const list = $('#sy-elist');
    list.textContent = '';
    g.history.forEach((r, i) => {
      list.appendChild(h('li', {},
        h('div', { class: 'prow glass-lite' + (r.pts === MAX_PTS ? ' win' : ''), style: '--i:' + i },
          h('span', { class: 'n' }, i + 1),
          h('span', { class: 'nm' }, r.q,
            h('small', { class: 'out-note' }, r.a + ' \u00b7 ' + r.b)),
          h('b', { class: 'pts' }, '+' + r.pts))));
    });
    list.scrollTop = 0;
    ui.show('sy-end');
    if (ratio >= 0.5) {
      g.p.forEach((p) => store.addWin(p.id));
      ui.confetti(['#22d3ee', '#ec4899', '#fbbf24', '#f4f5ff']);
      sfx('victory');
    }
    LG.buzz([60, 40, 60, 40, 160]);
  }

  function cleanup() {
    game = null;
  }

  function renderSetup() {
    if (duo) duo.render();
    $('#sy-chip').textContent = ROUNDS + ' RONDES';
  }

  function mount() {
    ui.mount(HTML);
    duo = LG.duo.create(['SPELER 1', 'SPELER 2']);
    $('#sy-duo').appendChild(duo.el);
    const stop = () => ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: () => LG.home() });
    ['p', 'a', 'r'].forEach((p) => $('#sy-' + p + 'stop').addEventListener('click', stop));
    $('#sy-start').addEventListener('click', startGame);
    $('#sy-pgo').addEventListener('click', () => { if (game) showAsk(); });
    $('#sy-lock').addEventListener('click', lock);
    $('#sy-next').addEventListener('click', nextRound);
    $('#sy-again').addEventListener('click', () => { cleanup(); ui.show('sy-setup'); });
    $('#sy-ehome').addEventListener('click', () => LG.home());
    document.addEventListener('screenshow', (e) => { if (e.detail === 'sy-setup') renderSetup(); });
  }

  LG.registerGame({
    id: 'blindsync', title: 'BLIND SYNC', tag: 'Denken jullie hetzelfde?',
    icon: 'merge', rgb: '34,211,238', min: 2, max: 20,
    mount: mount,
    open() { cleanup(); ui.show('sy-setup'); },
    reset: cleanup
  });
})();