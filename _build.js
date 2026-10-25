const fs = require('fs');

// ---- 1. Split css/styles.css into base / components / undercover ----
const css = fs.readFileSync('css/styles.css', 'utf8').split(/\r?\n/);
function idx(marker) {
  const i = css.findIndex((l) => l.startsWith(marker));
  if (i < 0) { console.error('CSS marker missing: ' + marker); process.exit(1); }
  return i;
}
const iSetup = idx('/* ===== Setup');
const iElim = idx('/* ===== Elimination');
const iVic = idx('/* ===== Victory');

const base = css.slice(0, iSetup).join('\n').trimEnd() + '\n';
let comp = css.slice(iSetup, iElim).concat(css.slice(iVic)).join('\n').trimEnd() + '\n';
let uc = css.slice(iElim, iVic).join('\n').trimEnd() + '\n';
comp = comp.split('#s-victory').join('.victory');
uc = uc.split('#s-elim').join('#s-uc-elim');

fs.mkdirSync('css/games', { recursive: true });
fs.writeFileSync('css/base.css', base, 'utf8');
fs.writeFileSync('css/components.css', comp, 'utf8');
fs.writeFileSync('css/games/undercover.css', uc, 'utf8');

// ---- 2. Extract the Undercover word database from js/app.js ----
const js = fs.readFileSync('js/app.js', 'utf8').split(/\r?\n/);
const a = js.findIndex((l) => l.includes('var CATEGORIES = ['));
const b = js.findIndex((l) => l.includes('var ALL_PAIRS'));
if (a < 0 || b < 0 || b <= a) { console.error('JS markers missing'); process.exit(1); }
let body = js.slice(a, b).join('\n').trim();
body = body.replace(/^var CATEGORIES = /, '').replace(/;\s*$/, '');

const out = [
  '(function () {',
  "  'use strict';",
  '  window.LG = window.LG || {};',
  '  LG.data = LG.data || {};',
  '  // 5 categorieën x 44 woordparen ("burgerwoord|undercoverwoord")',
  '  LG.data.undercover = ' + body + ';',
  '})();',
  ''
].join('\n');
fs.mkdirSync('js/data', { recursive: true });
fs.writeFileSync('js/data/undercover.js', out, 'utf8');

console.log('base.css lines:', base.split('\n').length - 1);
console.log('components.css lines:', comp.split('\n').length - 1);
console.log('undercover.css lines:', uc.split('\n').length - 1);
console.log('undercover data bytes:', out.length);