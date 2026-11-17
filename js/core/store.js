(function () {
  'use strict';

  /* LaFête storage.
     - One roster of everyone who ever played (localStorage).
     - "Today" = who plays during this launch of the app (sessionStorage): every new launch starts empty.
     - Groups are presets: a saved list of roster members that you tick in one go.
     - Scores, per-game settings and the no-repeat memory of drawn prompts are shared by the whole roster. */

  const LG = window.LG;
  const KEY = 'lafete:v3';
  const OLD_KEY = 'party-hub-liquid-glass:v2';
  const TODAY_KEY = 'lafete:today:v1';
  const NAME_MAX = 14;
  const PRESET_NAME_MAX = 22;
  const MAX_PRESETS = 12;
  const MAX_ROSTER = 60;
  const MAX_PLAYERS = 20; // most players a single game accepts
  const COLORS = ['#6fe0a0', '#6cb8ff', '#ffad6b', '#ff8fb8', '#ffd166', '#b49cff', '#7de3e0', '#ff9e7a', '#a8e66b', '#f7a8ff'];

  const blank = () => ({ nextId: 1, players: [], scores: {}, used: {}, cfg: {}, presets: [], nextPresetId: 1 });
  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  const clean = (n, max) => String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, max);
  let d = blank();
  let today = [];

  function save() {
    const out = Object.assign({}, d, { players: d.players.map((p) => ({ id: p.id, name: p.name, last: p.last || 0 })) });
    try { localStorage.setItem(KEY, JSON.stringify(out)); } catch (e) { /* private mode or full */ }
  }
  function saveToday() {
    try { sessionStorage.setItem(TODAY_KEY, JSON.stringify(today)); } catch (e) { /* private mode */ }
  }

  const byId = (id) => d.players.filter((p) => p.id === id)[0] || null;
  const byName = (name) => { const low = name.toLowerCase(); return d.players.filter((p) => p.name.toLowerCase() === low)[0] || null; };

  function readCurrent(raw, next) {
    if (Array.isArray(raw.players)) {
      raw.players.forEach((p) => {
        if (!isObj(p) || typeof p.id !== 'number' || next.players.length >= MAX_ROSTER) return;
        const name = clean(p.name, NAME_MAX);
        if (!name || next.players.some((x) => x.id === p.id || x.name.toLowerCase() === name.toLowerCase())) return;
        next.players.push({ id: p.id, name: name, last: +p.last || 0 });
        next.nextId = Math.max(next.nextId, p.id + 1);
      });
    }
    if (typeof raw.nextId === 'number') next.nextId = Math.max(next.nextId, raw.nextId);
    if (isObj(raw.scores)) {
      Object.keys(raw.scores).forEach((k) => {
        const s = raw.scores[k];
        if (isObj(s) && next.players.some((p) => String(p.id) === k)) {
          next.scores[k] = { pts: Math.max(0, Math.round(+s.pts || 0)), wins: Math.max(0, Math.round(+s.wins || 0)) };
        }
      });
    }
    if (isObj(raw.used)) Object.keys(raw.used).forEach((k) => { if (Array.isArray(raw.used[k])) next.used[k] = raw.used[k].slice(-1000); });
    if (isObj(raw.cfg)) next.cfg = raw.cfg;
    if (Array.isArray(raw.presets)) {
      raw.presets.slice(0, MAX_PRESETS).forEach((g) => {
        const name = clean(g && g.name, PRESET_NAME_MAX);
        if (!name || typeof g.id !== 'number' || !Array.isArray(g.members)) return;
        const members = g.members.filter((id) => next.players.some((p) => p.id === id));
        next.presets.push({ id: g.id, name: name, members: members });
        next.nextPresetId = Math.max(next.nextPresetId, g.id + 1);
      });
    }
  }

  // One-time import of the previous app: the guest roster and every group profile are merged into one roster,
  // and each old group becomes a preset of its members. Scores and drawn-prompt memory are combined by name.
  function migrate(old, next) {
    const addName = (name) => {
      const n = clean(name, NAME_MAX);
      if (!n) return null;
      const low = n.toLowerCase();
      let p = next.players.filter((x) => x.name.toLowerCase() === low)[0];
      if (!p && next.players.length < MAX_ROSTER) { p = { id: next.nextId++, name: n, last: 0 }; next.players.push(p); }
      return p || null;
    };
    const absorb = (bucket) => {
      const ids = [];
      (Array.isArray(bucket.players) ? bucket.players : []).forEach((op) => {
        if (!isObj(op)) return;
        const p = addName(op.name);
        if (!p) return;
        ids.push(p.id);
        const s = isObj(bucket.scores) ? bucket.scores[op.id] : null;
        if (isObj(s)) {
          const cur = next.scores[p.id] || (next.scores[p.id] = { pts: 0, wins: 0 });
          cur.pts += Math.max(0, Math.round(+s.pts || 0));
          cur.wins += Math.max(0, Math.round(+s.wins || 0));
        }
      });
      if (isObj(bucket.used)) {
        Object.keys(bucket.used).forEach((k) => {
          if (!Array.isArray(bucket.used[k])) return;
          const seen = LG.toMap((next.used[k] || []).map(String));
          next.used[k] = (next.used[k] || []).concat(bucket.used[k].filter((x) => !seen[String(x)])).slice(-1000);
        });
      }
      return ids;
    };
    absorb(old);
    if (isObj(old.cfg)) next.cfg = old.cfg;
    (Array.isArray(old.groups) ? old.groups : []).forEach((g) => {
      if (!isObj(g)) return;
      const ids = absorb(g);
      const name = clean(g.name, PRESET_NAME_MAX);
      if (name && ids.length && next.presets.length < MAX_PRESETS) next.presets.push({ id: next.nextPresetId++, name: name, members: ids });
    });
  }

  function load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { raw = null; }
    const next = blank();
    if (isObj(raw)) readCurrent(raw, next);
    else {
      let old = null;
      try { old = JSON.parse(localStorage.getItem(OLD_KEY) || 'null'); } catch (e) { old = null; }
      if (isObj(old)) migrate(old, next);
    }
    d = next;
    let t = null;
    try { t = JSON.parse(sessionStorage.getItem(TODAY_KEY) || 'null'); } catch (e) { t = null; }
    today = Array.isArray(t) ? t.filter((id) => !!byId(id)) : [];
    save();
  }

  const store = {
    NAME_MAX: NAME_MAX,
    PRESET_NAME_MAX: PRESET_NAME_MAX,
    MAX_PLAYERS: MAX_PLAYERS,
    load: load,
    save: save,

    /* ----- roster ----- */
    // Everyone ever added, most recently played first.
    players: () => d.players.slice().sort((a, b) => (b.last || 0) - (a.last || 0) || a.name.localeCompare(b.name))
      .map((p) => ({ id: p.id, name: p.name, last: p.last || 0, active: today.indexOf(p.id) !== -1 })),
    // Who plays today, in the order they were ticked.
    active: () => today.map(byId).filter(Boolean).map((p) => ({ id: p.id, name: p.name })),
    find: (id) => { const p = byId(id); return p ? { id: p.id, name: p.name, active: today.indexOf(id) !== -1 } : null; },
    color(id) {
      const i = d.players.findIndex((p) => p.id === id);
      return COLORS[(i < 0 ? 0 : i) % COLORS.length];
    },
    neon: (i) => COLORS[i % COLORS.length],

    add(name) {
      const n = clean(name, NAME_MAX);
      if (!n) return { err: 'Vul een naam in' };
      const existing = byName(n);
      if (existing) {
        if (today.indexOf(existing.id) === -1) { today.push(existing.id); saveToday(); }
        return { player: existing, existed: true };
      }
      if (d.players.length >= MAX_ROSTER) return { err: 'De spelerslijst is vol (' + MAX_ROSTER + ')' };
      const p = { id: d.nextId++, name: n, last: 0 };
      d.players.push(p);
      today.push(p.id);
      save();
      saveToday();
      return { player: p };
    },
    rename(id, name) {
      const p = byId(id);
      const n = clean(name, NAME_MAX);
      if (!p) return { err: 'Speler niet gevonden' };
      if (!n) return { err: 'Vul een naam in' };
      const other = byName(n);
      if (other && other.id !== id) return { err: 'Die naam bestaat al' };
      p.name = n;
      save();
      return { player: p };
    },
    remove(id) {
      d.players = d.players.filter((p) => p.id !== id);
      delete d.scores[id];
      d.presets.forEach((g) => { g.members = g.members.filter((m) => m !== id); });
      today = today.filter((x) => x !== id);
      save();
      saveToday();
    },
    setActive(id, on) {
      if (!byId(id)) return;
      const i = today.indexOf(id);
      if (on && i === -1) today.push(id);
      if (!on && i !== -1) today.splice(i, 1);
      saveToday();
    },
    clearToday() { today = []; saveToday(); },
    // Stamps "last played" on everyone playing today (called when a game starts).
    touchToday() {
      const now = Date.now();
      today.forEach((id) => { const p = byId(id); if (p) p.last = now; });
      save();
    },

    /* ----- group presets ----- */
    presets: () => d.presets.map((g) => ({ id: g.id, name: g.name, members: g.members.slice() })),
    savePreset(name) {
      const n = clean(name, PRESET_NAME_MAX);
      if (!n) return { err: 'Vul een groepsnaam in' };
      if (!today.length) return { err: 'Vink eerst wie meespeelt' };
      const low = n.toLowerCase();
      const same = d.presets.filter((g) => g.name.toLowerCase() === low)[0];
      if (same) { same.members = today.slice(); save(); return { preset: same, updated: true }; }
      if (d.presets.length >= MAX_PRESETS) return { err: 'Maximaal ' + MAX_PRESETS + ' groepen' };
      const g = { id: d.nextPresetId++, name: n, members: today.slice() };
      d.presets.push(g);
      save();
      return { preset: g };
    },
    applyPreset(id) {
      const g = d.presets.filter((x) => x.id === id)[0];
      if (!g) return 0;
      let added = 0;
      g.members.forEach((m) => { if (byId(m) && today.indexOf(m) === -1) { today.push(m); added++; } });
      saveToday();
      return added;
    },
    deletePreset(id) { d.presets = d.presets.filter((g) => g.id !== id); save(); },

    /* ----- scoreboard ----- */
    score: (id) => d.scores[id] || { pts: 0, wins: 0 },
    addPoints(id, n) {
      if (!byId(id) || !n) return;
      const s = d.scores[id] || (d.scores[id] = { pts: 0, wins: 0 });
      s.pts = Math.max(0, s.pts + Math.round(n));
      save();
    },
    addWin(id) {
      if (!byId(id)) return;
      const s = d.scores[id] || (d.scores[id] = { pts: 0, wins: 0 });
      s.wins += 1;
      save();
    },
    resetScores() { d.scores = {}; save(); },
    recordTime() { /* kept for compatibility: no group records any more */ },

    /* ----- per-game settings (mutate the returned object, then call save) ----- */
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

    /* ----- no-repeat drawing from a content pool ----- */
    freshCount(key, items, idOf) {
      const of = idOf || ((it, i) => i);
      const used = LG.toMap((d.used[key] || []).map(String));
      return items.filter((it, i) => !used[String(of(it, i))]).length;
    },
    draw(key, items, idOf) {
      const of = idOf || ((it, i) => i);
      const ids = items.map((it, i) => String(of(it, i)));
      const used = LG.toMap((d.used[key] || []).map(String));
      let fresh = [];
      items.forEach((it, i) => { if (!used[ids[i]]) fresh.push(i); });
      let recycled = false;
      if (!fresh.length) {
        const inPool = LG.toMap(ids);
        d.used[key] = (d.used[key] || []).filter((x) => !inPool[String(x)]);
        fresh = items.map((it, i) => i);
        recycled = true;
      }
      const pick = fresh[LG.rand(fresh.length)];
      (d.used[key] = d.used[key] || []).push(ids[pick]);
      save();
      return { item: items[pick], index: pick, recycled: recycled };
    },
    resetUsed() { d.used = {}; save(); }
  };

  LG.store = store;
  load();
})();
