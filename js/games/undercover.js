(function () {
  'use strict';

  const LG = window.LG;
  const $ = LG.$, $$ = LG.$$, h = LG.h, store = LG.store, ui = LG.ui;

  const MIN_PLAYERS = 3;
  const MAX_PLAYERS = 20;
  const MSG_MAJORITY = 'Minstens evenveel burgers als infiltranten';
  const MSG_MIN_INF = 'Minstens 1 infiltrant nodig';
  const ROLE_LABEL = { civ: 'BURGER', und: 'UNDERCOVER', white: 'MR. WHITE' };
  const ROLE_CLASS = { civ: 'r-civ', und: 'r-und', white: 'r-white' };
  const ROLE_ICON = { civ: 'user', und: 'mask', white: 'ghost' };
  const ROLE_RGB = { civ: '94,234,212', und: '255,77,141', white: '243,244,255' };
  const POINTS = { civ: 1, und: 2, white: 3 };
  const JESTER_POINTS = 3;
  const SEAL_RGB = '167,139,250';
  const SUB_LABEL = { informant: 'INFORMANT', jester: 'NAR' };
  const norm = LG.norm;

  // Specialists & modifiers shown in the setup screen. ok(total, und, white) = availability rule.
  const SPECS = [
    { key: 'informant', label: 'INFORMANT', icon: 'spy',
      note: 'Eén burger krijgt een forensisch spoor: twee namen, waarvan één infiltrant.',
      reason: 'Informant vanaf 4 spelers', ok: (t) => t >= 4 },
    { key: 'accomplice', label: 'HANDLANGER', icon: 'merge',
      note: 'Infiltranten kennen elkaar; Mr. White hoort naar wie hij moet luisteren.',
      reason: 'Handlanger vraagt minstens 2 infiltranten', ok: (t, u, w) => u + w >= 2 },
    { key: 'jester', label: 'DE NAR', icon: 'spark',
      note: 'Een burger wint solo als hij in ronde 1 wordt weggestemd.',
      reason: 'De Nar vanaf 5 spelers', ok: (t) => t >= 5 },
    { key: 'mutators', label: 'MUTATORS', icon: 'dice',
      note: 'Elke ronde een nieuwe spreekregel voor de hints.',
      reason: '', ok: () => true },
    { key: 'shroud', label: 'BLINDE ELIMINATIE', icon: 'shield',
      note: 'De rol van een uitgestemde speler blijft geheim tot de finale.',
      reason: '', ok: () => true }
  ];

  // 14 tactical speech constraints, drawn without repeats (see drawMutator).
  const MUTATORS = [
    'STRIKT 1 WOORD: Geef deze ronde een hint van exact één woord',
    'DE KLACHT: Formuleer je hint als een irritatie of klacht',
    'VERBODEN ZONE: Je mag niets zeggen over hoe het eruitziet',
    'VRAAG & ANTWOORD: Speler 1 stelt een directe vraag aan de volgende speler, die antwoordt met zijn hint',
    'TEGENPOOL: Beschrijf waar jouw woord absoluut NIET bij past',
    'BIJVOEGLIJK: Je hint mag alleen een bijvoeglijk naamwoord zijn',
    'ZINTUIGEN: Beschrijf je woord alleen met geur, smaak of geluid',
    'DE PLEK: Vertel waar je dit woord het vaakst tegenkomt',
    'TIJDREIS: Beschrijf je woord alsof het 100 jaar geleden was',
    'DE KRANTENKOP: Geef je hint als een sensationele krantenkop',
    'EMOTIE: Zeg welk gevoel jouw woord bij je oproept',
    'ACHTERSTEBOVEN: Noem het tegenovergestelde van jouw woord',
    'DE BIJNAAM: Geef jouw woord een nieuwe bijnaam als hint',
    'VIER WOORDEN: Je hint bestaat uit precies vier woorden'
  ];

  const cfgDefaults = () => ({
    und: 1, white: 1, cats: {},
    informant: false, accomplice: false, jester: false, mutators: false, shroud: false,
    undAware: true,
    kompas: 'auto' // 'auto' = aan vanaf 5 spelers, 'on'/'off' = keuze van de groep (string: store.cfg bewaart enkel waarden van hetzelfde type)
  });

  const CATEGORIES = LG.data.undercover;
  const ALL_PAIRS = [];
  CATEGORIES.forEach((cat) => {
    cat.pairs.forEach((raw) => {
      const parts = raw.split('|');
      ALL_PAIRS.push({ id: cat.id + ':' + raw, cat: cat.id, a: parts[0], b: parts[1] });
    });
  });
  // Integrity check: unique ids, exactly one "|" per pair, two different words, no repeated pair across categories.
  (function () {
    const seen = {};
    const seenPair = {};
    ALL_PAIRS.forEach((p) => {
      const raw = p.id.slice(p.cat.length + 1);
      const key = [p.a, p.b].sort().join('|');
      if (seen[p.id] || raw.split('|').length !== 2 || !p.a || !p.b || p.a === p.b) console.warn('Ongeldig woordpaar:', p.id);
      if (seenPair[key]) console.warn('Dubbel woordpaar:', p.id, '=', seenPair[key]);
      seen[p.id] = true;
      seenPair[key] = p.id;
    });
    if (ALL_PAIRS.length !== 264) console.warn('Verwacht 264 woordparen, gevonden:', ALL_PAIRS.length);
  })();

  let cfg = null;
  let game = null;
  let guessLocked = false;
  let elimTimer = null;
  let guessTimer = null;
  let peekHold = null;
  let beatTimer = null;

  const HTML = ui.setupHtml('uc', 'UNDERCOVER', '<div class="stack" id="uc-opts"></div>', 'START SPEL') + `
  <section class="screen" id="s-uc-round" aria-label="Ronde">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="uc-rstop" aria-label="Stop spel"><svg class="ic"><use href="#i-x"/></svg></button>
        <div class="round-title"><span>RONDE</span><b id="uc-roundnum">1</b></div>
        <span class="chip glass-lite" id="uc-alive"></span>
      </header>
      <p class="eyebrow plist-label">SPREEKVOLGORDE</p>
      <div class="mut glass-lite" id="uc-mut" hidden>
        <span class="mut-ic" aria-hidden="true"><svg class="ic"><use href="#i-dice"/></svg></span>
        <div class="mut-body" aria-live="polite"><b id="uc-muttitle"></b><span id="uc-muttext"></span></div>
        <button type="button" class="mut-roll" id="uc-reroll" aria-label="Nieuwe mutator trekken"><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg></button>
      </div>
      <ol class="plist" id="uc-order"></ol>
      <div class="foot">
        <button type="button" class="btn" id="uc-peek"><svg class="ic" aria-hidden="true"><use href="#i-spy"/></svg>SPIEK</button>
        <button type="button" class="btn btn-primary" id="uc-vote" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-vote"/></svg>STEM</button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-uc-vote" aria-label="Stemmen">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="uc-vback" data-autofocus aria-label="Terug"><svg class="ic"><use href="#i-x"/></svg></button>
        <h2 class="title">STEM</h2>
        <span style="width:58px" aria-hidden="true"></span>
      </header>
      <div class="vgrid scroll-y" id="uc-vgrid" role="group" aria-label="Kies een speler"></div>
      <div class="actions">
        <button type="button" class="btn btn-danger" id="uc-vconfirm" disabled><svg class="ic" aria-hidden="true"><use href="#i-vote"/></svg>ELIMINEER</button>
      </div>
    </div>
  </section>

  <section class="screen" id="s-uc-elim" aria-label="Eliminatie">
    <div class="wrap">
      <div class="center" aria-live="polite">
        <div class="elim-stage">
          <h2 class="who" id="uc-ename"></h2>
          <p class="was" id="uc-ewas">WAS EEN</p>
          <div class="role-orb" id="uc-eorb" aria-hidden="true"></div>
          <p class="role-big" id="uc-erole"></p>
          <p class="shroud-note" id="uc-enote" hidden></p>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-primary" id="uc-enext" disabled><svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg>DOOR</button>
      </div>
    </div>
  </section>

  <section class="screen victory" id="s-uc-victory" aria-label="Einde">
    <div class="wrap">
      <div class="vhead">
        <svg class="ic" aria-hidden="true"><use href="#i-crown"/></svg>
        <h2 id="uc-vtitle"></h2>
        <p class="eyebrow" id="uc-vsub"></p>
      </div>
      <div class="words">
        <div class="wtile glass civ"><small>BURGER WOORD</small><strong id="uc-vciv"></strong></div>
        <div class="wtile glass und"><small>UNDERCOVER WOORD</small><strong id="uc-vund"></strong></div>
      </div>
      <ul class="plist" id="uc-vlist" style="margin-top:12px"></ul>
      <div class="foot">
        <button type="button" class="btn" id="uc-vhome"><svg class="ic" aria-hidden="true"><use href="#i-home"/></svg>HUB</button>
        <button type="button" class="btn btn-primary" id="uc-again" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>NIEUW POTJE</button>
      </div>
    </div>
  </section>

  <div class="modal dismissable" id="m-uc-peek" role="dialog" aria-modal="true" aria-labelledby="uc-peektitle" aria-hidden="true" inert>
    <div class="sheet glass">
      <div class="view" id="uc-peekpick">
        <h3 id="uc-peektitle">WIE BEN JIJ?</h3>
        <div class="vgrid" id="uc-peekgrid"></div>
        <button type="button" class="btn" data-close="m-uc-peek">ANNULEER</button>
      </div>
      <div class="view" id="uc-peekguard" hidden>
        <p class="eyebrow">ALLEEN</p>
        <h3 id="uc-peekname"></h3>
        <button type="button" class="btn btn-primary" id="uc-peeksee"><svg class="ic" aria-hidden="true"><use href="#i-eye"/></svg>BEKIJK WOORD</button>
        <button type="button" class="btn" id="uc-peekcancel">TERUG</button>
      </div>
      <div class="view" id="uc-peekshow" hidden>
        <div class="hold-card peek-card" id="uc-peekcard"><div class="hold-glyph" aria-hidden="true"><span class="q">?</span></div><div class="secret shutter-closed" aria-hidden="true"><p class="eyebrow" id="uc-peeklabel"></p>
        <strong id="uc-peekword"></strong>
        <div class="brief-list" id="uc-peekbrief"></div></div></div>
        <div class="peek-actions">
          <button type="button" class="btn btn-primary hold-btn" id="uc-peekhold" aria-pressed="false"><svg class="ic" aria-hidden="true"><use href="#i-eye"/></svg>HOUD INGEDRUKT VOOR WOORD</button>
        <button type="button" class="btn" id="uc-peekhide" disabled><svg class="ic" aria-hidden="true"><use href="#i-eye-off"/></svg>VERBERG</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal" id="m-uc-guess" role="dialog" aria-modal="true" aria-labelledby="uc-guesstitle" aria-hidden="true" inert>
    <form class="sheet glass" id="uc-guessform" autocomplete="off" novalidate>
      <p class="eyebrow">LAATSTE KANS</p>
      <h3 id="uc-guesstitle">MR. WHITE</h3>
      <p class="eyebrow" id="uc-guesswho"></p>
      <label class="sr-only" for="uc-guessinput">Burgerwoord</label>
      <input class="input" id="uc-guessinput" type="text" maxlength="40" placeholder="Burgerwoord…" enterkeyhint="go" autocapitalize="off" autocorrect="off" spellcheck="false">
      <div class="feedback" id="uc-guessfb" role="status" aria-live="polite"></div>
      <button type="submit" class="btn btn-primary" id="uc-guessbtn"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>RADEN</button>
      <div class="judge" id="uc-guessjudge" hidden>
        <div class="judge-head"><svg class="ic" aria-hidden="true"><use href="#i-scale"/></svg><p class="eyebrow">GROEPS-OORDEEL (TWIJFELGEVAL)</p></div>
        <div class="judge-tiles">
          <div class="wtile glass"><small>MR. WHITE ZEGT</small><strong id="uc-judgeguess"></strong></div>
          <div class="wtile glass civ"><small>BURGERWOORD</small><strong id="uc-judgeword"></strong></div>
        </div>
        <button type="button" class="btn btn-primary judge-btn" id="uc-judgeyes"><svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>KEUR GOED (WINST)</button>
        <button type="button" class="btn btn-danger judge-btn" id="uc-judgeno"><svg class="ic" aria-hidden="true"><use href="#i-x"/></svg>KEUR AF (FOUT)</button>
      </div>
    </form>
  </div>`;

  /* ----- Mr. White Kompas: shows the category name to a blind Mr. White ----- */
  function kompasOn(n) {
    if (cfg.kompas === 'on') return true;
    if (cfg.kompas === 'off') return false;
    return n >= 5;
  }

  function kompasLine(pl) {
    if (!game || !game.kompas || !pl || pl.role !== 'white' || !game.catName) return null;
    return h('p', { class: 'eyebrow', style: 'margin-top:10px' }, 'KOMPAS: Categorie [' + game.catName + ']');
  }

  /* ----- pass & reveal (shared flow) ----- */
  const flow = LG.passflow.create('uc', {
    tag: 'UNDERCOVER',
    seeLabel: 'BEKIJK WOORD',
    flip: true,
    hold: true,
    fill(back, pl) {
      const white = pl.role === 'white';
      const word = h('strong', { id: 'revealWord' });
      back.appendChild(h('span', { class: 'eyebrow' }, white ? 'GEEN WOORD' : 'JOUW WOORD'));
      back.appendChild(word);
      LG.fitText(word, white ? 'JIJ BENT MR. WHITE' : pl.word, white ? 40 : 56);
      const kompas = kompasLine(pl);
      if (kompas) back.appendChild(kompas);
      back.appendChild(tipBlock(pl, 'revealTip'));
    },
    onDone() { startRound(1); },
    onStop() { LG.home(); }
  });

  /* ----- setup ----- */
  function activeCount() { return store.active().length; }

  // Keeps Burgers + Undercovers + Mr. White valid for the current roster size.
  function fixCfg() {
    const total = activeCount();
    let und = Math.max(0, Math.round(+cfg.und || 0));
    let white = Math.max(0, Math.round(+cfg.white || 0));
    const maxInf = Math.floor(total / 2);
    if (und + white < 1) und = 1;
    while (und + white > maxInf) {
      if (white > 0 && und + white > 1) white--;
      else if (und > 1) und--;
      else break;
    }
    cfg.und = und;
    cfg.white = white;
    let any = false;
    CATEGORIES.forEach((c) => {
      cfg.cats[c.id] = cfg.cats[c.id] !== false;
      if (cfg.cats[c.id]) any = true;
    });
    if (!any) CATEGORIES.forEach((c) => { cfg.cats[c.id] = true; });
    // Older saved settings have no specialist flags: normalise to real booleans.
    SPECS.forEach((s) => { cfg[s.key] = cfg[s.key] === true; });
    // Whether undercovers know their word differs. Older saves have no value: default is "yes".
    cfg.undAware = cfg.undAware !== false;
    store.save();
  }

  /* ----- specialists & modifiers ----- */
  let specPills = {};
  const specOk = (s) => s.ok(activeCount(), cfg.und, cfg.white);
  const specOn = (s) => cfg[s.key] === true && specOk(s);

  function refreshSpecs() {
    SPECS.forEach((s) => {
      const b = specPills[s.key];
      if (!b) return;
      b.setAttribute('aria-pressed', specOn(s) ? 'true' : 'false');
      b.setAttribute('aria-disabled', specOk(s) ? 'false' : 'true');
    });
  }

  // The preference is kept in cfg; what actually applies depends on the current roster.
  function effectiveOpts(total) {
    const o = {};
    SPECS.forEach((s) => { o[s.key] = cfg[s.key] === true && s.ok(total, cfg.und, cfg.white); });
    o.undAware = cfg.undAware !== false;
    return o;
  }

  const pickOne = (arr) => arr[LG.rand(arr.length)];

  function assignSpecialists(g) {
    const civs = g.players.filter((p) => p.role === 'civ');
    const infs = g.players.filter((p) => p.role !== 'civ');
    let informant = null;

    if (g.opts.informant && civs.length >= 2 && infs.length) {
      informant = pickOne(civs);
      informant.subRole = 'informant';
      const other = pickOne(civs.filter((p) => p !== informant));
      const names = LG.shuffle([other.name, pickOne(infs).name]);
      informant.informantClue = 'Forensisch spoor: Tussen ' + names[0] + ' en ' + names[1] + ' bevindt zich een infiltrant.';
    }

    if (g.opts.jester) {
      const cand = civs.filter((p) => p !== informant);
      if (cand.length) pickOne(cand).subRole = 'jester';
    }

    if (g.opts.accomplice) {
      const unds = infs.filter((p) => p.role === 'und');
      infs.forEach((p) => {
        if (p.role === 'und') {
          const allies = infs.filter((x) => x !== p);
          // An undercover who does not know his own role must not be told about allies.
          if (g.opts.undAware && allies.length) p.allyBrief = 'Bondgenoot in de schaduw: ' + pickOne(allies).name;
        } else if (unds.length) {
          p.allyBrief = 'Luister scherp naar de hints van ' + pickOne(unds).name;
        }
      });
    }
  }

  /* ----- tactical field briefing (always exactly two lines, for every role) ----- */
  const TIPS = {
    civ: [
      'Hint specifiek genoeg voor burgers, vaag genoeg voor vreemden.',
      'Let op wie te veel of te weinig zegt.'
    ],
    und: [
      'Jouw woord lijkt op dat van de burgers, maar klopt net niet.',
      'Pas je hint aan en val niet als eerste op.'
    ],
    white: [
      'Je hebt geen woord: luister, kopieer de sfeer, blijf vaag.',
      'Gok het burgerwoord als je wordt weggestemd.'
    ]
  };

  function tipLines(p) {
    if (p.subRole === 'informant') return ['SPECIALIST: DE INFORMANT', p.informantClue];
    if (p.subRole === 'jester') return ['DE NAR: word in ronde 1 weggestemd en win solo', 'Val op, maar niet te veel: gedraag je verdacht.'];
    // With "undercover weet het" switched off, an undercover gets exactly the briefing of a burger.
    const unaware = p.role === 'und' && game && game.opts.undAware === false;
    const base = (unaware ? TIPS.civ : TIPS[p.role]) || TIPS.civ;
    if (p.allyBrief) return [base[0], p.allyBrief];
    return base;
  }

  function tipBlock(p, id) {
    const lines = tipLines(p);
    const box = h('div', { class: 'reveal-tip', role: 'note' });
    if (id) box.id = id;
    lines.slice(0, 2).forEach((t, i) => box.appendChild(h('span', { class: 'tip-line' + (i === 0 && (p.subRole) ? ' sub-tag' : '') }, t)));
    return box;
  }

  /* ----- interrogation mutators ----- */
  function drawMutator() {
    const g = game;
    const all = MUTATORS.map((m, i) => i);
    let pool = all.filter((i) => g.mutUsed.indexOf(i) === -1 && i !== g.mutIdx);
    if (!pool.length) {
      g.mutUsed = [];
      pool = all.filter((i) => i !== g.mutIdx);
    }
    g.mutIdx = pickOne(pool);
    g.mutUsed.push(g.mutIdx);
  }

  function renderMutator() {
    const box = $('#uc-mut');
    const on = !!game.opts.mutators && game.mutIdx >= 0;
    box.hidden = !on;
    if (!on) return;
    const m = MUTATORS[game.mutIdx];
    const cut = m.indexOf(':');
    $('#uc-muttitle').textContent = cut > -1 ? m.slice(0, cut) : 'MUTATOR';
    $('#uc-muttext').textContent = cut > -1 ? m.slice(cut + 1).trim() : m;
  }

  function rerollMutator() {
    if (!game || !game.opts.mutators || ui.current() !== 'uc-round') return;
    drawMutator();
    renderMutator();
    LG.restart($('#uc-mut'), 'mut-flash');
    LG.buzz(12);
  }

  function enabledPairs() { return ALL_PAIRS.filter((p) => cfg.cats[p.cat]); }
  const pairId = (p) => p.id;

  function renderMeta() {
    const total = activeCount();
    const eq = $('#uc-eq');
    if (eq) eq.textContent = (total - cfg.und - cfg.white) + ' + ' + cfg.und + ' + ' + cfg.white + ' = ' + total;
    const fresh = store.freshCount('undercover', enabledPairs(), pairId);
    $('#uc-chip').textContent = fresh + ' PAREN';
    $('#uc-chip').setAttribute('aria-label', fresh + ' beschikbare woordparen');
    refreshSpecs();
  }

  function roleStepper(key, def) {
    const other = key === 'und' ? 'white' : 'und';
    const s = ui.stepper({
      label: def.label, icon: def.icon, rgb: def.rgb, minus: def.minus, plus: def.plus,
      value: () => cfg[key],
      check(dir) {
        const inf = cfg.und + cfg.white;
        if (dir > 0) return inf + 1 > Math.floor(activeCount() / 2) ? MSG_MAJORITY : '';
        if (cfg[key] <= 0) return 'Al op nul';
        return inf <= 1 ? MSG_MIN_INF : '';
      },
      apply(dir) { cfg[key] += dir; store.save(); },
      onChange() { renderMeta(); if (steppers[other]) steppers[other].refresh(); }
    });
    return s;
  }

  const steppers = {};

  function renderSetup() {
    if (!cfg) cfg = store.cfg('undercover', cfgDefaults());
    fixCfg();
    ui.fillStrip('uc');
    const box = $('#uc-opts');
    box.textContent = '';

    steppers.und = roleStepper('und', { label: 'UNDERCOVERS', icon: 'mask', rgb: '255,77,141', minus: 'Minder undercovers', plus: 'Meer undercovers' });
    steppers.white = roleStepper('white', { label: 'MR. WHITE', icon: 'ghost', rgb: '243,244,255', minus: 'Minder Mr. White', plus: 'Meer Mr. White' });

    box.appendChild(h('p', { class: 'how glass-lite' },
      h('b', {}, 'HOE WERKT HET? '),
      'Burgers krijgen één woord, undercovers een bijna gelijk woord en Mr. White niets. Geef om de beurt een hint en stem wie eruit moet.'));
    box.appendChild(h('p', { class: 'sec' }, 'ROLLEN'));
    box.appendChild(steppers.und.el);
    box.appendChild(steppers.white.el);
    box.appendChild(h('div', { class: 'eq glass-lite', id: 'uc-eq', 'aria-live': 'polite' }));
    box.appendChild(h('p', { class: 'sec' }, 'CATEGORIEËN'));
    const pills = h('div', { class: 'pills', role: 'group', 'aria-label': 'Categorieën' });
    CATEGORIES.forEach((cat) => {
      const b = h('button', {
        type: 'button', class: 'pill', 'aria-pressed': cfg.cats[cat.id] ? 'true' : 'false',
        onclick: () => {
          const on = CATEGORIES.filter((c) => cfg.cats[c.id]).length;
          if (cfg.cats[cat.id] && on === 1) { ui.toast('Minstens 1 categorie'); LG.buzz(25); return; }
          cfg.cats[cat.id] = !cfg.cats[cat.id];
          store.save();
          b.setAttribute('aria-pressed', cfg.cats[cat.id] ? 'true' : 'false');
          renderMeta();
          LG.buzz(8);
        }
      }, cat.name);
      pills.appendChild(b);
    });
    box.appendChild(h('div', { class: 'glass' }, pills));

    box.appendChild(h('p', { class: 'sec' }, 'SPECIALISTEN & MODIFIERS'));
    specPills = {};
    const specNote = h('p', { class: 'sheet-text spec-note', id: 'uc-specnote', 'aria-live': 'polite' },
      'Tik om een specialist of modifier aan te zetten.');
    const specRow = h('div', { class: 'pills spec-pills', role: 'group', 'aria-label': 'Specialisten en modifiers' });
    SPECS.forEach((s) => {
      const b = h('button', {
        type: 'button', class: 'pill', 'aria-pressed': 'false', 'aria-disabled': 'false', title: s.note,
        onclick: () => {
          if (!specOk(s)) { ui.toast(s.reason); LG.buzz(25); LG.restart(b, 'shake'); return; }
          cfg[s.key] = !cfg[s.key];
          store.save();
          refreshSpecs();
          specNote.textContent = s.label + ': ' + s.note;
          LG.buzz(8);
        }
      }, LG.icon(s.icon), s.label);
      specPills[s.key] = b;
      specRow.appendChild(b);
    });
    box.appendChild(h('div', { class: 'glass' }, specRow, specNote));

    box.appendChild(h('p', { class: 'sec' }, 'INFO VOOR UNDERCOVERS'));
    const awareNote = h('p', { class: 'sheet-text spec-note', id: 'uc-awarenote', 'aria-live': 'polite' });
    const awareBtn = h('button', {
      type: 'button', class: 'pill', 'aria-pressed': 'true',
      onclick: () => {
        cfg.undAware = !(cfg.undAware !== false);
        store.save();
        showAware();
        LG.buzz(8);
      }
    }, LG.icon('mask'), 'UNDERCOVER WEET HET');
    function showAware() {
      const on = cfg.undAware !== false;
      awareBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      awareNote.textContent = on
        ? 'AAN: een undercover weet dat zijn woord afwijkt en speelt daar bewust mee.'
        : 'UIT: een undercover denkt dat hij een gewoon burgerwoord heeft, krijgt dezelfde tips als een burger en hoort niets van Handlangers.';
    }
    showAware();
    box.appendChild(h('div', { class: 'glass' }, h('div', { class: 'pills spec-pills' }, awareBtn), awareNote));

    box.appendChild(h('p', { class: 'sec' }, 'INFO VOOR MR. WHITE'));
    const kompasNote = h('p', { class: 'sheet-text spec-note', id: 'uc-kompasnote', 'aria-live': 'polite' });
    const kompasBtn = h('button', {
      type: 'button', class: 'pill', 'aria-pressed': 'false',
      onclick: () => {
        cfg.kompas = kompasOn(activeCount()) ? 'off' : 'on';
        store.save();
        showKompas();
        LG.buzz(8);
      }
    }, LG.icon('target'), 'MR. WHITE KOMPAS');
    function showKompas() {
      const on = kompasOn(activeCount());
      kompasBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
      kompasNote.textContent = on
        ? 'AAN: Mr. White ziet op zijn kaart de categorie van het woordpaar, genoeg om ronde 1 te overleven.'
        : 'UIT: Mr. White speelt volledig blind. Standaard staat het Kompas aan vanaf 5 spelers.';
    }
    showKompas();
    box.appendChild(h('div', { class: 'glass' }, h('div', { class: 'pills spec-pills' }, kompasBtn), kompasNote));
    renderMeta();
  }

  /* ----- game flow ----- */
  function startGame() {
    const roster = store.active();
    if (roster.length < MIN_PLAYERS || roster.length > MAX_PLAYERS) {
      ui.toast('Undercover is voor ' + MIN_PLAYERS + '–' + MAX_PLAYERS + ' spelers');
      LG.buzz(25);
      return;
    }
    fixCfg();
    const civN = roster.length - cfg.und - cfg.white;
    let roles = [];
    for (let k = 0; k < civN; k++) roles.push('civ');
    for (let k = 0; k < cfg.und; k++) roles.push('und');
    for (let k = 0; k < cfg.white; k++) roles.push('white');
    roles = LG.shuffle(roles);

    const picked = store.draw('undercover', enabledPairs(), pairId);
    const swap = LG.rand(2) === 1;
    const civWord = swap ? picked.item.b : picked.item.a;
    const undWord = swap ? picked.item.a : picked.item.b;

    game = {
      players: roster.map((p, idx) => ({
        id: idx, pid: p.id, name: p.name, color: store.color(p.id), role: roles[idx], alive: true,
        word: roles[idx] === 'civ' ? civWord : (roles[idx] === 'und' ? undWord : null),
        subRole: null, informantClue: null, allyBrief: null, sealed: false
      })),
      civWord: civWord, undWord: undWord,
      kompas: kompasOn(roster.length),
      catName: (CATEGORIES.find((c) => c.id === picked.item.cat) || {}).name || '',
      round: 1, order: [], selected: null, lastOut: null, peekId: null, busy: false, winner: null,
      opts: effectiveOpts(roster.length), mutUsed: [], mutIdx: -1
    };
    assignSpecialists(game);
    if (picked.recycled) ui.toast('Alle woordparen gehad — opnieuw geschud');
    LG.buzz(20);
    flow.start(game.players);
  }

  function alivePlayers() { return game.players.filter((p) => p.alive); }

  function makeOrder(firstRound) {
    const ids = LG.shuffle(alivePlayers().map((p) => p.id));
    // Mr. White never starts the very first round (they would have nothing to copy).
    if (firstRound && ids.length > 1 && game.players[ids[0]].role === 'white') {
      const cand = [];
      ids.forEach((id, i) => { if (game.players[id].role !== 'white') cand.push(i); });
      if (cand.length) {
        const j = cand[LG.rand(cand.length)];
        const t = ids[0]; ids[0] = ids[j]; ids[j] = t;
      }
    }
    return ids;
  }

  function startRound(n) {
    game.round = n;
    game.busy = false;
    game.order = makeOrder(n === 1);
    if (game.opts.mutators) drawMutator();
    renderRound();
    ui.show('uc-round');
  }

  function renderRound() {
    const total = game.players.length, aliveN = game.order.length;
    $('#uc-roundnum').textContent = String(game.round);
    $('#uc-alive').textContent = aliveN + ' / ' + total;
    $('#uc-alive').setAttribute('aria-label', aliveN + ' van ' + total + ' spelers in het spel');
    renderMutator();

    const list = $('#uc-order');
    list.textContent = '';
    game.order.forEach((id, i) => {
      const p = game.players[id];
      const kids = [h('span', { class: 'n' }, i + 1), h('span', { class: 'nm' }, p.name)];
      if (i === 0) kids.push(h('span', { class: 'tag' }, 'START'));
      kids.push(LG.icon('eye'));
      list.appendChild(h('li', {},
        h('button', {
          type: 'button', class: 'prow glass-lite', style: '--i:' + i,
          'aria-label': p.name + ', bekijk eigen woord',
          onclick: () => peekFor(p.id)
        }, kids)
      ));
    });
    const offset = game.order.length;
    game.players.filter((p) => !p.alive).forEach((p, i) => {
      list.appendChild(h('li', {},
        h('div', { class: 'prow glass-lite dead', style: '--i:' + (offset + i) },
          h('span', { class: 'n' }, LG.icon('x')),
          h('span', { class: 'nm' }, p.name),
          p.sealed
            ? h('span', { class: 'role r-sealed' }, 'VERZEGELD')
            : h('span', { class: 'role ' + ROLE_CLASS[p.role] }, ROLE_LABEL[p.role])
        )
      ));
    });
    list.scrollTop = 0;
  }

  /* ----- peek (SPIEK) ----- */
  function showPeekView(id) {
    ['uc-peekpick', 'uc-peekguard', 'uc-peekshow'].forEach((v) => { $('#' + v).hidden = (v !== id); });
  }

  function clearPeek() {
    const w = $('#uc-peekword');
    if (w) w.textContent = '';
    const b = $('#uc-peekbrief');
    if (b) b.textContent = '';
    if (peekHold) peekHold.reset();
    if (game) game.peekId = null;
  }

  function openPeek() {
    if (!game || ui.current() !== 'uc-round') return;
    const grid = $('#uc-peekgrid');
    grid.textContent = '';
    game.order.forEach((id, i) => {
      const p = game.players[id];
      grid.appendChild(h('button', { type: 'button', class: 'vbtn glass-lite', style: '--i:' + i, onclick: () => peekFor(p.id) }, p.name));
    });
    showPeekView('uc-peekpick');
    ui.openModal('m-uc-peek');
  }

  function peekFor(id) {
    if (!game) return;
    game.peekId = id;
    $('#uc-peekname').textContent = game.players[id].name;
    $('#uc-peekword').textContent = '';
    showPeekView('uc-peekguard');
    ui.openModal('m-uc-peek');
  }

  function peekReveal() {
    if (!game || game.peekId === null) return;
    const p = game.players[game.peekId];
    const white = p.role === 'white';
    $('#uc-peeklabel').textContent = white ? 'GEEN WOORD' : 'JOUW WOORD';
    LG.fitText($('#uc-peekword'), white ? 'JIJ BENT MR. WHITE' : p.word, white ? 36 : 48, 260);
    const brief = $('#uc-peekbrief');
    brief.textContent = '';
    const kompas = kompasLine(p);
    if (kompas) brief.appendChild(kompas);
    brief.appendChild(tipBlock(p));
    peekHold.arm();
    showPeekView('uc-peekshow');
    LG.buzz(12);
  }

  /* ----- vote & elimination ----- */
  function openVote() {
    if (!game || ui.current() !== 'uc-round') return;
    game.selected = null;
    $('#uc-vconfirm').disabled = true;
    const grid = $('#uc-vgrid');
    grid.textContent = '';
    game.order.forEach((id, i) => {
      const p = game.players[id];
      grid.appendChild(h('button', {
        type: 'button', class: 'vbtn glass-lite', 'aria-pressed': 'false', 'data-id': p.id, style: '--i:' + i,
        onclick: () => selectVote(p.id)
      }, p.name));
    });
    ui.show('uc-vote');
  }

  function selectVote(id) {
    game.selected = id;
    $$('.vbtn', $('#uc-vgrid')).forEach((b) => {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-id')) === id ? 'true' : 'false');
    });
    $('#uc-vconfirm').disabled = false;
    LG.buzz(10);
  }

  function confirmVote() {
    if (!game || ui.current() !== 'uc-vote' || game.selected === null) return;
    const p = game.players[game.selected];
    p.alive = false;
    game.lastOut = p;
    // De Nar: voted out in round 1 = instant solo victory, no elimination screen.
    if (p.subRole === 'jester' && game.round === 1) {
      game.busy = true;
      endGame('jester', p.id);
      return;
    }
    showElim(p);
  }

  function showElim(p) {
    const el = $('#s-uc-elim');
    // Shroud mode: keep the role hidden unless the game ends now or it is Mr. White (who must guess).
    const sealed = !!game.opts.shroud && p.role !== 'white' && !checkWin();
    p.sealed = sealed;
    el.classList.toggle('sealed', sealed);
    el.style.setProperty('--rc', sealed ? SEAL_RGB : ROLE_RGB[p.role]);
    $('#uc-ename').textContent = p.name;
    $('#uc-ewas').textContent = sealed ? 'IS ELIMINEERD' : 'WAS EEN';
    $('#uc-erole').textContent = sealed ? 'IDENTITEIT VERZEGELD' : ROLE_LABEL[p.role];
    const note = $('#uc-enote');
    note.hidden = !sealed;
    note.textContent = sealed ? 'ROL BLIJFT GEHEIM TOT DE FINALE' : '';
    const orb = $('#uc-eorb');
    orb.textContent = '';
    orb.appendChild(h('span', { class: 'ring' }));
    orb.appendChild(LG.icon(sealed ? 'shield' : ROLE_ICON[p.role]));
    const btn = $('#uc-enext');
    btn.disabled = true;
    el.classList.remove('play');
    ui.show('uc-elim');
    void el.offsetWidth;
    el.classList.add('play');
    if (LG.sound) LG.sound.eliminationDrama(); // impact lands at 1400 ms, same moment as the role orb
    LG.cancel(elimTimer);
    elimTimer = LG.later(() => {
      btn.disabled = false;
      if (ui.current() === 'uc-elim') btn.focus({ preventScroll: true });
      LG.buzz([40, 50, 110]);
    }, 2300);
  }

  function elimDone() {
    if (!game || ui.current() !== 'uc-elim' || game.busy) return;
    game.busy = true;
    const p = game.lastOut;
    if (p.role === 'white') openGuess(p); else afterElimination();
  }

  function checkWin() {
    const alive = alivePlayers();
    const civ = alive.filter((p) => p.role === 'civ').length;
    const inf = alive.length - civ;
    if (inf === 0) return 'civ';
    if (civ <= 1) return 'inf';
    return null;
  }

  function afterElimination() {
    const w = checkWin();
    if (w) endGame(w, null); else startRound(game.round + 1);
  }

  /* ----- Mr. White last chance ----- */
  // Slow heartbeat while Mr. White is thinking; it speeds up after a few beats and stops once the guess is locked.
  function stopBeat() {
    LG.cancel(beatTimer);
    beatTimer = null;
  }

  function startBeat() {
    stopBeat();
    let n = 0;
    const tick = () => {
      if (!game || guessLocked) { beatTimer = null; return; }
      n++;
      if (LG.sound) LG.sound.heartbeat(n > 6);
      beatTimer = LG.later(tick, n > 6 ? 700 : 1100);
    };
    beatTimer = LG.later(tick, 600);
  }

  function openGuess(p) {
    guessLocked = false;
    setGuessView('main');
    $('#uc-guesswho').textContent = p.name;
    const input = $('#uc-guessinput');
    input.value = '';
    input.readOnly = false;
    $('#uc-guessfb').textContent = '';
    $('#uc-guessfb').className = 'feedback';
    $('#uc-guessbtn').disabled = false;
    ui.openModal('m-uc-guess');
    startBeat();
  }

  // Damerau-Levenshtein (optimal string alignment): insert, delete, substitute, swap neighbours.
  function editDistance(a, b) {
    if (a === b) return 0;
    const la = a.length, lb = b.length;
    if (!la) return lb;
    if (!lb) return la;
    let prev2 = null;
    let prev = [];
    for (let j = 0; j <= lb; j++) prev[j] = j;
    for (let i = 1; i <= la; i++) {
      const cur = [i];
      for (let j = 1; j <= lb; j++) {
        const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (i > 1 && j > 1 && a.charAt(i - 1) === b.charAt(j - 2) && a.charAt(i - 2) === b.charAt(j - 1)) {
          v = Math.min(v, prev2[j - 2] + 1);
        }
        cur[j] = v;
      }
      prev2 = prev;
      prev = cur;
    }
    return prev[lb];
  }

  // Both arguments are already normalised. Returns 'exact' (tier 1), 'doubt' (tier 2) or 'miss' (tier 3).
  function judgeGuess(guess, target) {
    if (!target) return 'miss';
    const dist = editDistance(guess, target);
    if (guess === target || (target.length >= 6 && dist <= 1) || (target.length >= 9 && dist <= 2)) return 'exact';
    if (guess.length >= 4 && (target.indexOf(guess) !== -1 || guess.indexOf(target) !== -1 || dist <= 3)) return 'doubt';
    return 'miss';
  }

  function setGuessView(mode) {
    const judge = mode === 'judge';
    ['uc-guessinput', 'uc-guessfb', 'uc-guessbtn'].forEach((id) => { $('#' + id).hidden = judge; });
    $('#uc-guessjudge').hidden = !judge;
  }

  function concludeGuess(ok) {
    const fb = $('#uc-guessfb');
    fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
    fb.textContent = ok ? 'GOED!' : 'FOUT!';
    if (!ok) LG.restart($('#uc-guessform'), 'shake');
    LG.buzz(ok ? [30, 40, 120] : 200);
    stopBeat();
    LG.cancel(guessTimer);
    guessTimer = LG.later(() => {
      ui.closeModal('m-uc-guess');
      if (!game) return;
      if (ok) endGame('white', game.lastOut.id); else afterElimination();
    }, 1100);
  }

  function openJudge(raw) {
    $('#uc-judgeguess').textContent = raw;
    $('#uc-judgeword').textContent = game.civWord;
    $('#uc-guessinput').blur();
    setGuessView('judge');
    $('#uc-judgeyes').focus({ preventScroll: true });
    LG.buzz([20, 30, 20]);
  }

  function judgeVerdict(ok) {
    if (!game || $('#uc-guessjudge').hidden) return;
    setGuessView('main');
    concludeGuess(ok);
  }

  function submitGuess(e) {
    e.preventDefault();
    if (!game || guessLocked) return;
    const input = $('#uc-guessinput');
    const raw = input.value.replace(/\s+/g, ' ').trim();
    const guess = norm(raw);
    if (!guess) { LG.restart(input, 'shake'); input.focus(); return; }
    guessLocked = true;
    stopBeat();
    input.readOnly = true;
    $('#uc-guessbtn').disabled = true;
    const verdict = judgeGuess(guess, norm(game.civWord));
    if (verdict === 'doubt') openJudge(raw);
    else concludeGuess(verdict === 'exact');
  }

  /* ----- victory ----- */
  function endGame(winner, stealerId) {
    game.winner = winner;
    $('#s-uc-victory').setAttribute('data-winner', winner);

    let title, sub;
    if (winner === 'civ') { title = 'BURGERS WINNEN'; sub = 'ALLE INFILTRANTEN ZIJN UIT'; }
    else if (winner === 'inf') { title = 'INFILTRANTEN WINNEN'; sub = 'NOG MAAR 1 BURGER OVER'; }
    else if (winner === 'jester') {
      title = 'DE NAR WINT SOLO';
      sub = 'JULLIE TRAPTEN IN DE RONDE-1 VALSTRIK VAN ' + game.players[stealerId].name.toUpperCase();
    }
    else { title = 'MR. WHITE WINT'; sub = game.players[stealerId].name + ' RAADDE HET WOORD'; }
    $('#uc-vtitle').textContent = title;
    $('#uc-vsub').textContent = sub;
    $('#uc-vciv').textContent = game.civWord;
    $('#uc-vund').textContent = game.undWord;

    const list = $('#uc-vlist');
    list.textContent = '';
    game.players.forEach((p, i) => {
      const isWinner = winner === 'civ' ? p.role === 'civ'
        : winner === 'inf' ? p.role !== 'civ'
        : p.id === stealerId;
      if (isWinner) {
        store.addPoints(p.pid, winner === 'jester' ? JESTER_POINTS : POINTS[p.role]);
        store.addWin(p.pid);
      }
      list.appendChild(h('li', {}, h('div', { class: 'prow glass-lite' + (isWinner ? ' win' : ''), style: '--i:' + i },
        h('span', { class: 'n' }, i + 1),
        h('span', { class: 'nm' }, p.name),
        p.subRole ? h('span', { class: 'out-note sub-tag' }, SUB_LABEL[p.subRole]) : null,
        p.alive ? null : h('span', { class: 'out-note' }, 'UIT'),
        h('span', { class: 'role ' + ROLE_CLASS[p.role] }, ROLE_LABEL[p.role]),
        isWinner ? LG.icon('crown') : null
      )));
    });
    list.scrollTop = 0;

    const vicon = $('#s-uc-victory .vhead use');
    if (vicon) vicon.setAttribute('href', winner === 'jester' ? '#i-spark' : '#i-crown');
    ui.show('uc-victory');
    ui.confetti(winner === 'jester' ? ['#fde047', '#fbbf24', '#a78bfa', '#f4f5ff'] : undefined);
    if (LG.sound) LG.sound.victory(winner);
    LG.buzz([60, 40, 60, 40, 160]);
  }

  function cleanup() {
    LG.cancel(elimTimer);
    LG.cancel(guessTimer);
    flow.cancel();
    clearPeek();
    game = null;
  }

  function backToSetup() {
    cleanup();
    ui.closeAll();
    ui.show('uc-setup');
  }

  function mount() {
    ui.mount(HTML);
    flow.mount();

    // Peek modal: same dead-man's switch as the pass-and-play reveal.
    peekHold = LG.shield.hold({
      button: $('#uc-peekhold'),
      root: () => $('#uc-peekcard'),
      minMs: 600,
      onLock() { $('#uc-peekhide').disabled = true; },
      onUnlock() { $('#uc-peekhide').disabled = false; LG.buzz(8); }
    });

    $('#uc-start').addEventListener('click', startGame);
    $('#uc-rstop').addEventListener('click', () => ui.confirm({ title: 'STOPPEN?', yes: 'STOP SPEL', onYes: () => LG.home() }));
    $('#uc-peek').addEventListener('click', openPeek);
    $('#uc-vote').addEventListener('click', openVote);
    $('#uc-vback').addEventListener('click', () => { if (game && ui.current() === 'uc-vote') ui.show('uc-round'); });
    $('#uc-vconfirm').addEventListener('click', confirmVote);
    $('#uc-enext').addEventListener('click', elimDone);
    $('#uc-again').addEventListener('click', backToSetup);
    $('#uc-vhome').addEventListener('click', () => LG.home());

    $('#uc-peeksee').addEventListener('click', peekReveal);
    $('#uc-peekcancel').addEventListener('click', () => ui.closeModal('m-uc-peek'));
    $('#uc-peekhide').addEventListener('click', () => ui.closeModal('m-uc-peek'));
    $('#m-uc-peek').addEventListener('modalclose', clearPeek);
    $('#uc-guessform').addEventListener('submit', submitGuess);
    $('#uc-judgeyes').addEventListener('click', () => judgeVerdict(true));
    $('#uc-judgeno').addEventListener('click', () => judgeVerdict(false));
    $('#uc-reroll').addEventListener('click', rerollMutator);

    document.addEventListener('screenshow', (e) => { if (e.detail === 'uc-setup') renderSetup(); });

    // Anti-spy: never leave a secret word on screen when the page goes to the background.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && $('#m-uc-peek').classList.contains('open')) ui.closeModal('m-uc-peek');
    });
  }

  LG.registerGame({
    id: 'undercover', title: 'UNDERCOVER', tag: 'Wie heeft een ander woord?',
    icon: 'mask', rgb: '255,77,141', min: MIN_PLAYERS, max: MAX_PLAYERS,
    mount: mount,
    open() { cleanup(); cfg = store.cfg('undercover', cfgDefaults()); ui.show('uc-setup'); },
    reset: cleanup
  });
})();