(function () {
  'use strict';

  /* Group profiles drawer (#m-groups): create / switch / rename / hall of fame / reset word memory.
     Games never talk to this file; the store routes roster, scores and used-prompt memory to the active group. */

  const LG = window.LG;
  const h = LG.h, $ = LG.$, $$ = LG.$$, ui = LG.ui, store = LG.store;
  let formMode = 'create';
  let formId = null;

  const HTML = `
  <div class="modal dismissable" id="m-groups" role="dialog" aria-modal="true" aria-labelledby="grpTitle" aria-hidden="true" inert>
    <div class="sheet glass grp-sheet">
      <h3 id="grpTitle">GROEPEN</h3>

      <div class="view" id="grpListView">
        <div class="grp-list" id="grpList"></div>
        <p class="grp-note">Een nieuwe groep onthoudt de spelers die nu actief zijn en alle vragen die jullie al gehad hebben.</p>
        <button type="button" class="btn btn-sm" id="grpGuest" aria-pressed="false">SPEEL ZONDER GROEP (GAST)</button>
        <button type="button" class="btn btn-primary" id="grpNew"><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>NIEUWE GROEP</button>
        <button type="button" class="btn btn-sm" data-close="m-groups">SLUITEN</button>
      </div>

      <form class="view" id="grpForm" autocomplete="off" novalidate hidden>
        <p class="set-sec" id="grpFormTitle">NIEUWE GROEP</p>
        <label class="sr-only" for="grpName">Groepsnaam</label>
        <input class="input" id="grpName" type="text" maxlength="22" placeholder="Bijv. De Vrijdag-Crew" enterkeyhint="done" autocapitalize="words" spellcheck="false">
        <button type="submit" class="btn btn-primary">OPSLAAN</button>
        <button type="button" class="btn btn-sm" id="grpFormBack">ANNULEER</button>
      </form>

      <div class="view" id="grpHofView" hidden>
        <div class="hof" id="grpHof"></div>
        <button type="button" class="btn btn-sm" id="grpHofBack">TERUG</button>
      </div>
    </div>
  </div>`;

  const VIEWS = { list: 'grpListView', form: 'grpForm', hof: 'grpHofView' };

  function showView(name) {
    Object.keys(VIEWS).forEach((k) => { $('#' + VIEWS[k]).hidden = k !== name; });
  }

  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  // Every group chip in the app (welcome dock + hub) shows the active group name.
  function refreshChips() {
    const g = store.activeGroup();
    $$('.gchip-name').forEach((el) => { el.textContent = g ? g.name : 'Groep Kiezen'; });
    $$('[data-open-groups]').forEach((el) => {
      el.setAttribute('aria-label', g ? 'Groep ' + g.name + ', groepen beheren' : 'Groep kiezen');
    });
  }

  function iconBtn(icon, label, onClick) {
    return h('button', { type: 'button', class: 'icon-btn mini', 'aria-label': label, onclick: onClick }, LG.icon(icon));
  }

  function renderList() {
    const list = $('#grpList');
    const groups = store.groups();
    const guest = $('#grpGuest');
    list.textContent = '';
    guest.classList.toggle('is-active', !store.activeGroup());
    guest.setAttribute('aria-pressed', store.activeGroup() ? 'false' : 'true');
    if (!groups.length) {
      list.appendChild(h('p', { class: 'grp-empty' }, 'Nog geen groepen. Maak er een om namen, scores en gebruikte vragen te onthouden.'));
      return;
    }
    groups.forEach((g) => {
      const main = h('button', {
        type: 'button', class: 'grp-main', 'aria-pressed': g.active ? 'true' : 'false', 'aria-label': 'Kies groep ' + g.name,
        onclick: () => choose(g)
      },
        h('span', { class: 'grp-check', 'aria-hidden': 'true' }, LG.icon('check')),
        h('span', { class: 'grp-txt' },
          h('b', {}, g.name),
          h('small', {}, plural(g.players, 'speler', 'spelers') + ' · ' + g.used + ' onthouden')
        )
      );
      const acts = h('div', { class: 'grp-acts' },
        iconBtn('pen', 'Hernoem ' + g.name, () => openForm('rename', g)),
        iconBtn('trophy', 'Hall of fame van ' + g.name, () => openHof(g.id)),
        iconBtn('refresh', 'Wis woordgeheugen van ' + g.name, () => confirmReset(g)),
        iconBtn('trash', 'Verwijder ' + g.name, () => confirmDelete(g))
      );
      list.appendChild(h('div', { class: 'grp-row glass-lite' + (g.active ? ' active' : '') }, main, acts));
    });
  }

  function choose(g) {
    if (store.switchGroup(g.id)) {
      LG.buzz(10);
      ui.toast('Groep: ' + g.name);
      renderList();
    }
  }

  function openForm(mode, g) {
    formMode = mode;
    formId = g ? g.id : null;
    $('#grpFormTitle').textContent = mode === 'rename' ? 'GROEP HERNOEMEN' : 'NIEUWE GROEP';
    const input = $('#grpName');
    input.value = g ? g.name : '';
    showView('form');
    LG.later(() => input.focus(), 60);
  }

  function submitForm(e) {
    e.preventDefault();
    const input = $('#grpName');
    const res = formMode === 'rename' ? store.renameGroup(formId, input.value) : store.createGroup(input.value);
    if (res.err) {
      ui.toast(res.err);
      LG.buzz(25);
      LG.restart(input, 'shake');
      input.focus();
      return;
    }
    ui.toast(formMode === 'rename' ? 'Groep hernoemd' : 'Groep aangemaakt: ' + res.group.name);
    LG.buzz(10);
    renderList();
    showView('list');
  }

  function openHof(id) {
    const s = store.stats(id);
    if (!s) return;
    const box = $('#grpHof');
    box.textContent = '';
    const rec = (label, value) => h('div', { class: 'hof-row' }, h('b', {}, label), h('span', {}, value));
    box.appendChild(h('p', { class: 'hof-h' }, 'RANGLIJST · ' + s.name.toUpperCase()));
    if (!s.rows.length) box.appendChild(h('p', { class: 'grp-empty' }, 'Nog geen spelers in deze groep.'));
    s.rows.forEach((r, i) => {
      box.appendChild(rec((i + 1) + '. ' + r.name, r.wins + ' W · ' + r.pts + ' PT'));
    });
    box.appendChild(h('p', { class: 'hof-h' }, 'RECORDS'));
    box.appendChild(rec('Hoogste score', s.high ? s.high.n + ' · ' + s.high.pts : '—'));
    box.appendChild(rec('Snelste', s.fast ? s.fast.n + ' · ' + (s.fast.ms / 1000).toFixed(1) + ' s' : '—'));
    box.appendChild(rec('Winsten totaal', String(s.totalWins)));
    box.appendChild(rec('Onthouden', String(s.used)));
    showView('hof');
  }

  function confirmReset(g) {
    ui.confirm({
      title: 'GEHEUGEN WISSEN?', text: 'Alle onthouden vragen en woorden van ' + g.name + ' komen weer in omloop.',
      yes: 'WISSEN', no: 'ANNULEER',
      onYes: () => { store.resetUsed(g.id); renderList(); ui.toast('Geheugen gewist'); }
    });
  }

  function confirmDelete(g) {
    ui.confirm({
      title: 'GROEP VERWIJDEREN?', text: g.name + ' met alle spelers, scores en geheugen wordt verwijderd.',
      yes: 'VERWIJDER', no: 'ANNULEER',
      onYes: () => { store.deleteGroup(g.id); renderList(); ui.toast('Groep verwijderd'); }
    });
  }

  function open() {
    showView('list');
    renderList();
    ui.openModal('m-groups');
  }

  function build() {
    ui.mount(HTML);
    $('#grpNew').addEventListener('click', () => openForm('create', null));
    $('#grpGuest').addEventListener('click', () => {
      store.switchGroup(null);
      LG.buzz(10);
      ui.toast('Je speelt zonder groep');
      renderList();
    });
    $('#grpForm').addEventListener('submit', submitForm);
    $('#grpFormBack').addEventListener('click', () => showView('list'));
    $('#grpHofBack').addEventListener('click', () => showView('list'));
    $('#m-groups').addEventListener('modalclose', () => showView('list'));
    document.addEventListener('groupchange', () => {
      refreshChips();
      if (LG.hub) LG.hub.render();
    });
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('[data-open-groups]')) open();
    });
    refreshChips();
  }

  LG.groups = { build: build, open: open };
})();