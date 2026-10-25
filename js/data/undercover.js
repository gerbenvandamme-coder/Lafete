(function () {
  'use strict';
  window.LG = window.LG || {};
  LG.data = LG.data || {};
  // 6 categorieën x 44 woordparen = 264 ("burgerwoord|undercoverwoord").
  // `frame` = breed 2-woords domein voor de Mr. White nood-hint (Semantisch Kompas).
  LG.data.undercover = [
    { id: 'situaties', name: 'Situaties & Plekken', frame: 'Sociale Situaties', pairs: [
      'Eerste date|Sollicitatiegesprek', 'Sauna|Sportschool', 'Begrafenis|Bruiloft', 'Biechtstoel|Verhoorkamer',
      'Festival|Camping', 'Wachtkamer|Vertrekhal', 'Bibliotheek|Museum', 'Kermis|Pretpark',
      'Bioscoop|Theater', 'Strandtent|Stadsterras', 'Ziekenhuis|Tandartspraktijk', 'Hotellobby|Luchthaven',
      'Schoolplein|Kinderdagverblijf', 'Examenzaal|Rechtbank', 'Dierentuin|Kinderboerderij', 'Escaperoom|Spookhuis',
      'Kampvuur|Barbecue', 'Reünie|Verjaardagsfeestje', 'Zwembad|Wellnesscentrum', 'Kantoortuin|Klaslokaal',
      'Stadion|Concertzaal', 'Bingoavond|Kaartavond', 'Vliegtuig|Trein', 'Veerboot|Cruiseschip',
      'Vakantiehuisje|Hotelkamer', 'Escaperoom|Quarantaine', 'Pashokje|Kapperszaak', 'Kringloopwinkel|Antiekmarkt',
      'Verhuizing|Emigratie', 'Gevangenis|Kostschool', 'Bunker|Kelder', 'Dakterras|Balkon',
      'Tuinfeest|Buurtbarbecue', 'Speeddate|Netwerkborrel', 'Eerste schooldag|Eerste werkdag', 'Veiling|Rommelmarkt',
      'Skipiste|Schaatsbaan', 'Casino|Bingohal', 'Observatorium|Planetarium', 'Rijschool|Vliegschool',
      'Spoedeisende hulp|Huisartsenpost', 'Zolder|Garage', 'Parkeergarage|Tunnel', 'Werkoverleg|Familiediner'
    ]},
    { id: 'psycho', name: 'Psychologisch & Abstract', frame: 'Innerlijke Beleving', pairs: [
      'Jaloers|Onzeker', 'Spijt|Schuldgevoel', 'Nostalgie|Heimwee', 'Roddel|Geheim',
      'Karma|Wraak', 'Arrogant|Zelfverzekerd', 'Verlegen|Introvert', 'Koppig|Vastberaden',
      'Geheim|Leugen', 'Angst|Stress', 'Eenzaamheid|Verveling', 'Trots|Hoogmoed',
      'Moed|Roekeloosheid', 'Geluk|Toeval', 'Hoop|Optimisme', 'Wantrouwen|Paranoia',
      'Bewondering|Jaloezie', 'Liefde|Verliefdheid', 'Gewoonte|Verslaving', 'Ambitie|Hebzucht',
      'Nieuwsgierig|Bemoeiziek', 'Zuinig|Gierig', 'Eerlijk|Tactloos', 'Beleefd|Onderdanig',
      'Vergeving|Vergeten', 'Medelijden|Medeleven', 'Fantasie|Leugen', 'Herinnering|Droom',
      'Intuïtie|Voorgevoel', 'Dankbaarheid|Opluchting', 'Schaamte|Gêne', 'Wijsheid|Slimheid',
      'Verzet|Rebellie', 'Gehoorzaam|Volgzaam', 'Zelfspot|Zelfkritiek', 'Dromer|Idealist',
      'Perfectionisme|Controledrang', 'Woede|Irritatie', 'Opwinding|Zenuwen', 'Rust|Stilte',
      'Gemis|Leegte', 'Respect|Bewondering', 'Macht|Invloed', 'Vrijheid|Onafhankelijkheid'
    ]},
    { id: 'objecten', name: 'Subtiele Objecten', frame: 'Dagelijkse Spullen', pairs: [
      'Zonnebrandcrème|Bodylotion', 'Tatoeage|Litteken', 'Paspoort|Rijbewijs', 'Wekker|Timer',
      'Parfum|Deodorant', 'Kompas|GPS', 'Zaklamp|Kaars', 'Rugzak|Weekendtas',
      'Pen|Potlood', 'Horloge|Smartwatch', 'Bril|Contactlenzen', 'Paraplu|Regenjas',
      'Sjaal|Das', 'Handschoenen|Wanten', 'Sleutelbos|Pasje', 'Portemonnee|Geldclip',
      'Spiegel|Raam', 'Kussen|Knuffel', 'Deken|Slaapzak', 'Matras|Luchtbed',
      'Fotoalbum|Dagboek', 'Kaart|Brief', 'Handboeien|Trouwring', 'Wekker|Rookmelder',
      'Koptelefoon|Oordopjes', 'Radio|Podcast', 'Boek|E-reader', 'Laptop|Tablet',
      'Powerbank|Oplader', 'Afstandsbediening|Joystick', 'Ring|Armband', 'Ketting|Hanger',
      'Kam|Borstel', 'Föhn|Krultang', 'Schaar|Mes', 'Hamer|Boormachine',
      'Ladder|Trap', 'Zaag|Bijl', 'Thermosfles|Waterfles', 'Kluisje|Brievenbus',
      'Zakmes|Nagelknipper', 'Sticker|Button', 'Camera|Verrekijker', 'Fluit|Trompet'
    ]},
    { id: 'cultuur', name: 'Eten, Sfeer & Cultuur', frame: 'Smaak Cultuur', pairs: [
      'Champagne|Prosecco', 'Frituur|Kebabzaak', 'Bruine kroeg|Nachtclub', 'Foodtruck|Marktkraam',
      'Tapas|Borrelplank', 'Sushi|Poké bowl', 'Pizza|Flammkuchen', 'Pannenkoek|Wafel',
      'Champagne|Kinderchampagne', 'Bitterballen|Kroketten', 'Haring|Zalm', 'Appeltaart|Vlaai',
      'Koffie|Espresso', 'Thee|Kruidenthee', 'Bier|Cider', 'Whisky|Cognac',
      'Rode wijn|Port', 'Cocktail|Shot', 'Ontbijt|Brunch', 'Lunch|High tea',
      'Barbecue|Gourmetten', 'Fondue|Raclette', 'Soep|Bouillon', 'Salade|Rauwkost',
      'Chocola|Cacao', 'Ijs|Sorbet', 'Slagroom|Kwark', 'Honing|Stroop',
      'Carnaval|Oktoberfest', 'Koningsdag|Sinterklaas', 'Oud en nieuw|Verjaardag', 'Pride|Demonstratie',
      'Opera|Musical', 'Stand-up|Cabaret', 'Jazz|Blues', 'Techno|House',
      'Graffiti|Muurschildering', 'Poëzie|Songtekst', 'Stripboek|Roman', 'Karaoke|Playback',
      'Rijsttafel|Buffet', 'Kantine|Restaurant', 'Biecht|Verhoor', 'Broodje kroket|Tosti'
    ]},
    { id: 'dagelijks', name: 'Dagelijks Leven & Acties', frame: 'Menselijk Gedrag', pairs: [
      'Spijbelen|Ziek melden', 'Ghosten|Blokkeren', 'Stalken|Lurken', 'Powernap|Meditatie',
      'Onderhandelen|Chanteren', 'Knuffelen|Fouilleren', 'Sporten|Wandelen', 'Koken|Bakken',
      'Fietsen|Hardlopen', 'Zwemmen|Snorkelen', 'Dansen|Aerobics', 'Zingen|Neuriën',
      'Fluisteren|Mompelen', 'Roepen|Schreeuwen', 'Lachen|Giechelen', 'Huilen|Snikken',
      'Bellen|Appen', 'Mailen|Posten', 'Scrollen|Zappen', 'Gamen|Gokken',
      'Daten|Flirten', 'Zoenen|Knuffelen', 'Ruziën|Discussiëren', 'Klagen|Zeuren',
      'Sparen|Beleggen', 'Lenen|Huren', 'Verkopen|Ruilen', 'Onderhandelen|Afdingen',
      'Verslapen|Uitslapen', 'Vaccinatie|Tatoeage', 'Dromen|Dagdromen', 'Snurken|Slaapwandelen',
      'Verhuizen|Vertrekken', 'Inpakken|Uitpakken', 'Wachten|Treuzelen', 'Haasten|Rennen',
      'Solliciteren|Stage lopen', 'Ontslag nemen|Ontslagen worden', 'Sollicitatie|Verhoor', 'Promotie|Salarisverhoging',
      'Afspreken|Uitnodigen', 'Boodschappen doen|Bestellen', 'Afwassen|Afdrogen', 'Tanden poetsen|Mondspoelen'
    ]},
    { id: 'mindfuck', name: 'Dubbele Bodem & Dilemma', frame: 'Sociaal Dilemma', pairs: [
      'Tinder-date|Blind date', 'Smoezenboek|Dagboek', 'Schoonmoeder|Baas', 'Kater|Griep',
      'Nepnieuws|Roddel', 'Vrijgezellenfeest|Kroegentocht', 'Ghosten|Ontslaan', 'Plastische chirurgie|Make-over',
      'Alibi|Smoes', 'Sekteleider|Influencer', 'Omkoping|Fooi', 'Stalker|Geheime aanbidder',
      'Zakkenroller|Goochelaar', 'Bodyguard|Schaduw', 'Chantage|Ruilhandel', 'Dronken|Moe',
      'Spionage|Nieuwsgierigheid', 'Echtscheiding|Faillissement', 'Zwarte markt|Beurs', 'Kroongetuige|Verrader',
      'Dwangbuis|Knuffeldeken', 'Noodleugen|Compliment', 'Oplichter|Verkoper', 'Omerta|Vriendenclub',
      'Bonus|Smeergeld', 'Hacker|Slotenmaker', 'Gokverslaving|Hobby', 'Pestkop|Grapjas',
      'Dubbelleven|Undercoveragent', 'Spijtoptant|Twijfelaar', 'Ontvoering|Surprise-uitje', 'Mol|Klokkenluider',
      'Groepsdruk|Teambuilding', 'Verzekeringsfraude|Pech', 'Zwartwerken|Bijverdienen', 'Prank|Sabotage',
      'Raadsel|Complot', 'Peptalk|Preek', 'Liegen|Overdrijven', 'Therapie|Roddelen',
      'Nepaccount|Pseudoniem', 'Stagiair|Koffiejongen', 'Gijzeling|Logeerpartij', 'Familiebezoek|Inval'
    ]}
  ];
})();