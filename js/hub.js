(function () {
  'use strict';

  /* Home (#s-hub): who plays today + the vertical, snapping game rail.
     Players (#s-roster): the roster of everyone who ever played, ticked for today, with group presets.
     Scoreboard (#s-scores). */

  const LG = window.LG;
  const h = LG.h, $ = LG.$, $$ = LG.$$, store = LG.store, ui = LG.ui;
  const ICON = (name) => 'assets/icons/' + name + '.webp';
  let rosterReturn = 'hub';
  let editMode = false;

  // How each game is presented on its card (rules and content live in the game files).
  const META = {
    undercover: { name: 'Undercover', tag: 'Iedereen krijgt een woord. Eén iemand heeft een net ander woord.', icon: 'undercover', color: '#6fe0a0' },
    saboteur: { name: 'Saboteur', tag: 'Teken samen een geheim woord, lijn per lijn. Wie tekent er naast?', icon: 'saboteur', color: '#6cb8ff' },
    golflengte: { name: 'Golflengte', tag: 'Eén hint. De groep schuift naar het verborgen doel.', icon: 'golflengte', color: '#ffad6b' },
    blackstories: { name: 'Black Story', tag: 'Los een duister verhaal op met alleen ja- of nee-vragen.', icon: 'blackstory', color: '#ff8fb8' },
    dilemma: { name: 'Het Dilemma', tag: 'Stem in het geheim ja of nee en raad hoeveel er ja zeiden.', icon: 'dilemma', color: '#ffd166' }
  };
  LG.gameMeta = (id) => META[id] || { name: id, tag: '', icon: 'lafete', color: '#6fe0a0' };

  const HTML = `
  <section class="screen active" id="s-welcome" aria-label="Welkom bij LaFête">
    <button type="button" class="welcome" id="welcomeTap" aria-label="Tik om te beginnen">
      <span class="w-float" aria-hidden="true">
        <img class="wf f1" src="${ICON('undercover')}" alt=""><img class="wf f2" src="${ICON('saboteur')}" alt="">
        <img class="wf f3" src="${ICON('golflengte')}" alt=""><img class="wf f4" src="${ICON('blackstory')}" alt="">
        <img class="wf f5" src="${ICON('dilemma')}" alt="">
      </span>
      <span class="w-title" aria-hidden="true"><i>L</i><i>a</i><i>F</i><i>ê</i><i>t</i><i>e</i></span>
      <span class="w-sub">Feestspellen voor je vriendengroep</span>
      <span class="w-hint">Tik ergens om te beginnen</span>
    </button>
  </section>

  <section class="screen" id="s-hub" aria-label="LaFête">
    <div class="wrap hub-wrap">
      <header class="top hub-top">
        <h1 class="brand">LaFête</h1>
        <div class="top-right" id="hubTopRight">
          <button type="button" class="icon-btn glass" id="hubScores" aria-label="Scorebord"><img src="${ICON('scorebord')}" alt=""></button>
        </div>
      </header>
      <button type="button" class="today glass" id="hubToday" aria-label="Kies wie er vandaag meespeelt">
        <span class="today-head"><img src="${ICON('spelers')}" alt=""><span class="eyebrow">Vandaag spelen mee</span></span>
        <span class="today-body" id="hubTodayBody"></span>
      </button>
      <div class="rail" id="gameRail" aria-label="Spellen"></div>
    </div>
  </section>

  <section class="screen" id="s-roster" aria-label="Wie speelt er?">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="rosterBack" aria-label="Terug"><svg class="ic"><use href="#i-back"/></svg></button>
        <h2 class="title">Wie speelt er?</h2>
        <button type="button" class="chip glass-lite chip-btn" id="rosterEdit" aria-pressed="false">Bewerk</button>
      </header>
      <form class="roster-add" id="rosterForm" autocomplete="off" novalidate>
        <label class="sr-only" for="rosterInput">Nieuwe speler</label>
        <input class="input" id="rosterInput" type="text" maxlength="14" placeholder="Nieuwe speler" enterkeyhint="done" autocapitalize="words" spellcheck="false">
        <button type="submit" class="btn btn-primary btn-add"><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>Erbij</button>
      </form>
      <div class="scroll roster-scroll" id="rosterScroll">
        <div class="presets-block">
          <p class="sec">Groepen <span class="sec-note">tik om iedereen in één keer aan te vinken</span></p>
          <div class="presets" id="rosterPresets"></div>
        </div>
        <div class="sec-row"><p class="sec">Alle spelers</p><button type="button" class="link-btn" id="rosterNone">Alles uit</button></div>
        <div class="roster-list" id="rosterList"></div>
      </div>
      <div class="dock"><div class="dock-in">
        <button type="button" class="btn btn-primary btn-block" id="rosterDone"></button>
      </div></div>
    </div>
  </section>

  <section class="screen" id="s-scores" aria-label="Scorebord">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" data-go="hub" aria-label="Terug"><svg class="ic"><use href="#i-back"/></svg></button>
        <h2 class="title">Scorebord</h2>
        <span class="chip glass-lite">Alle spellen</span>
      </header>
      <ol class="plist" id="scoreList"></ol>
      <div class="actions">
        <button type="button" class="btn btn-danger" id="scoresReset"><svg class="ic" aria-hidden="true"><use href="#i-trash"/></svg>Reset scores</button>
      </div>
    </div>
  </section>

  <div class="modal dismissable" id="m-preset" role="dialog" aria-modal="true" aria-labelledby="presetTitle" aria-hidden="true" inert>
    <form class="sheet glass" id="presetForm" autocomplete="off" novalidate>
      <h3 id="presetTitle">Bewaar als groep</h3>
      <p class="sheet-text" id="presetNames"></p>
      <label class="sr-only" for="presetName">Groepsnaam</label>
      <input class="input" id="presetName" type="text" maxlength="22" placeholder="Bijv. Vrijdagclub" enterkeyhint="done" autocapitalize="words" spellcheck="false">
      <button type="submit" class="btn btn-primary">Bewaar groep</button>
      <button type="button" class="btn" data-close="m-preset">Annuleer</button>
    </form>
  </div>`;

  /* ----- home ----- */
  function renderToday() {
    const act = store.active();
    const body = $('#hubTodayBody');
    body.textContent = '';
    if (!act.length) {
      body.appendChild(h('span', { class: 'today-empty' }, 'Nog niemand gekozen'));
      body.appendChild(h('span', { class: 'today-cta' }, 'Kies spelers'));
    } else {
      const stack = h('span', { class: 'today-stack' });
      act.slice(0, 6).forEach((p) => stack.appendChild(ui.avatar(p.id, p.name)));
      if (act.length > 6) stack.appendChild(h('span', { class: 'pav more' }, '+' + (act.length - 6)));
      body.appendChild(stack);
      body.appendChild(h('span', { class: 'today-count' }, act.length + (act.length === 1 ? ' speler' : ' spelers')));
    }
  }

  let cards = [];
  let activeCard = -1;
  let railFrame = 0;

  function buildRail() {
    const rail = $('#gameRail');
    rail.textContent = '';
    cards = LG.games.map((g, i) => {
      const m = LG.gameMeta(g.id);
      const need = h('span', { class: 'need', hidden: true });
      const icon = h('img', { class: 'gico', src: ICON(m.icon), alt: '' });
      // The whole card is the play button; a round play badge hints at that without words.
      const card = h('article', { class: 'gcard glass', style: '--c:' + m.color, role: 'button', tabindex: '0', 'aria-label': 'Speel ' + m.name },
        need,
        icon,
        h('h2', { class: 'gname' }, m.name),
        h('p', { class: 'gtag' }, m.tag),
        h('span', { class: 'gmeta' }, g.min + ' tot ' + g.max + ' spelers'),
        h('span', { class: 'ggo', 'aria-hidden': 'true' }, LG.icon('play'))
      );
      const choose = () => {
        if (i !== activeCard) { scrollToCard(i); return; }
        LG.restart(icon, 'wiggle');
        LG.restart(card, 'chosen');
        LG.buzz(10);
        setTimeout(() => LG.openGame(g.id), 280);
      };
      card.addEventListener('click', choose);
      card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); } });
      rail.appendChild(card);
      return { el: card, need: need, icon: icon, game: g };
    });
    rail.addEventListener('scroll', () => { if (!railFrame) railFrame = requestAnimationFrame(updateRail); }, { passive: true });
    window.addEventListener('resize', sizeRail);
    if (window.ResizeObserver) new ResizeObserver(sizeRail).observe(rail);
  }

  function sizeRail() {
    const rail = $('#gameRail');
    if (!rail || !rail.clientHeight) return;
    // Leave the top of the next card peeking out, so it can be tapped.
    // The card never gets taller than the visible rail, so its Play button always fits; the next card peeks below.
    rail.style.setProperty('--card-h', Math.max(300, rail.clientHeight - 70) + 'px');
    updateRail();
  }

  function step() {
    return cards.length > 1 ? cards[1].el.offsetTop - cards[0].el.offsetTop : 1;
  }

  function scrollToCard(i) {
    const rail = $('#gameRail');
    rail.scrollTo({ top: cards[i].el.offsetTop - cards[0].el.offsetTop, behavior: 'smooth' });
    LG.buzz(10);
  }

  // Cards tilt, shrink and fade the further they are from the snap point; the one that lands pops its icon.
  function updateRail() {
    railFrame = 0;
    const rail = $('#gameRail');
    if (!rail || !cards.length) return;
    const st = step();
    const pos = rail.scrollTop / st;
    cards.forEach((c, i) => {
      const dlt = i - pos;
      const ad = Math.min(Math.abs(dlt), 1.2);
      const rot = Math.max(-1, Math.min(1, dlt)) * 9;
      c.el.style.transform = 'perspective(900px) rotateX(' + (-rot).toFixed(2) + 'deg) scale(' + (1 - ad * 0.12).toFixed(3) + ')';
      c.el.style.opacity = (1 - ad * 0.42).toFixed(3);
    });
    const act = Math.max(0, Math.min(cards.length - 1, Math.round(pos)));
    if (act !== activeCard) {
      if (activeCard !== -1) LG.buzz(5);
      activeCard = act;
      cards.forEach((c, i) => c.el.classList.toggle('act', i === act));
      LG.restart(cards[act].icon, 'hop');
    }
  }

  function renderNeeds() {
    const n = store.active().length;
    cards.forEach((c) => {
      const g = c.game;
      const short = n < g.min;
      const over = n > g.max;
      c.need.hidden = !short && !over;
      c.need.textContent = n === 0 ? 'Kies eerst spelers' : short ? 'Nog ' + (g.min - n) + ' nodig' : 'Max. ' + g.max;
      c.el.classList.toggle('short', short || over);
    });
  }

  function render() {
    renderToday();
    if (!cards.length) buildRail();
    renderNeeds();
    requestAnimationFrame(sizeRail);
  }

  LG.openGame = function (id) {
    const g = LG.games.filter((x) => x.id === id)[0];
    if (!g) return;
    const n = store.active().length;
    const name = LG.gameMeta(id).name;
    if (n === 0) { ui.toast('Kies eerst wie er meespeelt'); LG.buzz(25); openRoster('hub'); return; }
    if (n < g.min) { ui.toast('Minstens ' + g.min + ' spelers nodig voor ' + name); LG.buzz(25); return; }
    if (n > g.max) { ui.toast('Maximaal ' + g.max + ' spelers voor ' + name); LG.buzz(25); return; }
    store.touchToday();
    LG.buzz(12);
    g.open();
  };

  /* ----- roster ----- */
  function openRoster(returnId) {
    rosterReturn = returnId || 'hub';
    setEdit(false);
    renderRoster();
    ui.show('roster');
  }

  function setEdit(on) {
    editMode = on;
    const b = $('#rosterEdit');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = on ? 'Klaar' : 'Bewerk';
    $('#s-roster').classList.toggle('editing', on);
  }

  function lastLabel(ts) {
    if (!ts) return 'Nog niet gespeeld';
    const days = Math.floor((Date.now() - ts) / 86400000);
    if (days <= 0) return 'Vandaag gespeeld';
    if (days === 1) return 'Gisteren gespeeld';
    if (days < 7) return days + ' dagen geleden';
    if (days < 14) return 'Vorige week';
    if (days < 60) return Math.floor(days / 7) + ' weken geleden';
    return 'Lang geleden';
  }

  function renderPresets() {
    const box = $('#rosterPresets');
    box.textContent = '';
    store.presets().forEach((g, i) => {
      const pill = h('button', {
        type: 'button', class: 'gpill', style: '--c:' + store.neon(i + 2),
        onclick: () => {
          if (editMode) {
            ui.confirm({
              title: 'Groep verwijderen?', text: g.name + ' verdwijnt. De spelers blijven in je lijst.', yes: 'Verwijder', no: 'Annuleer',
              onYes: () => { store.deletePreset(g.id); renderRoster(); }
            });
            return;
          }
          const added = store.applyPreset(g.id);
          LG.buzz(12);
          ui.toast(added ? g.name + ' aangevinkt' : 'Iedereen van ' + g.name + ' speelt al mee');
          renderRoster();
        }
      }, h('span', { class: 'gdot' }, String(g.members.length)), g.name, editMode ? LG.icon('x') : null);
      box.appendChild(pill);
    });
    box.appendChild(h('button', { type: 'button', class: 'gpill new', onclick: openPresetForm }, LG.icon('plus'), 'Groep van selectie'));
  }

  function renderRoster() {
    const list = $('#rosterList');
    const all = store.players();
    const n = store.active().length;
    list.textContent = '';
    renderPresets();
    if (!all.length) {
      list.appendChild(h('p', { class: 'empty' }, 'Nog geen spelers. Typ hierboven een naam en tik op Erbij.'));
    }
    all.forEach((p, i) => {
      if (editMode) {
        const input = h('input', {
          type: 'text', class: 'r-name', maxlength: store.NAME_MAX, value: p.name, 'aria-label': 'Naam van ' + p.name,
          autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', enterkeyhint: 'done',
          onchange: () => {
            const res = store.rename(p.id, input.value);
            if (res.err) { ui.toast(res.err); input.value = p.name; LG.restart(row, 'shake'); }
          },
          onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } }
        });
        const del = h('button', {
          type: 'button', class: 'icon-btn mini', 'aria-label': p.name + ' verwijderen',
          onclick: () => ui.confirm({
            title: 'Speler verwijderen?', text: p.name + ' en zijn of haar punten verdwijnen.', yes: 'Verwijder', no: 'Annuleer',
            onYes: () => { store.remove(p.id); renderRoster(); }
          })
        }, LG.icon('trash'));
        const row = h('div', { class: 'prow-r glass-lite', style: '--i:' + i }, ui.avatar(p.id, p.name, 'big'), input, del);
        list.appendChild(row);
        return;
      }
      const row = h('button', {
        type: 'button', class: 'prow-r glass-lite' + (p.active ? ' on' : ''), role: 'checkbox', 'aria-checked': p.active ? 'true' : 'false', style: '--i:' + i,
        onclick: () => {
          store.setActive(p.id, !p.active);
          LG.buzz(p.active ? 6 : 10);
          renderRoster();
        }
      },
        ui.avatar(p.id, p.name, 'big'),
        h('span', { class: 'pr-text' }, h('b', {}, p.name), h('small', {}, p.active ? 'Speelt mee vandaag' : lastLabel(p.last))),
        h('span', { class: 'check', 'aria-hidden': 'true' }, LG.icon('check'))
      );
      list.appendChild(row);
    });
    $('#rosterNone').hidden = editMode || n === 0;
    $('#rosterDone').textContent = n === 0 ? 'Vink aan wie meespeelt' : 'Klaar · ' + n + (n === 1 ? ' speler' : ' spelers');
  }

  function addPlayer(e) {
    e.preventDefault();
    const input = $('#rosterInput');
    const res = store.add(input.value);
    if (res.err) { ui.toast(res.err); LG.buzz(25); LG.restart(input, 'shake'); input.focus(); return; }
    input.value = '';
    if (res.existed) ui.toast(res.player.name + ' stond al in je lijst en speelt nu mee');
    LG.buzz(12);
    renderRoster();
    input.focus();
  }

  function openPresetForm() {
    const act = store.active();
    if (act.length < 2) { ui.toast('Vink eerst minstens 2 spelers aan'); LG.buzz(25); return; }
    $('#presetNames').textContent = act.map((p) => p.name).join(', ');
    $('#presetName').value = '';
    ui.openModal('m-preset');
  }

  function savePreset(e) {
    e.preventDefault();
    const res = store.savePreset($('#presetName').value);
    if (res.err) { ui.toast(res.err); LG.buzz(25); return; }
    ui.closeModal('m-preset');
    ui.toast(res.updated ? 'Groep ' + res.preset.name + ' bijgewerkt' : 'Groep ' + res.preset.name + ' bewaard');
    LG.buzz(14);
    renderRoster();
  }

  /* ----- scoreboard ----- */
  function renderScores() {
    const list = $('#scoreList');
    list.textContent = '';
    const rows = store.players().map((p) => ({ p: p, s: store.score(p.id) })).filter((r) => r.s.pts || r.s.wins || r.p.active);
    rows.sort((a, b) => b.s.pts - a.s.pts || b.s.wins - a.s.wins || a.p.name.localeCompare(b.p.name));
    if (!rows.length) {
      list.appendChild(h('li', {}, h('p', { class: 'empty' }, 'Nog geen punten. Speel een spel!')));
      return;
    }
    rows.forEach((r, i) => {
      list.appendChild(h('li', {},
        h('div', { class: 'prow glass-lite' + (i === 0 && r.s.pts > 0 ? ' win' : ''), style: '--i:' + i },
          h('span', { class: 'n rank r' + (i < 3 ? i + 1 : 0) }, i + 1),
          ui.avatar(r.p.id, r.p.name),
          h('span', { class: 'nm' }, r.p.name),
          h('span', { class: 'out-note' }, r.s.wins + (r.s.wins === 1 ? ' winst' : ' winsten')),
          h('b', { class: 'pts' }, r.s.pts)
        )
      ));
    });
  }

  function enter() {
    const w = $('#s-welcome');
    if (w.classList.contains('leaving')) return;
    w.classList.add('leaving');
    LG.buzz(14);
    setTimeout(() => { ui.show('hub'); w.classList.remove('leaving'); }, 650);
  }

  function build() {
    ui.mount(HTML);
    $('#welcomeTap').addEventListener('click', enter);
    $('#hubTopRight').insertBefore(LG.sysBar(true), $('#hubScores'));
    $('#hubToday').addEventListener('click', () => openRoster('hub'));
    $('#hubScores').addEventListener('click', () => { renderScores(); ui.show('scores'); });
    $('#rosterBack').addEventListener('click', () => ui.show(rosterReturn, { back: true }));
    $('#rosterDone').addEventListener('click', () => {
      if (!store.active().length) { ui.toast('Vink minstens één speler aan'); LG.buzz(25); return; }
      ui.show(rosterReturn, { back: true });
    });
    $('#rosterEdit').addEventListener('click', () => { setEdit(!editMode); renderRoster(); });
    $('#rosterNone').addEventListener('click', () => { store.clearToday(); LG.buzz(10); renderRoster(); });
    $('#rosterForm').addEventListener('submit', addPlayer);
    $('#presetForm').addEventListener('submit', savePreset);
    $('#scoresReset').addEventListener('click', () => ui.confirm({
      title: 'Scores resetten?', text: 'Alle punten en winsten gaan terug naar nul.', yes: 'Reset', no: 'Annuleer',
      onYes: () => { store.resetScores(); renderScores(); ui.toast('Scorebord gereset'); }
    }));
    document.addEventListener('screenshow', (e) => {
      if (e.detail === 'hub') render();
      else if (e.detail === 'scores') renderScores();
      // Setup screens show who plays: keep their strip in sync after the roster changed.
      const m = /^(\w+)-setup$/.exec(e.detail || '');
      if (m) ui.fillStrip(m[1]);
    });
  }

  LG.hub = { build: build, render: render, openRoster: openRoster };
})();
