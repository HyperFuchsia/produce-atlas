// levels.js — the twelve plates.
//
// Layers read bottom-slice upward, the way a section drawing through soil reads.
//   #  bedrock, solid in both phases      w  thicket, solid only while WILD
//   .  air                                c  terrace, solid only while CULTIVATED
//   @  courier spawn                      s  seed                o  origin plot
//
// Every `solution` here is executed by the test suite and must reach a win, so none of them
// is aspirational. The teaching order is: push, then the phase axis, then the time axis,
// then both at once.
//
// Crop notes are deliberately hedged where the evidence is. Domestication was a process
// spread over centuries, not an event with a date, and the round numbers below are midpoints
// of archaeobotanical ranges, not discoveries.

export const LEVELS = [
  {
    id: 'furrow',
    name: 'Furrow',
    teaches: 'Walk into a seed to push it. Land it on the origin plot.',
    crop: {
      common: 'Emmer wheat',
      binomial: 'Triticum turgidum subsp. dicoccum',
      ancestor: 'Triticum turgidum subsp. dicoccoides',
      origin: 'Fertile Crescent, south-eastern Anatolia',
      years: '~10,500–9,500 years ago',
      confidence: 'contested',
      note: 'Wild emmer shatters when ripe — the stalk breaks and scatters the grain. The plants we eat descend from mutants that could not let go.',
    },
    maxLoops: 0,
    solution: 'EEEE',
    layers: [
      ['#######', '#######', '#######'],
      ['.......', '.@..s.o', '.......'],
      ['.......', '.......', '.......'],
    ],
  },

  {
    id: 'shatter',
    name: 'Shatter',
    teaches: 'Thicket blocks you while the world is wild. Flip it.',
    crop: {
      common: 'Barley',
      binomial: 'Hordeum vulgare subsp. vulgare',
      ancestor: 'Hordeum vulgare subsp. spontaneum',
      origin: 'Fertile Crescent, eastern and western wings',
      years: '~10,500–9,500 years ago',
      confidence: 'contested',
      note: 'Barley tolerates salt and drought better than wheat, which is why it followed farming into places wheat could not go.',
    },
    maxLoops: 0,
    solution: 'FEEEE',
    layers: [
      ['#######', '#######', '#######'],
      ['...w...', '.@.ws.o', '...w...'],
      ['...w...', '...w...', '...w...'],
      ['.......', '.......', '.......'],
    ],
  },

  {
    id: 'terrace',
    name: 'Terrace',
    teaches: 'Stand where a terrace will be. Flipping lifts you with it.',
    crop: {
      common: 'Rice',
      binomial: 'Oryza sativa',
      ancestor: 'Oryza rufipogon',
      origin: 'Lower Yangtze basin, China',
      years: '~10,000–8,000 years ago',
      confidence: 'contested',
      note: 'Terracing let rice climb hillsides it could never have colonised on its own. The landscape was domesticated alongside the plant.',
    },
    maxLoops: 0,
    solution: 'EFEEEE',
    layers: [
      ['########', '########', '########'],
      ['...##...', '.@c##.so', '...##...'],
      ['...##...', '..c##...', '...##...'],
      ['........', '........', '........'],
    ],
  },

  {
    id: 'bund',
    name: 'Bund',
    teaches: 'A terrace lifts seeds too, not just couriers.',
    crop: {
      common: 'Potato',
      binomial: 'Solanum tuberosum',
      ancestor: 'Solanum candolleanum, in the brevicaule complex',
      origin: 'Lake Titicaca basin, Peru and Bolivia',
      years: '~10,000–7,000 years ago',
      confidence: 'contested',
      note: 'Andean farmers grew hundreds of varieties at once across different altitudes — a hedge against frost, blight and drought all at the same time.',
    },
    maxLoops: 0,
    solution: 'EEEF',
    layers: [
      ['#######', '#######', '#######'],
      ['.......', '.@.s.c.', '.......'],
      ['.......', '.....o.', '.......'],
    ],
  },

  {
    id: 'threshold',
    name: 'Threshold',
    teaches: 'One flip can raise you and the seed together.',
    crop: {
      common: 'Maize',
      binomial: 'Zea mays subsp. mays',
      ancestor: 'Balsas teosinte, Zea mays subsp. parviglumis',
      origin: 'Balsas river valley, southern Mexico',
      years: '~9,000 years ago',
      confidence: 'well-established',
      note: 'Teosinte carries a dozen hard-cased kernels on a brittle stalk. Getting from that to a cob is the largest single transformation in any crop.',
    },
    maxLoops: 0,
    solution: 'EEFEE',
    layers: [
      ['########', '########', '########'],
      ['........', '.@scc##.', '........'],
      ['........', '......o.', '........'],
      ['........', '........', '........'],
    ],
  },

  {
    id: 'causeway',
    name: 'Causeway',
    teaches: 'Rewind. Your past self stays in the world — and holds weight.',
    crop: {
      common: 'Banana',
      binomial: 'Musa acuminata cultivars',
      ancestor: 'Musa acuminata subsp. banksii',
      origin: 'Kuk Swamp, New Guinea highlands',
      years: '~7,000–6,400 years ago',
      confidence: 'contested',
      note: 'Cultivated bananas are sterile clones. Every plant is a cutting of a cutting, which is why the crop is so exposed to a single disease.',
    },
    maxLoops: 1,
    solution: 'SEEEN' + 'R' + '...EEEEE',
    layers: [
      ['#######', '#######', '#######'],
      ['###.###', '###.###', '###.###'],
      ['.......', '@s....o', '.......'],
      ['.......', '.......', '.......'],
    ],
  },

  {
    id: 'sheaf',
    name: 'Sheaf',
    teaches: 'Two seeds, one flip. Set them both up first.',
    crop: {
      common: 'Common bean',
      binomial: 'Phaseolus vulgaris',
      ancestor: 'wild Phaseolus vulgaris',
      origin: 'Mesoamerica and the Andes, independently',
      years: '~8,000–4,300 years ago',
      confidence: 'contested',
      note: 'Domesticated twice, from two different wild populations. The beans in your kitchen belong to one lineage or the other.',
    },
    maxLoops: 0,
    solution: 'ESEENEF',
    layers: [
      ['########', '########', '########'],
      ['........', '.@sc.sc.', '........'],
      ['........', '...o..o.', '........'],
    ],
  },

  {
    id: 'contour',
    name: 'Contour',
    teaches: 'Stacked terraces lift two cells in a single flip.',
    crop: {
      common: 'Squash',
      binomial: 'Cucurbita pepo',
      ancestor: 'Cucurbita pepo subsp. fraterna, not firmly resolved',
      origin: 'Guilá Naquitz cave, Oaxaca, Mexico',
      years: '~10,000 years ago',
      confidence: 'well-established',
      note: 'The oldest known domesticate in the Americas — squash seeds in Guilá Naquitz cave predate maize there by well over a thousand years.',
    },
    maxLoops: 0,
    solution: 'EEFEE',
    layers: [
      ['########', '########', '########'],
      ['........', '.@scc###', '........'],
      ['........', '...cc###', '........'],
      ['........', '......o.', '........'],
      ['........', '........', '........'],
    ],
  },

  {
    id: 'bridgework',
    name: 'Bridgework',
    teaches: 'A wider gap needs more of your history standing in it.',
    crop: {
      common: 'Sorghum',
      binomial: 'Sorghum bicolor',
      ancestor: 'Sorghum bicolor subsp. verticilliflorum',
      origin: 'Butana and Atbai, eastern Sudan',
      years: '~5,500–4,000 years ago',
      confidence: 'contested',
      note: 'Sorghum sets seed on rainfall too erratic for maize or wheat, which is why it anchors farming across the dry Sahel.',
    },
    maxLoops: 2,
    solution: 'SEEEN' + 'R' + 'NEEEES' + 'R' + '...EEEEE',
    layers: [
      ['#######', '#######', '#######'],
      ['###..##', '###..##', '###..##'],
      ['.......', '@s....o', '.......'],
      ['.......', '.......', '.......'],
    ],
  },

  {
    id: 'scaffold',
    name: 'Scaffold',
    teaches: 'Walk into your past self to climb onto their shoulders.',
    crop: {
      common: 'Apple',
      binomial: 'Malus domestica',
      ancestor: 'Malus sieversii',
      origin: 'Tian Shan mountains, Kazakhstan',
      years: '~4,000–2,500 years ago',
      confidence: 'contested',
      note: 'Apples do not breed true from seed, so every named variety is a graft — a cutting kept alive on other roots, sometimes for centuries.',
    },
    maxLoops: 1,
    solution: 'EE' + 'R' + 'EEEEE',
    layers: [
      ['########', '########', '########'],
      ['....#...', '.@..#.so', '....#...'],
      ['....#...', '....#...', '....#...'],
      ['........', '........', '........'],
      ['........', '........', '........'],
    ],
  },

  {
    id: 'dispersal',
    name: 'Dispersal',
    teaches: 'Bridge the gap with your history, then flip at the far end.',
    crop: {
      common: 'Cacao',
      binomial: 'Theobroma cacao',
      ancestor: 'wild Theobroma cacao',
      origin: 'Upper Amazon, south-eastern Ecuador',
      years: '~5,300 years ago',
      confidence: 'well-established',
      note: 'Residue on pottery at Santa Ana-La Florida pushed cacao use back millennia, and moved its origin from Mesoamerica to the Amazon.',
    },
    maxLoops: 1,
    solution: 'SEEEN' + 'R' + '...EEEEEF',
    layers: [
      ['########', '########', '########'],
      ['###.####', '###.####', '###.####'],
      ['........', '@s....c.', '........'],
      ['........', '......o.', '........'],
    ],
  },

  {
    id: 'rachis',
    name: 'Rachis',
    teaches: 'Everything at once. Two lanes, one bridge, one flip.',
    crop: {
      common: 'Sunflower',
      binomial: 'Helianthus annuus',
      ancestor: 'wild Helianthus annuus',
      origin: 'Eastern North America',
      years: '~4,500 years ago',
      confidence: 'well-established',
      note: 'One of the few crops domesticated north of Mexico, in a farming tradition that was largely abandoned once maize arrived from the south.',
    },
    maxLoops: 1,
    solution: 'SEEEN' + 'R' + 'NEEEEEWWWWWSEEEEEF',
    layers: [
      ['#########', '#########', '#########'],
      ['#########', '###.#####', '#########'],
      ['.s....c..', '@s....c..', '.........'],
      ['......o..', '......o..', '.........'],
      ['.........', '.........', '.........'],
    ],
  },
];

/** Levels whose whole point is that a single run cannot solve them. */
export const NEEDS_TIME = ['causeway', 'bridgework', 'scaffold', 'dispersal', 'rachis'];

/** Levels that must be impossible without the phase axis. */
export const NEEDS_PHASE = ['shatter', 'terrace', 'bund', 'threshold', 'sheaf', 'contour', 'dispersal', 'rachis'];
