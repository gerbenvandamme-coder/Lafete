(function () {
  'use strict';

  const LG = window.LG;
  const $ = LG.$, h = LG.h, store = LG.store, ui = LG.ui;

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;
  const KAM_MIN = 4; // the Kameleon twist needs enough players to hide in
  const MAX_LEN = 28;
  const POOL = LG.data.kameleon;

  let cfg = null;
  let game = null;

  const norm = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const keyOf = (s) => norm(s) || String(s).toLowerCase();

  const HTML = ui.setupHtml('kam', 'KAMELEON', '<div class="stack" id="kam-opts"></div>', 'START SPEL') + `
  <section class="screen" id="s-kam-ask" aria-label="Antwoord invoeren">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="kam-astop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="kam-around"></span>
        <span class="chip glass-lite" id="kam-awho"></span>
      </header>
      <div class="center kam-center">
        <p class="eyebrow" id="kam-aeye"></p>
        <div class="kam-q" id="kam-aq"></div>
        <form class="kam-form" id="kam-form" autocomplete="off" novalidate>
          <input class="input" id="kam-in" type="text" maxlength="${MAX_LEN}" autocomplete="off" autocapitalize="sentences" enterkeyhint="done" aria-label="Jouw antwoord" data-autofocus>
          <button type="submit" class="btn btn-primary btn-block" id="kam-send"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>KLAAR</button>
        </form>
      </div>
    </div>
  </section>

  <section class="screen" id="s-kam-group" aria-label="Antwoorden groeperen">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="kam-gstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="kam-ground"></span>
        <span class="chip glass-lite" id="kam-ghint">TIK = KOPPEL</span>
      </header>
      <p class="kam-q small" id="kam-gq"></p>
      <div class="kam-groups" id="kam-groups"></div>
      <div class="kam-selbox" id="kam-selbox" aria-live="polite"></div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="kam-done" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-trophy"/></svg>UITSLAG</button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-kam-result" aria-label="Rondeuitslag">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="kam-rstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="kam-rround"></span>
        <span style="width:58px" aria-hidden="true"></span>
      </header>
      <div class="scroll" id="kam-rscroll">
        <div class="kam-sum glass-lite" id="kam-sum"></div>
        <ul class="plist" id="kam-rlist"></ul>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="kam-next" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg><span id="kam-nextlabel">VOLGENDE</span></button>
      </div>
    </div>
  </section>

  <section class="screen victory" id="s-kam-end" aria-label="Einde">
    <div class="wrap">
      <div class="vscroll">
        <div class="vhead">
          <svg class="ic" aria-hidden="true"><use href="#i-chameleon"/></svg>
          <h2 id="kam-etitle"></h2>
          <p class="eyebrow" id="kam-esub"></p>
        </div>
        <ul class="plist" id="kam-elist"></ul>
      </div>
      <div class="foot">
        <button type="button" class="btn" id="kam-ehome"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>HUB</button>
        <button type="button" class="btn btn-primary" id="kam-again" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>NIEUW POTJE</button>
      </div>
    </div>
  </section>`;

  const flow = LG.passflow.create('kam', {
    tag: 'KAMELEON', eyebrow: 'GEEF AAN', seeLabel: 'ANTWOORD', seeIcon: 'chameleon',
    onSee(idx, pl) { openAnswer(pl); },
    onDone() { openGroup(); },
    onStop() { LG.home(); }
  });

  const roundLabel = () => 'RONDE ' + (game.round + 1) + '/' + game.rounds;
  const answerOf = (id) => game.answers.filter((a) => a.id === id)[0] || null;
  const groupIndexOf = (id) => game.groups.findIndex((gr) => gr.ids.indexOf(id) !== -1);
  const sortedGroups = () => game.groups.slice().sort((a, b) => b.ids.length - a.ids.length);

  /* The group label is the most common spelling inside the group. */
  function labelOf(gr) {
    const counts = new Map();
    let best = null, bestN = 0;
    gr.ids.forEach((id) => {
      const a = answerOf(id);
      if (!a) return;
      const k = keyOf(a.text);
      const n = (counts.get(k) || 0) + 1;
      counts.set(k, n);
      if (n > bestN) { bestN = n; best = a.text; }
    });
    return best || '?';
  }

  /* ----- setup ----- */
  function loadCfg() { cfg = store.cfg('kameleon', { rounds: 5, kameleon: true }); store.save(); }

  function renderSetup() {
    if (!cfg) loadCfg();
    ui.fillStrip('kam');
    $('#kam-chip').textContent = store.freshCount('kameleon', POOL) + ' VRAGEN';
    const box = $('#kam-opts');
    box.textContent = '';
    box.appendChild(h('p', { class: 'how glass-lite' },
      h('b', {}, 'HOE WERKT HET? '),
      'Iedereen typt in het geheim een antwoord op dezelfde vraag. Antwoorden die op elkaar lijken tellen samen. De grootste kudde scoort. Denk zoals de groep!'));
    box.appendChild(h('p', { class: 'sec' }, 'RONDES'));
    box.appendChild(ui.numStepper({
      label: 'RONDES', icon: 'herd', rgb: '190,255,60', minus: 'Minder rondes', plus: 'Meer rondes',
      obj: cfg, key: 'rounds', min: 1, max: 15
    }).el);
    box.appendChild(h('p', { class: 'sec' }, 'TWIST'));
    box.appendChild(ui.switchRow({
      label: 'DE KAMELEON (VANAF ' + KAM_MIN + ')', icon: 'chameleon', rgb: '190,255,60',
      get: () => cfg.kameleon, set: (v) => { cfg.kameleon = v; store.save(); }
    }).el);
    box.appendChild(h('p', { class: 'how glass-lite' },
      'Eén speler per ronde is de Kameleon: die ziet de vraag niet en moet toch in de kudde passen. Lukt dat, dan scoort de Kameleon dubbel.'));
  }

  /* ----- game flow ----- */
  function startGame() {
    const roster = store.active();
    if (roster.length < MIN_PLAYERS || roster.length > MAX_PLAYERS) {
      ui.toast('Kameleon is voor ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' spelers');
      LG.buzz(25);
      return;
    }
    if (!cfg) loadCfg();
    game = {
      players: roster.map((p, i) => ({ id: i, pid: p.id, name: p.name, color: store.color(p.id) })),
      rounds: cfg.rounds, round: 0, useKam: cfg.kameleon && roster.length >= KAM_MIN,
      q: '', kam: -1, lastKam: -1, answers: [], groups: [], picked: null,
      cur: null, busy: false, totals: {}, gains: {}
    };
    LG.buzz(20);
    startRound();
  }

  function startRound() {
    const g = game;
    const picked = store.draw('kameleon', POOL);
    g.q = String(picked.item);
    g.answers = [];
    g.groups = [];
    g.picked = null;
    g.busy = false;
    g.kam = -1;
    if (g.useKam) {
      let k = LG.rand(g.players.length);
      if (k === g.lastKam) k = (k + 1 + LG.rand(g.players.length - 1)) % g.players.length;
      g.kam = k;
      g.lastKam = k;
    }
    if (picked.recycled) ui.toast('Alle vragen gehad — opnieuw geschud');
    flow.start(LG.shuffle(g.players)); // random order keeps the Kameleon hidden
    $('#kam-pcount').textContent = 'RONDE ' + (g.round + 1) + ' · ' + $('#kam-pcount').textContent;
  }

  /* ----- secret answer ----- */
  function openAnswer(pl) {
    const g = game;
    if (!g) return;
    g.cur = pl;
    g.busy = false;
    const isKam = pl.id === g.kam;
    $('#kam-around').textContent = roundLabel();
    $('#kam-awho').textContent = pl.name;
    $('#kam-aeye').textContent = isKam ? 'GEHEIME ROL' : 'VRAAG';
    const q = $('#kam-aq');
    q.textContent = '';
    q.classList.toggle('is-kam', isKam);
    if (isKam) {
      q.appendChild(h('span', { class: 'kam-badge' }, LG.icon('chameleon')));
      q.appendChild(h('span', {}, 'JIJ BENT DE KAMELEON'));
      q.appendChild(h('small', { class: 'kam-note' }, 'JE ZIET DE VRAAG NIET · TYP WAT DE GROEP WAARSCHIJNLIJK ZEGT'));
    } else {
      q.appendChild(h('span', {}, g.q));
    }
    const input = $('#kam-in');
    input.value = '';
    ui.show('kam-ask');
  }

  function submitAnswer(e) {
    e.preventDefault();
    const g = game;
    if (!g || g.busy || !g.cur || ui.current() !== 'kam-ask') return;
    const input = $('#kam-in');
    const text = input.value.replace(/\s+/g, ' ').trim().slice(0, MAX_LEN);
    if (!text) {
      ui.toast('Vul een antwoord in');
      LG.buzz(25);
      LG.restart(input, 'shake');
      return;
    }
    g.busy = true;
    g.answers.push({ id: g.cur.id, name: g.cur.name, text: text });
    input.value = '';
    $('#kam-aq').textContent = ''; // wipe the secret before the phone moves on
    input.blur();
    LG.buzz(14);
    flow.next();
  }

  /* ----- grouping ----- */
  function openGroup() {
    const g = game;
    if (!g) return;
    const map = new Map();
    g.groups = [];
    g.answers.forEach((a) => {
      const k = keyOf(a.text);
      if (!map.has(k)) { const gr = { ids: [] }; map.set(k, gr); g.groups.push(gr); }
      map.get(k).ids.push(a.id);
    });
    g.picked = null;
    $('#kam-ground').textContent = roundLabel();
    $('#kam-gq').textContent = g.q;
    renderGroups();
    ui.show('kam-group');
  }

  function renderGroups() {
    const g = game;
    const box = $('#kam-groups');
    const top = box.scrollTop;
    box.textContent = '';
    const gs = sortedGroups();
    const max = gs.length ? gs[0].ids.length : 0;
    gs.forEach((gr, i) => {
      const major = max >= 2 && gr.ids.length === max;
      const chips = gr.ids.map((id) => {
        const a = answerOf(id);
        return h('button', {
          type: 'button', class: 'kam-chip', 'aria-pressed': g.picked === id ? 'true' : 'false',
          onclick: () => pick(id)
        }, h('b', {}, a.name), h('small', {}, a.text));
      });
      box.appendChild(h('div', { class: 'kam-group glass' + (major ? ' major' : ''), style: '--i:' + i },
        h('div', { class: 'kam-ghead' },
          h('span', { class: 'kam-count' }, gr.ids.length),
          h('span', { class: 'kam-label' }, labelOf(gr))),
        h('div', { class: 'kam-members' }, chips)));
    });
    box.scrollTop = top;
    renderSel();
  }

  function renderSel() {
    const g = game;
    const box = $('#kam-selbox');
    box.textContent = '';
    if (g.picked == null) return;
    const a = answerOf(g.picked);
    const gi = groupIndexOf(g.picked);
    if (!a || gi < 0) return;
    const kids = [h('span', {}, a.name + ': ' + a.text + ' · tik een ander antwoord om samen te voegen')];
    if (g.groups[gi].ids.length > 1) {
      kids.push(h('button', { type: 'button', class: 'btn', onclick: detach }, 'LOS'));
    }
    box.appendChild(h('div', { class: 'kam-sel glass-lite' }, kids));
  }

  function pick(id) {
    const g = game;
    if (!g || ui.current() !== 'kam-group') return;
    if (g.picked == null) { g.picked = id; LG.buzz(8); }
    else if (g.picked === id) { g.picked = null; }
    else if (groupIndexOf(g.picked) === groupIndexOf(id)) { g.picked = id; LG.buzz(8); }
    else {
      const from = groupIndexOf(g.picked), to = groupIndexOf(id);
      const src = g.groups[from], dst = g.groups[to];
      dst.ids = dst.ids.concat(src.ids);
      g.groups.splice(from, 1);
      g.picked = null;
      LG.buzz(18);
    }
    renderGroups();
  }

  function detach() {
    const g = game;
    if (!g || g.picked == null) return;
    const gi = groupIndexOf(g.picked);
    if (gi < 0 || g.groups[gi].ids.length < 2) return;
    g.groups[gi].ids = g.groups[gi].ids.filter((id) => id !== g.picked);
    g.groups.push({ ids: [g.picked] });
    g.picked = null;
    LG.buzz(12);
    renderGroups();
  }

  /* ----- round result ----- */
  function showResult() {
    const g = game;
    if (!g || ui.current() !== 'kam-group') return;
    const gs = sortedGroups();
    const max = gs.length ? gs[0].ids.length : 0;
    const herd = max >= 2 ? gs.filter((gr) => gr.ids.length === max) : [];
    const inHerd = {};
    herd.forEach((gr) => gr.ids.forEach((id) => { inHerd[id] = true; }));

    g.gains = {};
    g.answers.forEach((a) => {
      const pts = inHerd[a.id] ? (a.id === g.kam ? 2 : 1) : 0;
      g.gains[a.id] = pts;
      g.totals[a.id] = (g.totals[a.id] || 0) + pts;
      if (pts > 0) store.addPoints(g.players[a.id].pid, pts);
    });

    const sum = $('#kam-sum');
    sum.textContent = '';
    if (herd.length) {
      sum.appendChild(h('span', { style: 'display:block' }, 'KUDDE: ', h('b', {}, herd.map(labelOf).join(' / ')), ' · ' + max + ' SPELERS'));
    } else {
      sum.appendChild(h('span', { style: 'display:block' }, 'GEEN KUDDE · NIEMAND SCOORT'));
    }
    if (g.kam >= 0) {
      const caught = !inHerd[g.kam];
      sum.appendChild(h('span', { style: 'display:block' },
        'KAMELEON: ', h('b', {}, g.players[g.kam].name), caught ? ' · GEPAKT' : ' · ONTSNAPT (+2)'));
    }

    const rows = g.answers.slice().sort((a, b) => (g.gains[b.id] - g.gains[a.id]) || a.name.localeCompare(b.name));
    const list = $('#kam-rlist');
    list.textContent = '';
    rows.forEach((a, i) => {
      const gain = g.gains[a.id];
      const kids = [
        h('span', { class: 'n', style: 'background:' + g.players[a.id].color + ';color:#050510' }, LG.initial(a.name)),
        h('span', { class: 'nm' }, a.name, h('small', { class: 'out-note', style: 'display:block' }, a.text))
      ];
      if (a.id === g.kam) kids.push(h('span', { class: 'kam-badge', title: 'Kameleon' }, LG.icon('chameleon')));
      kids.push(h('b', { class: 'pts' + (gain > 0 ? ' kam-gain' : '') }, gain > 0 ? '+' + gain : '0'));
      list.appendChild(h('li', {}, h('div', { class: 'prow glass-lite' + (gain > 0 ? ' win' : ''), style: '--i:' + i }, kids)));
    });

    $('#kam-rround').textContent = roundLabel();
    $('#kam-nextlabel').textContent = g.round + 1 >= g.rounds ? 'EINDE' : 'VOLGENDE';
    $('#kam-rscroll').scrollTop = 0;
    ui.show('kam-result');
    if (herd.length) ui.confetti(['#d9ff4a', '#5eead4', '#22d3ee', '#f4f5ff']);
    LG.buzz(herd.length ? [30, 40, 120] : 150);
  }

  function nextRound() {
    const g = game;
    if (!g || ui.current() !== 'kam-result') return;
    g.round++;
    if (g.round >= g.rounds) endGame(); else startRound();
  }

  /* ----- end ----- */
  function endGame() {
    const g = game;
    const rows = g.players.map((p) => ({ p: p, pts: g.totals[p.id] || 0 })).sort((a, b) => b.pts - a.pts);
    const top = rows[0].pts;
    const winners = top > 0 ? rows.filter((r) => r.pts === top) : [];
    winners.forEach((r) => store.addWin(r.p.pid));

    $('#kam-etitle').textContent = winners.length === 1 ? winners[0].p.name.toUpperCase() + ' WINT'
      : winners.length > 1 ? 'GELIJK SPEL' : 'GEEN KUDDE';
    $('#kam-esub').textContent = g.rounds + (g.rounds === 1 ? ' RONDE' : ' RONDES') + ' GESPEELD';

    const list = $('#kam-elist');
    list.textContent = '';
    rows.forEach((r, i) => {
      const win = winners.indexOf(r) !== -1;
      const kids = [
        h('span', { class: 'n', style: 'background:' + r.p.color + ';color:#050510' }, i + 1),
        h('span', { class: 'nm' }, r.p.name),
        h('b', { class: 'pts' }, r.pts)
      ];
      if (win) kids.push(LG.icon('crown'));
      list.appendChild(h('li', {}, h('div', { class: 'prow glass-lite' + (win ? ' win' : ''), style: '--i:' + i }, kids)));
    });
    list.scrollTop = 0;
    $('#s-kam-end').setAttribute('data-winner', 'civ');
    ui.show('kam-end');
    if (winners.length) ui.confetti(['#d9ff4a', '#5eead4', '#fde047', '#f4f5ff']);
    LG.buzz([60, 40, 60, 40, 160]);
  }

  function cleanup() {
    flow.cancel();
    game = null;
    const input = $('#kam-in');
    if (input) input.value = '';
    const q = $('#kam-aq');
    if (q) q.textContent = '';
  }

  function mount() {
    ui.mount(HTML);
    flow.mount();
    const stop = () => ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: () => LG.home() });
    $('#kam-start').addEventListener('click', startGame);
    $('#kam-astop').addEventListener('click', stop);
    $('#kam-gstop').addEventListener('click', stop);
    $('#kam-rstop').addEventListener('click', stop);
    $('#kam-form').addEventListener('submit', submitAnswer);
    $('#kam-done').addEventListener('click', showResult);
    $('#kam-next').addEventListener('click', nextRound);
    $('#kam-again').addEventListener('click', () => { cleanup(); ui.show('kam-setup'); });
    $('#kam-ehome').addEventListener('click', () => LG.home());
    document.addEventListener('screenshow', (e) => { if (e.detail === 'kam-setup') renderSetup(); });
    // Anti-spy: never leave the secret question on screen when the page goes to the background.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game && ui.current() === 'kam-ask') {
        $('#kam-aq').textContent = '';
        $('#kam-in').value = '';
        flow.clear();
        game.busy = true;
        ui.toast('Pauze — geef de telefoon terug');
        ui.show('kam-pass');
      }
    });
  }

  LG.registerGame({
    id: 'kameleon', title: 'KAMELEON', tag: 'Denk als de groep',
    icon: 'chameleon', rgb: '190,255,60', min: MIN_PLAYERS, max: MAX_PLAYERS,
    mount: mount,
    open() { cleanup(); loadCfg(); ui.show('kam-setup'); },
    reset: cleanup
  });
})();