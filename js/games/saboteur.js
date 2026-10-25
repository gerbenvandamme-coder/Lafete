(function () {
  'use strict';

  const LG = window.LG;
  const $ = LG.$, $$ = LG.$$, h = LG.h, store = LG.store, ui = LG.ui;

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 10;
  const PTS_CREW = 2;
  const PTS_SAB = 3;
  const NEUTRAL_INK = '#8b5cf6';
  const INK = ['#22d3ee', '#ff4da6', '#a3e635', '#fb923c', '#a78bfa', '#facc15', '#2dd4bf', '#f87171', '#60a5fa', '#e879f9'];

  const CATEGORIES = LG.data.saboteur;
  const ALL_WORDS = [];
  CATEGORIES.forEach((c) => c.words.forEach((w) => {
    ALL_WORDS.push({ id: c.id + ':' + w, cat: c.id, catName: c.name, word: w });
  }));

  let cfg = null;
  let game = null;
  let ink = null;
  let guessLocked = false;
  let guessTimer = null;

  const HTML = ui.setupHtml('sab', 'SABOTEUR', '<div class="stack" id="sab-opts"></div>', 'START SPEL') + `
  <section class="screen" id="s-sab-draw" aria-label="Tekenen">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="sab-dstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="sab-cat"></span>
        <span class="chip glass-lite" id="sab-round"></span>
      </header>
      <div class="sab-turn glass-lite" aria-live="polite">
        <i class="sab-dot" id="sab-dot"></i><span id="sab-turntext"></span>
      </div>
      <div class="sab-canvas glass" id="sab-canvaswrap">
        <canvas id="sab-canvas" role="img" aria-label="Tekenvlak"></canvas>
      </div>
      <div class="sab-legend" id="sab-legend" role="group" aria-label="Kies de Saboteur" hidden></div>
      <div class="actions sab-actions">
        <p class="stage-note" id="sab-hint">TEKEN 1 LIJN</p>
        <div class="sab-confirm" id="sab-confirmrow" hidden>
          <button type="button" class="btn" id="sab-redo"><svg class="ic" aria-hidden="true"><use href="#i-undo"/></svg>OPNIEUW</button>
          <button type="button" class="btn btn-primary" id="sab-ok"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>BEVESTIG LIJN</button>
        </div>
        <button type="button" class="btn btn-danger btn-block" id="sab-vote" hidden disabled><svg class="ic" aria-hidden="true"><use href="#i-vote"/></svg>STEM</button>
      </div>
    </div>
  </section>

  <section class="screen victory" id="s-sab-victory" aria-label="Einde">
    <div class="wrap">
      <div class="vscroll">
        <div class="vhead">
          <svg class="ic" aria-hidden="true"><use href="#i-crown"/></svg>
          <h2 id="sab-vtitle"></h2>
          <p class="eyebrow" id="sab-vsub"></p>
        </div>
        <div class="words">
          <div class="wtile glass civ"><small>GEHEIM WOORD</small><strong id="sab-vword"></strong></div>
          <div class="wtile glass und"><small>DE SABOTEUR</small><strong id="sab-vsab"></strong></div>
        </div>
        <img class="sab-art" id="sab-art" alt="De getekende kunst van deze ronde" hidden>
        <ul class="plist" id="sab-vlist"></ul>
      </div>
      <div class="foot">
        <button type="button" class="btn" id="sab-vhome"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>HUB</button>
        <button type="button" class="btn btn-primary" id="sab-again" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>NIEUW POTJE</button>
      </div>
    </div>
  </section>

  <div class="modal" id="m-sab-guess" role="dialog" aria-modal="true" aria-labelledby="sab-guesstitle" aria-hidden="true" inert>
    <form class="sheet glass" id="sab-guessform" autocomplete="off" novalidate>
      <p class="eyebrow">GEPAKT!</p>
      <h3 id="sab-guesstitle">LAATSTE KANS</h3>
      <p class="eyebrow" id="sab-guesswho"></p>
      <p class="sheet-text">Wat werd er getekend? Categorie: <b id="sab-guesscat"></b></p>
      <label class="sr-only" for="sab-guessinput">Geheim woord</label>
      <input class="input" id="sab-guessinput" type="text" maxlength="40" placeholder="Geheim woord…" enterkeyhint="go" autocapitalize="off" autocorrect="off" spellcheck="false">
      <div class="feedback" id="sab-guessfb" role="status" aria-live="polite"></div>
      <button type="submit" class="btn btn-primary" id="sab-guessbtn"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>RADEN</button>
    </form>
  </div>`;

  /* ----- pass & reveal (shared flow) ----- */
  const flow = LG.passflow.create('sab', {
    tag: 'SABOTEUR',
    seeLabel: 'BEKIJK WOORD',
    flip: true,
    fill(back, pl) {
      back.appendChild(h('span', { class: 'eyebrow' }, 'CATEGORIE'));
      back.appendChild(h('b', { class: 'sab-catname' }, game.catName));
      const word = h('strong', {});
      if (pl.isSab) {
        back.appendChild(word);
        LG.fitText(word, 'JIJ BENT DE SABOTEUR', 34);
        back.appendChild(h('span', { class: 'eyebrow' }, 'GEEN WOORD'));
      } else {
        back.appendChild(h('span', { class: 'eyebrow' }, 'GEHEIM WOORD'));
        back.appendChild(word);
        LG.fitText(word, game.word, 56);
      }
    },
    onDone() { startDrawing(); },
    onStop() { LG.home(); }
  });

  /* ----- setup ----- */
  const isOn = (id) => cfg.cats[id] !== false;
  const enabledWords = () => ALL_WORDS.filter((w) => isOn(w.cat));
  const wordId = (w) => w.id;

  function loadCfg() {
    cfg = store.cfg('saboteur', { rounds: 2, cats: {} });
    if (!CATEGORIES.some((c) => isOn(c.id))) CATEGORIES.forEach((c) => { cfg.cats[c.id] = true; });
    store.save();
  }

  function renderMeta() {
    const fresh = store.freshCount('saboteur', enabledWords(), wordId);
    const chip = $('#sab-chip');
    chip.textContent = fresh + ' WOORDEN';
    chip.setAttribute('aria-label', fresh + ' beschikbare woorden');
  }

  function renderSetup() {
    if (!cfg) loadCfg();
    ui.fillStrip('sab');
    const box = $('#sab-opts');
    box.textContent = '';
    box.appendChild(h('p', { class: 'how glass-lite' },
      h('b', {}, 'HOE WERKT HET? '),
      'Iedereen ziet het geheime woord, behalve de Saboteur. Teken om de beurt precies één lijn op het gedeelde vlak. Wie tekent er naast? Stem de Saboteur eruit.'));
    box.appendChild(h('p', { class: 'sec' }, 'RONDES'));
    box.appendChild(ui.numStepper({
      label: 'RONDES', icon: 'pen', rgb: '34,211,238', minus: 'Minder rondes', plus: 'Meer rondes',
      obj: cfg, key: 'rounds', min: 1, max: 4
    }).el);
    box.appendChild(h('p', { class: 'sec' }, 'CATEGORIEËN'));
    const pills = h('div', { class: 'pills', role: 'group', 'aria-label': 'Categorieën' });
    CATEGORIES.forEach((cat) => {
      const b = h('button', {
        type: 'button', class: 'pill', 'aria-pressed': isOn(cat.id) ? 'true' : 'false',
        onclick: () => {
          const on = CATEGORIES.filter((c) => isOn(c.id)).length;
          if (isOn(cat.id) && on === 1) { ui.toast('Minstens 1 categorie'); LG.buzz(25); return; }
          cfg.cats[cat.id] = !isOn(cat.id);
          store.save();
          b.setAttribute('aria-pressed', isOn(cat.id) ? 'true' : 'false');
          renderMeta();
          LG.buzz(8);
        }
      }, cat.name);
      pills.appendChild(b);
    });
    box.appendChild(h('div', { class: 'glass' }, pills));
    renderMeta();
  }

  /* ----- game flow ----- */
  function startGame() {
    const roster = store.active();
    if (roster.length < MIN_PLAYERS || roster.length > MAX_PLAYERS) {
      ui.toast('Saboteur is voor ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' spelers');
      LG.buzz(25);
      return;
    }
    if (!cfg) loadCfg();
    const pool = enabledWords();
    if (!pool.length) { ui.toast('Kies minstens 1 categorie'); return; }

    const picked = store.draw('saboteur', pool, wordId);
    const sabIdx = LG.rand(roster.length);
    const order = LG.shuffle(roster.map((p, i) => i));
    const turns = [];
    for (let r = 0; r < cfg.rounds; r++) order.forEach((i) => turns.push(i));

    game = {
      players: roster.map((p, i) => ({ id: i, pid: p.id, name: p.name, color: INK[i % INK.length], isSab: i === sabIdx })),
      word: picked.item.word, catName: picked.item.catName, sab: sabIdx,
      rounds: cfg.rounds, turns: turns, turn: 0,
      strokes: [], pending: null, redoUsed: false,
      phase: 'idle', selected: null, voted: null
    };
    if (picked.recycled) ui.toast('Alle woorden gehad — opnieuw geschud');
    LG.buzz(20);
    flow.start(game.players);
  }

  function startDrawing() {
    if (!game) return;
    game.phase = 'draw';
    game.turn = 0;
    renderDraw();
    ui.show('sab-draw');
    LG.later(() => { if (ink) ink.resize(); }, 60);
  }

  /* ----- drawing screen ----- */
  function renderDraw() {
    if (!game) return;
    const g = game;
    const done = g.phase === 'vote' || g.phase === 'locked';
    const p = done ? null : g.players[g.turns[g.turn]];
    const round = Math.min(g.rounds, Math.floor(g.turn / g.players.length) + 1);

    $('#sab-cat').textContent = g.catName.toUpperCase();
    $('#sab-round').textContent = done ? 'STEMMEN' : 'RONDE ' + round + '/' + g.rounds;
    $('#sab-dot').style.setProperty('--c', p ? p.color : NEUTRAL_INK);

    let text;
    if (done) text = 'Wie is de Saboteur? Kies een speler en druk op STEM';
    else if (g.phase === 'confirm') text = 'Beurt van ' + p.name + ' - Bevestig je lijn';
    else text = 'Beurt van ' + p.name + ' - Teken 1 lijn';
    $('#sab-turntext').textContent = text;

    $('#sab-canvaswrap').classList.toggle('locked', g.phase !== 'draw');
    $('#sab-hint').hidden = g.phase !== 'draw';
    $('#sab-confirmrow').hidden = g.phase !== 'confirm';
    $('#sab-confirmrow').classList.toggle('single', g.redoUsed);
    $('#sab-redo').hidden = g.redoUsed;
    $('#sab-legend').hidden = !done;
    $('#sab-vote').hidden = !done;
    $('#sab-vote').disabled = g.phase !== 'vote' || g.selected === null;
  }

  // 1-stroke rule: a stroke is only accepted while the phase is 'draw'.
  // Lifting the finger moves the phase to 'confirm', which locks the canvas.
  const inkHooks = {
    begin() { return (game && game.phase === 'draw') ? game.players[game.turns[game.turn]].color : null; },
    end(s) {
      if (!game || game.phase !== 'draw') return;
      game.pending = s;
      game.phase = 'confirm';
      renderDraw();
      LG.buzz(12);
    },
    strokes() { return game ? game.strokes.concat(game.pending ? [game.pending] : []) : []; }
  };

  function confirmStroke() {
    if (!game || game.phase !== 'confirm' || !game.pending) return;
    game.strokes.push(game.pending);
    game.pending = null;
    game.turn++;
    game.redoUsed = false;
    if (game.turn >= game.turns.length) {
      game.phase = 'vote';
      game.selected = null;
      buildLegend();
    } else {
      game.phase = 'draw';
    }
    ink.redraw();
    renderDraw();
    LG.buzz(15);
  }

  // OPNIEUW: one undo per turn, for an accidental tap.
  function redoStroke() {
    if (!game || game.phase !== 'confirm' || game.redoUsed) return;
    game.pending = null;
    game.redoUsed = true;
    game.phase = 'draw';
    ink.redraw();
    renderDraw();
    LG.buzz(10);
  }

  /* ----- voting ----- */
  function buildLegend() {
    const box = $('#sab-legend');
    box.textContent = '';
    game.players.forEach((p) => {
      box.appendChild(h('button', {
        type: 'button', class: 'sab-chip glass-lite', 'aria-pressed': 'false', 'data-id': p.id, style: '--c:' + p.color,
        onclick: () => selectSuspect(p.id)
      }, h('i', { class: 'sab-dot', style: '--c:' + p.color }), p.name));
    });
  }

  function selectSuspect(id) {
    if (!game || game.phase !== 'vote') return;
    game.selected = id;
    $$('.sab-chip', $('#sab-legend')).forEach((b) => {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-id')) === id ? 'true' : 'false');
    });
    $('#sab-vote').disabled = false;
    LG.buzz(10);
  }

  function confirmVote() {
    if (!game || game.phase !== 'vote' || game.selected === null) return;
    game.voted = game.selected;
    game.phase = 'locked';
    if (game.voted === game.sab) openGuess();
    else endGame('sab', 'escaped');
  }

  /* ----- saboteur's last chance ----- */
  function openGuess() {
    guessLocked = false;
    $('#sab-guesswho').textContent = game.players[game.sab].name;
    $('#sab-guesscat').textContent = game.catName;
    const input = $('#sab-guessinput');
    input.value = '';
    input.readOnly = false;
    $('#sab-guessfb').textContent = '';
    $('#sab-guessfb').className = 'feedback';
    $('#sab-guessbtn').disabled = false;
    ui.openModal('m-sab-guess');
  }

  function submitGuess(e) {
    e.preventDefault();
    if (!game || guessLocked) return;
    const input = $('#sab-guessinput');
    const guess = LG.norm(input.value);
    if (!guess) { LG.restart(input, 'shake'); input.focus(); return; }
    guessLocked = true;
    input.readOnly = true;
    $('#sab-guessbtn').disabled = true;
    const ok = guess === LG.norm(game.word);
    const fb = $('#sab-guessfb');
    fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
    fb.textContent = ok ? 'GOED!' : 'FOUT!';
    if (!ok) LG.restart($('#sab-guessform'), 'shake');
    LG.buzz(ok ? [30, 40, 120] : 200);
    LG.cancel(guessTimer);
    guessTimer = LG.later(() => {
      ui.closeModal('m-sab-guess');
      if (!game) return;
      if (ok) endGame('sab', 'guess'); else endGame('crew', 'caught');
    }, 1100);
  }

  /* ----- victory ----- */
  function endGame(winner, how) {
    const g = game;
    g.phase = 'done';
    const sab = g.players[g.sab];
    $('#s-sab-victory').setAttribute('data-winner', winner === 'crew' ? 'civ' : 'inf');

    let title, sub;
    if (winner === 'crew') { title = 'DE GROEP WINT'; sub = sab.name.toUpperCase() + ' WERD GEPAKT'; }
    else if (how === 'guess') { title = 'SABOTEUR WINT'; sub = sab.name.toUpperCase() + ' RAADDE HET WOORD'; }
    else { title = 'SABOTEUR WINT'; sub = g.players[g.voted].name.toUpperCase() + ' WERD ONTERECHT UITGESTEMD'; }
    $('#sab-vtitle').textContent = title;
    $('#sab-vsub').textContent = sub;
    $('#sab-vword').textContent = g.word;
    $('#sab-vsab').textContent = sab.name;

    const art = $('#sab-art');
    const url = ink ? ink.snapshot() : '';
    if (url) art.src = url; else art.removeAttribute('src');
    art.hidden = !url;

    const list = $('#sab-vlist');
    list.textContent = '';
    g.players.forEach((p, i) => {
      const isWinner = winner === 'crew' ? !p.isSab : p.isSab;
      if (isWinner) {
        store.addPoints(p.pid, p.isSab ? PTS_SAB : PTS_CREW);
        store.addWin(p.pid);
      }
      list.appendChild(h('li', {}, h('div', { class: 'prow glass-lite' + (isWinner ? ' win' : ''), style: '--i:' + i },
        h('span', { class: 'n', style: 'background:' + p.color + ';color:#050510' }, i + 1),
        h('span', { class: 'nm' }, p.name),
        h('span', { class: 'role ' + (p.isSab ? 'r-und' : 'r-civ') }, p.isSab ? 'SABOTEUR' : 'TEKENAAR'),
        isWinner ? LG.icon('crown') : null
      )));
    });
    list.scrollTop = 0;

    ui.show('sab-victory');
    ui.confetti(winner === 'crew' ? ['#22d3ee', '#a3e635', '#5eead4', '#f4f5ff'] : ['#ff4da6', '#a78bfa', '#fb923c', '#f4f5ff']);
    LG.buzz([60, 40, 60, 40, 160]);
  }

  function cleanup() {
    LG.cancel(guessTimer);
    flow.cancel();
    if (ink) ink.cancelLive();
    game = null;
    ui.closeModal('m-sab-guess');
    if (ink) ink.redraw();
  }

  function backToSetup() {
    cleanup();
    ui.closeAll();
    ui.show('sab-setup');
  }

  function mount() {
    ui.mount(HTML);
    flow.mount();
    ink = LG.createInkCanvas($('#sab-canvaswrap'), $('#sab-canvas'), inkHooks);

    $('#sab-start').addEventListener('click', startGame);
    $('#sab-dstop').addEventListener('click', () => ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: () => LG.home() }));
    $('#sab-ok').addEventListener('click', confirmStroke);
    $('#sab-redo').addEventListener('click', redoStroke);
    $('#sab-vote').addEventListener('click', confirmVote);
    $('#sab-again').addEventListener('click', backToSetup);
    $('#sab-vhome').addEventListener('click', () => LG.home());
    $('#sab-guessform').addEventListener('submit', submitGuess);

    document.addEventListener('screenshow', (e) => {
      if (e.detail === 'sab-setup') renderSetup();
      else if (e.detail === 'sab-draw' && ink) ink.resize();
    });
  }

  LG.registerGame({
    id: 'saboteur', title: 'SABOTEUR', tag: 'Wie tekent er naast?',
    icon: 'pen', rgb: '34,211,238', min: MIN_PLAYERS, max: MAX_PLAYERS,
    mount: mount,
    open() { cleanup(); loadCfg(); ui.show('sab-setup'); },
    reset: cleanup
  });
})();