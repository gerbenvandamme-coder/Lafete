// Tijdelijk: controleert de omvang en de integriteit van de databases.
global.window = { LG: { data: {} } };
['saboteur', 'golflengte', 'dilemma', 'kameleon'].forEach((n) => require('./js/data/' + n + '.js'));
const d = window.LG.data;
let bad = 0;
function fail(msg) { console.error('FOUT:', msg); bad++; }
function dupes(list, label) {
  const seen = {};
  list.forEach((x) => { const k = String(x).toLowerCase(); if (seen[k]) fail(label + ' dubbel: ' + x); seen[k] = true; });
}

const words = [];
d.saboteur.forEach((c) => c.words.forEach((w) => words.push(w)));
dupes(words, 'saboteur');
if (words.length < 80) fail('saboteur < 80');

dupes(d.golflengte, 'golflengte');
d.golflengte.forEach((s) => {
  const p = s.split('|');
  if (p.length !== 2 || !p[0].trim() || !p[1].trim()) fail('golflengte ongeldig: ' + s);
});
if (d.golflengte.length < 80) fail('golflengte < 80');

dupes(d.dilemma, 'dilemma');
if (d.dilemma.length < 100) fail('dilemma < 100');

dupes(d.kameleon, 'kameleon');
if (d.kameleon.length < 100) fail('kameleon < 100');

console.log('saboteur woorden:', words.length, 'in', d.saboteur.length, 'categorieën');
console.log('golflengte paren:', d.golflengte.length);
console.log('dilemma stellingen:', d.dilemma.length);
console.log('kameleon opdrachten:', d.kameleon.length);
process.exit(bad ? 1 : 0);