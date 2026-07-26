/* ==========================================================================
   PRODUCE ATLAS — CORE DATASET
   --------------------------------------------------------------------------
   Every figure here is real. Domestication ages are calibrated years before
   present (cal BP, present = 1950) from archaeobotanical or archaeogenomic
   evidence, and each carries the site the claim rests on. Production is FAO
   round-figure annual output. Where a date is contested the record says so
   in `confidence` rather than presenting a single number as settled.

   Dispersal legs are historical vectors with the earliest defensible date
   for arrival, not the date of widespread adoption.

   Seasonality is a Northern-Hemisphere (US/EU) retail availability profile
   across 12 months: 0 = absent, 1 = stored or imported, 2 = local peak.
   ========================================================================== */

/* Vavilov's centres of origin, as delimited in "Studies on the Origin of
   Cultivated Plants" (1926) and the 1935 revision. Bounds are approximate
   rendering extents, not claims about hard boundaries. */
const VAVILOV_CENTRES = [
  { id: 'I',    name: 'Chinese',                bounds: [ 24,  99,  41, 122], channel: 'viridian' },
  { id: 'II',   name: 'Indian',                 bounds: [  8,  72,  28,  92], channel: 'viridian' },
  { id: 'IIa',  name: 'Indo-Malayan',           bounds: [-10,  96,  10, 142], channel: 'viridian' },
  { id: 'III',  name: 'Central Asiatic',        bounds: [ 30,  60,  45,  80], channel: 'amber'    },
  { id: 'IV',   name: 'Near Eastern',           bounds: [ 30,  33,  42,  53], channel: 'amber'    },
  { id: 'V',    name: 'Mediterranean',          bounds: [ 30,  -9,  45,  36], channel: 'amber'    },
  { id: 'VI',   name: 'Abyssinian',             bounds: [  4,  33,  16,  44], channel: 'amber'    },
  { id: 'VII',  name: 'South Mexican & C. Am.', bounds: [ 12, -106,  24, -83], channel: 'xeno'    },
  { id: 'VIII', name: 'South American',         bounds: [-20, -80,   2, -63], channel: 'xeno'    },
  { id: 'VIIIa',name: 'Chiloé',                 bounds: [-44, -75, -40, -72], channel: 'xeno'    },
  { id: 'VIIIb',name: 'Brazilian-Paraguayan',   bounds: [-25, -60, -10, -45], channel: 'xeno'    }
];

const TAXA = [
  {
    id: 'ZEA-MAY',
    common: 'Maize',
    sci: 'Zea mays subsp. mays',
    family: 'Poaceae',
    progenitor: 'Zea mays subsp. parviglumis (Balsas teosinte)',
    centre: 'VII',
    origin: { lat: 18.0, lng: -100.2, place: 'Balsas River valley, Guerrero, Mexico' },
    domesticated: 9000,
    confidence: 'high',
    evidence: 'Starch grains and phytoliths, Xihuatoxtla rockshelter, 8700 cal BP; earliest cobs, Guilá Naquitz, 6250 cal BP.',
    genome: '2n = 2x = 20',
    production: 1160,
    producers: [['United States', 349], ['China', 277], ['Brazil', 109], ['Argentina', 59]],
    season: [1,1,1,1,1,1,2,2,2,2,1,1],
    traits: ['C4 photosynthesis', 'Monoecious', 'Non-shattering rachis', 'Naked kernel'],
    dispersal: [
      { to: [33.5, -111.9], place: 'Sonoran Desert',    year: -2100, mode: 'overland' },
      { to: [-12.0, -77.0], place: 'Central Andes',     year: -1300, mode: 'overland' },
      { to: [37.4, -6.0],   place: 'Seville',           year: 1493,  mode: 'Columbian Exchange' },
      { to: [6.5, 3.4],     place: 'Bight of Benin',    year: 1550,  mode: 'Atlantic trade' },
      { to: [30.6, 114.3],  place: 'Middle Yangtze',    year: 1560,  mode: 'Manila galleon' }
    ],
    note: 'Domestication turned a shattering, two-ranked spike bearing a dozen hard-cased seeds into a cob holding several hundred exposed kernels. The plant can no longer disperse without us.'
  },
  {
    id: 'TRI-AES',
    common: 'Bread wheat',
    sci: 'Triticum aestivum',
    family: 'Poaceae',
    progenitor: 'T. turgidum ssp. dicoccon × Aegilops tauschii',
    centre: 'IV',
    origin: { lat: 37.7, lng: 39.3, place: 'Karacadağ range, southeastern Anatolia' },
    domesticated: 10500,
    confidence: 'high',
    evidence: 'Non-shattering einkorn, Abu Hureyra and Çayönü; hexaploid hybridisation event dated to c. 8500 cal BP, Caspian littoral.',
    genome: '2n = 6x = 42 (AABBDD)',
    production: 808,
    producers: [['China', 138], ['India', 108], ['Russia', 92], ['United States', 45]],
    season: [1,1,1,1,1,1,2,2,2,1,1,1],
    traits: ['Hexaploid', 'Free-threshing', 'Tough rachis', 'Autogamous'],
    dispersal: [
      { to: [37.9, 23.7],  place: 'Aegean',          year: -6400, mode: 'Neolithic expansion' },
      { to: [27.3, 68.1],  place: 'Indus valley',    year: -6000, mode: 'overland' },
      { to: [51.5, -0.1],  place: 'British Isles',   year: -4000, mode: 'Neolithic expansion' },
      { to: [34.3, 108.9], place: 'Wei river',       year: -2000, mode: 'Inner Asian corridor' },
      { to: [19.4, -99.1], place: 'Valley of Mexico', year: 1521,  mode: 'Columbian Exchange' }
    ],
    note: 'Bread wheat has never existed in the wild. It is the product of a hybridisation between a domesticated tetraploid and a wild goatgrass that could only have happened in a cultivated field.'
  },
  {
    id: 'ORY-SAT',
    common: 'Asian rice',
    sci: 'Oryza sativa',
    family: 'Poaceae',
    progenitor: 'Oryza rufipogon',
    centre: 'I',
    origin: { lat: 29.9, lng: 120.1, place: 'Lower Yangtze basin, Zhejiang' },
    domesticated: 9000,
    confidence: 'high',
    evidence: 'Managed stands at Shangshan, 10000 cal BP; non-shattering spikelet bases rise from 27% to 39% at Tianluoshan between 6900 and 6600 cal BP.',
    genome: '2n = 2x = 24',
    production: 776,
    producers: [['China', 209], ['India', 196], ['Bangladesh', 57], ['Indonesia', 54]],
    season: [1,1,1,1,1,1,1,1,2,2,2,1],
    traits: ['Semi-aquatic', 'Non-shattering', 'Photoperiod-sensitive', 'Two subspecies'],
    dispersal: [
      { to: [23.1, 113.3], place: 'Pearl River delta', year: -3000, mode: 'overland' },
      { to: [25.6, 85.1],  place: 'Middle Ganges',     year: -2500, mode: 'overland' },
      { to: [35.0, 135.8], place: 'Kinai, Japan',      year: -900,  mode: 'maritime' },
      { to: [32.9, 44.4],  place: 'Mesopotamia',       year: -300,  mode: 'Achaemenid trade' },
      { to: [32.8, -79.9], place: 'Carolina lowcountry', year: 1685, mode: 'Atlantic trade' }
    ],
    note: 'Japonica and indica were domesticated from different rufipogon populations. The non-shattering allele crossed between them — indica inherited its domestication from japonica by introgression.'
  },
  {
    id: 'SOL-TUB',
    common: 'Potato',
    sci: 'Solanum tuberosum',
    family: 'Solanaceae',
    progenitor: 'Solanum brevicaule complex',
    centre: 'VIII',
    origin: { lat: -15.8, lng: -69.3, place: 'Lake Titicaca basin, Peru–Bolivia' },
    domesticated: 8000,
    confidence: 'high',
    evidence: 'Tuber starch on grinding stones, Monte Verde II (wild use, 14600 cal BP); cultivated remains, Chilca Canyon, 7000 cal BP.',
    genome: '2n = 4x = 48',
    production: 375,
    producers: [['China', 95], ['India', 56], ['Ukraine', 21], ['Russia', 19]],
    season: [1,1,1,1,1,2,2,2,2,2,1,1],
    traits: ['Autotetraploid', 'Vegetative propagation', 'Glycoalkaloid defence', 'Short-day tuberisation'],
    dispersal: [
      { to: [28.1, -15.4], place: 'Canary Islands',  year: 1567, mode: 'Atlantic trade' },
      { to: [37.4, -6.0],  place: 'Seville',         year: 1570, mode: 'Columbian Exchange' },
      { to: [53.3, -6.3],  place: 'Ireland',         year: 1590, mode: 'coastal trade' },
      { to: [30.6, 114.3], place: 'Hubei',           year: 1700, mode: 'maritime' },
      { to: [28.6, 77.2],  place: 'Northern India',  year: 1780, mode: 'colonial introduction' }
    ],
    note: 'Andean landraces are short-day plants that tuberise only near the equinox. European agriculture required a mutation in the CDF1 gene allowing tuberisation under long days — it took roughly two centuries to fix.'
  },
  {
    id: 'SOL-LYC',
    common: 'Tomato',
    sci: 'Solanum lycopersicum',
    family: 'Solanaceae',
    progenitor: 'S. lycopersicum var. cerasiforme',
    centre: 'VII',
    origin: { lat: -5.2, lng: -80.6, place: 'Coastal Ecuador and northern Peru (wild range)' },
    domesticated: 2500,
    confidence: 'contested',
    evidence: 'No secure archaeobotanical horizon. Genomic evidence places the semi-domesticated intermediate in Ecuador and the final domestication in Mesoamerica; Nahuatl "tomatl" is the first written record, 16th c.',
    genome: '2n = 2x = 24',
    production: 186,
    producers: [['China', 68], ['India', 20], ['Türkiye', 13], ['United States', 10]],
    season: [1,1,1,1,2,2,2,2,2,1,1,1],
    traits: ['Fleshy berry', 'Self-compatible', 'Fruit-size QTL fw2.2', 'Climacteric ripening'],
    dispersal: [
      { to: [19.4, -99.1], place: 'Valley of Mexico', year: -500, mode: 'overland' },
      { to: [37.4, -6.0],  place: 'Seville',          year: 1540, mode: 'Columbian Exchange' },
      { to: [40.9, 14.3],  place: 'Campania',         year: 1590, mode: 'Mediterranean trade' },
      { to: [39.9, 116.4], place: 'Beijing',          year: 1620, mode: 'Jesuit introduction' },
      { to: [38.0, -78.5], place: 'Virginia',         year: 1781, mode: 'return migration' }
    ],
    note: 'A round-trip crop. Domesticated in the Americas, held in Europe for two centuries as an ornamental suspected of toxicity, and only returned to North American kitchens in the late 18th century.'
  },
  {
    id: 'THE-CAC',
    common: 'Cacao',
    sci: 'Theobroma cacao',
    family: 'Malvaceae',
    progenitor: 'Wild T. cacao, Upper Amazon',
    centre: 'VIII',
    origin: { lat: -4.4, lng: -78.9, place: 'Santa Ana-La Florida, Zamora-Chinchipe, Ecuador' },
    domesticated: 5300,
    confidence: 'high',
    evidence: 'Theobromine residue, starch grains and ancient DNA in Mayo-Chinchipe ceramics, 5300 cal BP — 1500 years before any Mesoamerican use.',
    genome: '2n = 2x = 20',
    production: 5.8,
    producers: [['Côte d\'Ivoire', 2.2], ['Ghana', 0.65], ['Indonesia', 0.65], ['Ecuador', 0.43]],
    season: [1,1,1,1,1,1,1,1,1,1,1,1],
    traits: ['Cauliflorous', 'Midge-pollinated', 'Recalcitrant seed', 'Understory shade crop'],
    dispersal: [
      { to: [17.5, -91.5], place: 'Usumacinta basin', year: -1900, mode: 'overland' },
      { to: [19.4, -99.1], place: 'Valley of Mexico', year: -600,  mode: 'tribute network' },
      { to: [40.4, -3.7],  place: 'Madrid',           year: 1528,  mode: 'Columbian Exchange' },
      { to: [1.6, 10.5],   place: 'Bioko',            year: 1822,  mode: 'plantation transfer' },
      { to: [5.6, -0.2],   place: 'Gold Coast',       year: 1876,  mode: 'plantation transfer' }
    ],
    note: 'Cacao seeds are recalcitrant — they cannot be dried or frozen and die within weeks of leaving the pod. Every transoceanic move required living plants in transit, which is why the crop travelled so slowly.'
  },
  {
    id: 'COF-ARA',
    common: 'Arabica coffee',
    sci: 'Coffea arabica',
    family: 'Rubiaceae',
    progenitor: 'C. eugenioides × C. canephora',
    centre: 'VI',
    origin: { lat: 7.3, lng: 36.2, place: 'Kaffa highlands, southwestern Ethiopia' },
    domesticated: 1000,
    confidence: 'moderate',
    evidence: 'No archaeobotany. Earliest textual attestation of brewed coffee in Sufi practice, Yemen, 15th c. Allopolyploid origin dated genomically to c. 600 ka, long predating human use.',
    genome: '2n = 4x = 44',
    production: 11.1,
    producers: [['Brazil', 3.2], ['Vietnam', 1.9], ['Colombia', 0.75], ['Indonesia', 0.76]],
    season: [1,1,1,1,1,1,1,1,1,1,1,1],
    traits: ['Allotetraploid', 'Self-fertile', 'Narrow genetic base', 'Shade-tolerant'],
    dispersal: [
      { to: [15.4, 44.2],  place: 'Yemen highlands', year: 1450, mode: 'Red Sea trade' },
      { to: [41.0, 28.9],  place: 'Istanbul',        year: 1554, mode: 'Ottoman trade' },
      { to: [-6.2, 106.8], place: 'Java',            year: 1696, mode: 'VOC transfer' },
      { to: [14.6, -61.1], place: 'Martinique',      year: 1720, mode: 'colonial transfer' },
      { to: [-22.9, -43.2],place: 'Rio de Janeiro',  year: 1727, mode: 'colonial transfer' }
    ],
    note: 'Nearly all cultivated arabica outside Ethiopia descends from a handful of plants taken to Yemen, then from a single seedling raised in Amsterdam in 1706. The crop\'s genetic base is measurably narrower than that of its wild population.'
  },
  {
    id: 'MUS-ACU',
    common: 'Banana',
    sci: 'Musa acuminata (AAA)',
    family: 'Musaceae',
    progenitor: 'M. acuminata ssp. banksii',
    centre: 'IIa',
    origin: { lat: -5.8, lng: 144.3, place: 'Kuk Swamp, Wahgi valley, New Guinea' },
    domesticated: 6900,
    confidence: 'high',
    evidence: 'Musa phytoliths in drained-field contexts at Kuk, 6950 cal BP, with associated mounding and ditching.',
    genome: '3n = 3x = 33',
    production: 135,
    producers: [['India', 35], ['China', 12], ['Indonesia', 9.2], ['Brazil', 6.8]],
    season: [1,1,1,1,1,1,1,1,1,1,1,1],
    traits: ['Triploid', 'Parthenocarpic', 'Sterile', 'Clonally propagated'],
    dispersal: [
      { to: [-2.5, 118.0], place: 'Sulawesi',        year: -3000, mode: 'Austronesian voyaging' },
      { to: [-18.9, 47.5], place: 'Madagascar',      year: 500,   mode: 'Austronesian voyaging' },
      { to: [0.3, 32.6],   place: 'Great Lakes',     year: 1000,  mode: 'overland' },
      { to: [28.1, -15.4], place: 'Canary Islands',  year: 1402,  mode: 'Atlantic trade' },
      { to: [18.5, -69.9], place: 'Hispaniola',      year: 1516,  mode: 'Columbian Exchange' }
    ],
    note: 'The edible banana is a sterile triploid with no seeds and no sexual reproduction. Every Cavendish plant on Earth is a cutting of the same individual, which is why a single fungal lineage can threaten the entire export crop.'
  },
  {
    id: 'MAL-DOM',
    common: 'Apple',
    sci: 'Malus domestica',
    family: 'Rosaceae',
    progenitor: 'Malus sieversii (with M. sylvestris introgression)',
    centre: 'III',
    origin: { lat: 43.2, lng: 76.9, place: 'Tian Shan forests, Kazakhstan' },
    domesticated: 4000,
    confidence: 'high',
    evidence: 'Large-fruited Malus at Bronze Age sites along the Inner Asian Mountain Corridor; genomic analysis shows subsequent hybridisation with European crabapple during westward transit.',
    genome: '2n = 2x = 34',
    production: 96,
    producers: [['China', 48], ['Türkiye', 4.8], ['United States', 4.4], ['Poland', 4.3]],
    season: [1,1,1,1,1,1,1,2,2,2,2,1],
    traits: ['Self-incompatible', 'Grafted clonally', 'Insect-pollinated', 'Cold-requiring'],
    dispersal: [
      { to: [39.6, 66.9],  place: 'Sogdiana',       year: -2000, mode: 'Silk Road' },
      { to: [32.6, 44.4],  place: 'Babylonia',      year: -1500, mode: 'overland' },
      { to: [37.9, 23.7],  place: 'Attica',         year: -600,  mode: 'Mediterranean trade' },
      { to: [48.9, 2.3],   place: 'Gaul',           year: -50,   mode: 'Roman expansion' },
      { to: [42.4, -71.1], place: 'Massachusetts Bay', year: 1625, mode: 'colonial settlement' }
    ],
    note: 'Apples do not come true from seed — a pip from a Gala produces something that is not a Gala. The crop is inseparable from grafting, so the westward spread of the apple is also the spread of a technique.'
  },
  {
    id: 'VIT-VIN',
    common: 'Grape',
    sci: 'Vitis vinifera ssp. vinifera',
    family: 'Vitaceae',
    progenitor: 'V. vinifera ssp. sylvestris',
    centre: 'IV',
    origin: { lat: 41.5, lng: 44.8, place: 'Gadachrili Gora, Kvemo Kartli, Georgia' },
    domesticated: 8000,
    confidence: 'high',
    evidence: 'Tartaric acid residue in Shulaveri-Shomu jars, 7950 cal BP; genomic work identifies parallel Caucasian table and Levantine wine domestications.',
    genome: '2n = 2x = 38',
    production: 75,
    producers: [['China', 12], ['Italy', 7.3], ['Spain', 6.1], ['France', 5.9]],
    season: [1,1,1,1,1,1,1,2,2,2,1,1],
    traits: ['Hermaphrodite (from dioecious)', 'Clonally propagated', 'Berry cluster', 'Deep-rooting'],
    dispersal: [
      { to: [33.5, 35.5],  place: 'Phoenician coast', year: -2500, mode: 'maritime trade' },
      { to: [37.5, 15.1],  place: 'Sicily',           year: -750,  mode: 'Greek colonisation' },
      { to: [43.6, 3.9],   place: 'Narbonensis',      year: -125,  mode: 'Roman expansion' },
      { to: [-33.9, 18.4], place: 'Cape of Good Hope', year: 1655, mode: 'VOC settlement' },
      { to: [37.8, -122.4],place: 'Alta California',  year: 1769,  mode: 'mission planting' }
    ],
    note: 'The wild vine is dioecious; domestication selected a hermaphrodite mutation that lets a single plant set fruit alone. Every classical variety is a clone maintained by cutting for two millennia or more.'
  },
  {
    id: 'CAP-ANN',
    common: 'Chili pepper',
    sci: 'Capsicum annuum',
    family: 'Solanaceae',
    progenitor: 'C. annuum var. glabriusculum (chiltepín)',
    centre: 'VII',
    origin: { lat: 22.5, lng: -99.1, place: 'Northeastern Mexico, Sierra Madre Oriental' },
    domesticated: 6000,
    confidence: 'high',
    evidence: 'Capsicum starch microfossils from Tehuacán, 6000 cal BP; multiproxy modelling places the domestication centre north of the earlier-assumed Tehuacán focus.',
    genome: '2n = 2x = 24',
    production: 57,
    producers: [['China', 20], ['Mexico', 3.4], ['Türkiye', 3.1], ['Indonesia', 2.7]],
    season: [1,1,1,1,1,2,2,2,2,2,1,1],
    traits: ['Capsaicinoid defence', 'Bird-dispersed', 'Self-compatible', 'Non-deciduous fruit'],
    dispersal: [
      { to: [37.4, -6.0],  place: 'Seville',        year: 1493, mode: 'Columbian Exchange' },
      { to: [15.5, 73.8],  place: 'Goa',            year: 1510, mode: 'Portuguese Estado da Índia' },
      { to: [30.6, 104.1], place: 'Sichuan',        year: 1640, mode: 'overland from Canton' },
      { to: [37.6, 127.0], place: 'Korean peninsula', year: 1600, mode: 'maritime' },
      { to: [47.5, 19.0],  place: 'Hungarian plain', year: 1569, mode: 'Ottoman transfer' }
    ],
    note: 'Capsaicin deters mammals but not birds, which lack the receptor and disperse the seeds intact. The compound evolved to prevent exactly the kind of consumption that made the plant a global crop.'
  },
  {
    id: 'MAN-ESC',
    common: 'Cassava',
    sci: 'Manihot esculenta',
    family: 'Euphorbiaceae',
    progenitor: 'M. esculenta ssp. flabellifolia',
    centre: 'VIIIb',
    origin: { lat: -11.0, lng: -62.0, place: 'Southwestern Amazon, Rondônia, Brazil' },
    domesticated: 8000,
    confidence: 'high',
    evidence: 'Starch grains on tools, Aguadulce shelter, Panama, 7600 cal BP; molecular phylogeny locates the single wild progenitor population in Rondônia.',
    genome: '2n = 2x = 36',
    production: 330,
    producers: [['Nigeria', 60], ['DR Congo', 49], ['Thailand', 30], ['Ghana', 23]],
    season: [1,1,1,1,1,1,1,1,1,1,1,1],
    traits: ['Cyanogenic glycosides', 'Drought-tolerant', 'Stem-cutting propagation', 'In-ground storage'],
    dispersal: [
      { to: [9.0, -79.5],  place: 'Isthmus of Panama', year: -5600, mode: 'overland' },
      { to: [18.5, -69.9], place: 'Hispaniola',        year: -1000, mode: 'Arawak voyaging' },
      { to: [-8.8, 13.2],  place: 'Kongo coast',       year: 1558,  mode: 'Atlantic trade' },
      { to: [6.5, 3.4],    place: 'Bight of Benin',    year: 1700,  mode: 'coastal trade' },
      { to: [13.8, 100.5], place: 'Siam',              year: 1786,  mode: 'maritime' }
    ],
    note: 'Bitter cassava stores cyanogenic glycosides that make the root lethal raw. Its spread depended on transferring a multi-day detoxification process — grating, pressing, fermenting — alongside the plant itself.'
  },
  {
    id: 'GLY-MAX',
    common: 'Soybean',
    sci: 'Glycine max',
    family: 'Fabaceae',
    progenitor: 'Glycine soja',
    centre: 'I',
    origin: { lat: 34.8, lng: 114.0, place: 'Huang-Huai plain, central China' },
    domesticated: 5000,
    confidence: 'high',
    evidence: 'Seed-size increase across Jiahu and Yellow River sequences from 9000 cal BP; fully domesticated seed dimensions by 5000 cal BP.',
    genome: '2n = 4x = 40 (palaeopolyploid)',
    production: 349,
    producers: [['Brazil', 121], ['United States', 116], ['Argentina', 44], ['China', 20]],
    season: [1,1,1,1,1,1,1,1,2,2,1,1],
    traits: ['Nitrogen-fixing', 'Photoperiod-sensitive', 'High seed protein', 'Indehiscent pod'],
    dispersal: [
      { to: [37.6, 127.0], place: 'Korean peninsula', year: -1000, mode: 'overland' },
      { to: [35.0, 135.8], place: 'Kinai, Japan',     year: -300,  mode: 'maritime' },
      { to: [-6.2, 106.8], place: 'Java',             year: 1200,  mode: 'maritime trade' },
      { to: [51.5, -0.1],  place: 'London',           year: 1790,  mode: 'East India trade' },
      { to: [41.9, -87.6], place: 'Illinois',         year: 1851,  mode: 'agricultural exchange' }
    ],
    note: 'Grown in East Asia for five millennia as a food legume, the soybean became a global commodity only after 1930s processing separated it into oil and protein meal — two products, neither of which is a bean.'
  },
  {
    id: 'OLE-EUR',
    common: 'Olive',
    sci: 'Olea europaea ssp. europaea',
    family: 'Oleaceae',
    progenitor: 'O. europaea var. sylvestris (oleaster)',
    centre: 'V',
    origin: { lat: 32.8, lng: 35.0, place: 'Carmel coast, southern Levant' },
    domesticated: 6000,
    confidence: 'high',
    evidence: 'Submerged olive-pressing installations and crushed stones at Kfar Samir, 6600–5800 cal BP.',
    genome: '2n = 2x = 46',
    production: 23,
    producers: [['Spain', 6.5], ['Italy', 2.6], ['Türkiye', 2.6], ['Morocco', 1.9]],
    season: [1,1,1,1,1,1,1,1,1,2,2,2],
    traits: ['Evergreen', 'Wind-pollinated', 'Alternate bearing', 'Extreme longevity'],
    dispersal: [
      { to: [35.3, 25.1],  place: 'Crete',           year: -3500, mode: 'maritime trade' },
      { to: [36.8, 10.2],  place: 'Carthage',        year: -800,  mode: 'Phoenician colonisation' },
      { to: [37.4, -6.0],  place: 'Baetica',         year: -200,  mode: 'Roman expansion' },
      { to: [-33.4, -70.7],place: 'Central Chile',   year: 1560,  mode: 'colonial planting' },
      { to: [35.4, -119.0],place: 'San Joaquin valley', year: 1769, mode: 'mission planting' }
    ],
    note: 'Olive trees are effectively immortal under coppicing — the trunk dies and regenerates from the base. Individual groves in the Levant have been in continuous production since the Bronze Age.'
  },
  {
    id: 'SAC-OFF',
    common: 'Sugarcane',
    sci: 'Saccharum officinarum',
    family: 'Poaceae',
    progenitor: 'Saccharum robustum',
    centre: 'IIa',
    origin: { lat: -5.8, lng: 144.3, place: 'New Guinea highlands' },
    domesticated: 8000,
    confidence: 'moderate',
    evidence: 'Associated with the Kuk Swamp cultivation horizon, 8000 cal BP; direct macrofossils are scarce because cane leaves no durable seed.',
    genome: '2n = 8x = 80',
    production: 1900,
    producers: [['Brazil', 725], ['India', 439], ['China', 104], ['Thailand', 92]],
    season: [1,1,1,1,1,1,1,1,1,1,1,1],
    traits: ['C4 photosynthesis', 'Octoploid', 'Vegetative propagation', 'High sucrose parenchyma'],
    dispersal: [
      { to: [22.6, 88.4],  place: 'Bengal',          year: -1000, mode: 'Austronesian and overland' },
      { to: [31.3, 48.7],  place: 'Khuzestan',       year: 600,   mode: 'Sasanian transfer' },
      { to: [35.5, 12.6],  place: 'Ifriqiya',        year: 750,   mode: 'Islamic agricultural revolution' },
      { to: [32.6, -16.9], place: 'Madeira',         year: 1425,  mode: 'Atlantic islands' },
      { to: [-8.1, -34.9], place: 'Pernambuco',      year: 1516,  mode: 'plantation transfer' }
    ],
    note: 'The single largest crop on Earth by tonnage. Its movement west across the Indian Ocean and Mediterranean carried with it the plantation form of labour organisation, which reached the Atlantic before the cane did.'
  },
  {
    id: 'PER-AME',
    common: 'Avocado',
    sci: 'Persea americana',
    family: 'Lauraceae',
    progenitor: 'Wild P. americana, Mesoamerican highlands',
    centre: 'VII',
    origin: { lat: 18.4, lng: -97.4, place: 'Tehuacán valley, Puebla, Mexico' },
    domesticated: 7500,
    confidence: 'moderate',
    evidence: 'Avocado stones increasing in size through the Coxcatlán Cave sequence, 9000–5000 cal BP; managed rather than sharply domesticated.',
    genome: '2n = 2x = 24',
    production: 9.5,
    producers: [['Mexico', 2.5], ['Colombia', 1.1], ['Peru', 0.86], ['Dominican Republic', 0.68]],
    season: [1,1,2,2,2,2,2,1,1,1,1,1],
    traits: ['Protogynous dichogamy', 'Recalcitrant seed', 'Oil-rich mesocarp', 'Evergreen'],
    dispersal: [
      { to: [9.9, -84.1],  place: 'Costa Rica',      year: -3000, mode: 'overland' },
      { to: [-12.0, -77.0],place: 'Central coast, Peru', year: -1500, mode: 'overland' },
      { to: [18.5, -69.9], place: 'Hispaniola',      year: 1520, mode: 'Columbian Exchange' },
      { to: [-6.2, 106.8], place: 'Java',            year: 1750, mode: 'colonial transfer' },
      { to: [34.1, -118.1],place: 'Southern California', year: 1856, mode: 'nursery introduction' }
    ],
    note: 'The fruit evolved for dispersal by gomphotheres and other large mammals that went extinct roughly 13 000 years ago. In ecological terms the avocado is an anachronism kept alive by human planting.'
  },
  {
    id: 'PHA-VUL',
    common: 'Common bean',
    sci: 'Phaseolus vulgaris',
    family: 'Fabaceae',
    progenitor: 'Wild P. vulgaris',
    centre: 'VII',
    origin: { lat: 20.5, lng: -103.5, place: 'Lerma–Santiago basin, Jalisco, Mexico' },
    domesticated: 8000,
    confidence: 'high',
    evidence: 'Guitarrero Cave pods, Peru (re-dated to 4300 cal BP); Mesoamerican and Andean gene pools diverged c. 165 ka and were domesticated independently.',
    genome: '2n = 2x = 22',
    production: 28,
    producers: [['India', 6.4], ['Myanmar', 4.0], ['Brazil', 2.9], ['China', 1.3]],
    season: [1,1,1,1,1,2,2,2,2,1,1,1],
    traits: ['Nitrogen-fixing', 'Two gene pools', 'Indehiscent pod', 'Phaseolin seed protein'],
    dispersal: [
      { to: [-15.8, -69.3],place: 'Southern Andes',  year: -6000, mode: 'independent domestication' },
      { to: [36.1, -106.0],place: 'Rio Grande pueblos', year: -1300, mode: 'overland' },
      { to: [37.4, -6.0],  place: 'Seville',         year: 1506, mode: 'Columbian Exchange' },
      { to: [45.4, 11.9],  place: 'Veneto',          year: 1530, mode: 'Mediterranean trade' },
      { to: [0.3, 32.6],   place: 'Great Lakes',     year: 1600, mode: 'Portuguese coastal trade' }
    ],
    note: 'Two separate peoples, 4000 km apart, domesticated the same wild species from two different populations. The Mesoamerican and Andean gene pools remain distinguishable in every bean grown today.'
  },
  {
    id: 'SOR-BIC',
    common: 'Sorghum',
    sci: 'Sorghum bicolor',
    family: 'Poaceae',
    progenitor: 'S. bicolor ssp. verticilliflorum',
    centre: 'VI',
    origin: { lat: 15.5, lng: 36.4, place: 'Eastern Sudan, Atbai region' },
    domesticated: 5500,
    confidence: 'high',
    evidence: 'Domesticated-type spikelets at Khashm el Girba, 5700–5000 cal BP — the earliest secure African cereal domestication.',
    genome: '2n = 2x = 20',
    production: 60,
    producers: [['United States', 12], ['Nigeria', 6.8], ['Ethiopia', 5.3], ['Sudan', 5.0]],
    season: [1,1,1,1,1,1,1,1,2,2,1,1],
    traits: ['C4 photosynthesis', 'Extreme drought tolerance', 'Dhurrin defence', 'Photoperiod-sensitive'],
    dispersal: [
      { to: [12.6, 8.0],   place: 'Sahel',           year: -1500, mode: 'overland' },
      { to: [15.4, 44.2],  place: 'Southern Arabia', year: -1000, mode: 'Red Sea trade' },
      { to: [27.3, 68.1],  place: 'Indus valley',    year: -1700, mode: 'maritime' },
      { to: [-20.2, 28.6], place: 'Zimbabwe plateau', year: 200,  mode: 'Bantu expansion' },
      { to: [32.8, -79.9], place: 'Carolina lowcountry', year: 1700, mode: 'Atlantic trade' }
    ],
    note: 'Sorghum tolerates heat and drought at levels that kill maize, and it is one of very few major crops that was domesticated in and remains adapted to the seasonally arid tropics.'
  }
];

/* Trade corridors drawn as standing geography rather than per-crop legs. */
const CORRIDORS = [
  { name: 'Silk Road',            channel: 'amber', path: [[34.3,108.9],[39.6,66.9],[41.5,44.8],[41.0,28.9]] },
  { name: 'Columbian Exchange',   channel: 'xeno',  path: [[19.4,-99.1],[18.5,-69.9],[28.1,-15.4],[37.4,-6.0]] },
  { name: 'Indian Ocean circuit', channel: 'ice',   path: [[-6.2,106.8],[6.9,79.9],[15.4,44.2],[-18.9,47.5]] },
  { name: 'Austronesian voyaging',channel: 'viridian', path: [[-5.8,144.3],[-2.5,118.0],[-6.2,106.8],[-18.9,47.5]] }
];

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
