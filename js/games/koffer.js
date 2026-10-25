(function () {
  'use strict';

  /* KOFFER MET GELD: 1-tegen-1 bluffduel. Smokkelaar pakt in, inspecteur kiest openmaken of doorlaten. */
  const LG = window.LG;
  const $ = LG.$, $$ = LG.$$, h = LG.h, store = LG.store, ui = LG.ui;

  const ROUNDS = 5;
  const GRILL_SECONDS = 45;
  const HOT_SECONDS = 10;
  const ITEMS = {
    money: { name: 'DE BUIT', sub: '\u20ac50.000', loot: '\u20ac50.000' },
    bomb: { name: 'DE BOM', sub: 'DIRECT VERLIES', loot: 'BOEM!' },
    empty: { name: 'HET LUCHTJE', sub: 'WAARDELOOS PAPIER', loot: 'LEEG' }
  };
  const CLAIMS = [
    'In deze koffer zit puur contant geld, inspecteur. Durf je hem te openen?',
    'Niets aan de hand, inspecteur. Alleen wat vuile was. Kijk gerust.',
    'Ik zou die koffer niet aanraken als ik jou was. Echt niet.',
    'Mijn tante reisde met deze koffer. Er zit alleen een cadeautje in.',
    'Maak hem maar open. Dan zie je dat ik niets te verbergen heb.',
    'Laat me gewoon door, inspecteur. We zijn toch vrienden?'
  ];

  let game = null;
  let duo = null;
  let timerId = 0;

  const sfx = (name) => { try { if (LG.sound && LG.sound[name]) LG.sound[name](); } catch (e) { /* geen geluid */ } };
  const stopTimer = () => { LG.cancel(timerId); timerId = 0; };

  const head = (p) => `
      <header class="top">
        <button type="button" class="icon-btn glass" id="kf-${p}stop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="kf-${p}round"></span>
        <span class="chip glass-lite" id="kf-${p}score"></span>
      </header>`;

  const HTML = ui.setupHtml('kf', 'KOFFER MET GELD', `
      <div class="how glass-lite">
        <b>SMOKKELAAR</b> pakt in en liegt of vertelt de waarheid. <b>INSPECTEUR</b> heeft 45 seconden en kiest: openmaken of doorlaten.
        Vijf rondes, de rollen wisselen elke ronde.
      </div>
      <div id="kf-duo"></div>
      <div class="how glass-lite">
        <b>PUNTEN</b><br>
        Open + geld: inspecteur +1<br>
        Open + bom of luchtje: smokkelaar +1<br>
        Door + geld: smokkelaar +2<br>
        Door + bom of luchtje: niemand
      </div>`, 'START DUEL') + `
  <section class="screen" id="s-kf-pass" aria-label="Geef de telefoon door">
    <div class="wrap">${head('p')}
      <div class="center">
        <p class="eyebrow" id="kf-peyebrow"></p>
        <div id="kf-pavatar"></div>
        <h2 class="kf-pname" id="kf-pname"></h2>
        <p class="kf-note" id="kf-pnote"></p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="kf-pgo" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-eye"/></svg><span id="kf-pgolabel"></span></button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-kf-pack" aria-label="Koffer inpakken">
    <div class="wrap">${head('k')}
      <div class="center kf-center">
        <p class="eyebrow">SMOKKELAAR &middot; <span id="kf-kwho"></span></p>
        <p class="stage-note">TIK OP EEN KOFFER OM TE ZIEN WAT ERIN ZIT</p>
        <div class="kf-cases" id="kf-cases"></div>
        <p class="kf-chosen" id="kf-chosen" aria-live="polite"></p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="kf-pack" aria-disabled="true"><svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg>PAK IN & GEEF DOOR</button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-kf-grill" aria-label="Verhoor">
    <div class="wrap">${head('g')}
      <div class="center kf-center">
        <p class="eyebrow">INSPECTEUR &middot; <span id="kf-gwho"></span></p>
        <div class="kf-clock glass" id="kf-clock">
          <small>VERHOOR</small>
          <b class="kf-time" id="kf-time" role="timer" aria-live="off">45</b>
          <div class="kf-bar"><i id="kf-barfill"></i></div>
        </div>
        <p class="kf-note"><b id="kf-gsmug"></b>, kijk de inspecteur recht in de ogen en doe je claim:</p>
        <p class="kf-claim" id="kf-claim"></p>
      </div>
      <div class="big-btns kf-decide">
        <button type="button" class="btn kf-open" id="kf-open">OPENMAKEN</button>
        <button type="button" class="btn kf-let" id="kf-let">DOORLATEN</button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-kf-reveal" aria-label="De onthulling" data-kind="">
    <div class="wrap">${head('r')}
      <div class="center kf-center">
        <p class="eyebrow" id="kf-rchoice"></p>
        <div class="kf-stage" id="kf-stage">
          <div class="kf-bigcase" id="kf-bigcase">
            <span class="kf-base"></span>
            <span class="kf-lid"></span>
          </div>
          <span class="kf-loot" id="kf-loot" aria-hidden="true"></span>
        </div>
        <div class="kf-verdict" id="kf-verdict" hidden>
          <b id="kf-vtitle"></b>
          <span id="kf-vtext"></span>
          <small id="kf-vpts"></small>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="kf-next" hidden><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg><span id="kf-nextlabel">VOLGENDE RONDE</span></button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-kf-end" aria-label="Eindstand">
    <div class="wrap">
      <div class="center kf-center">
        <p class="eyebrow">EINDSTAND</p>
        <h2 class="kf-etitle" id="kf-etitle"></h2>
        <p class="stage-note" id="kf-esub"></p>
        <ol class="vscroll kf-list" id="kf-elist"></ol>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="kf-again"><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>OPNIEUW SPELEN</button>
        <button type="button" class="btn btn-block" id="kf-ehome"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>NAAR DE HUB</button>
      </div>
    </div>
  </section>`;

  /* ----- helpers ----- */
  const scoreText = () => {
    const g = game;
    return g.p[0].name + ' ' + g.score[g.p[0].id] + ' \u2013 ' + g.score[g.p[1].id] + ' ' + g.p[1].name;
  };

  function stamp(prefix) {
    $('#kf-' + prefix + 'round').textContent = 'RONDE ' + (game.round + 1) + '/' + ROUNDS;
    $('#kf-' + prefix + 'score').textContent = scoreText();
  }

  function judge(item, open) {
    if (open) {
      if (item === 'money') return { smug: 0, insp: 1, kind: 'win', title: '\u20ac50.000 GEPAKT!', text: 'De inspecteur vindt de buit en houdt het geld.' };
      if (item === 'bomb') return { smug: 1, insp: 0, kind: 'boom', title: 'BOEM!', text: 'De inspecteur blaast zichzelf op. De smokkelaar wint de ronde.' };
      return { smug: 1, insp: 0, kind: 'dud', title: 'LUCHTJE!', text: 'Alleen waardeloos papier. De inspecteur verspilde zijn tijd.' };
    }
    if (item === 'money') return { smug: 2, insp: 0, kind: 'heist', title: 'GESMOKKELD!', text: 'De buit gaat de grens over. Dubbele winst voor de smokkelaar.' };
    if (item === 'bomb') return { smug: 0, insp: 0, kind: 'safe', title: 'SLIM!', text: 'De inspecteur ontsnapt aan een bom. Niemand scoort.' };
    return { smug: 0, insp: 0, kind: 'safe', title: 'VEILIG', text: 'Een lege koffer glipt door. Niemand scoort.' };
  }

  /* ----- spelverloop ----- */
  function startGame() {
    const pair = duo.pair();
    if (!pair) { ui.toast('Voeg minstens twee spelers toe'); return; }
    const score = {};
    pair.forEach((p) => { score[p.id] = 0; });
    game = { p: pair, round: 0, smug: 0, items: [], pick: -1, score: score, history: [], busy: false, deadline: 0, lastS: -1, passKind: 'smug' };
    LG.buzz(20);
    beginRound();
  }

  function beginRound() {
    const g = game;
    g.items = LG.shuffle(['money', 'bomb', 'empty']);
    g.pick = -1;
    g.smug = g.round % 2;
    g.busy = false;
    showPass('smug');
  }

  function showPass(kind) {
    const g = game;
    const p = kind === 'smug' ? g.p[g.smug] : g.p[1 - g.smug];
    g.passKind = kind;
    stamp('p');
    $('#kf-peyebrow').textContent = kind === 'smug' ? 'GEEF DE TELEFOON AAN DE SMOKKELAAR' : 'GEEF DE TELEFOON AAN DE INSPECTEUR';
    const av = $('#kf-pavatar');
    av.textContent = '';
    av.appendChild(ui.avatar(p.id, p.name));
    $('#kf-pname').textContent = p.name;
    $('#kf-pnote').textContent = kind === 'smug'
      ? 'Alleen jij mag straks de koffers zien. De inspecteur kijkt weg.'
      : 'Het verhoor begint zodra je doorgaat. Je hebt ' + GRILL_SECONDS + ' seconden.';
    $('#kf-pgolabel').textContent = kind === 'smug' ? 'IK BEN DE SMOKKELAAR' : 'IK BEN DE INSPECTEUR';
    ui.show('kf-pass');
  }

  function setPackReady(ready) {
    $('#kf-pack').setAttribute('aria-disabled', ready ? 'false' : 'true');
  }

  function showPack() {
    const g = game;
    g.pick = -1;
    stamp('k');
    $('#kf-kwho').textContent = g.p[g.smug].name.toUpperCase();
    const box = $('#kf-cases');
    box.textContent = '';
    g.items.forEach((item, i) => {
      box.appendChild(h('button', {
        type: 'button', class: 'kf-case', 'data-item': item, 'aria-pressed': 'false', 'aria-label': 'Koffer ' + (i + 1),
        onclick: () => pickCase(i)
      },
        h('span', { class: 'kf-case-3d' },
          h('span', { class: 'kf-face kf-front' }, h('i', { class: 'kf-handle' }), h('b', {}, i + 1), h('i', { class: 'kf-latch' })),
          h('span', { class: 'kf-face kf-back' }, h('b', {}, ITEMS[item].name), h('small', {}, ITEMS[item].sub)))
      ));
    });
    $('#kf-chosen').textContent = 'Kies je smokkelkoffer.';
    setPackReady(false);
    ui.show('kf-pack');
  }

  function pickCase(i) {
    const g = game;
    if (!g) return;
    g.pick = i;
    $$('.kf-case').forEach((el, j) => {
      const on = j === i;
      el.classList.toggle('on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    const it = ITEMS[g.items[i]];
    $('#kf-chosen').textContent = 'Ingepakt: ' + it.name + ' (' + it.sub + ')';
    setPackReady(true);
    LG.buzz(12);
    sfx('tap');
  }

  function confirmPack() {
    if (!game || game.pick < 0) { ui.toast('Kies eerst een koffer'); LG.buzz(25); return; }
    $('#kf-cases').textContent = '';
    showPass('insp');
  }

  function showGrill() {
    const g = game;
    stamp('g');
    g.busy = false;
    $('#kf-gwho').textContent = g.p[1 - g.smug].name.toUpperCase();
    $('#kf-gsmug').textContent = g.p[g.smug].name;
    $('#kf-claim').textContent = '\u201c' + CLAIMS[g.round % CLAIMS.length] + '\u201d';
    g.deadline = Date.now() + GRILL_SECONDS * 1000;
    g.lastS = -1;
    ui.show('kf-grill');
    tick();
  }

  function tick() {
    const g = game;
    if (!g || g.busy) return;
    const left = Math.max(0, g.deadline - Date.now());
    const s = Math.ceil(left / 1000);
    $('#kf-time').textContent = s;
    $('#kf-barfill').style.transform = 'scaleX(' + (left / (GRILL_SECONDS * 1000)).toFixed(3) + ')';
    $('#kf-clock').classList.toggle('hot', s <= HOT_SECONDS);
    if (s !== g.lastS) {
      g.lastS = s;
      if (s <= HOT_SECONDS && s > 0) { sfx('tap'); LG.buzz(10); }
    }
    if (left <= 0) {
      ui.toast('Tijd om: de koffer wordt doorgelaten');
      decide(false);
      return;
    }
    timerId = LG.later(tick, 200);
  }

  function decide(open) {
    const g = game;
    if (!g || g.busy) return;
    g.busy = true;
    stopTimer();
    const item = g.items[g.pick];
    const out = judge(item, open);
    const smug = g.p[g.smug], insp = g.p[1 - g.smug];
    g.score[smug.id] += out.smug;
    g.score[insp.id] += out.insp;
    store.addPoints(smug.id, out.smug);
    store.addPoints(insp.id, out.insp);
    g.history.push({ round: g.round + 1, smug: smug.name, insp: insp.name, open: open, item: item, out: out });

    stamp('r');
    const scorer = out.smug > 0 ? smug.name + ' +' + out.smug : out.insp > 0 ? insp.name + ' +' + out.insp : 'NIEMAND SCOORT';
    $('#kf-rchoice').textContent = open ? 'DE INSPECTEUR MAAKT DE KOFFER OPEN\u2026' : 'DE INSPECTEUR LAAT DE KOFFER DOOR\u2026';
    const stage = $('#kf-stage');
    stage.className = 'kf-stage';
    $('#kf-bigcase').classList.remove('open');
    $('#kf-loot').textContent = ITEMS[item].loot;
    $('#kf-verdict').hidden = true;
    $('#kf-next').hidden = true;
    $('#kf-nextlabel').textContent = g.round + 1 >= ROUNDS ? 'EINDSTAND' : 'VOLGENDE RONDE';
    $('#s-kf-reveal').setAttribute('data-kind', '');
    ui.show('kf-reveal');
    if (open && item === 'bomb') sfx('heartbeat');

    LG.later(() => {
      if (game !== g) return;
      $('#kf-bigcase').classList.add('open');
      stage.classList.add('show', 'k-' + out.kind);
      $('#s-kf-reveal').setAttribute('data-kind', out.kind);
      $('#kf-vtitle').textContent = out.title;
      $('#kf-vtext').textContent = out.text;
      $('#kf-vpts').textContent = scorer.toUpperCase();
      $('#kf-verdict').hidden = false;
      if (out.kind === 'boom') { sfx('eliminationDrama'); LG.buzz([80, 40, 160, 40, 240]); }
      else if (out.kind === 'win' || out.kind === 'heist') { sfx('victory'); ui.confetti(['#fbbf24', '#34d399', '#f4f5ff']); LG.buzz([40, 30, 80]); }
      else LG.buzz(30);
    }, 1100);
    LG.later(() => { if (game === g) $('#kf-next').hidden = false; }, 1900);
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
    const A = g.p[0], B = g.p[1];
    const sa = g.score[A.id], sb = g.score[B.id];
    const winner = sa === sb ? null : (sa > sb ? A : B);
    $('#kf-etitle').textContent = winner ? winner.name.toUpperCase() + ' WINT' : 'GELIJKSPEL';
    $('#kf-esub').textContent = A.name + ' ' + sa + ' \u2013 ' + sb + ' ' + B.name;
    const list = $('#kf-elist');
    list.textContent = '';
    g.history.forEach((r, i) => {
      const who = r.out.smug > 0 ? r.smug : r.out.insp > 0 ? r.insp : null;
      const pts = r.out.smug || r.out.insp;
      list.appendChild(h('li', {},
        h('div', { class: 'prow glass-lite' + (who ? ' win' : ''), style: '--i:' + i },
          h('span', { class: 'n' }, r.round),
          h('span', { class: 'nm' }, r.smug + ' smokkelt',
            h('small', { class: 'out-note' }, (r.open ? 'OPEN' : 'DOOR') + ' \u00b7 ' + ITEMS[r.item].name + (who ? ' \u00b7 ' + who : ''))),
          h('b', { class: 'pts' }, who ? '+' + pts : '\u2013'))
      ));
    });
    list.scrollTop = 0;
    ui.show('kf-end');
    if (winner) {
      store.addWin(winner.id);
      ui.confetti(['#fbbf24', '#fb923c', '#34d399', '#f4f5ff']);
      sfx('victory');
    }
    LG.buzz([60, 40, 60, 40, 160]);
  }

  function cleanup() {
    stopTimer();
    game = null;
  }

  function renderSetup() {
    if (duo) duo.render();
    $('#kf-chip').textContent = 'BEST OF ' + ROUNDS;
  }

  function mount() {
    ui.mount(HTML);
    duo = LG.duo.create(['SPELER 1', 'SPELER 2']);
    $('#kf-duo').appendChild(duo.el);
    const stop = () => ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: () => LG.home() });
    ['p', 'k', 'g', 'r'].forEach((p) => $('#kf-' + p + 'stop').addEventListener('click', stop));
    $('#kf-start').addEventListener('click', startGame);
    $('#kf-pgo').addEventListener('click', () => { if (game) { if (game.passKind === 'smug') showPack(); else showGrill(); } });
    $('#kf-pack').addEventListener('click', confirmPack);
    $('#kf-open').addEventListener('click', () => decide(true));
    $('#kf-let').addEventListener('click', () => decide(false));
    $('#kf-next').addEventListener('click', nextRound);
    $('#kf-again').addEventListener('click', () => { cleanup(); ui.show('kf-setup'); });
    $('#kf-ehome').addEventListener('click', () => LG.home());
    document.addEventListener('screenshow', (e) => { if (e.detail === 'kf-setup') renderSetup(); });
  }

  LG.registerGame({
    id: 'koffer', title: 'KOFFER MET GELD', tag: 'Bluf je langs de douane?',
    icon: 'lock', rgb: '251,146,60', min: 2, max: 20,
    mount: mount,
    open() { cleanup(); ui.show('kf-setup'); },
    reset: cleanup
  });
})();