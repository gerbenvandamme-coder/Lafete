(function () {
  'use strict';

  const LG = window.LG;
  const $ = LG.$, h = LG.h, store = LG.store, ui = LG.ui;

  const MIN_PLAYERS = 3; // minder spelers = geen echte anonimiteit
  const MAX_PLAYERS = 20;
  const POOL = LG.data.dilemma;

  let cfg = null;
  let game = null;
  let timers = [];

  const later = (fn, ms) => { const id = LG.later(fn, ms); timers.push(id); return id; };
  const clearTimers = () => { timers.forEach(LG.cancel); timers = []; };

  const HTML = ui.setupHtml('dil', 'HET DILEMMA', '<div class="stack" id="dil-opts"></div>', 'START SPEL') + `
  <section class="screen" id="s-dil-vote" aria-label="Stemmen">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="dil-vstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="dil-vround"></span>
        <span class="chip glass-lite" id="dil-vwho"></span>
      </header>
      <div class="center dil-center">
        <p class="eyebrow">JOUW STEM</p>
        <p class="dil-q" id="dil-vq"></p>
      </div>
      <div class="dil-vote-btns">
        <button type="button" class="btn dil-btn yes" id="dil-yes"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>JA</button>
        <button type="button" class="btn dil-btn no" id="dil-no"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg>NEE</button>
      </div>
    </div>
    <div class="dil-mask" aria-hidden="true"><svg class="ic"><use href="#i-lock"/></svg><b>GESTEMD</b><small>GEEF DOOR</small></div>
  </section>

  <section class="screen" id="s-dil-pred" aria-label="Groepsgok">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="dil-pstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="dil-pround"></span>
        <span style="width:58px" aria-hidden="true"></span>
      </header>
      <div class="center dil-center">
        <p class="eyebrow">GROEPSGOK</p>
        <p class="dil-q" id="dil-pq"></p>
        <p class="sheet-text" id="dil-ptext"></p>
        <div class="dil-pred glass">
          <button type="button" class="step" id="dil-minus" aria-label="Minder"><svg class="ic"><use href="#i-minus"/></svg></button>
          <span class="big-num" id="dil-num" aria-live="polite">0</span>
          <button type="button" class="step" id="dil-plus" aria-label="Meer"><svg class="ic"><use href="#i-plus"/></svg></button>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="dil-lock" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg>VERGRENDEL</button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-dil-reveal" aria-label="Resultaat">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="dil-rstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="dil-rround"></span>
        <span class="chip glass-lite" id="dil-rguess"></span>
      </header>
      <div class="center dil-center">
        <p class="dil-q" id="dil-rq"></p>
        <div class="dil-counters" aria-live="polite">
          <div class="dil-count yes glass"><small>JA</small><b id="dil-cy">0</b></div>
          <div class="dil-count no glass"><small>NEE</small><b id="dil-cn">0</b></div>
        </div>
        <div id="dil-verdict" hidden></div>
        <ul class="dil-open" id="dil-open" hidden></ul>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="dil-show" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-eye"/></svg>ONTHUL RESULTAAT</button>
        <button type="button" class="btn btn-primary" id="dil-next" hidden><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg><span id="dil-nextlabel">VOLGENDE</span></button>
      </div>
    </div>
  </section>

  <section class="screen victory" id="s-dil-end" aria-label="Einde">
    <div class="wrap">
      <div class="vscroll">
        <div class="vhead">
          <svg class="ic" aria-hidden="true"><use href="#i-scale"/></svg>
          <h2 id="dil-etitle"></h2>
          <p class="eyebrow" id="dil-esub"></p>
        </div>
        <ul class="plist" id="dil-elist"></ul>
      </div>
      <div class="foot">
        <button type="button" class="btn" id="dil-ehome"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>HUB</button>
        <button type="button" class="btn btn-primary" id="dil-again" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>NIEUW POTJE</button>
      </div>
    </div>
  </section>`;

  const flow = LG.passflow.create('dil', {
    tag: 'DILEMMA', eyebrow: 'GEEF AAN', seeLabel: 'STEM NU', seeIcon: 'vote',
    onSee(idx, pl) { openVote(pl); },
    onDone() { openPredict(); },
    onStop() { LG.home(); }
  });

  /* ----- setup ----- */
  function loadCfg() { cfg = store.cfg('dilemma', { rounds: 5, open: false }); store.save(); }

  function renderSetup() {
    if (!cfg) loadCfg();
    ui.fillStrip('dil');
    $('#dil-chip').textContent = store.freshCount('dilemma', POOL) + ' STELLINGEN';
    const box = $('#dil-opts');
    box.textContent = '';
    box.appendChild(h('p', { class: 'how glass-lite' },
      h('b', {}, 'HOE WERKT HET? '),
      'Iedereen stemt in het geheim JA of NEE op een stelling. Daarna gokt de groep hoeveel mensen JA zeiden. Dichterbij = meer teampunten.'));
    box.appendChild(h('p', { class: 'sec' }, 'RONDES'));
    box.appendChild(ui.numStepper({
      label: 'RONDES', icon: 'scale', rgb: '251,191,36', minus: 'Minder rondes', plus: 'Meer rondes',
      obj: cfg, key: 'rounds', min: 1, max: 15
    }).el);
    box.appendChild(h('p', { class: 'sec' }, 'MODUS'));
    box.appendChild(ui.switchRow({
      label: 'OPEN KAART', icon: 'eye', rgb: '251,191,36',
      get: () => cfg.open, set: (v) => { cfg.open = v; store.save(); }
    }).el);
  }

  /* ----- game flow ----- */
  function startGame() {
    const roster = store.active();
    if (roster.length < MIN_PLAYERS || roster.length > MAX_PLAYERS) {
      ui.toast('Het Dilemma is voor ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' spelers');
      LG.buzz(25);
      return;
    }
    if (!cfg) loadCfg();
    game = {
      players: roster.map((p, i) => ({ id: i, pid: p.id, name: p.name, color: store.color(p.id) })),
      rounds: cfg.rounds, round: 0, open: cfg.open,
      q: '', votes: [], cur: null, busy: false, pred: 0, score: 0, history: []
    };
    LG.buzz(20);
    startRound();
  }

  function startRound() {
    const g = game;
    const picked = store.draw('dilemma', POOL);
    g.q = String(picked.item);
    g.votes = [];
    g.busy = false;
    if (picked.recycled) ui.toast('Alle stellingen gehad — opnieuw geschud');
    flow.start(LG.shuffle(g.players));
    $('#dil-pcount').textContent = 'RONDE ' + (g.round + 1) + ' · ' + $('#dil-pcount').textContent;
  }

  const roundLabel = () => 'RONDE ' + (game.round + 1) + '/' + game.rounds;

  /* ----- blind voting ----- */
  function openVote(pl) {
    const g = game;
    if (!g) return;
    g.cur = pl;
    g.busy = false;
    $('#s-dil-vote').classList.remove('masked');
    $('#dil-vround').textContent = roundLabel();
    $('#dil-vwho').textContent = pl.name;
    $('#dil-vq').textContent = g.q;
    ui.show('dil-vote');
  }

  function castVote(yes) {
    const g = game;
    if (!g || g.busy || !g.cur || ui.current() !== 'dil-vote') return;
    g.busy = true;
    g.votes.push({ id: g.cur.id, name: g.cur.name, yes: yes });
    $('#s-dil-vote').classList.add('masked'); // spring mask hides the screen at once
    LG.buzz(yes ? 14 : 22);
    later(() => { if (game === g) flow.next(); }, 700);
  }

  /* ----- prediction ----- */
  function setPredText() {
    const n = game.players.length;
    const t = $('#dil-ptext');
    t.textContent = 'Jullie gokken: ' + game.pred + ' van de ' + n;
    $('#dil-num').textContent = String(game.pred);
  }

  function openPredict() {
    const g = game;
    if (!g) return;
    const n = g.players.length;
    g.pred = Math.round(n / 2);
    $('#dil-pround').textContent = roundLabel();
    const q = $('#dil-pq');
    q.textContent = '';
    q.appendChild(document.createTextNode('Hoeveel van de '));
    q.appendChild(h('b', {}, n));
    q.appendChild(document.createTextNode(' spelers hebben JA gestemd?'));
    setPredText();
    ui.show('dil-pred');
  }

  function stepPred(dir) {
    const g = game;
    if (!g || ui.current() !== 'dil-pred') return;
    const next = g.pred + dir;
    if (next < 0 || next > g.players.length) { LG.buzz(25); return; }
    g.pred = next;
    setPredText();
    LG.restart($('#dil-num'), 'bump');
    LG.buzz(8);
  }

  /* ----- counter reveal ----- */
  function openReveal() {
    const g = game;
    if (!g || ui.current() !== 'dil-pred') return;
    $('#dil-rround').textContent = roundLabel();
    $('#dil-rguess').textContent = 'GOK ' + g.pred;
    $('#dil-rq').textContent = g.q;
    $('#dil-cy').textContent = '0';
    $('#dil-cn').textContent = '0';
    $('#dil-verdict').hidden = true;
    $('#dil-verdict').textContent = '';
    $('#dil-open').hidden = true;
    $('#dil-open').textContent = '';
    $('#dil-next').hidden = true;
    $('#dil-show').hidden = false;
    $('#dil-show').disabled = false;
    ui.show('dil-reveal');
  }

  function tickReveal() {
    const g = game;
    if (!g || g.busy || ui.current() !== 'dil-reveal') return;
    g.busy = true;
    $('#dil-show').disabled = true;
    const seq = LG.shuffle(g.votes.map((v) => v.yes)); // random order keeps votes anonymous
    const gap = LG.clamp(Math.round(5000 / seq.length), 160, 450);
    let yes = 0, no = 0;
    const step = (i) => {
      if (game !== g) return;
      if (i >= seq.length) { later(() => { if (game === g) finishReveal(yes); }, 400); return; }
      const el = seq[i] ? $('#dil-cy') : $('#dil-cn');
      if (seq[i]) yes++; else no++;
      el.textContent = String(seq[i] ? yes : no);
      LG.restart(el, 'bump');
      LG.buzz(8);
      later(() => step(i + 1), gap);
    };
    later(() => step(0), 500);
  }

  function finishReveal(yes) {
    const g = game;
    const diff = Math.abs(g.pred - yes);
    const pts = diff === 0 ? 2 : diff === 1 ? 1 : 0;
    g.score += pts;
    g.history.push({ q: g.q, yes: yes, no: g.players.length - yes, pred: g.pred, pts: pts });
    g.busy = false;

    const box = $('#dil-verdict');
    box.textContent = '';
    box.appendChild(h('div', { class: 'dil-verdict', 'data-diff': diff === 0 ? '0' : diff === 1 ? '1' : 'x' },
      h('b', {}, diff === 0 ? 'PRECIES!' : diff === 1 ? 'BIJNA' : 'MIS'),
      h('span', {}, 'JULLIE GOKTEN ' + g.pred + ' · ECHT ' + yes)));
    box.hidden = false;

    if (g.open) {
      const ul = $('#dil-open');
      ul.textContent = '';
      g.votes.forEach((v, i) => {
        ul.appendChild(h('li', {}, h('div', { class: 'prow glass-lite', style: '--i:' + i },
          h('span', { class: 'n' }, LG.initial(v.name)),
          h('span', { class: 'nm' }, v.name),
          h('span', { class: 'vtag ' + (v.yes ? 'yes' : 'no') }, v.yes ? 'JA' : 'NEE'))));
      });
      ul.hidden = false;
    }

    $('#dil-show').hidden = true;
    $('#dil-nextlabel').textContent = g.round + 1 >= g.rounds ? 'RESULTAAT' : 'VOLGENDE';
    $('#dil-next').hidden = false;
    if (diff === 0) ui.confetti(['#5eead4', '#34d399', '#fde047', '#f4f5ff']);
    LG.buzz(diff === 0 ? [30, 40, 120] : diff === 1 ? 40 : 150);
  }

  function nextRound() {
    const g = game;
    if (!g || g.busy) return;
    g.round++;
    if (g.round >= g.rounds) endGame(); else startRound();
  }

  /* ----- end ----- */
  function endGame() {
    const g = game;
    const max = g.rounds * 2;
    const ratio = max ? g.score / max : 0;
    $('#dil-etitle').textContent = ratio >= 0.7 ? 'BESTE VRIENDEN' : ratio >= 0.35 ? 'GOEDE KENNISSEN' : 'VREEMDEN';
    $('#dil-esub').textContent = 'TEAMSCORE ' + g.score + ' / ' + max;
    $('#s-dil-end').setAttribute('data-winner', ratio >= 0.35 ? 'civ' : 'inf');

    const list = $('#dil-elist');
    list.textContent = '';
    g.history.forEach((r, i) => {
      list.appendChild(h('li', {}, h('div', { class: 'prow glass-lite' + (r.pts === 2 ? ' win' : ''), style: '--i:' + i },
        h('span', { class: 'n' }, i + 1),
        h('span', { class: 'nm' },
          h('span', { class: 'dil-rtext' }, r.q),
          h('small', { class: 'out-note' }, 'JA ' + r.yes + ' · NEE ' + r.no + ' · GOK ' + r.pred)),
        h('b', { class: 'pts' }, '+' + r.pts))));
    });
    list.scrollTop = 0;
    ui.show('dil-end');
    if (ratio >= 0.7) ui.confetti(['#fbbf24', '#34d399', '#fb7185', '#f4f5ff']);
    LG.buzz([60, 40, 60, 40, 160]);
  }

  function cleanup() {
    clearTimers();
    flow.cancel();
    game = null;
    const v = $('#s-dil-vote');
    if (v) v.classList.remove('masked');
  }

  function mount() {
    ui.mount(HTML);
    flow.mount();
    const stop = () => ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: () => LG.home() });
    $('#dil-start').addEventListener('click', startGame);
    $('#dil-vstop').addEventListener('click', stop);
    $('#dil-pstop').addEventListener('click', stop);
    $('#dil-rstop').addEventListener('click', stop);
    $('#dil-yes').addEventListener('click', () => castVote(true));
    $('#dil-no').addEventListener('click', () => castVote(false));
    $('#dil-minus').addEventListener('click', () => stepPred(-1));
    $('#dil-plus').addEventListener('click', () => stepPred(1));
    $('#dil-lock').addEventListener('click', openReveal);
    $('#dil-show').addEventListener('click', tickReveal);
    $('#dil-next').addEventListener('click', nextRound);
    $('#dil-again').addEventListener('click', () => { cleanup(); ui.show('dil-setup'); });
    $('#dil-ehome').addEventListener('click', () => LG.home());
    document.addEventListener('screenshow', (e) => { if (e.detail === 'dil-setup') renderSetup(); });
  }

  LG.registerGame({
    id: 'dilemma', title: 'HET DILEMMA', tag: 'Hoe goed ken je elkaar?',
    icon: 'scale', rgb: '251,191,36', min: MIN_PLAYERS, max: MAX_PLAYERS,
    mount: mount,
    open() { cleanup(); loadCfg(); ui.show('dil-setup'); },
    reset: cleanup
  });
})();