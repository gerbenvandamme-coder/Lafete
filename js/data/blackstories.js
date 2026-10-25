(function () {
  'use strict';
  const LG = window.LG = window.LG || {};
  LG.data = LG.data || {};

  // 50 Black Stories: 12 easy, 14 medium, 14 hard, 10 extreme.
  LG.data.blackstories = [
    /* ===== EASY (12) ===== */
    {
      id: 'bs-01', title: 'De Dodelijke Lift', difficulty: 'easy',
      enigma: "Een man stapt op de 10e verdieping uit de lift, loopt de trap op naar de 14e verdieping en sterft daar. Waarom koos hij de trap?",
      solution: "Hij is brandweerman. Op de 14e verdieping woedt een brand en bij brandalarm zetten liften zichzelf automatisch stil op een veilige verdieping, in dit geval de 10e. Hij liep de laatste vier verdiepingen omhoog om bewoners te redden, maar stikte zelf in de dikke rook."
    },
    {
      id: 'bs-02', title: 'De Vuurtorenwachter', difficulty: 'easy',
      enigma: "Een vuurtorenwachter doet op een nacht zijn lamp een uur uit omdat hij moe is. De volgende ochtend springt hij van de rotsen. Waarom?",
      solution: "Terwijl het licht uit was, voer een groot passagiersschip tegen de rotsen en veel mensen verdronken. Tot die nacht had hij zijn taak altijd trouw gedaan. Hij besefte dat hij de ramp had kunnen voorkomen en kon met die schuld niet verder leven."
    },
    {
      id: 'bs-03', title: 'Het IJsblok', difficulty: 'easy',
      enigma: "Een man wordt dood aangetroffen in een afgesloten schuur. Hij hangt aan een touw aan de balk, de vloer eronder is kletsnat en er staat niets waar hij op had kunnen staan.",
      solution: "De man stond op een groot blok ijs, deed het touw om zijn nek en liet het ijs smelten. Het smeltwater trok weg door de kieren in de vloer en liet alleen een natte plek achter. Daardoor leek het alsof hij zonder hulpmiddel omhoog was gekomen."
    },
    {
      id: 'bs-04', title: 'De Albatrossoep', difficulty: 'easy',
      enigma: "Een man bestelt in een restaurant albatrossoep. Hij neemt één hap, rekent af, gaat naar huis en maakt een eind aan zijn leven.",
      solution: "Jaren eerder was hij schipbreukeling op een eiland. Zijn metgezellen gaven hem 'albatrossoep' te eten, maar in werkelijkheid was het vlees van zijn omgekomen vrouw. Nu hij voor het eerst echte albatrossoep proefde, merkte hij dat die heel anders smaakte en begreep hij wat hij toen gegeten had."
    },
    {
      id: 'bs-05', title: 'De Hik', difficulty: 'easy',
      enigma: "Een man loopt een bar in en vraagt om een glas water. De barman pakt een pistool en richt het op hem. De man zegt vriendelijk 'dank u wel' en loopt weg.",
      solution: "De man had de hik. De barman zag dat en wist dat een flinke schrik de hik meestal verjaagt. Het werkte meteen, dus de man had geen water meer nodig."
    },
    {
      id: 'bs-06', title: 'Het Hotel', difficulty: 'easy',
      enigma: "Een man duwt zijn auto naar een hotel, kijkt het gebouw aan en weet meteen dat hij failliet is.",
      solution: "Hij speelt Monopoly. Zijn auto is zijn speelstuk en hij komt terecht op een straat van zijn tegenstander met een hotel erop. De huur is hoger dan al het geld dat hij nog heeft."
    },
    {
      id: 'bs-07', title: 'De Sprong in het Donker', difficulty: 'easy',
      enigma: "Een ervaren duiker klimt 's nachts stiekem op de tienmeterplank van een zwembad, springt en sterft. Hij was nuchter en de plank was heel.",
      solution: "Het zwembad was die dag leeggepompt voor onderhoud. In het donker zag de duiker niet dat er geen water in het bad stond. Hij sprong en kwam op de tegels terecht."
    },
    {
      id: 'bs-08', title: 'Het Kaarslicht', difficulty: 'easy',
      enigma: "Een man komt thuis in een donker huis, strijkt een lucifer af om een kaars aan te steken en even later bestaat zijn huis niet meer.",
      solution: "Er was net een stroomstoring en door een lek in de gasleiding hing het hele huis vol gas. De vlam van de lucifer deed het gas ontploffen."
    },
    {
      id: 'bs-09', title: 'De Fotograaf', difficulty: 'easy',
      enigma: "Een man schiet zijn vrouw, houdt haar kort onder water en hangt haar daarna op. Daarna gaan ze samen gezellig uit eten.",
      solution: "Hij is fotograaf en zij stond model. Hij schoot foto's van haar, dompelde de afdrukken in het ontwikkelbad en hing ze aan een lijn te drogen. Er is niemand iets overkomen."
    },
    {
      id: 'bs-10', title: 'Uit Heldere Hemel', difficulty: 'easy',
      enigma: "Een golfer ligt dood op de green terwijl de zon schijnt en er geen wolkje aan de lucht is. Hij heeft geen wond en is niet door een bal geraakt.",
      solution: "Een onweersbui trok kilometers verderop en de bliksem sloeg in zijn richting. Op het open veld was hij met zijn metalen club het hoogste punt. De bliksem trof hem 'uit een heldere hemel'."
    },
    {
      id: 'bs-11', title: 'Het Perfecte Wapen', difficulty: 'easy',
      enigma: "Een vrouw slaat haar man dood en nodigt daarna de politie uit voor een heerlijke maaltijd. Het moordwapen wordt nooit gevonden.",
      solution: "Ze sloeg hem neer met een bevroren lamsbout. Daarna stopte ze die in de oven en serveerde hem aan de rechercheurs die haar kwamen ondervragen. Het bewijs werd opgegeten."
    },
    {
      id: 'bs-12', title: 'De Ijspegel', difficulty: 'easy',
      enigma: "Een man ligt dood in de sneeuw met een steekwond in zijn rug. Binnen een straal van tien meter zijn alleen zijn eigen voetsporen te zien en er ligt geen wapen.",
      solution: "Van het dak van een schuur viel een grote ijspegel naar beneden. Die doorboorde de man van achteren. In de zon smolt de ijspegel, waardoor het wapen verdween."
    },

    /* ===== MEDIUM (14) ===== */
    {
      id: 'bs-13', title: 'De Parachutist', difficulty: 'medium',
      enigma: "Een man ligt dood in een open veld, een rugzak op zijn rug met een ongeopend pakket erin. Er is geen vliegtuigwrak te vinden en hij is niet beroofd.",
      solution: "Hij was parachutist en het pakket op zijn rug was zijn parachute. De parachute ging niet open, waardoor hij op de grond viel. Het vliegtuig waaruit hij sprong vloog gewoon door."
    },
    {
      id: 'bs-14', title: 'De Verstekelingen', difficulty: 'medium',
      enigma: "Een havenarbeider opent een container met verse bananen en valt dood neer. Er was geen gas, geen explosief en niemand heeft hem aangeraakt.",
      solution: "Tussen de bananen zat een giftige spin die met de lading was meegereisd. Toen hij zijn hand in de kisten stak, beet ze hem. Zonder tegengif was de beet dodelijk."
    },
    {
      id: 'bs-15', title: 'De Plakrand', difficulty: 'medium',
      enigma: "Een vrouw verstuurt de uitnodigingen voor haar bruiloft en sterft een paar uur later. Ze at en dronk die dag niets en niemand was bij haar.",
      solution: "Haar jaloerse ex had gif op de plaklaag van de enveloppen gesmeerd. Zij likte ze één voor één dicht. Het gif kwam via haar tong binnen en was binnen enkele uren fataal."
    },
    {
      id: 'bs-16', title: 'De Laatste Grap', difficulty: 'medium',
      enigma: "Een clown valt tijdens zijn optreden dood neer. Het publiek lacht, klapt en roept om meer. Pas na afloop merkt iemand dat er iets mis is.",
      solution: "Het neerploffen was onderdeel van zijn act: hij viel elke avond op dezelfde plek. Dit keer kreeg hij echt een hartaanval. Het publiek hield de echte val voor de grap en niemand greep in."
    },
    {
      id: 'bs-17', title: 'Het Dorstige Record', difficulty: 'medium',
      enigma: "Een marathonloper wint de race, verbreekt het wereldrecord en sterft vlak na de finish. Hij was kerngezond en kreeg onderweg niets giftigs binnen, alleen water.",
      solution: "Hij dronk bij elk drinkpunt water, veel meer dan hij uitzweette. Daardoor raakte het zout in zijn bloed sterk verdund (hyponatriëmie). Zijn hersencellen zwollen op en dat was fataal."
    },
    {
      id: 'bs-18', title: 'Het Luchtkussen', difficulty: 'medium',
      enigma: "Een stuntman springt van een gebouw van dertig meter op een luchtkussen en overleeft het zonder een schram. Een minuut later is hij dood.",
      solution: "Het kussen was ruim drie meter hoog. Trots stapte hij aan de rand van het kussen af en zette zijn voet verkeerd neer. Hij viel naar beneden op het beton."
    },
    {
      id: 'bs-19', title: 'Vals Alarm', difficulty: 'medium',
      enigma: "Een man roept in een volle bioscoop 'Brand!' terwijl er nergens vuur is. Later wordt hij veroordeeld voor de dood van meerdere mensen.",
      solution: "Het publiek raakte in paniek en stormde naar de uitgangen. In het gedrang werden mensen vertrapt en tegen de deuren geklemd. Zijn grap had een dodelijke paniek veroorzaakt."
    },
    {
      id: 'bs-20', title: 'De Dodelijke Kus', difficulty: 'medium',
      enigma: "Een man zoent zijn vriendin en sterft kort daarna. Geen van beiden was ziek en niemand heeft iets in zijn eten of drinken gedaan.",
      solution: "Hij was dodelijk allergisch voor pinda's. Zijn vriendin had vlak daarvoor een boterham met pindakaas gegeten. Door de kus kwamen resten in zijn mond en hij kreeg een allergische shock."
    },
    {
      id: 'bs-21', title: 'De Warme Tent', difficulty: 'medium',
      enigma: "Een gezin kampeert in de winter en slaapt in een dichtgeritste tent. 's Ochtends zijn ze allemaal dood. Er is geen brand geweest en niemand is aangevallen.",
      solution: "Ze hadden de barbecue met gloeiende kolen in de tent gezet om warm te blijven. Gloeiende kolen produceren koolmonoxide, een gas zonder geur. Ze vielen in slaap en werden nooit meer wakker."
    },
    {
      id: 'bs-22', title: 'De Bungeesprong', difficulty: 'medium',
      enigma: "Een vrouw doet haar eerste bungeesprong en sterft meteen. Het touw was niet gescheurd en zat goed vast aan haar enkels en aan de brug.",
      solution: "De instructeur had de touwlengte afgestemd op de vorige springer, die veel lichter was dan zij. Bij haar gewicht rekte het touw veel verder uit dan berekend. Ze raakte de rotsen onder de brug."
    },
    {
      id: 'bs-23', title: 'De Vanille-Auto', difficulty: 'medium',
      enigma: "Een man haalt elke avond ijs bij de supermarkt. Koopt hij chocola of aardbei, dan start zijn auto zonder problemen. Koopt hij vanille, dan start de auto niet. Waarom?",
      solution: "Vanille ligt voorverpakt in de vriezer en is zo gepakt, dus hij is snel terug bij de auto. De motor is dan nog heet en de brandstof in de leidingen verdampt (dampbellen), waardoor de auto niet start. Bij de andere smaken moest hij langer wachten en was de motor ondertussen afgekoeld."
    },
    {
      id: 'bs-24', title: 'Pizza met Ananas', difficulty: 'medium',
      enigma: "Een vrouw belt het alarmnummer en bestelt een pizza met ananas. De centralist hangt niet op, maar stuurt meteen de politie naar haar adres.",
      solution: "Ze werd in haar huis bedreigd door haar partner en kon niet openlijk om hulp vragen. Door te doen alsof ze een pizzeria belde, gaf ze stiekem een noodsignaal door. De centralist herkende dat en stuurde hulp."
    },
    {
      id: 'bs-25', title: 'Het Brood', difficulty: 'medium',
      enigma: "Een wiskundige weegt een jaar lang elk brood van één kilo dat hij bij de bakker koopt. De bakker belooft beterschap en levert vanaf dan zwaardere broden, maar de wiskundige gaat toch weer naar de politie.",
      solution: "Zijn eerste metingen lieten zien dat de broden gemiddeld maar 950 gram wogen. Daarna woog het brood gemiddeld weer een kilo, maar de verdeling van de gewichten was scheef. Hij kon daaruit rekenen dat de bakker hem steeds het zwaarste brood uit zijn voorraad gaf en dus nog steeds de boel bedroog."
    },
    {
      id: 'bs-26', title: 'De Paraplu', difficulty: 'medium',
      enigma: "Een man woont op de 20e verdieping. Bij droog weer neemt hij de lift tot de 12e verdieping en loopt de rest. Bij regen rijdt hij helemaal naar boven. Waarom?",
      solution: "Hij is klein en kan in de lift alleen de knop van de 12e verdieping bereiken. Op regenachtige dagen heeft hij zijn paraplu bij zich en kan hij daarmee ook de hogere knoppen indrukken."
    },

    /* ===== HARD (14) ===== */
    {
      id: 'bs-27', title: 'Duikers in het Bos', difficulty: 'hard',
      enigma: "Na een zware bosbrand vindt een brandweerman een volledig uitgeruste duiker dood in de verkoolde top van een boom, midden in het bos.",
      solution: "De duiker zwom in een meer vlak bij het bos. Een blusvliegtuig schepte water uit dat meer en nam hem mee in de tank. De piloot loosde de lading boven de brand, waardoor de duiker in de boomtop terechtkwam en omkwam."
    },
    {
      id: 'bs-28', title: 'Het Ruimtepak', difficulty: 'hard',
      enigma: "Een proefpersoon test een nieuw ruimtepak in een drukkamer. Het pak sluit perfect, de lucht in de kamer is veilig en er klinkt geen alarm. Toch sterft hij zonder iets te merken.",
      solution: "De zuurstoftank van het pak was per ongeluk met stikstof gevuld. Stikstof ruikt en smaakt naar niets en geeft geen benauwd gevoel. Hij raakte langzaam bewusteloos en stikte, zonder dat er een alarm afging."
    },
    {
      id: 'bs-29', title: 'Het Ijs in het Glas', difficulty: 'hard',
      enigma: "Twee mannen krijgen op een feest hetzelfde drankje met ijsblokjes. De man die zijn glas in één keer leegdrinkt, blijft leven. De man die rustig drinkt, sterft.",
      solution: "Het gif zat in de ijsblokjes en kwam pas in de drank terecht toen het ijs smolt. De snelle drinker was klaar voordat het gif vrijkwam. De langzame drinker kreeg het dodelijke mengsel binnen."
    },
    {
      id: 'bs-30', title: 'De Vuurspuwer', difficulty: 'hard',
      enigma: "Een straatartiest die vuur spuwt, overleeft elke voorstelling zonder brandwond. Maanden later sterft hij in het ziekenhuis, terwijl vuur er niets mee te maken had.",
      solution: "Bij het spuwen kreeg hij telkens een beetje lampolie in zijn longen. Zijn longen raakten daardoor steeds verder ontstoken. Het eindigde in een dodelijke longontsteking."
    },
    {
      id: 'bs-31', title: 'De Twee Piloten', difficulty: 'hard',
      enigma: "Een passagiersvliegtuig stort neer zonder technisch mankement, kaping of slecht weer. De piloten waren nuchter, uitgerust en gezond bij het opstijgen.",
      solution: "Beide piloten hadden dezelfde maaltijd uit dezelfde catering gegeten. Die maaltijd was bedorven en tijdens de vlucht werden ze allebei zo ziek dat ze niet meer konden vliegen. Daarom schrijven de regels voor dat piloten verschillende maaltijden eten."
    },
    {
      id: 'bs-32', title: 'Het Groene Atelier', difficulty: 'hard',
      enigma: "Een schilder die zijn hele leven met één bepaald groen werkte, wordt dood aangetroffen in zijn atelier. Hij slikte niets giftigs en niemand heeft hem iets aangedaan.",
      solution: "Zijn groene verf bevatte arseen, zoals vroeger gebruikelijk was. In zijn vochtige atelier ontstonden door schimmel giftige arseendampen. Jarenlang ademde hij die dampen in tot ze hem fataal werden."
    },
    {
      id: 'bs-33', title: 'Het Giftige Boek', difficulty: 'hard',
      enigma: "Een bibliothecaris wordt dood aangetroffen naast een opengeslagen oud boek. Er was niets mis met zijn eten, zijn drinken of de lucht in de kamer.",
      solution: "Iemand had gif op de bladzijden van het boek gesmeerd. De bibliothecaris likte zoals altijd zijn vinger af om de pagina's om te slaan. Zo kreeg hij bladzijde na bladzijde het gif binnen."
    },
    {
      id: 'bs-34', title: 'De Stok van de Maestro', difficulty: 'hard',
      enigma: "Een beroemde componist sterft aan zijn eigen dirigeerstok, maar niemand heeft hem iets aangedaan.",
      solution: "In de zeventiende eeuw sloegen dirigenten de maat met een zware stok op de grond. De componist stootte de stok per ongeluk op zijn eigen teen. De wond ontstak en kreeg koudvuur, waardoor hij kort daarna stierf."
    },
    {
      id: 'bs-35', title: 'Het Perfecte Alibi', difficulty: 'hard',
      enigma: "Een man wordt dood gevonden in een warme kamer. De lijkschouwer schat dat hij zes uur geleden stierf. Zijn vrouw heeft voor de hele afgelopen dag een waterdicht alibi, maar toch is zij de moordenaar.",
      solution: "Ze had haar man al dagen eerder gedood en zijn lichaam in de vrieskist bewaard. Een paar uur voor de ontdekking legde ze hem in de warme kamer, zodat het lichaam ontdooide. De lijkschouwer schatte daardoor een veel te late tijd van overlijden."
    },
    {
      id: 'bs-36', title: 'De Wespensteek', difficulty: 'hard',
      enigma: "Een imker die al duizenden keren door bijen is gestoken, sterft binnen een kwartier na één enkele steek.",
      solution: "Hij werd niet door een bij gestoken, maar door een wesp. Tegen bijengif was hij na al die jaren nauwelijks nog gevoelig. Voor wespengif was hij juist allergisch en hij kreeg een allergische shock."
    },
    {
      id: 'bs-37', title: 'De Zendmast', difficulty: 'hard',
      enigma: "Een monteur klimt in een 200 meter hoge zendmast om een lamp te vervangen. Hij valt niet, raakt geen kabel aan en toch is hij binnen een paar minuten dood.",
      solution: "De zender stond nog aan toen hij boven kwam. Een zendmast straalt zeer krachtige radiogolven uit, die het lichaam van dichtbij van binnenuit verhitten. Hij kreeg dodelijke inwendige brandwonden en zijn hart hield ermee op."
    },
    {
      id: 'bs-38', title: 'De Rode Tij', difficulty: 'hard',
      enigma: "Een gast eet in een strandtent mosselen en sterft. De mosselen waren vers, goed gekookt en kwamen uit een betrouwbare kwekerij.",
      solution: "Op het moment van de oogst stond de zee vol giftige algen, het zogenaamde rode tij. Mosselen filteren die algen uit het water en slaan de gifstoffen in hun lichaam op. Koken breekt dat gif niet af."
    },
    {
      id: 'bs-39', title: 'De Lichtgevende Wijzers', difficulty: 'hard',
      enigma: "Een vrouw sterft jaren nadat ze is gestopt met haar werk. Haar kaak en tanden waren verrot. Ze had nooit iets giftigs gegeten of gedronken.",
      solution: "Ze beschilderde vroeger wijzerplaten met lichtgevende verf met radium. Om de penselen puntig te houden likte ze er telkens aan. Zo kreeg ze jarenlang radioactief materiaal binnen dat in haar botten bleef zitten."
    },
    {
      id: 'bs-40', title: 'De Stille Nacht', difficulty: 'hard',
      enigma: "In één nacht sterven honderden dorpsbewoners en hun vee. Er was geen vuur, geen explosie, geen aanval en geen gif in het voedsel.",
      solution: "Uit het diepe meer bij het dorp barstte plotseling een enorme wolk koolzuurgas omhoog. Het gas is zwaarder dan lucht en vloeide als een onzichtbare deken door de vallei. Wie sliep, stikte zonder iets te merken."
    },

    /* ===== EXTREME (10) ===== */
    {
      id: 'bs-41', title: 'De Verzonken Tank', difficulty: 'extreme',
      enigma: "Vier duikers leven wekenlang in een luchtdichte tank op een schip. Als de bemanning de buitenklep opent, sterven alle vier op slag, hoewel er geen druppel water in de tank kwam.",
      solution: "Verzadigingsduikers leven in een tank onder zeer hoge druk, zodat hun lichaam went aan het werken op grote diepte. Door de klep te openen viel de druk in één keer weg naar normale druk. De gassen in hun bloed en weefsels vormden direct bellen, wat onmiddellijk dodelijk is."
    },
    {
      id: 'bs-42', title: 'Het Rekwisiet', difficulty: 'extreme',
      enigma: "Tijdens de generale repetitie van een toneelstuk haalt een acteur de trekker over van een antiek pistool dat het theater jaren geleden kocht. Zijn tegenspeler zakt neer en blijft liggen. De regisseur applaudisseert nog. Niemand wilde iemand kwaad doen.",
      solution: "Het pistool was geen namaak maar een echt antiek wapen van een rommelmarkt. De vorige eigenaar had nooit alle patronen verwijderd: in één kamer van de trommel zat nog een echte kogel. Bij eerdere repetities viel de hamer telkens op een lege kamer, maar nu draaide de trommel precies naar die ene. De regisseur hield de val voor goed acteerwerk."
    },
    {
      id: 'bs-43', title: 'De Ballonloting', difficulty: 'extreme',
      enigma: "Vier mannen drijven in een luchtballon boven open zee. Eén voor één springen drie van hen vrijwillig uit de mand. Alleen de laatste bereikt levend de kust. Niemand dwong iemand en niemand kreeg ooit verwijten.",
      solution: "De ballon verloor gas en daalde richting de golven. Ze gooiden eerst alle ballast, voedsel en kleren overboord, maar het was nog niet genoeg om de kust te halen. Ze rekenden uit dat de ballon met elk gewicht minder net genoeg hoogte zou houden voor de resterende afstand. Daarom trokken ze lootjes en sprongen de verliezers één voor één, zodat de laatste man het strand haalde."
    },
    {
      id: 'bs-44', title: 'De Slaapwandelaar op de Rots', difficulty: 'extreme',
      enigma: "Twee klimmers slapen in een tentje op een smalle richel van een steile bergwand. 's Ochtends is de tent van binnenuit geopend en één van hen is verdwenen. Er was geen storm, geen steenslag en geen ruzie.",
      solution: "De vermiste klimmer was een slaapwandelaar. Midden in de nacht maakte hij in zijn slaap de lijn los waarmee hij aan de wand hing, ritste de tent open en liep van de richel af. Zijn maat sliep door vermoeidheid zo diep dat hij niets hoorde."
    },
    {
      id: 'bs-45', title: 'De Stille Diepte', difficulty: 'extreme',
      enigma: "Een onderzoeksonderzeeër komt na een diepzeeduik vanzelf naar boven, onbeschadigd en met alle luiken dicht. Binnen zijn de drie onderzoekers dood. In het laatste radiobericht zei één van hen lachend dat er buiten iemand voor het raam stond te zwaaien.",
      solution: "De kalk die het koolstofdioxide uit de lucht haalde was verzadigd en de ventilatie viel uit. Een te hoog CO2-gehalte maakt eerst slaperig en geeft hallucinaties, daarna volgen bewusteloosheid en de dood. Het zwaaiende figuur was een hallucinatie. De noodballast liet de boot automatisch opstijgen toen niemand meer reageerde."
    },
    {
      id: 'bs-46', title: 'De Zoete Golf', difficulty: 'extreme',
      enigma: "Op een warme dag in januari stort in een stadswijk een muur van donkerbruine vloeistof door de straten. Mensen en paarden verdrinken en gebouwen storten in. Het regende niet en er was geen rivier of dijk in de buurt.",
      solution: "Een enorme opslagtank met melasse barstte open. De stroperige golf van miljoenen liters raasde met tientallen kilometers per uur door de straat. De zware, kleverige massa verpletterde en verdronk mensen en maakte redden bijna onmogelijk."
    },
    {
      id: 'bs-47', title: 'De Verdwijntruc', difficulty: 'extreme',
      enigma: "Een goochelaar laat elke avond zijn assistente verdwijnen en weer verschijnen. Op de avond van de jubileumshow komt ze niet meer terug. De truc werd perfect uitgevoerd en niemand saboteerde iets.",
      solution: "Tijdens de truc verstopte de assistente zich in een geheim compartiment onder het podium, dat met een elektrisch slot sluit en voor maximaal een minuut lucht bevat. Door een kortsluiting in de zaal sloeg het slot vast en de handmatige noodontgrendeling was jaren eerder dichtgeverfd. Zij stikte terwijl het publiek ademloos op haar terugkeer wachtte."
    },
    {
      id: 'bs-48', title: 'De Verwisseling', difficulty: 'extreme',
      enigma: "Twee mannen met precies dezelfde voor- en achternaam liggen tegelijk op dezelfde afdeling van een ziekenhuis. De één gaat de volgende dag gezond naar huis, de ander sterft aan iets waarvoor hij niet was opgenomen. Niemand deed iets opzettelijk fout.",
      solution: "Een verpleegkundige las alleen de naam op de lijst en gaf een zware dosis insuline aan de verkeerde patiënt, die helemaal niet suikerziek was. Hij raakte in coma en overleed. Sindsdien moeten ziekenhuizen minstens twee identificatiekenmerken controleren, zoals naam én geboortedatum."
    },
    {
      id: 'bs-49', title: 'De Trein zonder Uitweg', difficulty: 'extreme',
      enigma: "Een zware stoomtrein met honderden reizigers rijdt 's nachts een lange bergtunnel in. Er is geen botsing, geen brand en geen instorting, maar de trein komt nooit meer uit de tunnel en bijna alle reizigers zijn de volgende ochtend dood.",
      solution: "De overladen locomotief kwam op de steile helling in de tunnel tot stilstand doordat de wielen slipten. De brandende kolen produceerden koolmonoxide dat zich in de tunnel ophoopte. Machinisten en reizigers vielen in slaap en stikten zonder dat iemand alarm kon slaan."
    },
    {
      id: 'bs-50', title: 'Het Spookvliegtuig', difficulty: 'extreme',
      enigma: "Een passagiersvliegtuig vliegt na de start nog ruim twee uur door zonder antwoord op de radio. Gevechtspiloten die ernaast vliegen zien de copiloot slap in zijn stoel hangen. Er was geen kaping, geen bom en geen defect aan de motoren.",
      solution: "Bij het opstijgen stond de cabinedrukregeling per ongeluk op handmatig en niemand controleerde dat. Terwijl het toestel steeg, daalde de luchtdruk in de cabine. Door zuurstofgebrek vielen piloten en passagiers één voor één flauw. De automatische piloot hield het toestel in de lucht tot de brandstof op was."
    }
  ];
})();