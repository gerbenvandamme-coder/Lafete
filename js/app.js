(function () {
  'use strict';

  /* =====================================================================
     DATA — 5 categorieën × 44 woordparen = 220 duo's (volledig uitgeschreven)
     ===================================================================== */
  var CATEGORIES = [
    { id: 'situaties', name: 'Situaties & Plekken', pairs: [
      'Eerste date|Sollicitatiegesprek', 'Sauna|Sportschool', 'Begrafenis|Bruiloft', 'Biechtstoel|Verhoorkamer',
      'Festival|Camping', 'Wachtkamer|Vertrekhal', 'Bibliotheek|Museum', 'Kermis|Pretpark',
      'Bioscoop|Theater', 'Strandtent|Stadsterras', 'Ziekenhuis|Tandartspraktijk', 'Hotellobby|Luchthaven',
      'Schoolplein|Kinderdagverblijf', 'Examenzaal|Rechtbank', 'Dierentuin|Kinderboerderij', 'Escaperoom|Spookhuis',
      'Kampvuur|Barbecue', 'Reünie|Verjaardagsfeestje', 'Zwembad|Wellnesscentrum', 'Kantoortuin|Klaslokaal',
      'Stadion|Concertzaal', 'Bingoavond|Kaartavond', 'Vliegtuig|Trein', 'Veerboot|Cruiseschip',
      'Vakantiehuisje|Hotelkamer', 'Logeerpartij|Slaapfeestje', 'Pashokje|Kapperszaak', 'Kringloopwinkel|Antiekmarkt',
      'Verhuizing|Emigratie', 'Gevangenis|Kostschool', 'Bunker|Kelder', 'Dakterras|Balkon',
      'Tuinfeest|Buurtbarbecue', 'Speeddate|Netwerkborrel', 'Eerste schooldag|Eerste werkdag', 'Rondleiding|Excursie',
      'Skipiste|Schaatsbaan', 'Casino|Bingohal', 'Observatorium|Planetarium', 'Rijschool|Vliegschool',
      'Spoedeisende hulp|Huisartsenpost', 'Zolder|Garage', 'Parkeergarage|Tunnel', 'Werkoverleg|Familiediner'
    ]},
    { id: 'psycho', name: 'Psychologisch & Abstract', pairs: [
      'Jaloers|Onzeker', 'Spijt|Schuldgevoel', 'Nostalgie|Heimwee', 'Roddel|Geheim',
      'Karma|Wraak', 'Arrogant|Zelfverzekerd', 'Verlegen|Introvert', 'Koppig|Vastberaden',
      'Verdriet|Rouw', 'Angst|Stress', 'Eenzaamheid|Verveling', 'Trots|Hoogmoed',
      'Moed|Roekeloosheid', 'Geluk|Toeval', 'Hoop|Optimisme', 'Wantrouwen|Paranoia',
      'Vriendschap|Kameraadschap', 'Liefde|Verliefdheid', 'Gewoonte|Verslaving', 'Ambitie|Hebzucht',
      'Nieuwsgierig|Bemoeiziek', 'Zuinig|Gierig', 'Eerlijk|Tactloos', 'Beleefd|Onderdanig',
      'Vergeving|Vergeten', 'Medelijden|Medeleven', 'Fantasie|Leugen', 'Herinnering|Droom',
      'Intuïtie|Voorgevoel', 'Dankbaarheid|Opluchting', 'Schaamte|Gêne', 'Wijsheid|Slimheid',
      'Verzet|Rebellie', 'Gehoorzaam|Volgzaam', 'Zelfspot|Zelfkritiek', 'Dromer|Idealist',
      'Perfectionisme|Controledrang', 'Woede|Irritatie', 'Opwinding|Zenuwen', 'Rust|Stilte',
      'Gemis|Leegte', 'Respect|Bewondering', 'Macht|Invloed', 'Vrijheid|Onafhankelijkheid'
    ]},
    { id: 'objecten', name: 'Subtiele Objecten', pairs: [
      'Zonnebrandcrème|Bodylotion', 'Tatoeage|Litteken', 'Paspoort|Rijbewijs', 'Wekker|Timer',
      'Parfum|Deodorant', 'Kompas|GPS', 'Zaklamp|Kaars', 'Rugzak|Weekendtas',
      'Pen|Potlood', 'Horloge|Smartwatch', 'Bril|Contactlenzen', 'Paraplu|Regenjas',
      'Sjaal|Das', 'Handschoenen|Wanten', 'Sleutelbos|Pasje', 'Portemonnee|Geldclip',
      'Spiegel|Raam', 'Kussen|Knuffel', 'Deken|Slaapzak', 'Matras|Luchtbed',
      'Fotoalbum|Dagboek', 'Kaart|Brief', 'Cadeaubon|Waardebon', 'Ansichtkaart|Wenskaart',
      'Koptelefoon|Oordopjes', 'Radio|Podcast', 'Boek|E-reader', 'Laptop|Tablet',
      'Powerbank|Oplader', 'Afstandsbediening|Joystick', 'Ring|Armband', 'Ketting|Hanger',
      'Kam|Borstel', 'Föhn|Krultang', 'Schaar|Mes', 'Hamer|Boormachine',
      'Ladder|Trap', 'Zaag|Bijl', 'Thermosfles|Waterfles', 'Kluisje|Brievenbus',
      'Zakmes|Nagelknipper', 'Sticker|Button', 'Camera|Verrekijker', 'Fluit|Trompet'
    ]},
    { id: 'cultuur', name: 'Eten, Sfeer & Cultuur', pairs: [
      'Champagne|Prosecco', 'Frituur|Kebabzaak', 'Bruine kroeg|Nachtclub', 'Foodtruck|Marktkraam',
      'Tapas|Borrelplank', 'Sushi|Poké bowl', 'Pizza|Flammkuchen', 'Pannenkoek|Wafel',
      'Stamppot|Hutspot', 'Bitterballen|Kroketten', 'Haring|Zalm', 'Appeltaart|Vlaai',
      'Koffie|Espresso', 'Thee|Kruidenthee', 'Bier|Cider', 'Whisky|Cognac',
      'Rode wijn|Port', 'Cocktail|Shot', 'Ontbijt|Brunch', 'Lunch|High tea',
      'Barbecue|Gourmetten', 'Fondue|Raclette', 'Soep|Bouillon', 'Salade|Rauwkost',
      'Chocola|Cacao', 'Ijs|Sorbet', 'Slagroom|Kwark', 'Honing|Stroop',
      'Carnaval|Oktoberfest', 'Koningsdag|Sinterklaas', 'Oud en nieuw|Verjaardag', 'Pride|Demonstratie',
      'Opera|Musical', 'Stand-up|Cabaret', 'Jazz|Blues', 'Techno|House',
      'Graffiti|Muurschildering', 'Poëzie|Songtekst', 'Stripboek|Roman', 'Karaoke|Playback',
      'Rijsttafel|Buffet', 'Kantine|Restaurant', 'Cafetaria|Snackbar', 'Broodje kroket|Tosti'
    ]},
    { id: 'dagelijks', name: 'Dagelijks Leven & Acties', pairs: [
      'Spijbelen|Ziek melden', 'Ghosten|Blokkeren', 'Stalken|Lurken', 'Powernap|Meditatie',
      'Schoonmaken|Opruimen', 'Winkelen|Rondneuzen', 'Sporten|Wandelen', 'Koken|Bakken',
      'Fietsen|Hardlopen', 'Zwemmen|Snorkelen', 'Dansen|Aerobics', 'Zingen|Neuriën',
      'Fluisteren|Mompelen', 'Roepen|Schreeuwen', 'Lachen|Giechelen', 'Huilen|Snikken',
      'Bellen|Appen', 'Mailen|Posten', 'Scrollen|Zappen', 'Gamen|Gokken',
      'Daten|Flirten', 'Zoenen|Knuffelen', 'Ruziën|Discussiëren', 'Klagen|Zeuren',
      'Sparen|Beleggen', 'Lenen|Huren', 'Verkopen|Ruilen', 'Onderhandelen|Afdingen',
      'Verslapen|Uitslapen', 'Dutten|Slapen', 'Dromen|Dagdromen', 'Snurken|Slaapwandelen',
      'Verhuizen|Vertrekken', 'Inpakken|Uitpakken', 'Wachten|Treuzelen', 'Haasten|Rennen',
      'Solliciteren|Stage lopen', 'Ontslag nemen|Ontslagen worden', 'Vergaderen|Overleggen', 'Promotie|Salarisverhoging',
      'Afspreken|Uitnodigen', 'Boodschappen doen|Bestellen', 'Afwassen|Afdrogen', 'Tanden poetsen|Mondspoelen'
    ]}
  ];

  var ALL_PAIRS = [];
  CATEGORIES.forEach(function (cat) {
    cat.pairs.forEach(function (raw) {
      var parts = raw.split('|');
      ALL_PAIRS.push({ id: cat.id + ':' + raw, cat: cat.id, a: parts[0], b: parts[1] });
    });
  });
  // Integriteitscheck: geen dubbele id's, elk paar heeft twee verschillende woorden.
  (function () {
    var seen = {};
    ALL_PAIRS.forEach(function (p) {
      if (seen[p.id] || !p.a || !p.b || p.a === p.b) console.warn('Ongeldig woordpaar:', p.id);
      seen[p.id] = true;
    });
    console.info('Woordparen geladen:', ALL_PAIRS.length);
  })();

  /* =====================================================================
     CONSTANTS & HELPERS
     ===================================================================== */
  var MIN = 3, MAX = 20, NAME_MAX = 14;
  var LS_KEY = 'undercover-liquid-glass:v1';
  var NS = 'http://www.w3.org/2000/svg';
  var ROLE_LABEL = { civ: 'BURGER', und: 'UNDERCOVER', white: 'MR. WHITE' };
  var ROLE_CLASS = { civ: 'r-civ', und: 'r-und', white: 'r-white' };
  var ROLE_ICON = { civ: 'user', und: 'mask', white: 'ghost' };
  var ROLE_RGB = { civ: '94,234,212', und: '255,77,141', white: '243,244,255' };
  var DEFAULT_SETUP = { total: 6, und: 1, white: 1 };
  var MSG_MAJORITY = 'Minstens evenveel burgers als infiltranten';
  var MSG_MIN_INF = 'Minstens 1 infiltrant nodig';

  var ROWS = [
    { key: 'total', label: 'SPELERS', icon: 'users', rgb: '167,139,250', minus: 'Minder spelers', plus: 'Meer spelers' },
    { key: 'civ', label: 'BURGERS', icon: 'user', rgb: '94,234,212', minus: 'Minder burgers', plus: 'Meer burgers' },
    { key: 'und', label: 'UNDERCOVERS', icon: 'mask', rgb: '255,77,141', minus: 'Minder undercovers', plus: 'Meer undercovers' },
    { key: 'white', label: 'MR. WHITE', icon: 'ghost', rgb: '243,244,255', minus: 'Minder Mr. White', plus: 'Meer Mr. White' }
  ];

  var SCREEN_FOCUS = {
    setup: '#btnStart', pass: '#btnSee', reveal: '#btnHide', round: '#btnVote',
    vote: '#voteBack', elim: '#elimNext', victory: '#btnAgain'
  };

  var state = { setup: null, names: [], used: [] };
  var game = null;
  var current = 'setup';
  var refs = {};
  var pillRefs = {};
  var flipTimer = null, elimTimer = null, toastTimer = null, guessTimer = null;
  var guessLocked = false;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function h(tag, props) {
    var el = document.createElement(tag);
    var p = props || {};
    Object.keys(p).forEach(function (k) {
      var v = p[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.style.cssText = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2).toLowerCase(), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var kids = [].concat(arguments[i]);
      kids.forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
      });
    }
    return el;
  }

  function icon(name) {
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('class', 'ic');
    s.setAttribute('aria-hidden', 'true');
    var u = document.createElementNS(NS, 'use');
    u.setAttribute('href', '#i-' + name);
    s.appendChild(u);
    return s;
  }

  function rand(n) {
    if (window.crypto && window.crypto.getRandomValues) {
      var buf = new Uint32Array(1);
      var limit = Math.floor(0x100000000 / n) * n;
      var x;
      do { window.crypto.getRandomValues(buf); x = buf[0]; } while (x >= limit);
      return x % n;
    }
    return Math.floor(Math.random() * n);
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = rand(i + 1);
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function toMap(arr) {
    var m = Object.create(null);
    arr.forEach(function (x) { m[x] = true; });
    return m;
  }

  function buzz(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* niet ondersteund */ } }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function initial(name) { return (name.trim().charAt(0) || '?').toUpperCase(); }
  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  function restart(el, cls) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }

  function fitWord(el, text, maxSize, availMax) {
    el.textContent = text;
    var lens = text.split(/[\s-]+/).map(function (w) { return w.length; });
    var longest = Math.max.apply(null, lens.concat([4]));
    var avail = Math.min(window.innerWidth * 0.72, availMax || 300);
    var size = Math.floor(avail / (longest * 0.62));
    el.style.fontSize = clamp(size, 22, maxSize || 56) + 'px';
  }

  /* =====================================================================
     PERSISTENCE
     ===================================================================== */
  function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? Math.round(v) : d; }

  // Houdt de som Burgers + Undercovers + Mr. White === Totaal geldig,
  // met minstens 1 infiltrant en Burgers >= infiltranten.
  function normalize(t) {
    var total = clamp(num(t.total, DEFAULT_SETUP.total), MIN, MAX);
    var und = Math.max(0, num(t.und, DEFAULT_SETUP.und));
    var white = Math.max(0, num(t.white, DEFAULT_SETUP.white));
    var maxInf = Math.floor(total / 2);
    if (und + white < 1) und = 1;
    while (und + white > maxInf) {
      if (white > 0 && und + white > 1) white--;
      else if (und > 1) und--;
      else break;
    }
    return {
      total: total, civ: total - und - white, und: und, white: white,
      cats: t.cats || (state.setup && state.setup.cats) || {}
    };
  }

  function save() {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ setup: state.setup, names: state.names, used: state.used }));
    } catch (e) { /* privé modus of vol: negeren */ }
  }

  function loadState() {
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch (e) { saved = null; }
    if (!saved || typeof saved !== 'object') saved = {};
    var s = (saved.setup && typeof saved.setup === 'object') ? saved.setup : {};
    var savedCats = (s.cats && typeof s.cats === 'object') ? s.cats : {};
    var cats = {}, anyOn = false;
    CATEGORIES.forEach(function (c) {
      cats[c.id] = savedCats[c.id] !== false;
      if (cats[c.id]) anyOn = true;
    });
    if (!anyOn) CATEGORIES.forEach(function (c) { cats[c.id] = true; });

    state.setup = normalize({ total: num(s.total, DEFAULT_SETUP.total), und: num(s.und, DEFAULT_SETUP.und), white: num(s.white, DEFAULT_SETUP.white), cats: cats });

    state.names = [];
    if (Array.isArray(saved.names)) {
      saved.names.slice(0, MAX).forEach(function (n) { state.names.push(String(n == null ? '' : n).slice(0, NAME_MAX)); });
    }
    while (state.names.length < MAX) state.names.push('');

    var valid = toMap(ALL_PAIRS.map(function (p) { return p.id; }));
    state.used = Array.isArray(saved.used) ? saved.used.filter(function (id) { return valid[id]; }) : [];
  }

  /* =====================================================================
     SETUP SCREEN
     ===================================================================== */
  function plan(key, dir) {
    var s = state.setup, inf = s.und + s.white;
    var t = { total: s.total, und: s.und, white: s.white };
    if (key === 'total') {
      if (dir > 0 && s.total >= MAX) return { err: 'Maximaal ' + MAX + ' spelers' };
      if (dir < 0 && s.total <= MIN) return { err: 'Minimaal ' + MIN + ' spelers' };
      t.total += dir;
    } else if (key === 'civ') {
      if (dir > 0) {
        if (inf <= 1) return { err: MSG_MIN_INF };
        if (s.white > 0) t.white--; else t.und--;
      } else {
        if (s.civ - 1 < inf + 1) return { err: MSG_MAJORITY };
        t.und++;
      }
    } else {
      if (dir > 0) {
        if (s.civ - 1 < inf + 1) return { err: MSG_MAJORITY };
        t[key]++;
      } else {
        if (s[key] <= 0) return { err: 'Al op nul' };
        if (inf <= 1) return { err: MSG_MIN_INF };
        t[key]--;
      }
    }
    return { next: normalize(t) };
  }

  function onStep(key, dir) {
    var res = plan(key, dir);
    if (res.err) {
      toast(res.err);
      buzz(25);
      restart(refs[key].row, 'shake');
      return;
    }
    state.setup = res.next;
    save();
    renderSetup();
    buzz(8);
  }

  function buildRow(def) {
    var minus = h('button', { type: 'button', class: 'step', 'aria-label': def.minus, onclick: function () { onStep(def.key, -1); } }, icon('minus'));
    var plus = h('button', { type: 'button', class: 'step', 'aria-label': def.plus, onclick: function () { onStep(def.key, 1); } }, icon('plus'));
    var val = h('span', { class: 'val', 'aria-live': 'polite' }, '');
    var row = h('div', { class: 'row glass', style: '--rgb:' + def.rgb },
      h('span', { class: 'row-ic', 'aria-hidden': 'true' }, icon(def.icon)),
      h('span', { class: 'row-label' }, def.label),
      h('div', { class: 'ctrl' }, minus, val, plus)
    );
    refs[def.key] = { row: row, minus: minus, plus: plus, val: val };
    return row;
  }

  function buildSetup() {
    $('#rowTotal').appendChild(buildRow(ROWS[0]));
    for (var i = 1; i < ROWS.length; i++) $('#rowRoles').appendChild(buildRow(ROWS[i]));

    var box = $('#pills');
    CATEGORIES.forEach(function (cat) {
      var b = h('button', { type: 'button', class: 'pill', 'aria-pressed': 'true', onclick: function () { toggleCat(cat.id); } }, cat.name);
      pillRefs[cat.id] = b;
      box.appendChild(b);
    });
  }

  function enabledCount() {
    var n = 0;
    CATEGORIES.forEach(function (c) { if (state.setup.cats[c.id]) n++; });
    return n;
  }

  function toggleCat(id) {
    var cats = state.setup.cats;
    if (cats[id] && enabledCount() === 1) { toast('Minstens 1 categorie'); buzz(25); return; }
    cats[id] = !cats[id];
    save();
    renderSetup();
    buzz(8);
  }

  function enabledPairs() {
    return ALL_PAIRS.filter(function (p) { return state.setup.cats[p.cat]; });
  }

  function freshCount() {
    var used = toMap(state.used);
    return enabledPairs().filter(function (p) { return !used[p.id]; }).length;
  }

  function nameRow(i) {
    var input = h('input', {
      type: 'text', maxlength: NAME_MAX, placeholder: 'Speler ' + (i + 1), 'aria-label': 'Naam speler ' + (i + 1),
      autocomplete: 'off', autocapitalize: 'words', enterkeyhint: 'next', spellcheck: 'false',
      oninput: function (e) { state.names[i] = e.target.value; save(); },
      onkeydown: function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var next = $('#nameList').children[i + 1];
        if (next) next.querySelector('input').focus(); else e.target.blur();
      }
    });
    input.value = state.names[i] || '';
    return h('div', { class: 'name-row glass-lite' }, h('span', { class: 'num' }, i + 1), input);
  }

  function syncNames() {
    var list = $('#nameList'), total = state.setup.total;
    while (list.children.length > total) list.removeChild(list.lastChild);
    while (list.children.length < total) list.appendChild(nameRow(list.children.length));
  }

  function renderSetup() {
    var s = state.setup;
    ROWS.forEach(function (def) {
      var r = refs[def.key], v = String(s[def.key]);
      if (r.val.textContent !== v) {
        r.val.textContent = v;
        restart(r.val, 'bump');
      }
      r.minus.setAttribute('aria-disabled', plan(def.key, -1).err ? 'true' : 'false');
      r.plus.setAttribute('aria-disabled', plan(def.key, 1).err ? 'true' : 'false');
    });
    $('#eq').textContent = s.civ + ' + ' + s.und + ' + ' + s.white + ' = ' + s.total;
    CATEGORIES.forEach(function (c) {
      pillRefs[c.id].setAttribute('aria-pressed', s.cats[c.id] ? 'true' : 'false');
    });
    var fresh = freshCount();
    $('#poolChip').textContent = fresh + ' PAREN';
    $('#poolChip').setAttribute('aria-label', fresh + ' beschikbare woordparen');
    syncNames();
  }

  /* =====================================================================
     SCREENS & MODALS
     ===================================================================== */
  function show(name) {
    $$('.screen').forEach(function (sc) {
      var on = sc.id === 's-' + name;
      sc.classList.toggle('active', on);
      if (on) sc.removeAttribute('aria-hidden'); else sc.setAttribute('aria-hidden', 'true');
    });
    current = name;
    var sel = SCREEN_FOCUS[name];
    if (sel) setTimeout(function () { var b = $(sel); if (b && !b.disabled && current === name) b.focus({ preventScroll: true }); }, 450);
  }

  function openModal(id) {
    var m = $('#' + id);
    m.removeAttribute('inert');
    m.setAttribute('aria-hidden', 'false');
    m.classList.add('open');
    setTimeout(function () {
      var t = m.querySelector('input, .view:not([hidden]) button, .sheet > button');
      if (t) t.focus({ preventScroll: true });
    }, 80);
  }

  function clearPeek() {
    $('#peekWord').textContent = '';
    if (game) game.peekId = null;
  }

  function closeModal(id) {
    var m = $('#' + id);
    if (!m.classList.contains('open')) return;
    if (m.contains(document.activeElement)) document.activeElement.blur();
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    m.setAttribute('inert', '');
    if (id === 'm-peek') clearPeek();
  }

  function closeAllModals() {
    ['m-peek', 'm-guess', 'm-confirm'].forEach(closeModal);
  }

  /* =====================================================================
     GAME FLOW
     ===================================================================== */
  function getNames() {
    var out = [];
    for (var i = 0; i < state.setup.total; i++) {
      var raw = String(state.names[i] || '').trim().replace(/\s+/g, ' ');
      out.push(raw || ('Speler ' + (i + 1)));
    }
    return out;
  }

  function pickPair() {
    var pool = enabledPairs();
    var usedMap = toMap(state.used);
    var fresh = pool.filter(function (p) { return !usedMap[p.id]; });
    var recycled = false;
    if (!fresh.length) {
      var poolIds = toMap(pool.map(function (p) { return p.id; }));
      state.used = state.used.filter(function (id) { return !poolIds[id]; });
      fresh = pool;
      recycled = true;
    }
    var pair = fresh[rand(fresh.length)];
    state.used.push(pair.id);
    save();
    return { pair: pair, recycled: recycled };
  }

  function startGame() {
    var names = getNames();
    var seen = {};
    for (var i = 0; i < names.length; i++) {
      var key = names[i].toLowerCase();
      if (seen[key] !== undefined) {
        toast('Dubbele naam: ' + names[i]);
        buzz(30);
        var inputs = $$('#nameList input');
        if (inputs[i]) { inputs[i].scrollIntoView({ block: 'center' }); inputs[i].focus(); }
        return;
      }
      seen[key] = i;
    }

    var s = state.setup;
    var roles = [];
    var k;
    for (k = 0; k < s.civ; k++) roles.push('civ');
    for (k = 0; k < s.und; k++) roles.push('und');
    for (k = 0; k < s.white; k++) roles.push('white');
    roles = shuffle(roles);

    var picked = pickPair();
    var swap = rand(2) === 1;
    var civWord = swap ? picked.pair.b : picked.pair.a;
    var undWord = swap ? picked.pair.a : picked.pair.b;

    game = {
      players: names.map(function (n, idx) {
        var role = roles[idx];
        return { id: idx, name: n, role: role, alive: true, word: role === 'civ' ? civWord : (role === 'und' ? undWord : null) };
      }),
      civWord: civWord, undWord: undWord,
      round: 1, order: [], passIdx: 0,
      selected: null, lastOut: null, peekId: null,
      busy: false, winner: null
    };

    if (picked.recycled) toast('Alle woordparen gehad — opnieuw geschud');
    buzz(20);
    showPass(0);
  }

  /* ----- Pass & reveal ----- */
  function showPass(i) {
    game.passIdx = i;
    var p = game.players[i], n = game.players.length;
    $('#passAvatar').textContent = initial(p.name);
    $('#passName').textContent = p.name;
    var pct = Math.round((i / n) * 100);
    $('#passBar').style.width = pct + '%';
    $('#passProgress').setAttribute('aria-valuenow', String(pct));
    $('#passCount').textContent = (i + 1) + ' / ' + n;
    show('pass');
  }

  function showReveal() {
    if (!game || current !== 'pass') return;
    var p = game.players[game.passIdx];
    var isWhite = p.role === 'white';
    var last = game.passIdx === game.players.length - 1;
    $('#revealWho').textContent = p.name;
    $('#revealLabel').textContent = isWhite ? 'GEEN WOORD' : 'JOUW WOORD';
    fitWord($('#revealWord'), isWhite ? 'JIJ BENT MR. WHITE' : p.word, isWhite ? 40 : 56);
    $('#btnHideLabel').textContent = last ? 'VERBERG & START' : 'VERBERG & VOLGENDE';
    var flip = $('#flip');
    flip.classList.remove('flipped');
    show('reveal');
    clearTimeout(flipTimer);
    flipTimer = setTimeout(function () { flip.classList.add('flipped'); }, 450);
    buzz(15);
  }

  function clearReveal() {
    clearTimeout(flipTimer);
    $('#revealWord').textContent = '';
    $('#flip').classList.remove('flipped');
  }

  function hideReveal() {
    if (!game || current !== 'reveal') return;
    clearReveal(); // woord direct weg, vóór de overgang naar de volgende speler
    var next = game.passIdx + 1;
    if (next < game.players.length) showPass(next); else startRound(1);
  }

  /* ----- Round ----- */
  function alivePlayers() {
    return game.players.filter(function (p) { return p.alive; });
  }

  function makeOrder(firstRound) {
    var ids = shuffle(alivePlayers().map(function (p) { return p.id; }));
    if (firstRound && ids.length > 1 && game.players[ids[0]].role === 'white') {
      var cand = [];
      ids.forEach(function (id, i) { if (game.players[id].role !== 'white') cand.push(i); });
      if (cand.length) {
        var j = cand[rand(cand.length)];
        var t = ids[0]; ids[0] = ids[j]; ids[j] = t;
      }
    }
    return ids;
  }

  function startRound(n) {
    game.round = n;
    game.busy = false;
    game.order = makeOrder(n === 1);
    renderRound();
    show('round');
  }

  function renderRound() {
    var total = game.players.length, aliveN = game.order.length;
    $('#roundNum').textContent = String(game.round);
    $('#aliveChip').textContent = aliveN + ' / ' + total;
    $('#aliveChip').setAttribute('aria-label', aliveN + ' van ' + total + ' spelers in het spel');

    var list = $('#orderList');
    list.textContent = '';
    game.order.forEach(function (id, i) {
      var p = game.players[id];
      var kids = [h('span', { class: 'n' }, i + 1), h('span', { class: 'nm' }, p.name)];
      if (i === 0) kids.push(h('span', { class: 'tag' }, 'START'));
      kids.push(icon('eye'));
      list.appendChild(h('li', {},
        h('button', {
          type: 'button', class: 'prow glass-lite', style: '--i:' + i,
          'aria-label': p.name + ', bekijk eigen woord',
          onclick: function () { peekFor(p.id); }
        }, kids)
      ));
    });

    var offset = game.order.length;
    game.players.filter(function (p) { return !p.alive; }).forEach(function (p, i) {
      list.appendChild(h('li', {},
        h('div', { class: 'prow glass-lite dead', style: '--i:' + (offset + i) },
          h('span', { class: 'n' }, icon('x')),
          h('span', { class: 'nm' }, p.name),
          h('span', { class: 'role ' + ROLE_CLASS[p.role] }, ROLE_LABEL[p.role])
        )
      ));
    });
    list.scrollTop = 0;
  }

  /* ----- Peek (SPIEK) ----- */
  function showPeekView(id) {
    ['peekPick', 'peekGuard', 'peekShow'].forEach(function (v) { $('#' + v).hidden = (v !== id); });
  }

  function openPeek() {
    if (!game || current !== 'round') return;
    var grid = $('#peekGrid');
    grid.textContent = '';
    game.order.forEach(function (id, i) {
      var p = game.players[id];
      grid.appendChild(h('button', {
        type: 'button', class: 'vbtn glass-lite', style: '--i:' + i,
        onclick: function () { peekFor(p.id); }
      }, p.name));
    });
    showPeekView('peekPick');
    openModal('m-peek');
  }

  function peekFor(id) {
    if (!game) return;
    game.peekId = id;
    $('#peekName').textContent = game.players[id].name;
    $('#peekWord').textContent = '';
    showPeekView('peekGuard');
    openModal('m-peek');
  }

  function peekReveal() {
    if (!game || game.peekId === null) return;
    var p = game.players[game.peekId];
    var isWhite = p.role === 'white';
    $('#peekLabel').textContent = isWhite ? 'GEEN WOORD' : 'JOUW WOORD';
    fitWord($('#peekWord'), isWhite ? 'JIJ BENT MR. WHITE' : p.word, isWhite ? 36 : 48, 260);
    showPeekView('peekShow');
    buzz(12);
  }

  /* ----- Vote & elimination ----- */
  function openVote() {
    if (!game || current !== 'round') return;
    game.selected = null;
    $('#voteConfirm').disabled = true;
    var grid = $('#voteGrid');
    grid.textContent = '';
    game.order.forEach(function (id, i) {
      var p = game.players[id];
      grid.appendChild(h('button', {
        type: 'button', class: 'vbtn glass-lite', 'aria-pressed': 'false', 'data-id': p.id, style: '--i:' + i,
        onclick: function () { selectVote(p.id); }
      }, p.name));
    });
    show('vote');
  }

  function selectVote(id) {
    game.selected = id;
    $$('.vbtn', $('#voteGrid')).forEach(function (b) {
      b.setAttribute('aria-pressed', Number(b.getAttribute('data-id')) === id ? 'true' : 'false');
    });
    $('#voteConfirm').disabled = false;
    buzz(10);
  }

  function confirmVote() {
    if (!game || current !== 'vote' || game.selected === null) return;
    var p = game.players[game.selected];
    p.alive = false;
    game.lastOut = p;
    showElim(p);
  }

  function showElim(p) {
    var el = $('#s-elim');
    el.style.setProperty('--rc', ROLE_RGB[p.role]);
    $('#elimName').textContent = p.name;
    $('#elimRole').textContent = ROLE_LABEL[p.role];
    var orb = $('#elimOrb');
    orb.textContent = '';
    orb.appendChild(h('span', { class: 'ring' }));
    orb.appendChild(icon(ROLE_ICON[p.role]));
    var btn = $('#elimNext');
    btn.disabled = true;
    el.classList.remove('play');
    show('elim');
    void el.offsetWidth;
    el.classList.add('play');
    clearTimeout(elimTimer);
    elimTimer = setTimeout(function () {
      btn.disabled = false;
      if (current === 'elim') btn.focus({ preventScroll: true });
      buzz([40, 50, 110]);
    }, 2300);
  }

  function elimDone() {
    if (!game || current !== 'elim' || game.busy) return;
    game.busy = true;
    var p = game.lastOut;
    if (p.role === 'white') openGuess(p); else afterElimination();
  }

  function checkWin() {
    var alive = alivePlayers();
    var civ = alive.filter(function (p) { return p.role === 'civ'; }).length;
    var inf = alive.length - civ;
    if (inf === 0) return 'civ';
    if (civ <= 1) return 'inf';
    return null;
  }

  function afterElimination() {
    var w = checkWin();
    if (w) endGame(w, null); else startRound(game.round + 1);
  }

  /* ----- Mr. White last chance ----- */
  function openGuess(p) {
    guessLocked = false;
    $('#guessWho').textContent = p.name;
    var input = $('#guessInput');
    input.value = '';
    input.readOnly = false;
    $('#guessFb').textContent = '';
    $('#guessFb').className = 'feedback';
    $('#guessBtn').disabled = false;
    openModal('m-guess');
  }

  function submitGuess(e) {
    e.preventDefault();
    if (!game || guessLocked) return;
    var input = $('#guessInput');
    var guess = norm(input.value);
    if (!guess) {
      restart(input, 'shake');
      input.focus();
      return;
    }
    guessLocked = true;
    input.readOnly = true;
    $('#guessBtn').disabled = true;
    var ok = guess === norm(game.civWord);
    var fb = $('#guessFb');
    fb.className = 'feedback ' + (ok ? 'ok' : 'bad');
    fb.textContent = ok ? 'GOED!' : 'FOUT!';
    if (!ok) restart($('#guessForm'), 'shake');
    buzz(ok ? [30, 40, 120] : 200);
    clearTimeout(guessTimer);
    guessTimer = setTimeout(function () {
      closeModal('m-guess');
      if (!game) return;
      if (ok) endGame('white', game.lastOut.id); else afterElimination();
    }, 1100);
  }

  /* ----- Victory ----- */
  function confetti() {
    var colors = ['#8b5cf6', '#22d3ee', '#ec4899', '#6366f1', '#f4f5ff', '#5eead4'];
    for (var i = 0; i < 40; i++) {
      var angle = Math.random() * Math.PI * 2;
      var dist = 120 + Math.random() * 220;
      var el = h('i', {
        class: 'confetti', 'aria-hidden': 'true',
        style: '--dx:' + Math.round(Math.cos(angle) * dist) + 'px;--dy:' + Math.round(Math.sin(angle) * dist + 80) + 'px;--rot:' + Math.round(Math.random() * 720 - 360) + 'deg;--c:' + colors[i % colors.length]
      });
      document.body.appendChild(el);
      (function (node) {
        setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 2000);
      })(el);
    }
  }

  function endGame(winner, stealerId) {
    game.winner = winner;
    var el = $('#s-victory');
    el.setAttribute('data-winner', winner);

    var title, sub;
    if (winner === 'civ') { title = 'BURGERS WINNEN'; sub = 'ALLE INFILTRANTEN ZIJN UIT'; }
    else if (winner === 'inf') { title = 'INFILTRANTEN WINNEN'; sub = 'NOG MAAR 1 BURGER OVER'; }
    else { title = 'MR. WHITE WINT'; sub = game.players[stealerId].name + ' RAADDE HET WOORD'; }
    $('#vTitle').textContent = title;
    $('#vSub').textContent = sub;
    $('#vCiv').textContent = game.civWord;
    $('#vUnd').textContent = game.undWord;

    var list = $('#vList');
    list.textContent = '';
    game.players.forEach(function (p, i) {
      var isWinner = winner === 'civ' ? p.role === 'civ'
        : winner === 'inf' ? p.role !== 'civ'
        : p.id === stealerId;
      var kids = [
        h('span', { class: 'n' }, i + 1),
        h('span', { class: 'nm' }, p.name),
        p.alive ? null : h('span', { class: 'out-note' }, 'UIT'),
        h('span', { class: 'role ' + ROLE_CLASS[p.role] }, ROLE_LABEL[p.role]),
        isWinner ? icon('crown') : null
      ];
      list.appendChild(h('li', {}, h('div', { class: 'prow glass-lite' + (isWinner ? ' win' : ''), style: '--i:' + i }, kids)));
    });
    list.scrollTop = 0;

    show('victory');
    confetti();
    buzz([60, 40, 60, 40, 160]);
  }

  function resetToSetup() {
    clearTimeout(flipTimer);
    clearTimeout(elimTimer);
    clearTimeout(guessTimer);
    clearReveal();
    clearPeek();
    closeAllModals();
    game = null;
    show('setup');
    renderSetup();
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init() {
    loadState();
    buildSetup();
    renderSetup();

    $('#btnStart').addEventListener('click', startGame);
    $('#btnSee').addEventListener('click', showReveal);
    $('#btnHide').addEventListener('click', hideReveal);
    $('#btnPeek').addEventListener('click', openPeek);
    $('#btnVote').addEventListener('click', openVote);
    $('#voteBack').addEventListener('click', function () { if (game && current === 'vote') show('round'); });
    $('#voteConfirm').addEventListener('click', confirmVote);
    $('#elimNext').addEventListener('click', elimDone);
    $('#btnAgain').addEventListener('click', resetToSetup);
    $('#btnStop').addEventListener('click', function () { openModal('m-confirm'); });
    $('#confirmYes').addEventListener('click', resetToSetup);

    $('#peekSee').addEventListener('click', peekReveal);
    $('#peekCancel').addEventListener('click', function () { closeModal('m-peek'); });
    $('#peekHide').addEventListener('click', function () { closeModal('m-peek'); });
    $('#guessForm').addEventListener('submit', submitGuess);

    $$('[data-close]').forEach(function (b) {
      b.addEventListener('click', function () { closeModal(b.getAttribute('data-close')); });
    });
    ['m-peek', 'm-confirm'].forEach(function (id) {
      $('#' + id).addEventListener('click', function (e) { if (e.target === e.currentTarget) closeModal(id); });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if ($('#m-peek').classList.contains('open')) closeModal('m-peek');
      else if ($('#m-confirm').classList.contains('open')) closeModal('m-confirm');
    });

    // Anti-spy: als de pagina op de achtergrond gaat, nooit een woord laten staan.
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden || !game) return;
      if ($('#m-peek').classList.contains('open')) closeModal('m-peek');
      if (current === 'reveal') {
        clearReveal();
        showPass(game.passIdx);
      }
    });
  }

  init();
})();
