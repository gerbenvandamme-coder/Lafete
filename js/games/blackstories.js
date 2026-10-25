(function () {
  'use strict';

  /* RAADSEL DER DOOD (Black Stories): catalogus, publiek raadsel, dossier van de verteller met stopwatch en eregalerij. */
  const LG = window.LG;
  const $ = LG.$, h = LG.h, ui = LG.ui;

  const STORIES = (LG.data && LG.data.blackstories) || [];
  const DONE_KEY = 'lafete:blackstories:done:v1';
  const TIMES_KEY = 'lafete:blackstories:times:v1';
  const NAME_KEY = 'lafete:blackstories:name:v1';
  const NAME_MAX = 20;
  const KEEP_PER_STORY = 5;
  const HALL_SIZE = 10;

  const TIERS = [
    { id: 'easy', label: 'EASY' },
    { id: 'medium', label: 'MEDIUM' },
    { id: 'hard', label: 'HARD' },
    { id: 'extreme', label: 'EXTREME' }
  ];
  const TIER_LABEL = {};
  TIERS.forEach((t) => { TIER_LABEL[t.id] = t.label; });

  const ANSWERS = {
    yes: { text: 'JA', tone: [523, 784], buzz: 30 },
    no: { text: 'NEE', tone: [262, 196], buzz: [40, 30, 40] },
    na: { text: 'NIET RELEVANT', tone: [392], buzz: 15 }
  };

  const view = { q: '', diff: 'all', hide: false, hall: 'easy' };
  const watch = { elapsed: 0, t0: 0, running: false, raf: 0 };
  let current = null;
  let pending = null;
  let actx = null;

  /* ----- opslag ----- */
  function load(key) {
    try {
      const raw = localStorage.getItem(key);
      const v = raw ? JSON.parse(raw) : null;
      return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) { return {}; }
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* privémodus: negeren */ }
  }
  function loadName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; }
  }
  function saveName(n) {
    try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* negeren */ }
  }
  function setDone(id, on) {
    const d = load(DONE_KEY);
    if (on) d[id] = true; else delete d[id];
    save(DONE_KEY, d);
  }
  const cleanName = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  const storyById = (id) => STORIES.filter((s) => s.id === id)[0] || null;

  /* ----- geluid ----- */
  function blip(freqs, dur) {
    try {
      if (LG.sound && LG.sound.isMuted && LG.sound.isMuted()) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      actx = actx || new AC();
      if (actx.state === 'suspended') actx.resume();
      const t0 = actx.currentTime;
      freqs.forEach((f, i) => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        const s = t0 + i * 0.09;
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.18, s + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.connect(g);
        g.connect(actx.destination);
        o.start(s);
        o.stop(s + dur + 0.02);
      });
    } catch (e) { /* geen geluid beschikbaar */ }
  }

  /* ----- stopwatch ----- */
  const pad = (n) => (n < 10 ? '0' : '') + n;
  function fmt(ms) {
    const t = Math.max(0, Math.floor(ms));
    return pad(Math.floor(t / 60000)) + ':' + pad(Math.floor(t / 1000) % 60) + '.' + pad(Math.floor((t % 1000) / 10));
  }
  const elapsedNow = () => (watch.running ? watch.elapsed + (performance.now() - watch.t0) : watch.elapsed);

  function paint() {
    const el = $('#bs-time');
    if (el) el.textContent = fmt(elapsedNow());
  }
  function syncClock() {
    const clock = $('#bs-clock'), btn = $('#bs-toggle');
    if (!clock || !btn) return;
    clock.classList.toggle('run', watch.running);
    btn.textContent = watch.running ? 'PAUZE' : (watch.elapsed > 0 ? 'HERVAT' : 'START ONDERVRAGING');
    btn.setAttribute('aria-pressed', watch.running ? 'true' : 'false');
  }
  function loop() {
    if (!watch.running) return;
    paint();
    watch.raf = requestAnimationFrame(loop);
  }
  function startWatch() {
    if (watch.running) return;
    watch.t0 = performance.now();
    watch.running = true;
    syncClock();
    loop();
  }
  function pauseWatch() {
    if (!watch.running) return;
    watch.elapsed += performance.now() - watch.t0;
    watch.running = false;
    cancelAnimationFrame(watch.raf);
    paint();
    syncClock();
  }
  function resetWatch() {
    watch.running = false;
    cancelAnimationFrame(watch.raf);
    watch.elapsed = 0;
    paint();
    syncClock();
  }

  /* ----- HTML ----- */
  const HTML = `
  <section class="screen" id="s-bs-catalog" aria-label="Raadsel der Dood, verhalen">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" data-home aria-label="Terug naar hub"><svg class="ic"><use href="#i-home"/></svg></button>
        <h2 class="title">RAADSEL DER DOOD</h2>
        <button type="button" class="icon-btn glass" id="bs-hallbtn" aria-label="Eregalerij"><svg class="ic"><use href="#i-trophy"/></svg></button>
      </header>
      <div class="bs-tools">
        <label class="bs-search glass-lite">
          <svg class="ic" aria-hidden="true"><use href="#i-spy"/></svg>
          <input class="bs-input" id="bs-q" type="search" placeholder="Zoek op titel of trefwoord" autocomplete="off" aria-label="Zoeken in verhalen">
        </label>
        <div class="bs-pills" id="bs-pills" role="group" aria-label="Moeilijkheid"></div>
        <div class="bs-meta">
          <button type="button" class="bs-toggle" id="bs-hide" aria-pressed="false">VERBERG VOLTOOIDE</button>
          <span class="bs-count" id="bs-count" aria-live="polite"></span>
        </div>
      </div>
      <div class="vscroll">
        <div class="bs-grid" id="bs-list"></div>
        <p class="empty" id="bs-empty" hidden>Geen verhalen gevonden.</p>
      </div>
    </div>
  </section>

  <section class="screen" id="s-bs-enigma" aria-label="Het raadsel">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="bs-eback" aria-label="Terug naar de verhalen"><svg class="ic"><use href="#i-back"/></svg></button>
        <span class="chip glass-lite bs-tag" id="bs-ediff"></span>
        <span class="chip glass-lite" id="bs-etitle"></span>
      </header>
      <div class="center bs-enigma">
        <p class="eyebrow">HET RAADSEL</p>
        <p class="bs-q" id="bs-q-public"></p>
        <p class="stage-note">DIT SCHERM MAG DE GROEP ZIEN</p>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="bs-reveal" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg>BEKIJK DE TOEDRACHT</button>
        <p class="stage-note">ALLEEN VOOR DE VERTELLER</p>
      </div>
    </div>
  </section>

  <section class="screen" id="s-bs-narrator" aria-label="Dossier van de verteller">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="bs-nstop" aria-label="Terug naar de verhalen"><svg class="ic"><use href="#i-x"/></svg></button>
        <span class="chip glass-lite" id="bs-ntitle"></span>
        <button type="button" class="icon-btn glass" id="bs-veil" aria-pressed="false" aria-label="Toedracht verbergen of tonen"><svg class="ic"><use href="#i-eye"/></svg></button>
      </header>
      <div class="bs-clock glass" id="bs-clock">
        <div class="bs-time" id="bs-time" role="timer" aria-live="off">00:00.00</div>
        <p class="bs-cue" id="bs-cue" role="status" aria-live="polite"></p>
        <div class="bs-ctl">
          <button type="button" class="bs-ctlbtn" id="bs-toggle" aria-pressed="false">PAUZE</button>
          <button type="button" class="bs-ctlbtn" id="bs-reset">RESET</button>
        </div>
      </div>
      <div class="vscroll bs-dossier">
        <section class="bs-sol glass" id="bs-sol">
          <p class="eyebrow">DE TOEDRACHT</p>
          <p class="bs-solution" id="bs-solution"></p>
        </section>
        <section class="bs-ref glass-lite">
          <p class="eyebrow">HET RAADSEL</p>
          <p class="bs-refq" id="bs-question"></p>
        </section>
      </div>
      <div class="bs-answers" role="group" aria-label="Antwoord geven">
        <button type="button" class="bs-ans yes" data-ans="yes">JA</button>
        <button type="button" class="bs-ans no" data-ans="no">NEE</button>
        <button type="button" class="bs-ans na" data-ans="na">NIET RELEVANT</button>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary btn-block" id="bs-solved"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>MYSTERIE OPGELOST!</button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-bs-hall" aria-label="Eregalerij">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="bs-hback" aria-label="Terug naar de verhalen"><svg class="ic"><use href="#i-back"/></svg></button>
        <h2 class="title">EREGALERIJ</h2>
        <span class="chip glass-lite">SNELSTE TIJDEN</span>
      </header>
      <div class="bs-tools">
        <div class="bs-pills" id="bs-hallpills" role="group" aria-label="Moeilijkheid"></div>
      </div>
      <ol class="vscroll bs-hall" id="bs-halllist"></ol>
    </div>
  </section>

  <div class="modal dismissable" id="m-bs-name" role="dialog" aria-modal="true" aria-labelledby="bsNameTitle" aria-hidden="true" inert>
    <div class="sheet glass">
      <h3 id="bsNameTitle">MYSTERIE OPGELOST!</h3>
      <p class="sheet-text">Tijd: <b id="bs-solvetime"></b>. Wie of welk team komt in de eregalerij?</p>
      <form id="bs-nameform" class="bs-nameform" autocomplete="off">
        <input class="input bs-name" id="bs-name" type="text" maxlength="${NAME_MAX}" placeholder="Naam of team" aria-label="Naam of team" enterkeyhint="done">
        <button type="submit" class="btn btn-primary">OPSLAAN IN DE EREGALERIJ</button>
      </form>
      <button type="button" class="btn" id="bs-nameskip">OVERSLAAN</button>
    </div>
  </div>`;

  /* ----- pillen ----- */
  function makePills(box, withAll, getVal, onPick) {
    const items = (withAll ? [{ id: 'all', label: 'ALLE' }] : []).concat(TIERS);
    function paintPills() {
      Array.prototype.forEach.call(box.children, (b) => {
        b.setAttribute('aria-pressed', b.getAttribute('data-val') === getVal() ? 'true' : 'false');
      });
    }
    items.forEach((it) => {
      box.appendChild(h('button', {
        type: 'button', class: 'bs-pill', 'data-val': it.id, 'data-diff': it.id === 'all' ? null : it.id, 'aria-pressed': 'false',
        onclick: () => { onPick(it.id); paintPills(); LG.buzz(8); }
      }, it.label));
    });
    paintPills();
    return paintPills;
  }

  /* ----- catalogus ----- */
  function visibleStories() {
    const done = load(DONE_KEY);
    const q = LG.norm(view.q);
    return STORIES.filter((s) => {
      if (view.diff !== 'all' && s.difficulty !== view.diff) return false;
      if (view.hide && done[s.id]) return false;
      if (q && LG.norm(s.title + ' ' + s.enigma).indexOf(q) === -1) return false;
      return true;
    });
  }

  function toggleDone(id) {
    const done = load(DONE_KEY);
    setDone(id, !done[id]);
    LG.buzz(10);
    renderList();
  }

  function renderList() {
    const done = load(DONE_KEY);
    const list = visibleStories();
    const box = $('#bs-list');
    box.textContent = '';
    list.forEach((s, i) => {
      const isDone = !!done[s.id];
      box.appendChild(h('article', { class: 'bs-card', 'data-diff': s.difficulty, 'data-done': isDone ? '1' : '0', style: '--i:' + i },
        h('button', { type: 'button', class: 'bs-open', 'aria-label': 'Open raadsel: ' + s.title, onclick: () => openStory(s.id) },
          h('span', { class: 'bs-title' }, s.title)),
        h('div', { class: 'bs-foot' },
          h('span', { class: 'bs-badge bs-tag', 'data-diff': s.difficulty }, TIER_LABEL[s.difficulty]),
          h('button', {
            type: 'button', class: 'bs-check', 'aria-pressed': isDone ? 'true' : 'false',
            'aria-label': (isDone ? 'Markeer als niet voltooid: ' : 'Markeer als voltooid: ') + s.title,
            onclick: () => toggleDone(s.id)
          }, LG.icon('check')))
      ));
    });
    $('#bs-empty').hidden = list.length > 0;
    const n = STORIES.filter((s) => done[s.id]).length;
    $('#bs-count').textContent = n + '/' + STORIES.length + ' OPGELOST';
  }

  /* ----- fase 1 en 2 ----- */
  function openStory(id) {
    const s = storyById(id);
    if (!s) return;
    current = s;
    resetWatch();
    const d = $('#bs-ediff');
    d.textContent = TIER_LABEL[s.difficulty];
    d.setAttribute('data-diff', s.difficulty);
    $('#bs-etitle').textContent = s.title;
    $('#bs-q-public').textContent = s.enigma;
    LG.buzz(12);
    ui.show('bs-enigma');
  }

  function openDossier() {
    if (!current) return;
    $('#bs-ntitle').textContent = current.title;
    $('#bs-solution').textContent = current.solution;
    $('#bs-question').textContent = current.enigma;
    $('#bs-cue').textContent = '';
    $('#bs-sol').classList.remove('veiled');
    $('#bs-veil').setAttribute('aria-pressed', 'false');
    resetWatch();
    ui.show('bs-narrator');
    startWatch();
    LG.buzz(20);
  }

  function answer(key, btn) {
    const a = ANSWERS[key];
    if (!a) return;
    blip(a.tone, 0.28);
    LG.buzz(a.buzz);
    LG.restart(btn, 'flash');
    const cue = $('#bs-cue');
    cue.textContent = a.text;
    cue.setAttribute('data-k', key);
    LG.restart(cue, 'pop');
  }

  function solve() {
    if (!current) return;
    pauseWatch();
    const ms = Math.round(watch.elapsed);
    setDone(current.id, true);
    pending = { id: current.id, ms: ms };
    $('#bs-solvetime').textContent = fmt(ms);
    $('#bs-name').value = loadName();
    ui.confetti(['#34d399', '#fbbf24', '#f43f5e', '#f4f5ff']);
    if (LG.sound && LG.sound.victory) { try { LG.sound.victory(); } catch (e) { /* geen geluid */ } }
    LG.buzz([40, 30, 80]);
    ui.openModal('m-bs-name');
  }

  function toCatalog() {
    pauseWatch();
    renderList();
    ui.show('bs-catalog');
  }

  function commitEntry(skip) {
    if (!pending) return;
    const p = pending;
    pending = null;
    const story = storyById(p.id);
    if (skip || !story) {
      ui.closeModal('m-bs-name');
      toCatalog();
      return;
    }
    const name = cleanName($('#bs-name').value) || 'ANONIEM';
    const times = load(TIMES_KEY);
    const arr = Array.isArray(times[p.id]) ? times[p.id] : [];
    arr.push({ n: name, ms: p.ms, t: Date.now() });
    arr.sort((a, b) => a.ms - b.ms);
    times[p.id] = arr.slice(0, KEEP_PER_STORY);
    save(TIMES_KEY, times);
    saveName(name);
    ui.closeModal('m-bs-name');
    view.hall = story.difficulty;
    showHall();
  }

  /* ----- eregalerij ----- */
  function renderHall() {
    const times = load(TIMES_KEY);
    const rows = [];
    STORIES.forEach((s) => {
      if (s.difficulty !== view.hall || !Array.isArray(times[s.id])) return;
      times[s.id].forEach((e) => {
        if (e && typeof e.ms === 'number') rows.push({ s: s, e: e });
      });
    });
    rows.sort((a, b) => a.e.ms - b.e.ms);
    const box = $('#bs-halllist');
    box.textContent = '';
    if (!rows.length) {
      box.appendChild(h('li', {}, h('p', { class: 'empty' }, 'Nog geen tijden in ' + TIER_LABEL[view.hall] + '. Los een raadsel op!')));
      return;
    }
    rows.slice(0, HALL_SIZE).forEach((r, i) => {
      const date = r.e.t ? new Date(r.e.t).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' }) : '';
      box.appendChild(h('li', {},
        h('div', { class: 'prow glass-lite' + (i === 0 ? ' win' : ''), style: '--i:' + i },
          h('span', { class: 'n rank r' + (i < 3 ? i + 1 : 0) }, i + 1),
          h('span', { class: 'nm bs-hallnm' }, String(r.e.n || 'ANONIEM'),
            h('small', { class: 'out-note' }, r.s.title + (date ? ' · ' + date : ''))),
          h('b', { class: 'bs-hallt' }, fmt(r.e.ms)))
      ));
    });
  }

  let paintHallPills = function () {};
  function showHall() {
    paintHallPills();
    renderHall();
    ui.show('bs-hall');
  }

  /* ----- levenscyclus ----- */
  function cleanup() {
    cancelAnimationFrame(watch.raf);
    watch.running = false;
    watch.elapsed = 0;
    pending = null;
    current = null;
  }

  function mount() {
    ui.mount(HTML);
    makePills($('#bs-pills'), true, () => view.diff, (v) => { view.diff = v; renderList(); });
    paintHallPills = makePills($('#bs-hallpills'), false, () => view.hall, (v) => { view.hall = v; renderHall(); });

    $('#bs-q').addEventListener('input', (e) => { view.q = e.target.value; renderList(); });
    $('#bs-hide').addEventListener('click', (e) => {
      view.hide = !view.hide;
      e.currentTarget.setAttribute('aria-pressed', view.hide ? 'true' : 'false');
      renderList();
    });
    $('#bs-hallbtn').addEventListener('click', showHall);
    $('#bs-hback').addEventListener('click', toCatalog);
    $('#bs-eback').addEventListener('click', toCatalog);
    $('#bs-reveal').addEventListener('click', openDossier);
    $('#bs-nstop').addEventListener('click', () => ui.confirm({
      title: 'TERUG NAAR DE VERHALEN?', text: 'De stopwatch wordt gestopt en deze poging telt niet mee.',
      yes: 'TERUG', no: 'DOORGAAN', onYes: toCatalog
    }));
    $('#bs-toggle').addEventListener('click', () => { if (watch.running) pauseWatch(); else startWatch(); LG.buzz(8); });
    $('#bs-reset').addEventListener('click', () => { resetWatch(); LG.buzz(8); });
    $('#bs-veil').addEventListener('click', (e) => {
      const on = !$('#bs-sol').classList.contains('veiled');
      $('#bs-sol').classList.toggle('veiled', on);
      e.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.bs-ans'), (btn) => {
      btn.addEventListener('click', () => answer(btn.getAttribute('data-ans'), btn));
    });
    $('#bs-solved').addEventListener('click', solve);
    $('#bs-nameform').addEventListener('submit', (e) => { e.preventDefault(); commitEntry(false); });
    $('#bs-nameskip').addEventListener('click', () => commitEntry(true));
    $('#m-bs-name').addEventListener('modalclose', () => { if (pending) commitEntry(true); });
    document.addEventListener('screenshow', (e) => { if (e.detail !== 'bs-narrator') pauseWatch(); });
  }

  LG.registerGame({
    id: 'blackstories', title: 'RAADSEL DER DOOD', tag: 'Los de duistere misdaad op',
    icon: 'ghost', rgb: '244,63,94', min: 2, max: 20,
    mount: mount,
    open() { cleanup(); renderList(); ui.show('bs-catalog'); },
    reset: cleanup
  });
})();