(function () {
  'use strict';

  var domains = [
    { id: 'electricity', name: 'Sähköfysiikka & sähköoppi', desc: 'Varaus, kentät, potentiaali, teho ja sähkömagnetismin sovellukset.', topics: ['electric-basic', 'electric-applied', 'electrical-theory'] },
    { id: 'math', name: 'Tekniikan matematiikka', desc: 'Geometria, vektorit, kompleksiluvut, funktiot ja riippuvuudet.', topics: ['geometry', 'vectors', 'complex', 'functions'] },
    { id: 'physics', name: 'Tekniikan fysiikka', desc: 'Dynamiikka, voima ja liike, kitka sekä lämpöopin ilmiöt.', topics: ['dynamics', 'force-motion', 'friction', 'thermal'] },
    { id: 'circuits', name: 'Tasasähköpiirit', desc: 'Ohmin laki, Kirchhoffin lait, sarja- ja rinnankytkennät sekä teho.', topics: ['dc-circuits'] }
  ];

  var topics = {
    'electric-basic': { name: 'Sähköfysiikka — perusteet', domain: 'electricity' },
    'electric-applied': { name: 'Sähköfysiikka — sovelletut', domain: 'electricity' },
    'electrical-theory': { name: 'Sähköoppi', domain: 'electricity' },
    'geometry': { name: 'Tasogeometria', domain: 'math' },
    'vectors': { name: 'Vektorit tasossa ja avaruudessa', domain: 'math' },
    'complex': { name: 'Kompleksiluvut', domain: 'math' },
    'functions': { name: 'Funktiot ja riippuvuudet', domain: 'math' },
    'dynamics': { name: 'Dynamiikka', domain: 'physics' },
    'force-motion': { name: 'Voima ja liike', domain: 'physics' },
    'friction': { name: 'Kitka', domain: 'physics' },
    'thermal': { name: 'Lämpöoppi', domain: 'physics' },
    'dc-circuits': { name: 'Tasasähköpiirit', domain: 'circuits' }
  };

  var difficultyNames = { easy: 'Helppo', medium: 'Keskivaikea', hard: 'Vaikea', extreme: 'Erittäin haastava' };
  var config = { mode: 'practice', length: 10, difficulty: 'easy', timer: false, selected: Object.keys(topics), weighted: [] };
  var session = null;
  var timerHandle = null;
  var todayKey = new Date().toISOString().slice(0, 10);
  var stats = load('virtapiiriStats', { total: 0, correct: 0, today: {}, byDomain: {} });
  if (!stats.points) stats.points = 0;
  if (!stats.maxPoints) stats.maxPoints = 0;
  if (!stats.minigames) stats.minigames = { rapidBest: 0, memoryBest: 0, hangmanWins: 0 };
  var knownCards = load('virtapiiriCards', []);
  var wrongBank = load('virtapiiriWrongBank', []);

  var formulas = [
    { topic: 'electric-basic', title: 'Varaus ja virta', formula: 'Q = I · t', symbols: 'Q varaus [C], I virta [A], t aika [s]' },
    { topic: 'electric-basic', title: 'Coulombin laki', formula: 'F = k|q₁q₂| / r²', symbols: 'k ≈ 8,99·10⁹ Nm²/C², q varaus, r etäisyys' },
    { topic: 'electric-basic', title: 'Pistevarauksen kenttä', formula: 'E = k|Q| / r²', symbols: 'E kentän voimakkuus [N/C], Q varaus [C]' },
    { topic: 'electric-applied', title: 'Kondensaattorin varaus', formula: 'Q = C · U', symbols: 'C kapasitanssi [F], U jännite [V]' },
    { topic: 'electric-applied', title: 'Kondensaattorin energia', formula: 'W = ½CU²', symbols: 'W energia [J], C kapasitanssi, U jännite' },
    { topic: 'electrical-theory', title: 'Sähköteho', formula: 'P = UI = I²R = U²/R', symbols: 'P teho [W], U jännite, I virta, R resistanssi' },
    { topic: 'geometry', title: 'Pythagoraan lause', formula: 'c² = a² + b²', symbols: 'c hypotenuusa, a ja b kateetit' },
    { topic: 'geometry', title: 'Kolmion pinta-ala', formula: 'A = ½ab sin(γ)', symbols: 'a ja b sivut, γ niiden välinen kulma' },
    { topic: 'vectors', title: 'Pistetulo', formula: 'a·b = aₓbₓ + aᵧbᵧ + a_zb_z', symbols: 'Tulos on skalaari; kohtisuorilla vektoreilla arvo on 0' },
    { topic: 'vectors', title: 'Ristitulon pituus', formula: '|a×b| = |a||b|sin(θ)', symbols: 'Vastaa vektorien virittämän suunnikkaan pinta-alaa' },
    { topic: 'complex', title: 'Kompleksiluvun itseisarvo', formula: '|z| = √(a² + b²)', symbols: 'z = a + bi' },
    { topic: 'complex', title: 'De Moivren kaava', formula: '[r(cosφ+i sinφ)]ⁿ = rⁿ(cos nφ+i sin nφ)', symbols: 'r itseisarvo, φ argumentti' },
    { topic: 'functions', title: 'Suoran kulmakerroin', formula: 'k = (y₂−y₁)/(x₂−x₁)', symbols: 'Kahden pisteen kautta kulkevalle suoralle' },
    { topic: 'functions', title: 'Eksponentiaalinen malli', formula: 'y(t) = y₀eᵏᵗ', symbols: 'y₀ alkuarvo, k suhteellinen kasvukerroin' },
    { topic: 'dynamics', title: 'Liikemäärä ja impulssi', formula: 'p = mv,  J = Δp = FΔt', symbols: 'p liikemäärä, J impulssi' },
    { topic: 'dynamics', title: 'Liike-energia', formula: 'Eₖ = ½mv²', symbols: 'm massa [kg], v nopeus [m/s]' },
    { topic: 'force-motion', title: 'Newtonin toinen laki', formula: 'ΣF = ma', symbols: 'Kokonaisvoima määrää kiihtyvyyden' },
    { topic: 'force-motion', title: 'Tasaisesti kiihtyvä liike', formula: 'v = v₀ + at,  s = v₀t + ½at²', symbols: 'v nopeus, a kiihtyvyys, s matka' },
    { topic: 'friction', title: 'Kitkavoima', formula: 'Fµ = µN', symbols: 'µ kitkakerroin, N normaalivoima' },
    { topic: 'thermal', title: 'Lämpömäärä', formula: 'Q = mcΔT', symbols: 'm massa, c ominaislämpökapasiteetti, ΔT lämpötilan muutos' },
    { topic: 'thermal', title: 'Lämpölaajeneminen', formula: 'ΔL = αL₀ΔT', symbols: 'α pituuden lämpötilakerroin' },
    { topic: 'thermal', title: 'Carnot-hyötysuhde', formula: 'η = 1 − T_c/T_h', symbols: 'Lämpötilat kelvineinä' },
    { topic: 'dc-circuits', title: 'Ohmin laki', formula: 'U = RI', symbols: 'U jännite [V], R resistanssi [Ω], I virta [A]' },
    { topic: 'dc-circuits', title: 'Rinnankytkentä', formula: '1/R = 1/R₁ + 1/R₂ + …', symbols: 'Käänteisresistanssit summautuvat' },
    { topic: 'dc-circuits', title: 'Jännitteenjako', formula: 'U₂ = U · R₂/(R₁ + R₂)', symbols: 'Sarjaan kytketyt vastukset' }
  ];

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function byId(id) { return document.getElementById(id); }
  function round(value, digits) { var p = Math.pow(10, digits || 0); return Math.round(value * p) / p; }
  function fmt(value) { return String(value).replace('.', ','); }
  function pick(list, seed) { return list[Math.abs(seed) % list.length]; }
  function shuffle(list) {
    var copy = list.slice();
    for (var i = copy.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = copy[i]; copy[i] = copy[j]; copy[j] = temp;
    }
    return copy;
  }
  function mcq(topic, prompt, choices, answer, hint, explanation) {
    return { topic: topic, type: 'mcq', prompt: prompt, choices: choices, answer: answer, hint: hint, explanation: explanation, formula: '' };
  }
  function numeric(topic, prompt, answer, tolerance, unit, hint, formula, explanation) {
    return { topic: topic, type: 'open', answerType: 'numeric', prompt: prompt, answer: answer, tolerance: tolerance, unit: unit, hint: hint, formula: formula, explanation: explanation };
  }

  var concepts = {
    'electric-basic': {
      easy: [
        ['Mikä on sähkövarauksen SI-yksikkö?', ['voltti', 'ampeeri', 'coulombi', 'ohmi'], 2, 'Etsi suure, jonka tunnus on Q.', 'Sähkövarauksen SI-yksikkö on coulombi (C).'],
        ['Miten samanmerkkiset sähkövaraukset vaikuttavat toisiinsa?', ['vetävät puoleensa', 'hylkivät toisiaan', 'neutraloituvat aina', 'eivät vaikuta'], 1, 'Ajattele kahta elektronia lähellä toisiaan.', 'Samanmerkkiset varaukset hylkivät toisiaan.']
      ],
      medium: [
        ['Mihin suuntaan sähkökentän suunta määritellään?', ['elektronin liikesuuntaan', 'positiiviseen testivaraukseen kohdistuvan voiman suuntaan', 'aina kohti suurempaa resistanssia', 'magneettikentän suuntaan'], 1, 'Määritelmä käyttää positiivista testivarausta.', 'Sähkökentän suunta on positiiviseen testivaraukseen kohdistuvan voiman suunta.']
      ],
      hard: [
        ['Suljetun pinnan läpi kulkeva sähkövuo riippuu Gaussin lain mukaan suoraan mistä?', ['pinnan muodosta', 'pinnan sisään jäävästä nettovarauksesta', 'ulkopuolisista varauksista', 'pinnan lämpötilasta'], 1, 'Ratkaiseva asia on se, mitä pinta sulkee sisäänsä.', 'Gaussin lain mukaan vuo riippuu suljetun pinnan sisään jäävästä nettovarauksesta.']
      ],
      extreme: [
        ['Missä tilanteessa Gaussin laki antaa sähkökentän suuruuden suoralla algebrallisella ratkaisulla?', ['millä tahansa varausjakaumalla', 'vain kun kentällä on riittävä symmetria', 'vain tyhjiössä ilman varauksia', 'ainoastaan ajasta riippuvassa kentässä'], 1, 'Lain voimassaolo ja sen helppo ratkaistavuus ovat eri asioita.', 'Gaussin laki on aina voimassa, mutta kentän suora ratkaisu edellyttää sopivaa symmetriaa.']
      ]
    },
    'electric-applied': {
      easy: [
        ['Mikä komponentti varastoi energiaa sähkökenttään?', ['vastus', 'kondensaattori', 'sulake', 'diodi'], 1, 'Sen perusyhtälössä esiintyvät C, U ja Q.', 'Kondensaattori varastoi energiaa sähkökenttään.']
      ],
      medium: [
        ['Mitä ideaalisen kondensaattorin kapasitanssille tapahtuu, kun levyjen välimatka kasvaa?', ['kasvaa', 'pienenee', 'ei muutu', 'muuttuu nollaksi aina'], 1, 'Levykondensaattorille C = εA/d.', 'Kapasitanssi pienenee, koska se on kääntäen verrannollinen levyjen etäisyyteen.']
      ],
      hard: [
        ['Mikä suure säilyy eristetyssä, jännitelähteestä irrotetussa kondensaattorissa, kun levyjen väliä muutetaan?', ['jännite', 'kapasitanssi', 'varaus', 'sähkökentän energia'], 2, 'Piiristä ei ole reittiä varauksen siirtymiselle.', 'Eristetyn kondensaattorin varaus säilyy.']
      ],
      extreme: [
        ['Dielektriitti työnnetään eristettyyn kondensaattoriin. Mitä tapahtuu sen energialle?', ['kasvaa', 'pienenee', 'säilyy', 'muuttuu aina nollaksi'], 1, 'Varaus säilyy, mutta kapasitanssi kasvaa.', 'Kun Q säilyy ja C kasvaa, energia W = Q²/(2C) pienenee.']
      ]
    },
    'electrical-theory': {
      easy: [
        ['Mitä sähkövirta kuvaa?', ['energian määrää', 'varauksen siirtymisnopeutta', 'resistanssin muutosta', 'kentän suuntaa'], 1, 'Virran määritelmässä jaetaan varaus ajalla.', 'Sähkövirta kertoo poikkipinnan läpi kulkevan varauksen aikayksikössä.']
      ],
      medium: [
        ['Mikä on elektronien liikesuunta metallijohtimessa suhteessa sovittuun virran suuntaan?', ['sama', 'vastakkainen', 'kohtisuora', 'satunnainen'], 1, 'Virran suunta sovittiin ennen elektronin löytämistä.', 'Elektronit liikkuvat metallissa sovittuun virran suuntaan nähden vastakkaisesti.']
      ],
      hard: [
        ['Millä ehdolla lineaarista piiriä voidaan analysoida superpositioperiaatteella?', ['piirissä on vain yksi lähde', 'komponenttien vaste on lineaarinen', 'kaikki vastukset ovat samoja', 'jännite on vakio'], 1, 'Periaate perustuu lineaarisuuteen.', 'Superpositio toimii, kun piirin komponenttien ja lähteiden väliset riippuvuudet ovat lineaarisia.']
      ],
      extreme: [
        ['Miksi superpositiolla ei lasketa suoraan yksittäisten lähteiden tehoja yhteen?', ['teho ei riipu jännitteestä', 'teho on jännitteen tai virran neliöllinen suure', 'lähteitä ei voi passivoida', 'resistanssi muuttuu aina'], 1, 'Lineaarisuuden pitää säilyä summattavassa suureessa.', 'Jännitteet ja virrat superponoituvat, mutta teho on niistä epälineaarisesti riippuva.']
      ]
    },
    'geometry': {
      easy: [['Mikä on suorakulmaisen kolmion hypotenuusan neliö?', ['a + b', 'a² + b²', '2ab', 'a² − b²'], 1, 'Muista Pythagoraan lause.', 'Pythagoraan lause: c² = a² + b².']],
      medium: [['Mikä kaava antaa ympyräsektorin pinta-alan, kun kulma θ annetaan radiaaneina?', ['rθ', '½r²θ', 'πrθ', '2r²θ'], 1, 'Täysi kierros 2π antaa koko ympyrän pinta-alan.', 'Sektorin ala radiaaneilla on A = ½r²θ.']],
      hard: [['Mikä suure säilyy yhdenmuotoisissa kuvioissa?', ['pinta-ala', 'piiri', 'vastaavien sivujen suhde', 'kaikki sivunpituudet'], 2, 'Koko voi muuttua, muoto ei.', 'Vastaavien sivujen suhde eli mittakaava on yhdenmuotoisissa kuvioissa vakio.']],
      extreme: [['Mikä lause yhdistää kolmion sivut ja yhden kulman ilman suorakulmaisuusoletusta?', ['Pythagoraan lause', 'kosinilause', 'Thaleen lause', 'Gaussin laki'], 1, 'Se yleistää Pythagoraan lauseen.', 'Kosinilause c² = a² + b² − 2ab cosγ toimii yleiselle kolmiolle.']]
    },
    'vectors': {
      easy: [['Kaksi vektoria ovat kohtisuorassa, kun niiden pistetulo on…', ['1', '−1', '0', 'niiden pituuksien tulo'], 2, 'Pistetulossa esiintyy cos θ.', 'Koska cos 90° = 0, kohtisuorien vektorien pistetulo on nolla.']],
      medium: [['Mitä ristitulon a × b suunta noudattaa?', ['vasemman käden sääntöä', 'oikean käden sääntöä', 'aina x-akselia', 'vektorien keskiarvoa'], 1, 'Käpristä sormet ensimmäisestä vektorista toiseen.', 'Ristitulon suunta määräytyy oikean käden säännöllä.']],
      hard: [['Kolme vektoria ovat samassa tasossa, jos niiden skalaarikolmitulo on…', ['1', '−1', '0', 'maksimaalinen'], 2, 'Tilavuus häviää samassa tasossa.', 'Skalaarikolmitulon nollautuminen merkitsee, että vektorit ovat koplanaariset.']],
      extreme: [['Mitä Gram-determinantin nollautuminen kertoo vektorijoukosta?', ['vektorit ovat ortonormaaleja', 'vektorit ovat lineaarisesti riippuvia', 'kaikkien pituus on yksi', 'ristitulot ovat maksimaalisia'], 1, 'Gram-matriisi rakentuu vektorien pistetuloista.', 'Gram-determinantti on nolla täsmälleen, kun vektorit ovat lineaarisesti riippuvia.']]
    },
    'complex': {
      easy: [['Mikä on imaginääriyksikön i neliö?', ['1', '−1', 'i', '−i'], 1, 'Tämä on imaginääriyksikön määritelmä.', 'Määritelmän mukaan i² = −1.']],
      medium: [['Mitä kompleksiluvun kertominen luvulla i tekee kompleksitasossa?', ['peilaa reaaliakselin suhteen', 'kiertää 90° vastapäivään', 'puolittaa itseisarvon', 'kiertää 180°'], 1, 'Luvun i argumentti on π/2.', 'Kertominen i:llä kiertää lukua 90 astetta vastapäivään.']],
      hard: [['Mikä on reaalikertoimisen toisen asteen yhtälön epäreaalisten juurten suhde?', ['ne ovat vastalukuja', 'ne ovat kompleksikonjugaatteja', 'niiden summa on aina i', 'niiden itseisarvo on nolla'], 1, 'Kertoimet eivät sisällä imaginääriosaa.', 'Epäreaaliset juuret esiintyvät kompleksikonjugaattipareina.']],
      extreme: [['Miksi kompleksisen eksponentin e^(iφ) itseisarvo on yksi?', ['reaaliosa on aina nolla', 'Eulerin kaavan sini- ja kosinikomponentit muodostavat yksikköympyrän', 'i:n itseisarvo on nolla', 'eksponentti kumoutuu'], 1, 'Kirjoita eksponentti Eulerin kaavalla.', 'Eulerin kaava antaa cosφ + i sinφ, jonka itseisarvo on √(cos²φ+sin²φ)=1.']]
    },
    'functions': {
      easy: [['Suoraan verrannollisessa riippuvuudessa y = kx kuvaaja on…', ['origon kautta kulkeva suora', 'paraabeli', 'vaakasuora', 'hyperbeli'], 0, 'Aseta x = 0.', 'Suoraan verrannollinen riippuvuus on origon kautta kulkeva suora.']],
      medium: [['Mitä derivaatta kuvaa fysikaalisessa mallissa?', ['kokonaismäärää aina', 'hetkellistä muutosnopeutta', 'mittausvirhettä', 'funktion nollakohtaa aina'], 1, 'Ajattele paikan derivaattaa ajan suhteen.', 'Derivaatta kuvaa hetkellistä muutosnopeutta.']],
      hard: [['Minkä muotoinen ratkaisu ensimmäisen kertaluvun homogeenisella lineaarisella differentiaaliyhtälöllä y′ = ky on?', ['y = C + kx', 'y = Cx²', 'y = Ceᵏˣ', 'y = k/x'], 2, 'Etsi funktio, joka säilyttää muotonsa derivoitaessa.', 'Eksponenttifunktio Ceᵏˣ toteuttaa yhtälön.']],
      extreme: [['Mitä Laplace-muunnoksessa tapahtuu derivaatalle f′(t)?', ['se muuttuu F(s)/s:ksi', 'se muuttuu sF(s) − f(0):ksi', 'se säilyy ennallaan', 'se muuttuu aina nollaksi'], 1, 'Alkuarvo tulee mukaan derivaatan muunnokseen.', 'L{f′} = sF(s) − f(0), mikä tekee alkuarvotehtävistä algebrallisia.']]
    },
    'dynamics': {
      easy: [['Mikä suure kuvaa kappaleen liikkeen muuttumisen hitautta?', ['massa', 'nopeus', 'teho', 'paine'], 0, 'Newtonin toisessa laissa se kertoo, miten voima tuottaa kiihtyvyyttä.', 'Massa mittaa kappaleen inertiaa.']],
      medium: [['Milloin liikemäärä säilyy systeemissä?', ['kun nopeus on vakio', 'kun ulkoisten voimien resultantti on nolla', 'kun massa pienenee', 'vain levossa'], 1, 'Tarkastele koko systeemin ulkoisia vaikutuksia.', 'Liikemäärä säilyy, kun systeemiin vaikuttava ulkoinen kokonaisvoima on nolla.']],
      hard: [['Konservatiivisen voiman tekemä työ suljetulla reitillä on…', ['positiivinen', 'negatiivinen', 'nolla', 'ääretön'], 2, 'Alku- ja loppupiste ovat samat.', 'Konservatiivisen voiman työ riippuu vain päätepisteistä, joten suljetulla reitillä se on nolla.']],
      extreme: [['Mikä suure säilyy keskusvoimakentässä voiman konservatiivisuuden lisäksi?', ['vain massa', 'kulmaliikemäärä', 'vain nopeuden suunta', 'kiihtyvyysvektori'], 1, 'Keskusvoiman momentti origon suhteen on nolla.', 'Nollamomentti merkitsee kulmaliikemäärän säilymistä.']]
    },
    'force-motion': {
      easy: [['Mikä Newtonin laki yhdistää voiman, massan ja kiihtyvyyden?', ['ensimmäinen', 'toinen', 'kolmas', 'gravitaatiolaki'], 1, 'Yhtälö on F = ma.', 'Newtonin toinen laki: F = ma.']],
      medium: [['Kappale liikkuu vakionopeudella suoraviivaisesti. Mikä on siihen vaikuttava kokonaisvoima?', ['vakio mutta ei nolla', 'nolla', 'mg', 'riippuu nopeudesta'], 1, 'Vakionopeudella kiihtyvyys on nolla.', 'Kun a = 0, myös kokonaisvoima F = ma on nolla.']],
      hard: [['Keskeisliikkeessä keskeiskiihtyvyys suuntautuu…', ['tangentiaalisesti', 'radiaalisti ulospäin', 'kohti ympyräradan keskipistettä', 'nopeuden suuntaan'], 2, 'Nopeuden suunta muuttuu kohti radan keskustaa.', 'Keskeiskiihtyvyys on radiaalisesti kohti ympyräradan keskipistettä.']],
      extreme: [['Rakettien liikkeessä miksi yhtälö F = ma ei yksin riitä vakiomassaisessa muodossa?', ['painovoima katoaa', 'massa muuttuu polttoaineen poistuessa', 'kiihtyvyys on aina nolla', 'nopeus ei ole vektori'], 1, 'Tarkastele systeemin massavirtaa.', 'Raketti on muuttuvamassainen systeemi, joten liikemäärätaseeseen tulee ulos virtaavan massan vaikutus.']]
    },
    'friction': {
      easy: [['Mihin suuntaan liukukitka vaikuttaa?', ['liikkeen suuntaan', 'liukumisnopeuden vastakkaiseen suuntaan', 'aina ylöspäin', 'pinnan normaalin suuntaan'], 1, 'Kitka vastustaa pintojen suhteellista liikettä.', 'Liukukitka vaikuttaa suhteellisen liikkeen vastakkaiseen suuntaan.']],
      medium: [['Lepokitkan suuruus ennen liukumista on…', ['aina μₛN', 'tarvittavan suuruinen enintään arvoon μₛN', 'aina nolla', 'riippumaton normaalivoimasta'], 1, 'μₛN on yläraja, ei automaattinen arvo.', 'Lepokitka mukautuu tilanteeseen ja on enintään μₛN.']],
      hard: [['Miksi vierintävastus on usein liukukitkaa pienempi?', ['normaalivoimaa ei ole', 'kosketusalueen muodonmuutokset ja energiahäviöt ovat pienemmät', 'massa katoaa', 'painovoima kumoutuu'], 1, 'Vertaa kosketuspintojen suhteellista liikettä ja muodonmuutoksia.', 'Vierinnässä kosketuspinnat eivät yleensä liu’u toistensa suhteen ja häviöt jäävät pienemmiksi.']],
      extreme: [['Miksi Coulombin kitkamalli voi epäonnistua tarkassa dynaamisessa simuloinnissa?', ['se ei sisällä massaa', 'se sivuuttaa nopeus-, lämpötila- ja pintatilariippuvuuksia', 'normaalivoimaa ei ole', 'kitka on aina konservatiivinen'], 1, 'Todellinen kosketus ei määräydy yhdellä vakiokertoimella.', 'Coulombin malli on idealisointi eikä kuvaa esimerkiksi Stribeck-ilmiötä tai lämpötilariippuvuutta.']]
    },
    'thermal': {
      easy: [['Mikä lämpötila-asteikko alkaa absoluuttisesta nollapisteestä?', ['Celsius', 'Fahrenheit', 'Kelvin', 'Rankine vain'], 2, 'SI-järjestelmän lämpötilayksikkö auttaa.', 'Kelvin-asteikko alkaa absoluuttisesta nollapisteestä.']],
      medium: [['Mikä termodynamiikan suure kuvaa epäjärjestyksen ja energian hajaantumisen suuntaa?', ['entalpia', 'entropia', 'paine', 'ominaislämpökapasiteetti'], 1, 'Toinen pääsääntö liittyy tähän suureeseen.', 'Entropia kuvaa energian hajaantumista ja kasvaa eristetyssä systeemissä.']],
      hard: [['Carnot’n lämpökoneen hyötysuhde riippuu ideaalitapauksessa mistä?', ['työaineen massasta', 'lämpövaraajien absoluuttisista lämpötiloista', 'prosessin kestosta', 'männän pinta-alasta'], 1, 'Ideaalinen yläraja määräytyy kuuman ja kylmän lämpötilasta.', 'Carnot-hyötysuhde riippuu kuuman ja kylmän lämpövaraajan Kelvin-lämpötiloista.']],
      extreme: [['Miksi reversiibelin adiabaattisen ideaalikaasuprosessin entropian muutos on nolla?', ['lämpötila ei muutu', 'prosessi on isentrooppinen: lämpöä ei siirry eikä entropiaa synny', 'paine on vakio', 'tilavuus on aina nolla'], 1, 'Yhdistä adiabaattisuus ja reversiibeliys.', 'Reversiibelissä adiabaattisessa prosessissa δQ_rev/T = 0 eikä irreversiibeliä entropiantuottoa ole.']]
    },
    'dc-circuits': {
      easy: [['Miten ideaalinen ampeerimittari kytketään mitattavaan haaraan?', ['rinnan', 'sarjaan', 'avoimeksi piiriksi', 'suoraan jännitelähteen napojen yli'], 1, 'Sama virta kulkee mittarin ja kuorman läpi.', 'Ampeerimittari kytketään sarjaan mitattavan haaran kanssa.']],
      medium: [['Kirchhoffin virtalaki perustuu minkä suureen säilymiseen?', ['energian', 'varauksen', 'massan', 'resistanssin'], 1, 'Solmuun ei kerry ideaalitilanteessa nettovarausta.', 'Virtalaki seuraa sähkövarauksen säilymisestä.']],
      hard: [['Théveninin teoreemassa lineaarinen kaksinapainen piiri korvataan…', ['virtalähteellä yksin', 'jännitelähteellä ja sarjaresistanssilla', 'kondensaattorilla', 'kahdella rinnakkaisella jännitelähteellä'], 1, 'Ekvivalentissa on avoimen piirin jännite ja sisäinen resistanssi.', 'Thévenin-ekvivalentti on ideaalinen jännitelähde sarjassa ekvivalenttiresistanssin kanssa.']],
      extreme: [['Mikä ehto maksimoi kuormaan siirtyvän tehon resistiivisessä Thévenin-piirissä?', ['R_L = 0', 'R_L = R_Th', 'R_L → ∞', 'R_L = 2R_Th'], 1, 'Etsi kuormaresistanssin suhde lähteen sisäiseen resistanssiin.', 'Maksimitehonsiirtolauseen mukaan R_L = R_Th.']]
    }
  };

  function extremeQuestion(topic, seed) {
    var n = Math.abs(seed) + 7;
    if (topic === 'electric-basic') {
      var q = (2 + n % 7) * 1e-6, E = 800 + (n % 6) * 200, d = (2 + n % 5) / 100;
      return numeric(topic, 'Varaus ' + (q * 1e6) + ' µC siirretään homogeenisessa kentässä ' + E + ' V/m kentän suuntaan matka ' + fmt(d) + ' m. Laske kentän tekemä työ millijouleina.', round(q * E * d * 1000, 3), .03, 'mJ', 'Yhdistä voima qE ja siirtymä. Tarkista mikro- ja milliyksiköt.', 'W = qEd', 'Kentän tekemä työ on ' + fmt(round(q * E * d * 1000, 3)) + ' mJ.');
    }
    if (topic === 'electric-applied') {
      var R = 20 + (n % 5) * 10, C = 10 + (n % 6) * 5;
      return numeric(topic, 'RC-piirissä R = ' + R + ' kΩ ja C = ' + C + ' µF. Laske aikavakio millisekunteina.', R * C, .02, 'ms', 'Kilo-ohmin ja mikrofaradin tulo on millisekunti.', 'τ = RC', 'Aikavakio on ' + (R * C) + ' ms.');
    }
    if (topic === 'electrical-theory') {
      var P = 700 + (n % 6) * 100, e1 = 92 - n % 4, e2 = 88 - n % 3;
      return numeric(topic, 'Kaksivaiheisen sähkökäytön ottoteho on ' + P + ' W. Vaiheiden hyötysuhteet ovat ' + e1 + ' % ja ' + e2 + ' %. Laske kokonaisuuden lähtöteho.', round(P * e1 / 100 * e2 / 100, 2), .02, 'W', 'Peräkkäisten vaiheiden hyötysuhteet kerrotaan, niitä ei lasketa yhteen.', 'P_out = P_in · η₁ · η₂', 'Lähtöteho on ' + fmt(round(P * e1 / 100 * e2 / 100, 2)) + ' W.');
    }
    if (topic === 'geometry') {
      var a = 5 + n % 7, b = 7 + (n * 2) % 8, angle = 35 + (n % 5) * 10;
      return numeric(topic, 'Kolmion sivut a = ' + a + ' cm ja b = ' + b + ' cm rajaavat kulman ' + angle + '°. Laske vastainen sivu c.', round(Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(angle * Math.PI / 180)), 2), .03, 'cm', 'Tämä ei ole suorakulmainen kolmio. Käytä Pythagoraan lauseen yleistystä.', 'c² = a² + b² − 2ab cosγ', 'Sivun pituus on ' + fmt(round(Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(angle * Math.PI / 180)), 2)) + ' cm.');
    }
    if (topic === 'vectors') {
      var ax = 1 + n % 4, ay = 2 + n % 5, az = 1 + n % 3, bx = -1 - n % 3, by = 2 + (n * 2) % 4, bz = 3 + n % 4;
      var dot = ax * bx + ay * by + az * bz, mag = Math.sqrt(ax * ax + ay * ay + az * az) * Math.sqrt(bx * bx + by * by + bz * bz);
      return numeric(topic, 'Laske vektorien a = (' + ax + ', ' + ay + ', ' + az + ') ja b = (' + bx + ', ' + by + ', ' + bz + ') välinen kulma asteina.', round(Math.acos(dot / mag) * 180 / Math.PI, 2), .03, '°', 'Ratkaise kulman kosini pistetulon avulla ja käytä käänteiskosinia.', 'cosθ = (a·b)/(|a||b|)', 'Kulma on ' + fmt(round(Math.acos(dot / mag) * 180 / Math.PI, 2)) + '°.');
    }
    if (topic === 'complex') {
      var real = 5 + n % 8, imag = 4 + (n * 2) % 9;
      return numeric(topic, 'Sarjapiirin kompleksinen impedanssi on Z = ' + real + ' + j' + imag + ' Ω. Laske impedanssin itseisarvo.', round(Math.sqrt(real * real + imag * imag), 2), .02, 'Ω', 'Käsittele reaali- ja imaginääriosa suorakulmaisen kolmion kateetteina.', '|Z| = √(R² + X²)', 'Impedanssin itseisarvo on ' + fmt(round(Math.sqrt(real * real + imag * imag), 2)) + ' Ω.');
    }
    if (topic === 'functions') {
      var decay = 0.08 + (n % 5) * .02;
      return numeric(topic, 'Suure pienenee mallilla y = y₀e^(−' + fmt(round(decay, 2)) + 't). Laske puoliintumisaika.', round(Math.log(2) / decay, 2), .03, '', 'Aseta y/y₀ = 1/2 ja ota puolittain luonnollinen logaritmi.', 't½ = ln(2)/k', 'Puoliintumisaika on ' + fmt(round(Math.log(2) / decay, 2)) + '.');
    }
    if (topic === 'dynamics') {
      var m1 = 2 + n % 5, v1 = 4 + n % 7, m2 = 3 + (n * 2) % 6, v2 = -2 - n % 4;
      return numeric(topic, 'Kappaleet ' + m1 + ' kg ja ' + m2 + ' kg törmäävät täysin epäkimmoisasti. Nopeudet ennen törmäystä ovat ' + v1 + ' m/s ja ' + v2 + ' m/s samalla akselilla. Laske yhteinen loppunopeus.', round((m1 * v1 + m2 * v2) / (m1 + m2), 2), .03, 'm/s', 'Valitse yksi positiivinen suunta ja säilytä nopeuksien etumerkit liikemäärätaseessa.', 'm₁v₁ + m₂v₂ = (m₁+m₂)v', 'Loppunopeus on ' + fmt(round((m1 * v1 + m2 * v2) / (m1 + m2), 2)) + ' m/s.');
    }
    if (topic === 'force-motion') {
      var speed = 12 + n % 9, launch = 25 + (n % 5) * 10;
      return numeric(topic, 'Kappale heitetään nopeudella ' + speed + ' m/s kulmassa ' + launch + '° vaakatasosta. Ilmanvastus sivuutetaan ja lähtö- sekä osumakorkeus ovat samat. Laske kantama.', round(speed * speed * Math.sin(2 * launch * Math.PI / 180) / 9.81, 2), .03, 'm', 'Hajota alkunopeus komponentteihin tai käytä symmetrisen heittoliikkeen kantamakaavaa.', 'R = v₀² sin(2θ)/g', 'Kantama on ' + fmt(round(speed * speed * Math.sin(2 * launch * Math.PI / 180) / 9.81, 2)) + ' m.');
    }
    if (topic === 'friction') {
      var mu = .12 + (n % 5) * .04, ang = 25 + (n % 4) * 5;
      return numeric(topic, 'Kappale liukuu alas ' + ang + '° kaltevaa tasoa. Liukukitkakerroin on ' + fmt(round(mu, 2)) + '. Laske kiihtyvyys.', round(9.81 * (Math.sin(ang * Math.PI / 180) - mu * Math.cos(ang * Math.PI / 180)), 2), .03, 'm/s²', 'Hajota paino tason suuntaiseen ja normaaliin komponenttiin; kitka vaikuttaa ylämäkeen.', 'a = g(sinθ − µ cosθ)', 'Kiihtyvyys on ' + fmt(round(9.81 * (Math.sin(ang * Math.PI / 180) - mu * Math.cos(ang * Math.PI / 180)), 2)) + ' m/s².');
    }
    if (topic === 'thermal') {
      var mw = 1 + n % 4, Tw = 70 + n % 16, mc = 1 + (n * 2) % 4, Tc = 10 + n % 11;
      return numeric(topic, 'Eristetyssä astiassa sekoitetaan ' + mw + ' kg vettä lämpötilassa ' + Tw + ' °C ja ' + mc + ' kg vettä lämpötilassa ' + Tc + ' °C. Laske tasapainolämpötila.', round((mw * Tw + mc * Tc) / (mw + mc), 2), .02, '°C', 'Sama aine molemmissa osissa: ominaislämpökapasiteetti supistuu energiataseesta.', 'm₁c(T₁−T) = m₂c(T−T₂)', 'Tasapainolämpötila on ' + fmt(round((mw * Tw + mc * Tc) / (mw + mc), 2)) + ' °C.');
    }
    var Vth = 10 + (n % 6) * 2, Rth = 3 + n % 8;
    return numeric(topic, 'Piirin Thévenin-jännite on ' + Vth + ' V ja Thévenin-resistanssi ' + Rth + ' Ω. Laske kuormalle siirtyvä maksimiteho.', round(Vth * Vth / (4 * Rth), 2), .03, 'W', 'Maksimiteholla kuorma on yhtä suuri kuin Thévenin-resistanssi.', 'P_max = V_Th²/(4R_Th)', 'Maksimiteho on ' + fmt(round(Vth * Vth / (4 * Rth), 2)) + ' W.');
  }

  function openQuestion(topic, difficulty, seed) {
    if (difficulty === 'extreme') return extremeQuestion(topic, seed);
    var n = Math.abs(seed) + 3;
    if (topic === 'electric-basic') {
      if (difficulty === 'easy') { var I = 2 + n % 5, t = 3 + n % 6; return numeric(topic, 'Johtimessa kulkee ' + I + ' A virta ' + t + ' sekunnin ajan. Kuinka suuri varaus siirtyy?', I * t, .02, 'C', 'Mieti, kuinka virta liittyy varaukseen ja aikaan.', 'Q = I · t', 'Varaus on Q = ' + I + ' A · ' + t + ' s = ' + (I * t) + ' C.'); }
      if (difficulty === 'medium') { var q1 = (2 + n % 4) * 1e-6, q2 = (3 + n % 3) * 1e-6, r = (2 + n % 3) / 10, F = 8.99e9 * q1 * q2 / (r * r); return numeric(topic, 'Pistevaraukset ' + (q1 * 1e6) + ' µC ja ' + (q2 * 1e6) + ' µC ovat ' + fmt(r) + ' m etäisyydellä. Laske Coulombin voiman itseisarvo.', round(F, 3), .03, 'N', 'Muunna mikro-coulombit coulombeiksi ennen sijoitusta.', 'F = k|q₁q₂| / r², k ≈ 8,99·10⁹ Nm²/C²', 'Voiman itseisarvo on noin ' + fmt(round(F, 3)) + ' N.'); }
      var Q = (2 + n % 5) * 1e-9, dist = (2 + n % 4) / 10, E = 8.99e9 * Q / (dist * dist); return numeric(topic, 'Pistevaraus ' + (Q * 1e9) + ' nC synnyttää sähkökentän. Laske kentän voimakkuus etäisyydellä ' + fmt(dist) + ' m.', round(E, 2), .03, 'N/C', 'Kentän voimakkuus pienenee etäisyyden neliössä.', 'E = k|Q| / r²', 'Kentän voimakkuus on noin ' + fmt(round(E, 2)) + ' N/C.');
    }
    if (topic === 'electric-applied') {
      var C = 2 + n % 8, U = 4 + n % 9;
      if (difficulty === 'easy') return numeric(topic, 'Kondensaattorin kapasitanssi on ' + C + ' µF ja jännite ' + U + ' V. Laske varaus mikro-coulombeina.', C * U, .02, 'µC', 'Kun käytät yksiköitä µF ja V, tulos saadaan suoraan µC:na.', 'Q = C · U', 'Varaus on ' + (C * U) + ' µC.');
      if (difficulty === 'medium') return numeric(topic, 'Kondensaattori ' + C + ' µF varataan jännitteeseen ' + U + ' V. Laske varastoitunut energia millijouleina.', round(.5 * C * U * U / 1000, 3), .04, 'mJ', 'Huomaa kapasitanssin yksikkömuunnos ja energian neliöllinen jänniteriippuvuus.', 'W = ½CU²', 'Energia on ' + fmt(round(.5 * C * U * U / 1000, 3)) + ' mJ.');
      var C1 = 2 + n % 5, C2 = 3 + (n * 2) % 7; return numeric(topic, 'Kondensaattorit ' + C1 + ' µF ja ' + C2 + ' µF kytketään sarjaan. Laske yhteiskapasitanssi.', round(C1 * C2 / (C1 + C2), 3), .03, 'µF', 'Sarjakytkennässä käänteisarvot summautuvat.', '1/C = 1/C₁ + 1/C₂', 'Yhteiskapasitanssi on ' + fmt(round(C1 * C2 / (C1 + C2), 3)) + ' µF.');
    }
    if (topic === 'electrical-theory') {
      var I2 = 2 + n % 6, R = 3 + n % 9;
      if (difficulty === 'easy') return numeric(topic, 'Kuinka suuri jännite tarvitaan, jotta ' + R + ' Ω vastuksen läpi kulkee ' + I2 + ' A virta?', I2 * R, .02, 'V', 'Jännite syntyy virran ja resistanssin tulona.', 'U = R · I', 'Tarvittava jännite on ' + (I2 * R) + ' V.');
      if (difficulty === 'medium') return numeric(topic, 'Vastus ' + R + ' Ω johtaa virtaa ' + I2 + ' A. Laske vastuksessa muuttuva sähköteho.', I2 * I2 * R, .02, 'W', 'Yhdistä teholaki ja Ohmin laki.', 'P = UI = I²R', 'Teho on ' + (I2 * I2 * R) + ' W.');
      var Pin = 400 + (n % 6) * 50, eta = 80 + n % 11; return numeric(topic, 'Sähkökäyttö ottaa verkosta ' + Pin + ' W ja sen hyötysuhde on ' + eta + ' %. Laske hyödyllinen lähtöteho.', round(Pin * eta / 100, 1), .02, 'W', 'Hyötysuhde kertoo hyödyllisen tehon osuuden ottotehosta.', 'η = P_out / P_in', 'Lähtöteho on ' + fmt(round(Pin * eta / 100, 1)) + ' W.');
    }
    if (topic === 'geometry') {
      var a = 3 + n % 7, b = 4 + n % 8;
      if (difficulty === 'easy') return numeric(topic, 'Suorakulmaisen kolmion kateetit ovat ' + a + ' cm ja ' + b + ' cm. Laske hypotenuusan pituus.', round(Math.sqrt(a * a + b * b), 2), .02, 'cm', 'Piirrä kateetit ja hypotenuusa ennen laskua.', 'c = √(a² + b²)', 'Hypotenuusa on ' + fmt(round(Math.sqrt(a * a + b * b), 2)) + ' cm.');
      if (difficulty === 'medium') { var radius = 2 + n % 7, angle = 30 + (n % 6) * 15; return numeric(topic, 'Ympyräsektorin säde on ' + radius + ' cm ja keskuskulma ' + angle + '°. Laske sektorin pinta-ala.', round(Math.PI * radius * radius * angle / 360, 2), .03, 'cm²', 'Sektori on keskuskulman mukainen osa koko ympyrästä.', 'A = (θ/360°)πr²', 'Sektorin ala on ' + fmt(round(Math.PI * radius * radius * angle / 360, 2)) + ' cm².'); }
      var p = 5 + n % 8, q = 4 + (n * 2) % 7, theta = 25 + (n % 5) * 10; return numeric(topic, 'Kolmion kaksi sivua ovat ' + p + ' cm ja ' + q + ' cm ja niiden välinen kulma ' + theta + '°. Laske pinta-ala.', round(.5 * p * q * Math.sin(theta * Math.PI / 180), 2), .03, 'cm²', 'Kun tunnet kaksi sivua ja niiden välisen kulman, sini antaa korkeuden osuuden.', 'A = ½ab sin(γ)', 'Pinta-ala on ' + fmt(round(.5 * p * q * Math.sin(theta * Math.PI / 180), 2)) + ' cm².');
    }
    if (topic === 'vectors') {
      var x = 2 + n % 7, y = 3 + (n * 2) % 8;
      if (difficulty === 'easy') return numeric(topic, 'Vektori on a = (' + x + ', ' + y + '). Laske sen pituus.', round(Math.sqrt(x * x + y * y), 2), .02, '', 'Komponentit muodostavat suorakulmaisen kolmion.', '|a| = √(aₓ² + aᵧ²)', 'Vektorin pituus on ' + fmt(round(Math.sqrt(x * x + y * y), 2)) + '.');
      if (difficulty === 'medium') { var x2 = 1 + n % 5, y2 = -2 - n % 4; return numeric(topic, 'Laske vektorien a = (' + x + ', ' + y + ') ja b = (' + x2 + ', ' + y2 + ') pistetulo.', x * x2 + y * y2, .01, '', 'Kerro vastaavat komponentit ja laske tulot yhteen.', 'a · b = aₓbₓ + aᵧbᵧ', 'Pistetulo on ' + (x * x2 + y * y2) + '.'); }
      var ax = 1 + n % 4, ay = 2 + n % 5, bx = 2 + (n * 2) % 5, by = -1 - n % 4; return numeric(topic, 'Laske tasovektorien a = (' + ax + ', ' + ay + ') ja b = (' + bx + ', ' + by + ') virittämän suunnikkaan pinta-ala.', Math.abs(ax * by - ay * bx), .01, '', 'Pinta-ala on determinantti itseisarvona.', 'A = |aₓbᵧ − aᵧbₓ|', 'Suunnikkaan pinta-ala on ' + Math.abs(ax * by - ay * bx) + '.');
    }
    if (topic === 'complex') {
      var re = 2 + n % 7, im = 1 + (n * 2) % 6;
      if (difficulty === 'easy') return numeric(topic, 'Laske kompleksiluvun z = ' + re + ' + ' + im + 'i itseisarvo.', round(Math.sqrt(re * re + im * im), 2), .02, '', 'Reaali- ja imaginääriosa muodostavat kateetit.', '|z| = √(a² + b²)', 'Itseisarvo on ' + fmt(round(Math.sqrt(re * re + im * im), 2)) + '.');
      if (difficulty === 'medium') return numeric(topic, 'Kompleksiluvut z₁ = ' + re + ' + ' + im + 'i ja z₂ = ' + im + ' − ' + re + 'i kerrotaan. Mikä on tulon reaaliosa?', 2 * re * im, .01, '', 'Kerro sulut ja käytä tietoa i² = −1.', '(a+bi)(c+di) = (ac−bd) + (ad+bc)i', 'Tulon reaaliosa on ' + (2 * re * im) + '.');
      var ang = pick([30, 45, 60, 90], n), pow = 2 + n % 4; return numeric(topic, 'Kompleksiluvun itseisarvo on ' + re + ' ja argumentti ' + ang + '°. Mikä on luvun ' + pow + '. potenssin itseisarvo?', Math.pow(re, pow), .01, '', 'De Moivren kaavassa itseisarvot potensoituvat erikseen.', '[r(cosφ+i sinφ)]ⁿ = rⁿ(cos nφ+i sin nφ)', 'Potenssin itseisarvo on ' + Math.pow(re, pow) + '.');
    }
    if (topic === 'functions') {
      var k = 2 + n % 6, x = 3 + (n * 2) % 8;
      if (difficulty === 'easy') return numeric(topic, 'Funktio on f(x) = ' + k + 'x + ' + (n % 5) + '. Laske f(' + x + ').', k * x + n % 5, .01, '', 'Sijoita annettu x funktion lausekkeeseen.', 'f(x) = kx + b', 'Funktion arvo on ' + (k * x + n % 5) + '.');
      if (difficulty === 'medium') { var x1 = 1 + n % 4, y1 = 2 + n % 5, x2f = x1 + 2 + n % 4, y2f = y1 + k * (x2f - x1); return numeric(topic, 'Suora kulkee pisteiden (' + x1 + ', ' + y1 + ') ja (' + x2f + ', ' + y2f + ') kautta. Laske kulmakerroin.', k, .01, '', 'Jaa y:n muutos x:n muutoksella.', 'k = (y₂−y₁)/(x₂−x₁)', 'Kulmakerroin on ' + k + '.'); }
      var start = 100 + (n % 5) * 20, rate = 3 + n % 6, years = 4 + n % 5; return numeric(topic, 'Suure kasvaa jatkuvasti mallilla y = ' + start + 'e^(' + (rate / 100) + 't). Laske arvo, kun t = ' + years + '.', round(start * Math.exp(rate / 100 * years), 2), .02, '', 'Sijoita aika eksponenttiin ja säilytä riittävä määrä desimaaleja.', 'y(t) = y₀eᵏᵗ', 'Arvo on noin ' + fmt(round(start * Math.exp(rate / 100 * years), 2)) + '.');
    }
    if (topic === 'dynamics') {
      var mass = 2 + n % 8, vel = 3 + (n * 2) % 9;
      if (difficulty === 'easy') return numeric(topic, 'Kappaleen massa on ' + mass + ' kg ja nopeus ' + vel + ' m/s. Laske liikemäärä.', mass * vel, .01, 'kg·m/s', 'Liikemäärä yhdistää massan ja nopeuden.', 'p = mv', 'Liikemäärä on ' + (mass * vel) + ' kg·m/s.');
      if (difficulty === 'medium') return numeric(topic, 'Kappaleen massa on ' + mass + ' kg ja nopeus kasvaa levosta arvoon ' + vel + ' m/s. Laske liike-energia.', round(.5 * mass * vel * vel, 1), .02, 'J', 'Nopeus esiintyy energian kaavassa toiseen potenssiin.', 'Eₖ = ½mv²', 'Liike-energia on ' + fmt(round(.5 * mass * vel * vel, 1)) + ' J.');
      var r2 = 2 + n % 6; return numeric(topic, 'Massa ' + mass + ' kg liikkuu ympyräradalla nopeudella ' + vel + ' m/s. Radan säde on ' + r2 + ' m. Laske keskeisvoima.', round(mass * vel * vel / r2, 2), .02, 'N', 'Tarvittava kiihtyvyys osoittaa kohti keskipistettä.', 'F = mv²/r', 'Keskeisvoima on ' + fmt(round(mass * vel * vel / r2, 2)) + ' N.');
    }
    if (topic === 'force-motion') {
      var m = 3 + n % 8, acc = 2 + n % 6;
      if (difficulty === 'easy') return numeric(topic, 'Kappaleen massa on ' + m + ' kg ja kiihtyvyys ' + acc + ' m/s². Laske kokonaisvoima.', m * acc, .01, 'N', 'Newtonin toinen laki yhdistää nämä kolme suuretta.', 'F = ma', 'Kokonaisvoima on ' + (m * acc) + ' N.');
      if (difficulty === 'medium') { var v0 = 2 + n % 5, t2 = 3 + n % 7; return numeric(topic, 'Kappaleen alkunopeus on ' + v0 + ' m/s ja kiihtyvyys ' + acc + ' m/s². Laske nopeus ' + t2 + ' s kuluttua.', v0 + acc * t2, .01, 'm/s', 'Tasaisesti kiihtyvässä liikkeessä nopeuden muutos on at.', 'v = v₀ + at', 'Loppunopeus on ' + (v0 + acc * t2) + ' m/s.'); }
      var height = 3 + n % 10, g = 9.81; return numeric(topic, 'Kappale päästetään putoamaan levosta korkeudelta ' + height + ' m ilmanvastus sivuuttaen. Laske nopeus juuri ennen osumaa.', round(Math.sqrt(2 * g * height), 2), .02, 'm/s', 'Mekaaninen energia säilyy.', 'mgh = ½mv² → v = √(2gh)', 'Nopeus on noin ' + fmt(round(Math.sqrt(2 * g * height), 2)) + ' m/s.');
    }
    if (topic === 'friction') {
      var mk = round(.15 + (n % 6) * .05, 2), massf = 4 + n % 9, normal = round(massf * 9.81, 2);
      if (difficulty === 'easy') return numeric(topic, 'Kappaleen ja vaakatason välinen liukukitkakerroin on ' + fmt(mk) + ' ja normaalivoima ' + fmt(normal) + ' N. Laske liukukitka.', round(mk * normal, 2), .02, 'N', 'Kitkakerroin kertoo kitkan osuuden normaalivoimasta.', 'Fµ = µN', 'Liukukitka on ' + fmt(round(mk * normal, 2)) + ' N.');
      if (difficulty === 'medium') { var pull = 70 + (n % 6) * 5; return numeric(topic, 'Massaa ' + massf + ' kg vedetään vaakasuoraan voimalla ' + pull + ' N. Liukukitkakerroin on ' + fmt(mk) + '. Laske kiihtyvyys.', round((pull - mk * massf * 9.81) / massf, 2), .03, 'm/s²', 'Laske ensin kitka ja sitten vaakasuuntainen kokonaisvoima.', 'F_net = F − µmg, a = F_net/m', 'Kiihtyvyys on ' + fmt(round((pull - mk * massf * 9.81) / massf, 2)) + ' m/s².'); }
      var angle2 = 15 + (n % 4) * 5; return numeric(topic, 'Kappale on kaltevalla tasolla, jonka kulma on ' + angle2 + '°. Millä lepokitkakertoimen vähimmäisarvolla kappale pysyy paikallaan?', round(Math.tan(angle2 * Math.PI / 180), 3), .03, '', 'Rajatilassa painon tason suuntainen komponentti on suurimman lepokitkan suuruinen.', 'mg sinθ = µₛmg cosθ → µₛ = tanθ', 'Vähimmäiskerroin on ' + fmt(round(Math.tan(angle2 * Math.PI / 180), 3)) + '.');
    }
    if (topic === 'thermal') {
      var massT = 1 + n % 5, delta = 15 + (n % 6) * 5, c = 4200;
      if (difficulty === 'easy') return numeric(topic, 'Kuinka paljon energiaa tarvitaan lämmittämään ' + massT + ' kg vettä ' + delta + ' °C? Käytä ominaislämpökapasiteettia 4200 J/(kg·°C). Anna vastaus kilojouleina.', massT * c * delta / 1000, .02, 'kJ', 'Lämpömäärä riippuu massasta, ominaislämpökapasiteetista ja lämpötilan muutoksesta.', 'Q = mcΔT', 'Tarvittava energia on ' + (massT * c * delta / 1000) + ' kJ.');
      if (difficulty === 'medium') { var alpha = 12e-6, L = 2 + n % 5; return numeric(topic, 'Terästangon pituus on ' + L + ' m. Lämpötila nousee ' + delta + ' °C ja pituuden lämpötilakerroin on 12·10⁻⁶ 1/°C. Laske pituuden muutos millimetreinä.', round(alpha * L * delta * 1000, 3), .03, 'mm', 'Kerro alkuperäinen pituus lämpötilakertoimella ja lämpötilan muutoksella.', 'ΔL = αL₀ΔT', 'Pituuden muutos on ' + fmt(round(alpha * L * delta * 1000, 3)) + ' mm.'); }
      var hot = 500 + (n % 5) * 50, cold = 280 + (n % 4) * 10; return numeric(topic, 'Ideaalinen Carnot-kone toimii lämpötilojen ' + hot + ' K ja ' + cold + ' K välillä. Laske teoreettinen maksimihyötysuhde prosentteina.', round((1 - cold / hot) * 100, 2), .03, '%', 'Käytä absoluuttisia lämpötiloja; ne on jo annettu kelvineinä.', 'η = 1 − T_c/T_h', 'Maksimihyötysuhde on ' + fmt(round((1 - cold / hot) * 100, 2)) + ' %.');
    }
    var R1 = 2 + n % 8, R2 = 3 + (n * 2) % 9, U = 10 + (n % 6) * 2;
    if (difficulty === 'easy') return numeric(topic, 'Jännite ' + U + ' V kytketään vastukseen ' + R1 + ' Ω. Laske virta.', round(U / R1, 3), .02, 'A', 'Ratkaise virta Ohmin laista.', 'I = U/R', 'Virta on ' + fmt(round(U / R1, 3)) + ' A.');
    if (difficulty === 'medium') return numeric(topic, 'Vastukset ' + R1 + ' Ω ja ' + R2 + ' Ω ovat rinnan. Laske yhteisresistanssi.', round(R1 * R2 / (R1 + R2), 3), .03, 'Ω', 'Rinnankytkennässä johtavuudet summautuvat.', '1/R = 1/R₁ + 1/R₂', 'Yhteisresistanssi on ' + fmt(round(R1 * R2 / (R1 + R2), 3)) + ' Ω.');
    return numeric(topic, 'Jännitteenjakajassa R₁ = ' + R1 + ' kΩ ja R₂ = ' + R2 + ' kΩ ovat sarjassa lähteellä ' + U + ' V. Laske R₂:n yli vaikuttava jännite.', round(U * R2 / (R1 + R2), 3), .02, 'V', 'Sarjapiirin virta on sama molemmissa vastuksissa.', 'U₂ = U · R₂/(R₁ + R₂)', 'Lähtöjännite on ' + fmt(round(U * R2 / (R1 + R2), 3)) + ' V.');
  }

  function generateQuestion(topic, type, difficulty, seed) {
    var q;
    if (type === 'mcq') {
      var list = concepts[topic][difficulty];
      var item = pick(list, seed);
      q = mcq(topic, item[0], item[1], item[2], item[3], item[4]);
    } else {
      q = openQuestion(topic, difficulty, seed);
    }
    q.difficulty = difficulty;
    q.id = topic + '-' + type + '-' + difficulty + '-' + seed + '-' + Math.random().toString(36).slice(2, 7);
    return q;
  }

  var flashcards = [
    ['electric-basic', 'Sähkövaraus Q', 'Aineen ominaisuus, jonka SI-yksikkö on coulombi (C). Varaus voi olla positiivinen tai negatiivinen.'],
    ['electric-basic', 'Sähkökenttä E', 'Voima positiivista testivarausta kohden. Yksikkö on N/C tai V/m.'],
    ['electric-applied', 'Kapasitanssi C', 'Kondensaattorin kyky varastoida varausta jännitettä kohden: C = Q/U.'],
    ['electric-applied', 'Sähkövuo', 'Sähkökentän pintaa läpäisevää vaikutusta kuvaava suure, keskeinen Gaussin laissa.'],
    ['electrical-theory', 'Sähkövirta I', 'Poikkipinnan läpi aikayksikössä kulkeva varaus: I = ΔQ/Δt.'],
    ['electrical-theory', 'Sähköteho P', 'Energian siirtymisnopeus. Tasasähköpiirissä P = UI.'],
    ['geometry', 'Pythagoraan lause', 'Suorakulmaisessa kolmiossa kateettien neliöiden summa on hypotenuusan neliö.'],
    ['geometry', 'Radiaani', 'Kulman yksikkö, jossa kulma on kaaren pituuden suhde säteeseen. Täysi kierros on 2π rad.'],
    ['vectors', 'Pistetulo', 'Skalaari a·b = |a||b|cosθ. Nolla kohtisuorille vektoreille.'],
    ['vectors', 'Ristitulo', 'Vektori, joka on kohtisuorassa molempia lähtövektoreita vastaan; suunta oikean käden säännöllä.'],
    ['complex', 'Kompleksikonjugaatti', 'Luvun z = a + bi konjugaatti on a − bi. Tulo z·z̄ = |z|².'],
    ['complex', 'Argumentti', 'Kompleksiluvun suuntakulma positiiviseen reaaliakseliin nähden.'],
    ['functions', 'Derivaatta', 'Funktion hetkellinen muutosnopeus ja kuvaajan tangentin kulmakerroin.'],
    ['functions', 'Eksponentiaalinen riippuvuus', 'Riippuvuus, jossa suhteellinen muutosnopeus on vakio: y = y₀eᵏᵗ.'],
    ['dynamics', 'Liikemäärä p', 'Massan ja nopeuden tulo p = mv. Säilyy suljetussa systeemissä.'],
    ['dynamics', 'Liike-energia', 'Liikkeeseen sitoutunut energia Eₖ = ½mv².'],
    ['force-motion', 'Newtonin II laki', 'Kappaleen kokonaisvoima on massan ja kiihtyvyyden tulo: ΣF = ma.'],
    ['force-motion', 'Impulssi', 'Voiman aikavaikutus J = FΔt, joka vastaa liikemäärän muutosta.'],
    ['friction', 'Lepokitka', 'Liukumista estävä voima, joka mukautuu enimmäisarvoon F ≤ µₛN asti.'],
    ['friction', 'Liukukitka', 'Liukumista vastustava voima, jonka malli on F = µₖN.'],
    ['thermal', 'Ominaislämpökapasiteetti', 'Energia, joka tarvitaan yhden kilogramman lämpötilan nostamiseen yhdellä kelvinillä.'],
    ['thermal', 'Entropia', 'Energian hajaantumista ja termodynaamisten prosessien suuntaa kuvaava tilasuure.'],
    ['dc-circuits', 'Ohmin laki', 'Lineaarisen vastuksen jännitteen, virran ja resistanssin yhteys: U = RI.'],
    ['dc-circuits', 'Kirchhoffin virtalaki', 'Solmuun tulevien virtojen summa on yhtä suuri kuin solmusta lähtevien virtojen summa.'],
    ['dc-circuits', 'Thévenin-ekvivalentti', 'Lineaarinen kaksinapainen piiri korvataan ideaalijännitelähteellä ja sarjaresistanssilla.']
  ].map(function (c, i) { return { id: i, topic: c[0], term: c[1], definition: c[2] }; });

  function renderDomains() {
    byId('domainGrid').innerHTML = domains.map(function (d, i) {
      return '<article class="domain-card" data-domain="' + d.id + '" tabindex="0"><span class="domain-index">0' + (i + 1) + '</span><span class="domain-arrow">↗</span><h3>' + d.name + '</h3><p>' + d.desc + '</p></article>';
    }).join('');
    document.querySelectorAll('.domain-card').forEach(function (card) {
      function openDomain() {
        var domain = domains.find(function (d) { return d.id === card.dataset.domain; });
        config.selected = domain.topics.slice(); config.weighted = [];
        renderTopics(); updateSummary(); showView('practice');
      }
      card.addEventListener('click', openDomain);
      card.addEventListener('keydown', function (e) { if (e.key === 'Enter') openDomain(); });
    });
  }

  function renderTopics() {
    byId('topicSelector').innerHTML = domains.map(function (domain) {
      return '<div class="topic-group"><div class="topic-group-head">' + domain.name.toUpperCase() + '</div>' + domain.topics.map(function (id) {
        var checked = config.selected.indexOf(id) !== -1 ? ' checked' : '';
        var weighted = config.weighted.indexOf(id) !== -1 ? ' active' : '';
        return '<div class="topic-option"><input id="topic-' + id + '" data-topic-check="' + id + '" type="checkbox"' + checked + '><label for="topic-' + id + '">' + topics[id].name + '</label><button class="weight-btn' + weighted + '" data-topic-weight="' + id + '" aria-label="Painota aihetta ' + topics[id].name + '" title="Painota aihetta">★</button></div>';
      }).join('') + '</div>';
    }).join('');
    document.querySelectorAll('[data-topic-check]').forEach(function (input) {
      input.addEventListener('change', function () {
        var id = input.dataset.topicCheck;
        if (input.checked && config.selected.indexOf(id) === -1) config.selected.push(id);
        if (!input.checked) { config.selected = config.selected.filter(function (x) { return x !== id; }); config.weighted = config.weighted.filter(function (x) { return x !== id; }); }
        renderTopics(); updateSummary();
      });
    });
    document.querySelectorAll('[data-topic-weight]').forEach(function (button) {
      button.addEventListener('click', function () {
        var id = button.dataset.topicWeight;
        if (config.selected.indexOf(id) === -1) config.selected.push(id);
        if (config.weighted.indexOf(id) === -1) config.weighted.push(id); else config.weighted = config.weighted.filter(function (x) { return x !== id; });
        renderTopics(); updateSummary();
      });
    });
  }

  function updateSummary() {
    var exam = config.mode === 'exam';
    var review = config.mode === 'review';
    var reviewCount = wrongBank.filter(function (q) { return config.selected.indexOf(q.topic) !== -1; }).length;
    byId('summaryTitle').textContent = review ? 'Kertaustentti' : (exam ? ({ 8: 'Nopea tentti', 15: 'Keskipitkä tentti', 25: 'Pitkä tentti', 30: 'Mestaritentti', 50: 'Laaja tentti' }[config.length]) : 'Vapaaharjoittelu');
    byId('summaryCount').textContent = review ? reviewCount : (exam ? config.length : 10);
    byId('summaryDifficulty').textContent = review ? 'Tehtävien alkuperäinen' : difficultyNames[config.difficulty];
    var mins = config.length === 15 ? 55 : 120;
    byId('summaryTimer').textContent = exam && config.timer && config.length > 8 ? mins + ' min' : 'Ei';
    byId('summaryTopics').textContent = config.selected.length + ' / ' + Object.keys(topics).length + (config.weighted.length ? ' · ' + config.weighted.length + ' painotettu' : '');
    byId('headerStreak').textContent = (stats.today && stats.today[todayKey]) || 0;
    byId('reviewModeCopy').textContent = wrongBank.length ? wrongBank.length + ' aiemmin väärin mennyttä tehtävää' : 'Ei vielä tallennettuja virheitä';
  }

  function showView(name) {
    if (name !== 'games' && rapidTimer) clearInterval(rapidTimer);
    closeFormulaDrawer();
    if (session && name !== 'practice' && !byId('quizPanel').classList.contains('hidden')) {
      if (!window.confirm('Harjoitus on kesken. Haluatko poistua?')) return;
      stopTimer(); session = null;
    }
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    var target = byId(name + 'View'); if (target) target.classList.add('active');
    document.querySelectorAll('.nav-link').forEach(function (n) { n.classList.toggle('active', n.dataset.view === name); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (name === 'flashcards') renderFlashcards(true);
    if (name === 'progress') renderProgress();
    if (name === 'formulas') renderFormulaBank();
    if (name === 'games') { renderMemory(); startHangmanRound(); }
  }

  function makeSession() {
    if (config.mode === 'review') {
      var reviewQuestions = shuffle(wrongBank.filter(function (q) { return config.selected.indexOf(q.topic) !== -1; })).slice(0, 30).map(function (q, i) {
        var copy = JSON.parse(JSON.stringify(q)); copy.id = 'review-' + Date.now() + '-' + i; return copy;
      });
      return { questions: reviewQuestions, index: 0, answers: [], score: 0, maxPoints: reviewQuestions.reduce(function (sum, q) { return sum + (q.type === 'mcq' ? 2 : 3); }, 0), timeLeft: null, config: JSON.parse(JSON.stringify(config)) };
    }
    var count = config.mode === 'exam' ? config.length : 10;
    var mcqCount = config.mode === 'practice' ? 5 : ({ 8: 8, 15: 5, 25: 6, 30: 6, 50: 10 }[count]);
    var types = shuffle(Array(mcqCount).fill('mcq').concat(Array(count - mcqCount).fill('open')));
    var pool = [];
    config.selected.forEach(function (id) { pool.push(id); if (config.weighted.indexOf(id) !== -1) pool.push(id, id); });
    var chosen = [];
    if (count >= config.selected.length) chosen = shuffle(config.selected);
    while (chosen.length < count) chosen.push(pick(pool, Math.floor(Math.random() * 9999)));
    chosen = shuffle(chosen).slice(0, count);
    var questions = chosen.map(function (topic, i) { return generateQuestion(topic, types[i], config.difficulty, Date.now() % 10000 + i * 17); });
    var seconds = config.timer && count > 8 ? (count === 15 ? 55 * 60 : 120 * 60) : null;
    return { questions: questions, index: 0, answers: [], score: 0, maxPoints: questions.reduce(function (sum, q) { return sum + (q.type === 'mcq' ? 2 : 3); }, 0), timeLeft: seconds, config: JSON.parse(JSON.stringify(config)) };
  }

  function startSession() {
    if (!config.selected.length) { byId('setupError').textContent = 'Valitse vähintään yksi aihe.'; return; }
    if (config.mode === 'review' && !wrongBank.some(function (q) { return config.selected.indexOf(q.topic) !== -1; })) { byId('setupError').textContent = 'Kertausjono on vielä tyhjä. Tee ensin harjoitus ja vastaa muutamaan tehtävään.'; return; }
    byId('setupError').textContent = '';
    session = makeSession();
    byId('setupPanel').classList.add('hidden'); byId('resultsPanel').classList.add('hidden'); byId('quizPanel').classList.remove('hidden');
    if (session.timeLeft) { byId('quizTimer').classList.remove('hidden'); startTimer(); } else byId('quizTimer').classList.add('hidden');
    renderQuestion();
    window.scrollTo({ top: byId('quizPanel').offsetTop - 80, behavior: 'smooth' });
  }

  function renderQuestion() {
    var q = session.questions[session.index];
    session.attempts = 0;
    session.usedHint = false;
    session.usedFormula = false;
    byId('quizCounter').textContent = 'Tehtävä ' + (session.index + 1) + ' / ' + session.questions.length;
    byId('quizScore').textContent = session.score + ' / ' + session.maxPoints + ' p';
    byId('quizProgress').style.width = ((session.index) / session.questions.length * 100) + '%';
    byId('questionTopic').textContent = topics[q.topic].name;
    byId('questionDifficulty').textContent = difficultyNames[q.difficulty];
    byId('questionText').textContent = q.prompt;
    byId('questionContext').textContent = q.type === 'open' ? 'Kirjoita pelkkä lukuarvo. Sinulla on kolme yritystä.' + (q.unit ? ' Yksikkö: ' + q.unit + '.' : '') : 'Valitse yksi vaihtoehto. Sinulla on kaksi yritystä.';
    byId('feedback').className = 'feedback hidden'; byId('feedback').innerHTML = '';
    byId('formulaBox').classList.add('hidden'); byId('hintPopover').classList.add('hidden');
    byId('hintButton').disabled = false; byId('quizFormulaButton').disabled = false;
    byId('checkAnswer').classList.remove('hidden'); byId('checkAnswer').textContent = 'Tarkista vastaus'; byId('nextQuestion').classList.add('hidden');
    byId('hintText').textContent = helpfulHint(q);
    updatePointPreview();
    if (q.type === 'mcq') {
      byId('answerArea').innerHTML = q.choices.map(function (choice, i) { return '<button class="answer-option" data-answer="' + i + '"><span class="option-letter">' + String.fromCharCode(97 + i) + '</span><span>' + choice + '</span></button>'; }).join('');
      document.querySelectorAll('.answer-option').forEach(function (button) { button.addEventListener('click', function () { document.querySelectorAll('.answer-option').forEach(function (b) { b.classList.remove('selected'); }); button.classList.add('selected'); }); });
    } else {
      byId('answerArea').innerHTML = '<textarea id="openAnswer" class="open-answer" aria-label="Vastaus" placeholder="Kirjoita vastauksesi tähän…"></textarea><span class="answer-help">Vastauksessa sallitaan ±' + Math.round(q.tolerance * 100) + ' %:n pyöristysero.</span>';
      setTimeout(function () { byId('openAnswer').focus(); }, 50);
    }
  }

  function helpfulHint(q) {
    if (q.type === 'open') return q.hint + ' Kirjoita annetut suureet ja niiden yksiköt allekkain, päätä mitä ratkaiset ja tee yksikkömuunnokset ennen lukujen sijoittamista.';
    return q.hint + ' Sulje ensin pois vaihtoehdot, jotka rikkovat suureen määritelmää tai säilymislakia, ja vertaa jäljelle jääviä keskenään.';
  }

  function currentPointValue(q) {
    var aided = session.usedHint || session.usedFormula;
    if (q.type === 'mcq') return session.attempts > 0 || aided ? 1 : 2;
    if (session.attempts > 0) return 1;
    return aided ? 2 : 3;
  }

  function updatePointPreview() {
    if (!session) return;
    var q = session.questions[session.index];
    byId('questionPoints').textContent = currentPointValue(q) + ' p tarjolla';
  }

  function rememberWrong(q) {
    var copy = JSON.parse(JSON.stringify(q));
    wrongBank = wrongBank.filter(function (item) { return item.prompt !== copy.prompt; });
    wrongBank.unshift(copy); wrongBank = wrongBank.slice(0, 100);
    save('virtapiiriWrongBank', wrongBank); updateSummary();
  }

  function forgetQuestion(q) {
    var before = wrongBank.length;
    wrongBank = wrongBank.filter(function (item) { return item.prompt !== q.prompt; });
    if (wrongBank.length !== before) save('virtapiiriWrongBank', wrongBank);
  }

  function checkAnswer() {
    var q = session.questions[session.index], correct = false, given = null;
    if (q.type === 'mcq') {
      var selected = document.querySelector('.answer-option.selected');
      if (!selected) { showFeedback('Valitse ensin yksi vaihtoehto.', false, true); return; }
      given = Number(selected.dataset.answer); correct = given === q.answer;
      if (!correct) {
        session.attempts += 1;
        selected.classList.add('wrong'); selected.disabled = true; selected.classList.remove('selected');
        if (session.attempts < 2) {
          showFeedback('Ei vielä. Sulje tämä vaihtoehto pois ja kokeile kerran uudelleen.', false);
          updatePointPreview();
          return;
        }
        document.querySelector('[data-answer="' + q.answer + '"]').classList.add('correct');
      } else selected.classList.add('correct');
      document.querySelectorAll('.answer-option').forEach(function (b) { b.disabled = true; });
    } else {
      var raw = byId('openAnswer').value.trim();
      if (!raw) { showFeedback('Kirjoita ensin vastauksesi.', false, true); return; }
      given = parseFloat(raw.replace(',', '.').replace(/[^0-9eE+\-.]/g, ''));
      correct = Number.isFinite(given) && Math.abs(given - q.answer) <= Math.max(Math.abs(q.answer) * q.tolerance, .005);
      byId('openAnswer').disabled = true;
      if (!correct) {
        session.attempts += 1;
        if (session.attempts < 3) {
          if (session.attempts === 1 && q.formula) { byId('formulaText').textContent = q.formula; byId('formulaBox').classList.remove('hidden'); }
          showFeedback(session.attempts === 1 ? 'Ei vielä. Kaava on nyt näkyvissä — ratkaise suure ensin symbolisesti ja yritä uudelleen.' : 'Ei vielä. Sinulla on yksi yritys jäljellä; tarkista etumerkki, yksiköt ja laskujärjestys.', false);
          byId('openAnswer').disabled = false; byId('openAnswer').value = ''; byId('openAnswer').focus();
          byId('checkAnswer').textContent = session.attempts === 1 ? 'Tarkista toinen yritys' : 'Tarkista viimeinen yritys';
          updatePointPreview();
          return;
        }
      }
    }
    var earned = correct ? currentPointValue(q) : 0;
    if (correct) {
      session.score += earned;
      forgetQuestion(q);
      showFeedback('Oikein — ' + earned + (earned === 1 ? ' piste. ' : ' pistettä. ') + q.explanation, true);
    } else {
      rememberWrong(q);
      showFeedback('Yritykset käytetty — 0 pistettä. ' + q.explanation, false);
      if (q.formula) { byId('formulaText').textContent = q.formula; byId('formulaBox').classList.remove('hidden'); }
    }
    session.answers.push({ topic: q.topic, correct: correct, given: given, points: earned, maxPoints: q.type === 'mcq' ? 2 : 3 });
    byId('quizScore').textContent = session.score + ' / ' + session.maxPoints + ' p';
    byId('questionPoints').textContent = earned + ' p saatu';
    byId('hintButton').disabled = true; byId('quizFormulaButton').disabled = true;
    byId('checkAnswer').classList.add('hidden'); byId('nextQuestion').classList.remove('hidden');
    byId('nextQuestion').textContent = session.index === session.questions.length - 1 ? 'Näytä tulokset →' : 'Seuraava tehtävä →';
    byId('checkAnswer').textContent = 'Tarkista vastaus';
  }

  function showFeedback(message, correct, neutral) {
    var box = byId('feedback'); box.textContent = message; box.className = 'feedback ' + (neutral ? 'wrong' : (correct ? 'correct' : 'wrong'));
  }
  function nextQuestion() {
    if (session.index < session.questions.length - 1) { session.index++; renderQuestion(); }
    else finishSession(false);
  }
  function finishSession(timedOut) {
    stopTimer(); byId('quizPanel').classList.add('hidden'); byId('resultsPanel').classList.remove('hidden');
    if (timedOut) {
      session.questions.slice(session.index).forEach(function (q) { rememberWrong(q); });
    }
    var total = session.questions.length, pct = session.maxPoints ? Math.round(session.score / session.maxPoints * 100) : 0;
    byId('resultPercent').textContent = pct + '%'; byId('resultFraction').textContent = session.score + ' / ' + session.maxPoints + ' pistettä';
    byId('resultHeadline').textContent = timedOut ? 'Aika päättyi' : (pct >= 85 ? 'Erinomaista työtä!' : pct >= 60 ? 'Hyvä suunta!' : 'Tästä on hyvä jatkaa.');
    byId('resultCopy').textContent = timedOut ? 'Vastatut tehtävät arvioitiin. Kertaa alla näkyviä aiheita ja kokeile uudelleen.' : (pct >= 85 ? 'Perusta on vahva — seuraava vaikeustaso voi olla sopiva haaste.' : 'Kertaa etenkin heikoimmat osa-alueet ja tee uusi harjoitus.');
    var groups = {};
    session.answers.forEach(function (a) { var d = topics[a.topic].domain; if (!groups[d]) groups[d] = { total: 0, correct: 0, points: 0, maxPoints: 0 }; groups[d].total++; groups[d].points += a.points; groups[d].maxPoints += a.maxPoints; if (a.correct) groups[d].correct++; });
    byId('resultBreakdown').innerHTML = Object.keys(groups).map(function (id) { var d = domains.find(function (x) { return x.id === id; }); return '<div><span>' + d.name + '</span><b>' + groups[id].points + ' / ' + groups[id].maxPoints + ' p</b></div>'; }).join('');
    stats.total += total; stats.correct += session.answers.filter(function (a) { return a.correct; }).length; stats.points += session.score; stats.maxPoints += session.maxPoints; stats.today[todayKey] = (stats.today[todayKey] || 0) + total;
    Object.keys(groups).forEach(function (id) { if (!stats.byDomain[id]) stats.byDomain[id] = { total: 0, correct: 0 }; stats.byDomain[id].total += groups[id].total; stats.byDomain[id].correct += groups[id].correct; });
    save('virtapiiriStats', stats); updateSummary();
    window.scrollTo({ top: byId('resultsPanel').offsetTop - 80, behavior: 'smooth' });
  }
  function startTimer() {
    updateTimer();
    timerHandle = setInterval(function () { session.timeLeft--; updateTimer(); if (session.timeLeft <= 0) finishSession(true); }, 1000);
  }
  function updateTimer() {
    var m = Math.floor(session.timeLeft / 60), s = session.timeLeft % 60;
    byId('quizTimer').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    byId('quizTimer').classList.toggle('warning', session.timeLeft < 300);
  }
  function stopTimer() { if (timerHandle) clearInterval(timerHandle); timerHandle = null; }
  function quitQuiz() { if (window.confirm('Keskeytetäänkö harjoitus? Tämän harjoituksen tulosta ei tallenneta.')) { stopTimer(); session = null; byId('quizPanel').classList.add('hidden'); byId('setupPanel').classList.remove('hidden'); window.scrollTo({ top: byId('practiceTitle').offsetTop - 80, behavior: 'smooth' }); } }

  function formulaCard(f) {
    return '<article class="formula-card"><span>' + topics[f.topic].name + '</span><h3>' + f.formula + '</h3><b>' + f.title + '</b><p>' + f.symbols + '</p></article>';
  }

  function renderFormulaBank() {
    var query = (byId('formulaSearch').value || '').toLocaleLowerCase('fi-FI');
    var filter = byId('formulaFilter').value;
    var list = formulas.filter(function (f) {
      var matchesTopic = filter === 'all' || f.topic === filter;
      var haystack = (f.title + ' ' + f.formula + ' ' + f.symbols + ' ' + topics[f.topic].name).toLocaleLowerCase('fi-FI');
      return matchesTopic && haystack.indexOf(query) !== -1;
    });
    byId('formulaGrid').innerHTML = list.length ? list.map(formulaCard).join('') : '<p class="question-context">Hakuehdoilla ei löytynyt kaavoja.</p>';
  }

  function openFormulaDrawer() {
    if (!session) return;
    session.usedFormula = true; updatePointPreview();
    var q = session.questions[session.index];
    var relevant = formulas.filter(function (f) { return f.topic === q.topic; });
    if (!relevant.length) relevant = formulas.filter(function (f) { return topics[f.topic].domain === topics[q.topic].domain; });
    byId('drawerFormulas').innerHTML = relevant.map(formulaCard).join('');
    byId('formulaDrawer').classList.remove('hidden'); byId('drawerBackdrop').classList.remove('hidden');
    byId('closeFormulaDrawer').focus();
  }

  function closeFormulaDrawer() {
    byId('formulaDrawer').classList.add('hidden'); byId('drawerBackdrop').classList.add('hidden');
  }

  var flashState = { list: flashcards.slice(), index: 0, filter: 'all' };
  function renderFlashcards(reset) {
    if (reset) flashState.index = 0;
    flashState.list = flashcards.filter(function (c) { return flashState.filter === 'all' || c.topic === flashState.filter; });
    if (!flashState.list.length) return;
    if (flashState.index >= flashState.list.length) flashState.index = 0;
    var c = flashState.list[flashState.index];
    byId('flashCard').classList.remove('flipped');
    byId('flashTopic').textContent = topics[c.topic].name; byId('flashBackTopic').textContent = topics[c.topic].name;
    byId('flashTerm').textContent = c.term; byId('flashDefinition').textContent = c.definition;
    byId('flashCounter').textContent = (flashState.index + 1) + ' / ' + flashState.list.length;
    byId('flashKnown').textContent = knownCards.length;
    byId('flashRemaining').textContent = flashcards.length - knownCards.length;
  }
  function advanceCard(known) {
    var card = flashState.list[flashState.index];
    if (known && knownCards.indexOf(card.id) === -1) knownCards.push(card.id);
    if (!known) knownCards = knownCards.filter(function (id) { return id !== card.id; });
    save('virtapiiriCards', knownCards); flashState.index = (flashState.index + 1) % flashState.list.length; renderFlashcards(false);
  }
  function renderProgress() {
    var accuracy = stats.maxPoints ? Math.round(stats.points / stats.maxPoints * 100) : 0;
    var rows = domains.map(function (d) {
      var s = stats.byDomain[d.id] || { total: 0, correct: 0 }, pct = s.total ? Math.round(s.correct / s.total * 100) : 0;
      return '<div class="skill-row"><span>' + d.name + '</span><div class="skill-bar"><i style="width:' + pct + '%"></i></div><b>' + pct + '%</b></div>';
    }).join('');
    byId('progressDashboard').innerHTML = '<div class="metric-card"><span>Tehtäviä yhteensä</span><strong>' + stats.total + '</strong></div><div class="metric-card"><span>Pisteprosentti</span><strong>' + accuracy + '%</strong></div><div class="metric-card"><span>Flashcardeja hallussa</span><strong>' + knownCards.length + ' / ' + flashcards.length + '</strong></div><div class="metric-card"><span>Kertausjonossa</span><strong>' + wrongBank.length + '</strong></div><div class="metric-card"><span>Rapid-ennätys</span><strong>' + stats.minigames.rapidBest + ' p</strong></div><div class="metric-card"><span>Hirsipuuvoitot</span><strong>' + stats.minigames.hangmanWins + '</strong></div><div class="metric-card wide"><span>Osaaminen aihealueittain</span>' + rows + '</div>';
  }

  var rapidState = null, rapidTimer = null;
  function startRapid() {
    clearInterval(rapidTimer);
    rapidState = { cards: shuffle(flashcards).slice(0, 10), index: 0, score: 0, locked: false, startedAt: 0 };
    byId('rapidIntro').classList.add('hidden'); byId('rapidResult').classList.add('hidden'); byId('rapidPlay').classList.remove('hidden');
    renderRapidQuestion();
  }
  function renderRapidQuestion() {
    clearInterval(rapidTimer);
    if (rapidState.index >= rapidState.cards.length) { finishRapid(); return; }
    rapidState.locked = false;
    var card = rapidState.cards[rapidState.index];
    var distractors = shuffle(flashcards.filter(function (c) { return c.id !== card.id; })).slice(0, 3);
    var options = shuffle([card].concat(distractors));
    byId('rapidCount').textContent = (rapidState.index + 1) + ' / 10'; byId('rapidScore').textContent = rapidState.score + ' p';
    byId('rapidDefinition').textContent = card.definition; byId('rapidClockBar').style.transform = 'scaleX(1)';
    byId('rapidOptions').innerHTML = options.map(function (o, i) { return '<button data-rapid-id="' + o.id + '"><span class="option-letter">' + String.fromCharCode(97 + i) + '</span> ' + o.term + '</button>'; }).join('');
    document.querySelectorAll('[data-rapid-id]').forEach(function (button) { button.addEventListener('click', function () { resolveRapid(Number(button.dataset.rapidId), button); }); });
    rapidState.startedAt = performance.now();
    rapidTimer = setInterval(function () {
      var left = Math.max(0, 1 - (performance.now() - rapidState.startedAt) / 10000);
      byId('rapidClockBar').style.transform = 'scaleX(' + left + ')';
      if (left <= 0) resolveRapid(null, null);
    }, 80);
  }
  function resolveRapid(chosenId, button) {
    if (!rapidState || rapidState.locked) return;
    rapidState.locked = true; clearInterval(rapidTimer);
    var card = rapidState.cards[rapidState.index], elapsed = performance.now() - rapidState.startedAt;
    var correct = chosenId === card.id, earned = correct ? (elapsed < 1000 ? 5 : elapsed < 3000 ? 4 : elapsed < 5000 ? 3 : 2) : 0;
    rapidState.score += earned;
    document.querySelectorAll('[data-rapid-id]').forEach(function (b) { b.disabled = true; if (Number(b.dataset.rapidId) === card.id) b.classList.add('correct'); });
    if (button && !correct) button.classList.add('wrong');
    byId('rapidScore').textContent = rapidState.score + ' p';
    setTimeout(function () { rapidState.index++; renderRapidQuestion(); }, 650);
  }
  function finishRapid() {
    byId('rapidPlay').classList.add('hidden'); byId('rapidResult').classList.remove('hidden');
    byId('rapidResult').innerHTML = '<span class="kicker">RAPID VALMIS</span><strong>' + rapidState.score + ' / 50</strong><h2>' + (rapidState.score >= 40 ? 'Sähkönopea!' : rapidState.score >= 25 ? 'Hyvä tempo!' : 'Uusi kierros tekee terää.') + '</h2><button id="rapidAgain" class="btn primary">Pelaa uudelleen</button>';
    stats.minigames.rapidBest = Math.max(stats.minigames.rapidBest || 0, rapidState.score); save('virtapiiriStats', stats);
    byId('rapidAgain').addEventListener('click', startRapid);
  }

  var memoryState = null;
  function renderMemory() {
    var chosen = shuffle(flashcards).slice(0, 6), cards = [];
    chosen.forEach(function (c) { cards.push({ pair: c.id, type: 'term', text: c.term, open: false, matched: false }); cards.push({ pair: c.id, type: 'definition', text: c.definition, open: false, matched: false }); });
    memoryState = { cards: shuffle(cards), open: [], moves: 0, matched: 0, locked: false };
    paintMemory();
  }
  function paintMemory() {
    byId('memoryMoves').textContent = memoryState.moves + ' siirtoa'; byId('memoryPairs').textContent = memoryState.matched + ' / 6 paria';
    byId('memoryGrid').innerHTML = memoryState.cards.map(function (c, i) { return '<button class="memory-card ' + c.type + (c.open ? ' flipped' : '') + (c.matched ? ' matched' : '') + '" data-memory="' + i + '"><span>' + c.text + '</span></button>'; }).join('');
    document.querySelectorAll('[data-memory]').forEach(function (button) { button.addEventListener('click', function () { flipMemory(Number(button.dataset.memory)); }); });
  }
  function flipMemory(index) {
    if (memoryState.locked) return;
    var card = memoryState.cards[index]; if (card.open || card.matched) return;
    card.open = true; memoryState.open.push(index); paintMemory();
    if (memoryState.open.length < 2) return;
    memoryState.moves++;
    var a = memoryState.cards[memoryState.open[0]], b = memoryState.cards[memoryState.open[1]];
    if (a.pair === b.pair && a.type !== b.type) {
      a.matched = b.matched = true; memoryState.matched++; memoryState.open = []; paintMemory();
      if (memoryState.matched === 6) { var best = stats.minigames.memoryBest; stats.minigames.memoryBest = !best || memoryState.moves < best ? memoryState.moves : best; save('virtapiiriStats', stats); byId('memoryPairs').textContent = 'Valmis · ' + memoryState.moves + ' siirtoa'; }
    } else {
      memoryState.locked = true;
      setTimeout(function () { a.open = b.open = false; memoryState.open = []; memoryState.locked = false; paintMemory(); }, 850);
    }
  }

  var hangState = null;
  function normalized(value) { return value.toLocaleUpperCase('fi-FI').replace(/[^A-ZÅÄÖ]/g, ''); }
  function startHangmanRound(keepScore) {
    var previous = hangState;
    var pool = flashcards.filter(function (c) { return !previous || c.id !== previous.card.id; });
    hangState = { card: pick(pool, Math.floor(Math.random() * 9999)), mistakes: keepScore && previous ? previous.mistakes : 0, wins: keepScore && previous ? previous.wins : 0, finished: false };
    byId('hangDefinition').textContent = hangState.card.definition; byId('hangMessage').textContent = ''; byId('hangInput').value = '';
    paintHangman();
    setTimeout(function () { byId('hangInput').focus(); }, 30);
  }
  function paintHangman(reveal) {
    var target = hangState.card.term.toLocaleUpperCase('fi-FI');
    byId('hangWord').innerHTML = Array.from(target).map(function (char) {
      if (!/[A-ZÅÄÖ]/.test(char)) return '<span class="space">' + (char === ' ' ? '' : char) + '</span>';
      return '<span>' + (reveal ? char : '') + '</span>';
    }).join('');
    byId('hangMistakes').textContent = hangState.mistakes + ' / 6 virhettä';
    document.querySelectorAll('.g-part').forEach(function (part) { part.classList.toggle('visible', Number(part.dataset.part) <= hangState.mistakes); });
    byId('hangUsed').textContent = hangState.wins + ' termiä oikein tällä kierroksella';
  }
  function guessHangman(value) {
    if (!hangState || hangState.finished) return;
    var guess = normalized(value), target = normalized(hangState.card.term); if (!guess) return;
    finishHangman(guess === target);
  }
  function finishHangman(won) {
    hangState.finished = true;
    if (won) hangState.wins++; else hangState.mistakes++;
    paintHangman(true);
    byId('hangMessage').textContent = won ? 'Oikein: ' + hangState.card.term + '. Uusi termi alkaa pian.' : 'Väärin — termi oli ' + hangState.card.term + '. Uusi termi alkaa pian.';
    if (won) { stats.minigames.hangmanWins = (stats.minigames.hangmanWins || 0) + 1; save('virtapiiriStats', stats); }
    if (hangState.mistakes >= 6) {
      byId('hangMessage').textContent += ' Kierros päättyi tulokseen ' + hangState.wins + ' oikein.';
      setTimeout(function () { startHangmanRound(false); }, 2200);
    } else setTimeout(function () { startHangmanRound(true); }, 1500);
  }

  function bind() {
    document.querySelectorAll('[data-view], [data-view-link]').forEach(function (el) { el.addEventListener('click', function (e) { e.preventDefault(); showView(el.dataset.view || el.dataset.viewLink); }); });
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { config.mode = b.dataset.mode; config.length = config.mode === 'exam' ? 8 : 10; config.timer = false; byId('timerEnabled').checked = false; document.querySelectorAll('[data-mode]').forEach(function (x) { x.classList.toggle('selected', x === b); }); document.querySelectorAll('[data-length]').forEach(function (x) { x.classList.toggle('selected', Number(x.dataset.length) === 8); }); byId('timerOption').classList.add('hidden'); byId('examLengths').classList.toggle('hidden', config.mode !== 'exam'); byId('difficultyStep').textContent = config.mode === 'exam' ? '03' : '02'; byId('topicsStep').textContent = config.mode === 'exam' ? '04' : '03'; updateSummary(); }); });
    document.querySelectorAll('[data-length]').forEach(function (b) { b.addEventListener('click', function () { config.length = Number(b.dataset.length); config.timer = false; byId('timerEnabled').checked = false; document.querySelectorAll('[data-length]').forEach(function (x) { x.classList.toggle('selected', x === b); }); if (config.length === 30) { config.difficulty = 'extreme'; document.querySelectorAll('[data-difficulty]').forEach(function (x) { x.classList.toggle('selected', x.dataset.difficulty === 'extreme'); }); } var timed = config.length > 8; byId('timerOption').classList.toggle('hidden', !timed); byId('timerCopy').textContent = config.length === 15 ? '55 minuuttia' : '2 tuntia'; updateSummary(); }); });
    document.querySelectorAll('[data-difficulty]').forEach(function (b) { b.addEventListener('click', function () { if (config.mode === 'exam' && config.length === 30 && b.dataset.difficulty !== 'extreme') { byId('setupError').textContent = 'Mestaritentti suoritetaan erittäin haastavalla tasolla.'; return; } byId('setupError').textContent = ''; config.difficulty = b.dataset.difficulty; document.querySelectorAll('[data-difficulty]').forEach(function (x) { x.classList.toggle('selected', x === b); }); updateSummary(); }); });
    byId('timerEnabled').addEventListener('change', function () { config.timer = this.checked; updateSummary(); });
    byId('selectAllTopics').addEventListener('click', function () { config.selected = Object.keys(topics); renderTopics(); updateSummary(); });
    byId('clearTopics').addEventListener('click', function () { config.selected = []; config.weighted = []; renderTopics(); updateSummary(); });
    byId('startSession').addEventListener('click', startSession);
    byId('checkAnswer').addEventListener('click', checkAnswer); byId('nextQuestion').addEventListener('click', nextQuestion); byId('quitQuiz').addEventListener('click', quitQuiz);
    byId('hintButton').addEventListener('click', function () { if (session) { session.usedHint = true; updatePointPreview(); } byId('hintPopover').classList.toggle('hidden'); });
    byId('quizFormulaButton').addEventListener('click', openFormulaDrawer); byId('closeFormulaDrawer').addEventListener('click', closeFormulaDrawer); byId('drawerBackdrop').addEventListener('click', closeFormulaDrawer);
    byId('retrySession').addEventListener('click', function () { byId('resultsPanel').classList.add('hidden'); byId('setupPanel').classList.remove('hidden'); window.scrollTo({ top: byId('practiceTitle').offsetTop - 80, behavior: 'smooth' }); });
    var filter = byId('flashFilter'); filter.innerHTML += Object.keys(topics).map(function (id) { return '<option value="' + id + '">' + topics[id].name + '</option>'; }).join('');
    filter.addEventListener('change', function () { flashState.filter = this.value; renderFlashcards(true); });
    byId('flashCard').addEventListener('click', function () { this.classList.toggle('flipped'); });
    byId('flashCard').addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.classList.toggle('flipped'); } });
    byId('cardAgain').addEventListener('click', function () { advanceCard(false); }); byId('cardKnown').addEventListener('click', function () { advanceCard(true); });
    byId('resetCards').addEventListener('click', function () { knownCards = []; save('virtapiiriCards', knownCards); renderFlashcards(false); });
    byId('formulaFilter').innerHTML += Object.keys(topics).map(function (id) { return '<option value="' + id + '">' + topics[id].name + '</option>'; }).join('');
    byId('formulaSearch').addEventListener('input', renderFormulaBank); byId('formulaFilter').addEventListener('change', renderFormulaBank);
    document.querySelectorAll('.game-tab').forEach(function (tab) { tab.addEventListener('click', function () { document.querySelectorAll('.game-tab').forEach(function (x) { x.classList.toggle('active', x === tab); }); document.querySelectorAll('.game-panel').forEach(function (p) { p.classList.toggle('active', p.id === tab.dataset.game + 'Game'); }); if (tab.dataset.game === 'memory') renderMemory(); if (tab.dataset.game === 'hangman') startHangmanRound(); }); });
    document.querySelectorAll('[data-game-jump]').forEach(function (button) { button.addEventListener('click', function () { showView('games'); var tab = document.querySelector('[data-game="' + button.dataset.gameJump + '"]'); if (tab) tab.click(); }); });
    byId('startRapid').addEventListener('click', startRapid); byId('resetMemory').addEventListener('click', renderMemory);
    byId('hangForm').addEventListener('submit', function (e) { e.preventDefault(); guessHangman(byId('hangInput').value); });
  }

  renderDomains(); renderTopics(); bind(); updateSummary(); renderFlashcards(true); renderFormulaBank(); renderMemory(); startHangmanRound();
}());

