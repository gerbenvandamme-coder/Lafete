(function () {
  'use strict';
  const LG = window.LG = window.LG || {};
  LG.data = LG.data || {};

  // Blind Sync: drie soorten vragen. numbers = schaal 1-10, words = één woord, spectra = schuifbalk 0-100.
  LG.data.blindsync = {
    numbers: [
      { q: 'Hoe eng is een spin in je slaapkamer?', lo: 'Totaal niet', hi: 'Paniek' },
      { q: 'Hoe erg is het om te laat op een verjaardag te komen?', lo: 'Geen punt', hi: 'Onvergeeflijk' },
      { q: 'Hoe lekker is ananas op pizza?', lo: 'Smerig', hi: 'Heerlijk' },
      { q: 'Hoe goed kun jij een verrassingsfeestje geheimhouden?', lo: 'Ik verklap alles', hi: 'Als het graf' },
      { q: 'Hoe gezellig is een avondje bordspellen?', lo: 'Saai', hi: 'Top' },
      { q: 'Hoe slecht is het weer in Nederland?', lo: 'Prima', hi: 'Een ramp' },
      { q: 'Hoe belangrijk is een goede wifi-verbinding?', lo: 'Maakt niet uit', hi: 'Levensbelangrijk' },
      { q: 'Hoe warm moet een douche zijn?', lo: 'IJskoud', hi: 'Kokend' },
      { q: 'Hoe eng is een bos in het donker?', lo: 'Veilig', hi: 'Doodeng' },
      { q: 'Hoe erg is het om een dag zonder telefoon te zitten?', lo: 'Heerlijk rustig', hi: 'Wereldramp' },
      { q: 'Hoe lang duurt "ik ben er over vijf minuutjes" in het echt?', lo: 'Vijf minuten', hi: 'Een uur of meer' },
      { q: 'Hoe pijnlijk is een wekker om zes uur?', lo: 'Prima', hi: 'Marteling' }
    ],
    words: [
      { q: 'Eerste woord dat je denkt bij: STRAND' },
      { q: 'Noem een kleur uit de regenboog' },
      { q: 'Noem een fruitsoort' },
      { q: 'Noem een Nederlandse stad (niet Amsterdam)' },
      { q: 'Noem een dier op een boerderij' },
      { q: 'Noem iets wat je meeneemt op vakantie' },
      { q: 'Noem een pizzatopping' },
      { q: 'Eerste woord dat je denkt bij: VERJAARDAG' },
      { q: 'Noem een beroep' },
      { q: 'Noem een ijssmaak' },
      { q: 'Eerste woord dat je denkt bij: WINTER' },
      { q: 'Noem een muziekinstrument' }
    ],
    spectra: [
      { q: 'Een pizza', l: 'Gezond', r: 'Ongezond' },
      { q: 'Een kat', l: 'Schattig', r: 'Eng' },
      { q: 'Koffie', l: 'Ochtenddrankje', r: 'Avonddrankje' },
      { q: 'Een vakantie in Frankrijk', l: 'Saai', r: 'Spannend' },
      { q: 'Een regenbui', l: 'Gezellig', r: 'Vervelend' },
      { q: 'Een gitaar', l: 'Makkelijk te leren', r: 'Moeilijk te leren' },
      { q: 'De maan', l: 'Dichtbij', r: 'Ver weg' },
      { q: 'Een kasteel', l: 'Klein', r: 'Enorm' },
      { q: 'Een brandweerauto', l: 'Rustig', r: 'Luidruchtig' },
      { q: 'Chocolade', l: 'Zoet', r: 'Bitter' },
      { q: 'Een bioscoopfilm', l: 'Echt gebeurd', r: 'Pure fantasie' },
      { q: 'Een hamster', l: 'Nutteloos', r: 'Onmisbaar' }
    ]
  };
})();