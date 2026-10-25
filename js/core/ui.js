(function () {
  'use strict';

  const LG = window.LG;
  const $ = LG.$, $$ = LG.$$, h = LG.h;
  let current = null;
  let toastTimer = null;
  let confirmHandler = null;

  /* ----- screens ----- */
  // Screens (<section class="screen">) go into #app, everything else (modals) into <body>.
  function mount(html) {
    const tpl = document.createElement('template');
    tpl.innerHTML = html.trim();
    Array.prototype.slice.call(tpl.content.children).forEach((el) => {
      (el.classList.contains('screen') ? $('#app') : document.body).appendChild(el);
    });
  }

  function show(id) {
    const target = $('#s-' + id);
    if (!target) { console.warn('Onbekend scherm:', id); return; }
    $$('.screen').forEach((sc) => {
      const on = sc === target;
      sc.classList.toggle('active', on);
      if (on) sc.removeAttribute('aria-hidden'); else sc.setAttribute('aria-hidden', 'true');
    });
    current = id;
    document.dispatchEvent(new CustomEvent('screenshow', { detail: id }));
    LG.later(() => {
      if (current !== id) return;
      const b = $('[data-autofocus]', target);
      if (b && !b.disabled) b.focus({ preventScroll: true });
    }, 450);
  }

  /* ----- modals ----- */
  function openModal(id) {
    const m = $('#' + id);
    if (!m) return;
    m.removeAttribute('inert');
    m.setAttribute('aria-hidden', 'false');
    m.classList.add('open');
    LG.later(() => {
      if (!m.classList.contains('open')) return;
      const t = m.querySelector('input, .view:not([hidden]) button, .sheet > button');
      if (t) t.focus({ preventScroll: true });
    }, 80);
  }

  function closeModal(id) {
    const m = $('#' + id);
    if (!m || !m.classList.contains('open')) return;
    if (m.contains(document.activeElement)) document.activeElement.blur();
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
    m.setAttribute('inert', '');
    m.dispatchEvent(new CustomEvent('modalclose'));
  }

  function closeAll() {
    $$('.modal.open').forEach((m) => closeModal(m.id));
  }

  /* ----- toast / confirm ----- */
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }

  function confirm(o) {
    $('#confirmTitle').textContent = o.title || 'STOPPEN?';
    const t = $('#confirmText');
    t.textContent = o.text || '';
    t.hidden = !o.text;
    $('#confirmYes').textContent = o.yes || 'STOP SPEL';
    $('#confirmNo').textContent = o.no || 'DOORGAAN';
    confirmHandler = o.onYes || null;
    openModal('m-confirm');
  }

  /* ----- confetti ----- */
  function confetti(colors) {
    const cols = colors || ['#8b5cf6', '#22d3ee', '#ec4899', '#6366f1', '#f4f5ff', '#5eead4'];
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 120 + Math.random() * 220;
      const el = h('i', {
        class: 'confetti', 'aria-hidden': 'true',
        style: '--dx:' + Math.round(Math.cos(angle) * dist) + 'px;--dy:' + Math.round(Math.sin(angle) * dist + 80) +
          'px;--rot:' + Math.round(Math.random() * 720 - 360) + 'deg;--c:' + cols[i % cols.length]
      });
      document.body.appendChild(el);
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2000);
    }
  }

  /* ----- reusable building blocks ----- */
  function avatar(id, name, cls) {
    return h('span', { class: 'pav ' + (cls || ''), style: '--pc:' + LG.store.color(id), 'aria-hidden': 'true' }, LG.initial(name));
  }

  // Button with the active roster; tapping it opens the roster and returns to `returnId` afterwards.
  function strip(returnId) {
    const players = LG.store.active();
    const kids = players.slice(0, 7).map((p) => avatar(p.id, p.name));
    if (players.length > 7) kids.push(h('span', { class: 'pav more' }, '+' + (players.length - 7)));
    return h('button', {
      type: 'button', class: 'strip glass-lite', 'aria-label': 'Spelers aanpassen',
      onclick: () => LG.hub.openRoster(returnId)
    },
      h('span', { class: 'avatars' }, kids),
      h('span', { class: 'strip-n' }, players.length + ' SPELERS'),
      LG.icon('users')
    );
  }

  function fillStrip(p) {
    const box = $('#' + p + '-strip');
    if (!box) return;
    box.textContent = '';
    box.appendChild(strip(p + '-setup'));
  }

  // Standard setup screen shell used by every game.
  function setupHtml(p, title, body, startLabel) {
    return `
    <section class="screen" id="s-${p}-setup" aria-label="Instellingen ${title}">
      <div class="wrap">
        <header class="top">
          <button type="button" class="icon-btn glass" data-home aria-label="Terug naar hub"><svg class="ic"><use href="#i-home"/></svg></button>
          <h2 class="title">${title}</h2>
          <span class="chip glass-lite" id="${p}-chip" aria-live="polite"></span>
        </header>
        <div class="scroll" id="${p}-body">
          <div id="${p}-strip"></div>
          ${body}
        </div>
      </div>
      <div class="dock"><div class="dock-in">
        <button type="button" class="btn btn-primary btn-block" id="${p}-start" data-autofocus><svg class="ic" aria-hidden="true"><use href="#i-play"/></svg>${startLabel || 'START SPEL'}</button>
      </div></div>
    </section>`;
  }

  // Stepper row. def: { label, icon, rgb, minus, plus, value(), check(dir)->errorString|'', apply(dir), onChange() }
  function stepper(def) {
    const press = (dir) => {
      const err = def.check(dir);
      if (err) { toast(err); LG.buzz(25); LG.restart(row, 'shake'); return; }
      def.apply(dir);
      LG.buzz(8);
      refresh();
      if (def.onChange) def.onChange();
    };
    const minus = h('button', { type: 'button', class: 'step', 'aria-label': def.minus || 'Minder', onclick: () => press(-1) }, LG.icon('minus'));
    const plus = h('button', { type: 'button', class: 'step', 'aria-label': def.plus || 'Meer', onclick: () => press(1) }, LG.icon('plus'));
    const val = h('span', { class: 'val', 'aria-live': 'polite' }, '');
    const row = h('div', { class: 'row glass', style: '--rgb:' + (def.rgb || '167,139,250') },
      h('span', { class: 'row-ic', 'aria-hidden': 'true' }, LG.icon(def.icon || 'users')),
      h('span', { class: 'row-label' }, def.label),
      h('div', { class: 'ctrl' }, minus, val, plus)
    );
    function refresh() {
      const v = String(def.value());
      if (val.textContent !== v) { val.textContent = v; LG.restart(val, 'bump'); }
      minus.setAttribute('aria-disabled', def.check(-1) ? 'true' : 'false');
      plus.setAttribute('aria-disabled', def.check(1) ? 'true' : 'false');
    }
    refresh();
    return { el: row, refresh: refresh };
  }

  // Simple bounded number stepper bound to obj[key] (persisted through LG.store.save()).
  function numStepper(o) {
    return stepper({
      label: o.label, icon: o.icon, rgb: o.rgb, minus: o.minus, plus: o.plus,
      value: () => o.obj[o.key],
      check: (dir) => {
        const next = o.obj[o.key] + dir * (o.step || 1);
        if (next > o.max) return 'Maximaal ' + o.max;
        if (next < o.min) return 'Minimaal ' + o.min;
        return '';
      },
      apply: (dir) => { o.obj[o.key] += dir * (o.step || 1); LG.store.save(); },
      onChange: o.onChange
    });
  }

  // Toggle row: def { label, icon, rgb, get(), set(bool) }
  function switchRow(def) {
    const sw = h('button', {
      type: 'button', class: 'switch', role: 'switch', 'aria-label': def.label, 'aria-pressed': def.get() ? 'true' : 'false',
      onclick: () => {
        def.set(!def.get());
        sw.setAttribute('aria-pressed', def.get() ? 'true' : 'false');
        LG.buzz(8);
      }
    });
    const row = h('div', { class: 'row glass', style: '--rgb:' + (def.rgb || '94,234,212') },
      h('span', { class: 'row-ic', 'aria-hidden': 'true' }, LG.icon(def.icon || 'eye')),
      h('span', { class: 'row-label' }, def.label),
      sw
    );
    return { el: row };
  }

  function init() {
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t || !t.closest) return;
      const c = t.closest('[data-close]');
      if (c) { closeModal(c.getAttribute('data-close')); return; }
      const g = t.closest('[data-go]');
      if (g) { show(g.getAttribute('data-go')); return; }
      if (t.closest('[data-home]')) { LG.home(); return; }
      if (t.classList.contains('modal') && t.classList.contains('dismissable')) closeModal(t.id);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const open = $$('.modal.open.dismissable');
      if (open.length) closeModal(open[open.length - 1].id);
    });

    $('#confirmYes').addEventListener('click', () => {
      const fn = confirmHandler;
      confirmHandler = null;
      closeModal('m-confirm');
      if (fn) fn();
    });
    $('#m-confirm').addEventListener('modalclose', () => { confirmHandler = null; });
  }

  LG.ui = {
    init: init, mount: mount, show: show, current: () => current,
    openModal: openModal, closeModal: closeModal, closeAll: closeAll,
    toast: toast, confirm: confirm, confetti: confetti,
    avatar: avatar, strip: strip, fillStrip: fillStrip, setupHtml: setupHtml,
    stepper: stepper, numStepper: numStepper, switchRow: switchRow
  };
})();