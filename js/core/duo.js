(function () {
  'use strict';

  /* Duo-kiezer: kiest twee verschillende spelers uit de actieve groep voor 1-tegen-1 spellen.
     LG.duo.create([labelA, labelB]) -> { el, render(), pair() } */
  const LG = window.LG;
  const h = LG.h, ui = LG.ui, store = LG.store;

  LG.duo = {
    create(labels) {
      let a = 0;
      let b = 1;
      const box = h('div', { class: 'stack duo' });
      const roster = () => store.active();

      function normalise() {
        const n = roster().length;
        if (n < 2) return;
        a = ((a % n) + n) % n;
        b = ((b % n) + n) % n;
        if (a === b) b = (b + 1) % n;
      }

      function cycle(which, dir) {
        const n = roster().length;
        if (n < 2) return;
        if (n === 2) {
          const t = a; a = b; b = t;
        } else {
          let v = which === 0 ? a : b;
          const other = which === 0 ? b : a;
          do { v = (v + dir + n) % n; } while (v === other);
          if (which === 0) a = v; else b = v;
        }
        render();
        LG.buzz(8);
      }

      function render() {
        normalise();
        const players = roster();
        box.textContent = '';
        if (players.length < 2) {
          box.appendChild(h('p', { class: 'empty' }, 'Voeg minstens twee spelers toe.'));
          return;
        }
        [a, b].forEach((idx, which) => {
          const p = players[idx];
          box.appendChild(h('div', { class: 'duo-row glass', style: '--i:' + which },
            ui.avatar(p.id, p.name),
            h('span', { class: 'duo-text' }, h('small', {}, labels[which]), h('b', {}, p.name)),
            h('div', { class: 'duo-ctl' },
              h('button', { type: 'button', class: 'step', 'aria-label': labels[which] + ': vorige speler', onclick: () => cycle(which, -1) }, LG.icon('back')),
              h('button', { type: 'button', class: 'step', 'aria-label': labels[which] + ': volgende speler', onclick: () => cycle(which, 1) }, LG.icon('arrow'))
            )
          ));
        });
      }

      function pair() {
        normalise();
        const players = roster();
        return players.length < 2 ? null : [players[a], players[b]];
      }

      return { el: box, render: render, pair: pair };
    }
  };
})();