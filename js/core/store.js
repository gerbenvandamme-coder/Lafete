(function () {
  'use strict';

  const LG = window.LG;
  const KEY = 'party-hub-liquid-glass:v2';
  const OLD_KEY = 'undercover-liquid-glass:v1';
  const NAME_MAX = 14;
  const GROUP_NAME_MAX = 22;
  const MAX_GROUPS = 12;
  const MAX_PLAYERS = 20;
  const HISTORY_MAX = 200;
  const NEON = [
    '#22d3ee', '#ff4fd8', '#a3e635', '#fb923c', '#a78bfa', '#fde047',
    '#34d399', '#f87171', '#60a5fa', '#f472b6', '#2dd4bf', '#e879f9'
  ];

  /* A "bucket" holds everything that belongs to one circle of players: roster, scores and the
     no-repeat memory. The guest session is the root object itself; every group is its own bucket. */
  const bucketBlank = () => ({ nextId: 1, players: [], scores: {}, used: {} });
  const blank = () => Object.assign(bucketBlank(), { cfg: {}, groups: [], activeGroup: null, nextGroupId: 1 });
  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  const cleanName = (n) => String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);
  const cleanGroupName = (n) => String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, GROUP_NAME_MAX);
  let d = blank();

  const group = () => d.groups.filter((g) => g.id === d.activeGroup)[0] || null;
  const B = () => group() || d;
  const usedCount = (u) => Object.keys(u).reduce((n, k) => n + (Array.isArray(u[k]) ? u[k].length : 0), 0);

  function announce() {
    document.dispatchEvent(new CustomEvent('groupchange'));
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* privé modus of vol: negeren */ }
  }

  // One-time import of the roster + Undercover settings of the old single-game app.
  function migrateOld(next) {
    let old = null;
    try { old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); } catch (e) { old = null; }
    if (!isObj(old)) return;
    const lim = isObj(old.setup) && typeof old.setup.total === 'number' ? old.setup.total : MAX_PLAYERS;
    if (Array.isArray(old.names)) {
      old.names.slice(0, lim).forEach((n) => {
        const name = cleanName(n);
        if (!name || next.players.length >= MAX_PLAYERS) return;
        if (next.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
        next.players.push({ id: next.nextId++, name: name, active: true });
      });
    }
    if (isObj(old.setup)) {
      next.cfg.undercover = { und: old.setup.und, white: old.setup.white, cats: isObj(old.setup.cats) ? old.setup.cats : {} };
    }
    if (Array.isArray(old.used)) next.used.undercover = old.used.slice(0, 500);
  }

  // Reads roster, scores and used-memory from a saved object into a bucket.
  function readBucket(raw, out) {
    if (Array.isArray(raw.players)) {
      raw.players.forEach((p) => {
        if (!isObj(p) || typeof p.id !== 'number' || out.players.length >= MAX_PLAYERS) return;
        const name = cleanName(p.name);
        if (!name) return;
        out.players.push({ id: p.id, name: name, active: p.active !== false });
        out.nextId = Math.max(out.nextId, p.id + 1);
      });
    }
    if (typeof raw.nextId === 'number') out.nextId = Math.max(out.nextId, raw.nextId);
    if (isObj(raw.scores)) {
      Object.keys(raw.scores).forEach((k) => {
        const s = raw.scores[k];
        if (isObj(s) && out.players.some((p) => String(p.id) === k)) {
          out.scores[k] = { pts: Math.max(0, Math.round(+s.pts || 0)), wins: Math.max(0, Math.round(+s.wins || 0)) };
        }
      });
    }
    if (isObj(raw.used)) {
      Object.keys(raw.used).forEach((k) => { if (Array.isArray(raw.used[k])) out.used[k] = raw.used[k].slice(-1000); });
    }
    return out;
  }

  function readGroup(raw) {
    if (!isObj(raw) || typeof raw.id !== 'number') return null;
    const name = cleanGroupName(raw.name);
    if (!name) return null;
    const g = readBucket(raw, bucketBlank());
    g.id = raw.id;
    g.name = name;
    g.totalWins = Math.max(0, Math.round(+raw.totalWins || 0));
    g.history = Array.isArray(raw.history)
      ? raw.history
        .filter((x) => isObj(x) && typeof x.n === 'string' && isFinite(x.t))
        .slice(-HISTORY_MAX)
        .map((x) => ({ t: +x.t, n: cleanName(x.n) }))
      : [];
    const best = isObj(raw.best) ? raw.best : {};
    const hi = isObj(best.high) && isFinite(best.high.pts) ? best.high : null;
    const fa = isObj(best.fast) && isFinite(best.fast.ms) ? best.fast : null;
    g.best = {
      high: hi ? { n: cleanName(hi.n), pts: Math.max(0, Math.round(hi.pts)) } : null,
      fast: fa ? { n: cleanName(fa.n), ms: Math.max(1, Math.round(fa.ms)), game: String(fa.game || '').slice(0, 24) } : null
    };
    return g;
  }

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    const next = blank();
    if (isObj(raw)) {
      readBucket(raw, next);
      if (isObj(raw.cfg)) next.cfg = raw.cfg;
      if (Array.isArray(raw.groups)) {
        raw.groups.slice(0, MAX_GROUPS).forEach((rg) => {
          const g = readGroup(rg);
          if (g && !next.groups.some((x) => x.id === g.id)) next.groups.push(g);
        });
      }
      next.nextGroupId = next.groups.reduce((m, g) => Math.max(m, g.id + 1), 1);
      if (typeof raw.nextGroupId === 'number') next.nextGroupId = Math.max(next.nextGroupId, raw.nextGroupId);
      if (typeof raw.activeGroup === 'number' && next.groups.some((g) => g.id === raw.activeGroup)) {
        next.activeGroup = raw.activeGroup;
      }
    } else {
      migrateOld(next);
    }
    d = next;
  }

  function nameTaken(name, exceptId) {
    const low = name.toLowerCase();
    return B().players.some((p) => p.id !== exceptId && p.name.toLowerCase() === low);
  }

  function groupNameTaken(name, exceptId) {
    const low = name.toLowerCase();
    return d.groups.some((g) => g.id !== exceptId && g.name.toLowerCase() === low);
  }

  function groupById(id) {
    return d.groups.filter((g) => g.id === id)[0] || null;
  }

  function summary(g) {
    return { id: g.id, name: g.name, players: g.players.length, used: usedCount(g.used), active: g.id === d.activeGroup };
  }

  const store = {
    NAME_MAX: NAME_MAX,
    GROUP_NAME_MAX: GROUP_NAME_MAX,
    MAX_PLAYERS: MAX_PLAYERS,
    load: load,
    save: save,

    /* ----- roster (of the active group, or the guest roster) ----- */
    players: () => B().players.slice(),
    active: () => B().players.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name })),
    find: (id) => B().players.filter((p) => p.id === id)[0] || null,
    color(id) {
      const i = B().players.findIndex((p) => p.id === id);
      return NEON[(i < 0 ? 0 : i) % NEON.length];
    },
    neon: (i) => NEON[i % NEON.length],

    add(name) {
      const n = cleanName(name);
      const b = B();
      if (!n) return { err: 'Vul een naam in' };
      if (b.players.length >= MAX_PLAYERS) return { err: 'Maximaal ' + MAX_PLAYERS + ' spelers' };
      if (nameTaken(n, -1)) return { err: 'Die naam bestaat al' };
      const p = { id: b.nextId++, name: n, active: true };
      b.players.push(p);
      save();
      return { player: p };
    },
    rename(id, name) {
      const p = store.find(id);
      const n = cleanName(name);
      if (!p) return { err: 'Speler niet gevonden' };
      if (!n) return { err: 'Vul een naam in' };
      if (nameTaken(n, id)) return { err: 'Die naam bestaat al' };
      p.name = n;
      save();
      return { player: p };
    },
    remove(id) {
      const b = B();
      b.players = b.players.filter((p) => p.id !== id);
      delete b.scores[id];
      save();
    },
    setActive(id, on) {
      const p = store.find(id);
      if (p) { p.active = !!on; save(); }
    },

    /* ----- shared scoreboard (per group) ----- */
    score: (id) => B().scores[id] || { pts: 0, wins: 0 },
    addPoints(id, n) {
      const p = store.find(id);
      if (!p || !n) return;
      const b = B();
      const s = b.scores[id] || (b.scores[id] = { pts: 0, wins: 0 });
      s.pts = Math.max(0, s.pts + Math.round(n));
      const g = group();
      if (g && (!g.best.high || s.pts > g.best.high.pts)) g.best.high = { n: p.name, pts: s.pts };
      save();
    },
    addWin(id) {
      const p = store.find(id);
      if (!p) return;
      const b = B();
      const s = b.scores[id] || (b.scores[id] = { pts: 0, wins: 0 });
      s.wins += 1;
      const g = group();
      if (g) {
        g.totalWins += 1;
        g.history.push({ t: Date.now(), n: p.name });
        if (g.history.length > HISTORY_MAX) g.history = g.history.slice(-HISTORY_MAX);
      }
      save();
    },
    resetScores() { B().scores = {}; save(); },

    /* Fastest solve time of the active group. No game calls this yet; it is the hook a timed game uses. */
    recordTime(game, ms, name) {
      const g = group();
      if (!g || !isFinite(ms) || ms <= 0) return;
      if (!g.best.fast || ms < g.best.fast.ms) {
        g.best.fast = { n: cleanName(name), ms: Math.round(ms), game: String(game || '').slice(0, 24) };
        save();
      }
    },

    /* ----- per-game settings (persisted, mutate the returned object then call save) ----- */
    cfg(id, defaults) {
      const cur = isObj(d.cfg[id]) ? d.cfg[id] : {};
      const out = {};
      Object.keys(defaults).forEach((k) => {
        const dv = defaults[k];
        const v = cur[k];
        const okType = typeof v === typeof dv && (typeof dv !== 'number' || isFinite(v)) && (!isObj(dv) || isObj(v));
        out[k] = okType ? v : (isObj(dv) ? JSON.parse(JSON.stringify(dv)) : dv);
      });
      d.cfg[id] = out;
      return out;
    },

    /* ----- no-repeat drawing from a content pool (memory of the active group, or of the guest) ----- */
    freshCount(key, items, idOf) {
      const of = idOf || ((it, i) => i);
      const used = LG.toMap((B().used[key] || []).map(String));
      return items.filter((it, i) => !used[String(of(it, i))]).length;
    },
    draw(key, items, idOf) {
      const of = idOf || ((it, i) => i);
      const b = B();
      const ids = items.map((it, i) => String(of(it, i)));
      const used = LG.toMap((b.used[key] || []).map(String));
      let fresh = [];
      items.forEach((it, i) => { if (!used[ids[i]]) fresh.push(i); });
      let recycled = false;
      if (!fresh.length) {
        const inPool = LG.toMap(ids);
        b.used[key] = (b.used[key] || []).filter((x) => !inPool[String(x)]);
        fresh = items.map((it, i) => i);
        recycled = true;
      }
      const pick = fresh[LG.rand(fresh.length)];
      (b.used[key] = b.used[key] || []).push(ids[pick]);
      save();
      return { item: items[pick], index: pick, recycled: recycled };
    },

    /* ----- group profiles ----- */
    MAX_GROUPS: MAX_GROUPS,
    groups: () => d.groups.map(summary),
    activeGroup() {
      const g = group();
      return g ? { id: g.id, name: g.name } : null;
    },
    createGroup(name) {
      const n = cleanGroupName(name);
      if (!n) return { err: 'Vul een groepsnaam in' };
      if (d.groups.length >= MAX_GROUPS) return { err: 'Maximaal ' + MAX_GROUPS + ' groepen' };
      if (groupNameTaken(n, -1)) return { err: 'Die groep bestaat al' };
      const g = Object.assign(bucketBlank(), {
        id: d.nextGroupId++, name: n, totalWins: 0, history: [], best: { high: null, fast: null }
      });
      // A new group starts with the players that are active right now (guest or previous group).
      B().players.forEach((p) => { if (p.active) g.players.push({ id: g.nextId++, name: p.name, active: true }); });
      d.groups.push(g);
      d.activeGroup = g.id;
      save();
      announce();
      return { group: summary(g) };
    },
    switchGroup(id) {
      if (id !== null && !groupById(id)) return false;
      d.activeGroup = id;
      save();
      announce();
      return true;
    },
    renameGroup(id, name) {
      const g = groupById(id);
      const n = cleanGroupName(name);
      if (!g) return { err: 'Groep niet gevonden' };
      if (!n) return { err: 'Vul een groepsnaam in' };
      if (groupNameTaken(n, id)) return { err: 'Die groep bestaat al' };
      g.name = n;
      save();
      announce();
      return { group: summary(g) };
    },
    deleteGroup(id) {
      if (!groupById(id)) return;
      d.groups = d.groups.filter((g) => g.id !== id);
      if (d.activeGroup === id) d.activeGroup = null;
      save();
      announce();
    },
    resetUsed(id) {
      const g = groupById(id);
      if (!g) return;
      g.used = {};
      save();
      announce();
    },
    stats(id) {
      const g = groupById(id);
      if (!g) return null;
      const rows = g.players.map((p) => {
        const s = g.scores[p.id] || { pts: 0, wins: 0 };
        return { name: p.name, pts: s.pts, wins: s.wins };
      }).sort((a, b) => b.pts - a.pts || b.wins - a.wins || a.name.localeCompare(b.name));
      return { name: g.name, rows: rows, totalWins: g.totalWins, high: g.best.high, fast: g.best.fast, used: usedCount(g.used) };
    }
  };

  LG.store = store;
  load();
})();