(function () {
  'use strict';

  const LG = window.LG;
  const h = LG.h, $ = LG.$, store = LG.store, ui = LG.ui;
  let rosterReturn = 'hub';

  const HTML = `
  <section class="screen active" id="s-hub" aria-label="Spelkeuze">
    <div class="wrap">
      <header class="top">
        <div class="logo">
          <span class="logo-ic glass" aria-hidden="true"><svg class="ic"><use href="#i-mask"/></svg></span>
          <h1 class="brand">LaFête</h1>
        </div>
        <button type="button" class="icon-btn glass" id="hubScores" aria-label="Scorebord"><svg class="ic"><use href="#i-trophy"/></svg></button>
      </header>
      <div class="scroll hub-scroll">
        <div class="hub-tools">
          <button type="button" class="group-chip glass" id="hubGroups" data-open-groups aria-label="Groep kiezen"><svg class="ic" aria-hidden="true"><use href="#i-users"/></svg><span class="gchip-name">Groep Kiezen</span></button>
          <button type="button" class="dock-btn glass" id="hubSettings" data-open-settings aria-label="Instellingen openen"><svg class="ic" aria-hidden="true"><use href="#i-settings"/></svg></button>
        </div>
        <button type="button" class="roster-card glass" id="hubRoster" aria-label="Spelers beheren">
          <span class="row-ic" style="--rgb:34,211,238" aria-hidden="true"><svg class="ic"><use href="#i-users"/></svg></span>
          <span class="rc-text"><b>SPELERS</b><small id="hubRosterSub"></small></span>
          <span class="avatars" id="hubAvatars"></span>
          <svg class="ic" aria-hidden="true"><use href="#i-arrow"/></svg>
        </button>
        <p class="sec">KIES EEN SPEL</p>
        <div class="game-list" id="gameList"></div>
      </div>
    </div>
  </section>

  <section class="screen" id="s-roster" aria-label="Spelers">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" id="rosterBack" aria-label="Terug"><svg class="ic"><use href="#i-back"/></svg></button>
        <h2 class="title">SPELERS</h2>
        <span class="chip glass-lite" id="rosterCount"></span>
      </header>
      <div class="scroll roster-scroll" id="rosterList"></div>
      <form class="roster-add" id="rosterForm" autocomplete="off" novalidate>
        <label class="sr-only" for="rosterInput">Nieuwe naam</label>
        <input class="input" id="rosterInput" type="text" maxlength="14" placeholder="Nieuwe naam…" enterkeyhint="done" autocapitalize="words" spellcheck="false">
        <button type="submit" class="btn btn-primary"><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>ERBIJ</button>
      </form>
    </div>
  </section>

  <section class="screen" id="s-scores" aria-label="Scorebord">
    <div class="wrap">
      <header class="top">
        <button type="button" class="icon-btn glass" data-go="hub" aria-label="Terug"><svg class="ic"><use href="#i-back"/></svg></button>
        <h2 class="title">SCOREBORD</h2>
        <span class="chip glass-lite">ALLE SPELLEN</span>
      </header>
      <ol class="plist" id="scoreList"></ol>
      <div class="actions">
        <button type="button" class="btn btn-danger" id="scoresReset"><svg class="ic" aria-hidden="true"><use href="#i-trash"/></svg>RESET</button>
      </div>
    </div>
  </section>`;

  /* ----- hub ----- */
  // Game badge in the currently selected icon pack; LG.icons.refresh() re-renders it via data-game-icon.
  function gameOrb(g) {
    const orb = h('span', { class: 'gc-orb', 'aria-hidden': 'true' }, LG.renderGameIcon(g.id, LG.icons.get()));
    orb.setAttribute('data-game-icon', g.id);
    return orb;
  }

  function render() {
    const act = store.active(), all = store.players();
    $('#hubRosterSub').textContent = all.length
      ? act.length + ' ACTIEF · ' + all.length + ' IN LIJST'
      : 'TIK OM SPELERS TOE TE VOEGEN';
    const av = $('#hubAvatars');
    av.textContent = '';
    act.slice(0, 5).forEach((p) => av.appendChild(ui.avatar(p.id, p.name)));
    if (act.length > 5) av.appendChild(h('span', { class: 'pav more' }, '+' + (act.length - 5)));

    const list = $('#gameList');
    // De kaarten maar één keer opbouwen: opnieuw aanmaken herstart de rise-animatie en laat
    // Safari de backdrop-blur van elke tegel opnieuw initialiseren (zichtbare glitch).
    if (list.children.length === LG.games.length) {
      Array.prototype.forEach.call(list.children, (el, i) => {
        const g = LG.games[i];
        el.setAttribute('aria-disabled', act.length >= g.min && act.length <= g.max ? 'false' : 'true');
      });
      return;
    }
    list.textContent = '';
    LG.games.forEach((g, i) => {
      const ok = act.length >= g.min && act.length <= g.max;
      list.appendChild(h('button', {
        type: 'button', class: 'game-card glass', 'aria-disabled': ok ? 'false' : 'true',
        style: '--rgb:' + g.rgb + ';--i:' + i,
        'aria-label': g.title + ', ' + g.tag,
        onclick: () => LG.openGame(g.id)
      },
        gameOrb(g),
        h('span', { class: 'gc-body' },
          h('b', { class: 'gc-title' }, g.title),
          h('small', { class: 'gc-tag' }, g.tag),
          h('span', { class: 'gc-meta' }, g.min + '–' + g.max + ' SPELERS')
        ),
        LG.icon('arrow')
      ));
    });
  }

  LG.openGame = function (id) {
    const g = LG.games.filter((x) => x.id === id)[0];
    if (!g) return;
    const n = store.active().length;
    if (n === 0) { ui.toast('Voeg eerst spelers toe'); openRoster('hub'); return; }
    if (n < g.min) { ui.toast('Minstens ' + g.min + ' spelers nodig voor ' + g.title); LG.buzz(25); return; }
    if (n > g.max) { ui.toast('Maximaal ' + g.max + ' spelers voor ' + g.title); LG.buzz(25); return; }
    g.open();
  };

  /* ----- roster ----- */
  function openRoster(returnId) {
    rosterReturn = returnId || 'hub';
    renderRoster();
    ui.show('roster');
  }

  function renderRoster() {
    const list = $('#rosterList');
    const ps = store.players();
    list.textContent = '';
    $('#rosterCount').textContent = store.active().length + ' / ' + ps.length;
    if (!ps.length) {
      list.appendChild(h('p', { class: 'empty' }, 'Nog geen spelers. Voeg hieronder je vrienden toe.'));
      return;
    }
    ps.forEach((p, i) => {
      const input = h('input', {
        type: 'text', class: 'r-name', maxlength: store.NAME_MAX, value: p.name, 'aria-label': 'Naam van speler ' + (i + 1),
        autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', enterkeyhint: 'done',
        onchange: () => {
          const res = store.rename(p.id, input.value);
          if (res.err) { ui.toast(res.err); input.value = p.name; LG.restart(input.parentNode, 'shake'); } else { p.name = res.player.name; input.value = p.name; }
        },
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); input.blur(); } }
      });
      const sw = h('button', {
        type: 'button', class: 'switch', role: 'switch', 'aria-label': p.name + ' doet mee', 'aria-pressed': p.active ? 'true' : 'false',
        onclick: () => { store.setActive(p.id, !p.active); LG.buzz(8); renderRoster(); }
      });
      const del = h('button', {
        type: 'button', class: 'icon-btn mini', 'aria-label': p.name + ' verwijderen',
        onclick: () => ui.confirm({
          title: 'VERWIJDEREN?', text: p.name, yes: 'VERWIJDER', no: 'ANNULEER',
          onYes: () => { store.remove(p.id); renderRoster(); }
        })
      }, LG.icon('trash'));
      list.appendChild(h('div', { class: 'roster-row glass-lite' + (p.active ? '' : ' off'), style: '--i:' + i },
        ui.avatar(p.id, p.name, 'big'), input, sw, del));
    });
  }

  function addPlayer(e) {
    e.preventDefault();
    const input = $('#rosterInput');
    const res = store.add(input.value);
    if (res.err) {
      ui.toast(res.err);
      LG.buzz(25);
      LG.restart(input, 'shake');
      input.focus();
      return;
    }
    input.value = '';
    renderRoster();
    LG.buzz(10);
    const list = $('#rosterList');
    list.scrollTop = list.scrollHeight;
    input.focus();
  }

  /* ----- scoreboard ----- */
  function renderScores() {
    const list = $('#scoreList');
    list.textContent = '';
    const rows = store.players().map((p) => ({ p: p, s: store.score(p.id) }));
    rows.sort((a, b) => b.s.pts - a.s.pts || b.s.wins - a.s.wins || a.p.name.localeCompare(b.p.name));
    if (!rows.length) {
      list.appendChild(h('li', {}, h('p', { class: 'empty' }, 'Nog geen spelers.')));
      return;
    }
    rows.forEach((r, i) => {
      list.appendChild(h('li', {},
        h('div', { class: 'prow glass-lite' + (i === 0 && r.s.pts > 0 ? ' win' : ''), style: '--i:' + i },
          h('span', { class: 'n rank r' + (i < 3 ? i + 1 : 0) }, i + 1),
          ui.avatar(r.p.id, r.p.name),
          h('span', { class: 'nm' }, r.p.name),
          h('span', { class: 'out-note' }, r.s.wins + (r.s.wins === 1 ? ' WINST' : ' WINSTEN')),
          h('b', { class: 'pts' }, r.s.pts),
          i === 0 && r.s.pts > 0 ? LG.icon('crown') : null
        )
      ));
    });
  }

  function build() {
    ui.mount(HTML);
    // Header: audio + privacy-shield toggles next to the scoreboard button.
    const scoresBtn = $('#hubScores');
    const topRight = h('div', { class: 'top-right' }, LG.sysBar(false));
    scoresBtn.parentNode.insertBefore(topRight, scoresBtn);
    topRight.appendChild(scoresBtn);
    $('#hubRoster').addEventListener('click', () => openRoster('hub'));
    $('#hubScores').addEventListener('click', () => { renderScores(); ui.show('scores'); });
    $('#rosterBack').addEventListener('click', () => ui.show(rosterReturn));
    $('#rosterForm').addEventListener('submit', addPlayer);
    $('#scoresReset').addEventListener('click', () => ui.confirm({
      title: 'RESET SCORES?', text: 'Alle punten en winsten gaan terug naar nul.', yes: 'RESET', no: 'ANNULEER',
      onYes: () => { store.resetScores(); renderScores(); ui.toast('Scorebord gereset'); }
    }));
    document.addEventListener('screenshow', (e) => {
      if (e.detail === 'hub') render();
      else if (e.detail === 'scores') renderScores();
    });
  }

  LG.hub = { build: build, render: render, openRoster: openRoster };
})();