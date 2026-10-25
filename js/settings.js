(function () {
  'use strict';

  /* Visual customisation sheet (#m-settings): theme picker + icon pack picker. */

  const LG = window.LG;
  const h = LG.h, $ = LG.$, $$ = LG.$$, ui = LG.ui;

  const HTML = `
  <div class="modal dismissable" id="m-settings" role="dialog" aria-modal="true" aria-labelledby="setTitle" aria-hidden="true" inert>
    <div class="sheet glass set-sheet">
      <h3 id="setTitle">INSTELLINGEN</h3>
      <p class="set-sec" id="setThemeLbl">THEMA</p>
      <div class="opt-grid" id="themeGrid" role="radiogroup" aria-labelledby="setThemeLbl"></div>
      <p class="set-sec" id="setIconLbl">ICOONSTIJL</p>
      <div class="opt-grid three" id="iconGrid" role="radiogroup" aria-labelledby="setIconLbl"></div>
      <button type="button" class="btn btn-primary" data-close="m-settings">KLAAR</button>
    </div>
  </div>`;

  function option(id, label, visual, onPick) {
    const btn = h('button', {
      type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false',
      onclick: () => { onPick(id); LG.buzz(10); sync(); }
    }, visual, h('span', {}, label));
    btn.setAttribute('data-id', id);
    return btn;
  }

  function sync() {
    $$('#themeGrid .opt').forEach((b) => b.setAttribute('aria-checked', b.getAttribute('data-id') === LG.theme.get() ? 'true' : 'false'));
    $$('#iconGrid .opt').forEach((b) => b.setAttribute('aria-checked', b.getAttribute('data-id') === LG.icons.get() ? 'true' : 'false'));
  }

  function open() {
    sync();
    ui.openModal('m-settings');
  }

  function build() {
    ui.mount(HTML);
    const themes = $('#themeGrid');
    LG.theme.list.forEach((t) => {
      themes.appendChild(option(t.id, t.label, h('span', { class: 'opt-sw ' + t.swatch, 'aria-hidden': 'true' }), LG.theme.set));
    });
    const packs = $('#iconGrid');
    LG.icons.list.forEach((p) => {
      packs.appendChild(option(p.id, p.label,
        h('span', { class: 'opt-ic pk-' + p.id, 'aria-hidden': 'true' }, LG.renderGameIcon('undercover', p.id)),
        LG.icons.set));
    });
    sync();
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (t && t.closest && t.closest('[data-open-settings]')) open();
    });
  }

  LG.settings = { build: build, open: open };
})();