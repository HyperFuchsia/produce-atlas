/* NOGGIN — the atlas.

   One entry per food plant: how it is shaped, how big it actually is, what it
   is botanically, where it came from, and what he can tell you about it.

   `sizeCm` figures are typical specimens, not records — a supermarket apple,
   not a prize one. Shape fields feed src/produce.js; everything else feeds
   src/brain.js. */
(function (NG) {
  'use strict';

  const K = {};

  /* Reusable profiles, base (t=0) to tip (t=1). */
  const SPHERE = [0, 0.58, 0.9, 1.0, 1.0, 0.9, 0.58, 0];
  const APPLE = [0, 0.70, 0.93, 1.0, 1.0, 0.96, 0.85, 0.60, 0.26, 0];
  const PEAR = [0, 0.52, 0.88, 1.0, 0.97, 0.82, 0.6, 0.44, 0.34, 0.18, 0];
  const OVOID = [0, 0.58, 0.86, 0.98, 1.0, 0.98, 0.90, 0.74, 0.45, 0];
  const ELLIPSOID = [0, 0.55, 0.84, 0.96, 1.0, 1.0, 0.96, 0.84, 0.55, 0];
  const ROD = [0, 0.5, 0.85, 0.97, 1.0, 1.0, 0.97, 0.85, 0.5, 0];
  const CONE = [0, 0.16, 0.32, 0.48, 0.63, 0.76, 0.87, 0.95, 1.0, 0.96];
  const BARREL = [0, 0.62, 0.92, 1.0, 1.0, 1.0, 0.96, 0.82, 0];
  const BULB = [0, 0.55, 0.9, 1.0, 0.95, 0.76, 0.46, 0.13, 0];
  const BERRY_POINT = [0, 0.3, 0.55, 0.75, 0.9, 0.99, 1.0, 0.9, 0.0];

  /* type -> plain-language gloss, so he can explain the botany he quotes. */
  K.TYPES = {
    berry: 'a berry — botanically that means a fruit with its seeds inside a fleshy wall, grown from a single ovary',
    pome: 'a pome — the fleshy part is swollen stem tissue, and the real fruit is the core',
    drupe: 'a drupe — one seed sealed inside a hard stone, wrapped in flesh',
    aggregate: 'an aggregate accessory fruit — dozens of tiny fruits stuck to a swollen receptacle',
    multiple: 'a multiple fruit — dozens of separate flowers fused into one body',
    tuber: 'a tuber — a swollen underground stem the plant uses as a battery',
    taproot: 'a taproot — one fat storage root going straight down',
    bulb: 'a bulb — tightly packed leaf bases wrapped around a tiny stem',
    grain: 'a caryopsis, a grain — a one-seeded dry fruit where the seed coat is fused to the fruit wall',
    flower: 'an unopened flower head — you are eating it before it blooms',
    leaf: 'leaves — no fruit involved at all',
    pod: 'a pod — a dry fruit that splits to release seeds',
    legume: 'a legume — a pod fruit from the pea family'
  };

  K.ENTRIES = [
    {
      id: 'apple', name: 'apple', match: ['apple', 'apples', 'malus'],
      sizeCm: 8, lengthCm: 7.2, widthCm: 8, profile: APPLE,
      color: [0.78, 0.13, 0.12], seed: 3,
      stem: { lengthCm: 2.2, widthCm: 0.35, at: 0.42 },
      leaves: { count: 1, lengthCm: 4, widthCm: 2, at: 0.5, tilt: 0.9 },
      skin: 'waxy', skinAmt: 0.05, skinShade: 0.20,
      paint: {
        bottom: [0.74, 0.66, 0.24], bottomPower: 2.6, bottomAmount: 0.85,
        blush: { color: [0.66, 0.07, 0.06], dir: [0.42, 0.62, 0.66], power: 1.5, amount: 0.9 }
      },
      family: 'Rosaceae, the rose family', binomial: 'Malus domestica', type: 'pome',
      origin: 'the Tian Shan mountains of Central Asia, around modern Kazakhstan',
      ancestor: 'Malus sieversii, which still grows wild there',
      facts: [
        'apples do not grow true from seed. Plant a pip from your favourite apple and you get a stranger — every named variety is a cutting of one original tree, kept alive by grafting',
        'that means every Granny Smith on Earth is a clone of a single seedling found in Australia in the 1860s',
        'the flesh is swollen stem tissue. The actual fruit is the papery core you throw away'
      ],
      taste: 'sweet-tart, and the balance is mostly malic acid, which is literally named after the apple'
    },
    {
      id: 'banana', name: 'banana', match: ['banana', 'bananas', 'musa', 'plantain'],
      sizeCm: 18, lengthCm: 18, widthCm: 3.8, profile: ROD, bend: 0.95, lie: true,
      color: [0.92, 0.78, 0.19], segments: 22, rings: 30,
      skin: 'freckled', skinAmt: 0.26, skinShade: 0.30,
      paint: {
        top: [0.24, 0.19, 0.10], topPower: 6.0, topAmount: 0.95,
        bottom: [0.30, 0.24, 0.12], bottomPower: 6.0, bottomAmount: 0.9
      },
      family: 'Musaceae', binomial: 'Musa acuminata and its hybrids', type: 'berry',
      origin: 'New Guinea and Island Southeast Asia',
      ancestor: 'wild bananas that are full of hard black seeds',
      facts: [
        'a banana is botanically a berry, and the plant is a giant herb, not a tree — that trunk is a tube of rolled leaf bases',
        'the Cavendish you buy is a sterile clone. It has no viable seeds, so every plant is propagated from cuttings and the whole global crop is effectively one individual',
        'that monoculture already lost one war: the previous export variety, the Gros Michel, was wrecked by Panama disease in the mid-20th century'
      ],
      taste: 'sweet and faintly solvent-like, from isoamyl acetate — the same compound used in artificial banana flavouring'
    },
    {
      id: 'carrot', name: 'carrot', match: ['carrot', 'carrots', 'daucus'],
      sizeCm: 18, lengthCm: 18, widthCm: 3.4, profile: CONE,
      color: [0.90, 0.42, 0.08], gloss: false,
      leaves: { count: 4, lengthCm: 9, widthCm: 3, at: 0.5, tilt: 0.35, color: [0.24, 0.48, 0.16] },
      family: 'Apiaceae, alongside parsley, celery and hemlock', binomial: 'Daucus carota',
      type: 'taproot',
      origin: 'Central Asia, around Persia and Afghanistan',
      facts: [
        'orange is a recent fashion. For most of their history carrots were purple, white and yellow, and orange ones only became dominant in Europe a few centuries ago',
        'the orange comes from carotene, which your body converts to vitamin A — the pigment is named after the carrot, not the other way round',
        'it is in the same family as hemlock, which is why foraging wild carrot is a genuinely bad idea for beginners'
      ],
      taste: 'sweet and earthy; the earthiness is terpenes and the sweetness is stored sugar the root was saving for next year'
    },
    {
      id: 'tomato', name: 'tomato', match: ['tomato', 'tomatoes', 'solanum lycopersicum'],
      sizeCm: 7, lengthCm: 5.6, widthCm: 7, profile: SPHERE, ribs: 8, ribDepth: 0.05,
      color: [0.83, 0.13, 0.09],
      stem: { lengthCm: 1.4, widthCm: 0.4, at: 0.46, color: [0.25, 0.42, 0.15] },
      skin: 'waxy', skinAmt: 0.05, skinShade: 0.15,
      paint: { top: [0.46, 0.36, 0.10], topPower: 5.0, topAmount: 0.5 },
      family: 'Solanaceae, the nightshades', binomial: 'Solanum lycopersicum', type: 'berry',
      origin: 'western South America, domesticated in Mesoamerica',
      facts: [
        'a tomato is a berry. It sits in the savoury aisle for entirely cultural reasons',
        'it is a nightshade, so it is a close relative of the potato, the aubergine, the chilli and tobacco',
        'Europeans grew it as an ornamental curiosity for a long time before they trusted it as food'
      ],
      taste: 'sweet, sour and savoury at once — it is unusually high in glutamate, which is why it reads as meaty'
    },
    {
      id: 'potato', name: 'potato', match: ['potato', 'potatoes', 'spud', 'tuber'],
      sizeCm: 9, lengthCm: 6, widthCm: 9, profile: ELLIPSOID, ribs: 5, ribDepth: 0.06, lie: true,
      color: [0.72, 0.56, 0.34], gloss: false,
      skin: 'waxy', skinAmt: 0.14, skinShade: 0.26,
      family: 'Solanaceae, the nightshades', binomial: 'Solanum tuberosum', type: 'tuber',
      origin: 'the Andes, in the region of modern Peru and Bolivia',
      facts: [
        'the Andes still hold thousands of potato varieties in colours you would not accept in a shop — blue, purple, red, marbled',
        'a potato is a swollen stem, not a root. The eyes are buds, which is why a forgotten one in the cupboard tries to become a plant',
        'green patches mean solanine, a nightshade alkaloid the tuber makes when exposed to light. That part is genuinely mildly toxic'
      ],
      taste: 'bland on purpose — it is almost pure starch, which is exactly why it took over the world as a staple'
    },
    {
      id: 'strawberry', name: 'strawberry', match: ['strawberry', 'strawberries', 'fragaria'],
      sizeCm: 3.5, lengthCm: 4, widthCm: 3.2, profile: BERRY_POINT,
      color: [0.85, 0.11, 0.18],
      leaves: { count: 5, lengthCm: 2.2, widthCm: 1.1, at: 0.44, tilt: 1.1 },
      skin: 'seeded', skinAmt: 0.28, skinShade: 0.34,
      paint: { top: [0.58, 0.12, 0.10], topPower: 3.0, topAmount: 0.5,
        bottom: [0.80, 0.22, 0.14], bottomPower: 2.4, bottomAmount: 0.55 },
      family: 'Rosaceae, the rose family', binomial: 'Fragaria × ananassa', type: 'aggregate',
      origin: 'a garden hybrid, crossed in 18th-century France from a North American and a Chilean species',
      facts: [
        'a strawberry is not a berry. The red part is a swollen receptacle, and the real fruits are the little pips on the outside, called achenes',
        'so it wears its fruit on the skin, while a banana — an actual berry — hides its seeds inside',
        'the modern strawberry exists because two species from opposite ends of the Americas met in a French garden'
      ],
      taste: 'sweet and floral; the smell is a blend of over three hundred volatile compounds, which is why fake strawberry never quite lands'
    },
    {
      id: 'pineapple', name: 'pineapple', match: ['pineapple', 'pineapples', 'ananas'],
      sizeCm: 18, lengthCm: 18, widthCm: 12, profile: BARREL, ribs: 16, ribDepth: 0.07,
      color: [0.76, 0.55, 0.13], gloss: false,
      crown: { count: 11, lengthCm: 16, widthCm: 3, color: [0.24, 0.44, 0.18] },
      skin: 'celled', skinAmt: 0.30, skinShade: 0.30,
      paint: { bottom: [0.55, 0.40, 0.14], bottomPower: 3.0, bottomAmount: 0.7,
        top: [0.52, 0.52, 0.20], topPower: 3.5, topAmount: 0.55 },
      family: 'Bromeliaceae, the bromeliads', binomial: 'Ananas comosus', type: 'multiple',
      origin: 'South America, between the Paraná and Paraguay rivers',
      facts: [
        'a pineapple plant takes around two years to make one single pineapple. One. In two years',
        'it is a multiple fruit: every one of those diamond-shaped segments was a separate flower, and they fused into one body',
        'it contains bromelain, an enzyme that digests protein — when you eat pineapple, the pineapple is also eating you, which is why your tongue starts to sting'
      ],
      taste: 'sharply sweet and acidic, and it gets less acidic the longer it stays on the plant — it does not ripen further once cut'
    },
    {
      id: 'avocado', name: 'avocado', match: ['avocado', 'avocados', 'persea'],
      sizeCm: 10, lengthCm: 11, widthCm: 7.5, profile: PEAR,
      color: [0.22, 0.26, 0.13], gloss: false,
      skin: 'pitted', skinAmt: 0.26, skinShade: 0.26,
      family: 'Lauraceae, alongside cinnamon and bay', binomial: 'Persea americana', type: 'berry',
      origin: 'south-central Mexico',
      facts: [
        'an avocado is a berry. One enormous seed, one berry',
        'it is a close relative of cinnamon and the bay leaf, which is not obvious from eating one',
        'it will not ripen on the tree. The tree is the storage — a fruit can hang there for months and only starts ripening once picked'
      ],
      taste: 'barely sweet and very fatty, which is rare for a fruit — most fruit bribes animals with sugar, this one uses oil'
    },
    {
      id: 'lemon', name: 'lemon', match: ['lemon', 'lemons', 'citrus limon'],
      sizeCm: 7, lengthCm: 9, widthCm: 6, profile: OVOID,
      color: [0.94, 0.82, 0.12],
      skin: 'pitted', skinAmt: 0.22, skinShade: 0.20,
      paint: { top: [0.62, 0.58, 0.16], topPower: 5.0, topAmount: 0.6,
        bottom: [0.62, 0.58, 0.16], bottomPower: 5.0, bottomAmount: 0.6 },
      family: 'Rutaceae, the citrus family', binomial: 'Citrus limon', type: 'berry',
      origin: 'a hybrid, probably of the citron and the sour orange, from South or Southeast Asia',
      facts: [
        'a lemon is a berry — citrus fruits are a special kind called a hesperidium, with a leathery oily rind',
        'almost every citrus you eat is a hybrid of just a few wild ancestors: the citron, the pomelo, the mandarin and the papeda',
        'the smell in the peel is limonene, stored in tiny pressurised oil glands — that is the spray you see when you bend a strip of zest'
      ],
      taste: 'aggressively sour from citric acid, which can be around five percent of the juice'
    },
    {
      id: 'grape', name: 'grapes', match: ['grape', 'grapes', 'vitis'],
      sizeCm: 16, lengthCm: 16, widthCm: 9,
      cluster: { count: 34, berryCm: 2.0 }, seed: 12,
      color: [0.36, 0.14, 0.38],
      family: 'Vitaceae', binomial: 'Vitis vinifera', type: 'berry',
      origin: 'the Near East and the South Caucasus',
      facts: [
        'grapes are berries, and the wine grape was one of the earliest fruits ever domesticated — there is winemaking evidence going back thousands of years in the Caucasus',
        'wine varieties are clones too. A Pinot Noir vine is a cutting, not a seedling',
        'the dusty bloom on the skin is real wax made by the grape, and it carries wild yeast — which is how wine got invented before anyone knew what yeast was'
      ],
      taste: 'sweet with an acid backbone; in wine grapes the sugar and acid are tracked obsessively because they decide everything downstream'
    },
    {
      id: 'watermelon', name: 'watermelon', match: ['watermelon', 'watermelons', 'citrullus'],
      sizeCm: 30, lengthCm: 34, widthCm: 25, profile: ELLIPSOID, lie: true,
      color: [0.16, 0.36, 0.14], ribs: 12, ribDepth: 0.03,
      family: 'Cucurbitaceae, the gourds', binomial: 'Citrullus lanatus', type: 'berry',
      origin: 'north-eastern Africa',
      facts: [
        'watermelon is about ninety two percent water, which really should have been obvious from the name',
        'botanically it is a berry — a specialised kind called a pepo, with a hard rind',
        'its wild African relatives are small, hard and bitter. Sweet red flesh is entirely our doing'
      ],
      taste: 'clean and sweet; the flavour is mostly sugar and water, which is why it is so hard to fake convincingly'
    },
    {
      id: 'pumpkin', name: 'pumpkin', match: ['pumpkin', 'pumpkins', 'squash', 'cucurbita'],
      sizeCm: 25, lengthCm: 20, widthCm: 27, profile: SPHERE, ribs: 10, ribDepth: 0.15,
      color: [0.87, 0.42, 0.07], gloss: false,
      stem: { lengthCm: 5, widthCm: 1.8, at: 0.44, color: [0.42, 0.36, 0.18] },
      family: 'Cucurbitaceae, the gourds', binomial: 'Cucurbita pepo', type: 'berry',
      origin: 'the Americas — among the oldest domesticated plants in the New World',
      facts: [
        'a pumpkin is a berry too. Same pepo structure as the watermelon and the cucumber',
        'squashes were domesticated in the Americas before maize or beans, going back many thousands of years',
        'Cucurbita pepo also covers courgettes, acorn squash and most decorative gourds — same species, wildly different results'
      ],
      taste: 'mildly sweet and vegetal; the flesh is largely water and starch, which is why it takes on whatever you cook it with'
    },
    {
      id: 'cucumber', name: 'cucumber', match: ['cucumber', 'cucumbers', 'cucumis'],
      sizeCm: 20, lengthCm: 20, widthCm: 5, profile: ROD, ribs: 10, ribDepth: 0.05, lie: true,
      color: [0.20, 0.42, 0.16],
      family: 'Cucurbitaceae, the gourds', binomial: 'Cucumis sativus', type: 'berry',
      origin: 'India',
      facts: [
        'cucumbers, pumpkins, courgettes, melons and watermelons are all one family. A big damp family',
        'a cucumber is a berry as well, which makes the salad situation confusing',
        'the bitterness in a bad one is cucurbitacin, a defence compound — breeders have spent a long time removing it'
      ],
      taste: 'faintly green and mostly water, around ninety five percent of it'
    },
    {
      id: 'onion', name: 'onion', match: ['onion', 'onions', 'allium cepa'],
      sizeCm: 8, lengthCm: 8, widthCm: 8.5, profile: BULB,
      color: [0.80, 0.60, 0.30], gloss: false,
      family: 'Amaryllidaceae, the allium family', binomial: 'Allium cepa', type: 'bulb',
      origin: 'Central Asia',
      facts: [
        'onions make you cry using a gas they build on purpose the moment you cut them. It is a chemical alarm, and you triggered it',
        'the layers are leaf bases, wrapped around a tiny compressed stem at the base — the flat bit the roots come out of',
        'garlic, leeks, chives and shallots are all the same genus. The whole pungent gang'
      ],
      taste: 'sharp raw, sweet cooked — heat destroys the sulphur compounds and leaves the sugars behind'
    },
    {
      id: 'garlic', name: 'garlic', match: ['garlic', 'allium sativum', 'clove'],
      sizeCm: 5, lengthCm: 5, widthCm: 5.5, profile: BULB, ribs: 9, ribDepth: 0.13,
      color: [0.90, 0.87, 0.80], gloss: false,
      family: 'Amaryllidaceae, the allium family', binomial: 'Allium sativum', type: 'bulb',
      origin: 'Central Asia',
      facts: [
        'garlic has almost no smell until you damage it. Crushing mixes an enzyme with a stored compound and allicin is created on the spot, in seconds',
        'cultivated garlic rarely sets viable seed, so it is propagated by cloves — clones again',
        'each clove is a complete bud that can grow into a whole new plant'
      ],
      taste: 'pungent and hot raw, mellow and sweet roasted, because the aggressive sulphur compounds break down with heat'
    },
    {
      id: 'broccoli', name: 'broccoli', match: ['broccoli', 'brassica', 'cauliflower', 'cabbage', 'kale'],
      sizeCm: 15, lengthCm: 16, widthCm: 13,
      profile: [0.22, 0.24, 0.26, 0.34, 0.62, 0.92, 1.0, 0.92, 0.5, 0],
      color: [0.20, 0.42, 0.18], gloss: false, ribs: 12, ribDepth: 0.10,
      family: 'Brassicaceae, the cabbage family', binomial: 'Brassica oleracea var. italica',
      type: 'flower',
      origin: 'the Mediterranean, bred from wild cabbage; broccoli itself was developed in Italy',
      facts: [
        'broccoli, cauliflower, kale, cabbage, kohlrabi and brussels sprouts are all the same species. Brassica oleracea. One plant, six haircuts',
        'each one is a different organ pushed to an extreme: broccoli is the flower buds, kale the leaves, kohlrabi the stem, sprouts the side buds',
        'you are eating it before it blooms. Leave it alone and the whole head opens into small yellow flowers'
      ],
      taste: 'green and slightly sulphurous — the cabbage family signature, from glucosinolates'
    },
    {
      id: 'maize', name: 'maize', match: ['corn', 'maize', 'sweetcorn', 'zea'],
      sizeCm: 18, lengthCm: 18, widthCm: 5.2, profile: ROD, ribs: 18, ribDepth: 0.09,
      color: [0.93, 0.78, 0.22],
      leaves: { count: 3, lengthCm: 16, widthCm: 4, at: 0.3, tilt: 0.22, color: [0.42, 0.52, 0.20] },
      family: 'Poaceae, the grasses', binomial: 'Zea mays', type: 'grain',
      origin: 'southern Mexico',
      ancestor: 'teosinte, a scrawny grass with about a dozen hard kernels',
      facts: [
        'maize was domesticated from teosinte, a grass whose seed head is so small and hard you would not recognise it as an ancestor',
        'each kernel is a separate fruit, and each silk thread is one pollen tube leading to one of them — a missing kernel is a silk that never got pollinated',
        'it cannot survive without us. The cob does not shatter to scatter seed, so a dropped ear just sprouts a doomed tangle of seedlings'
      ],
      taste: 'sweet when fresh and starchy within hours — sweetcorn converts sugar to starch fast after picking'
    },
    {
      id: 'chilli', name: 'chilli pepper', match: ['chilli', 'chili', 'chile', 'pepper', 'capsicum', 'jalapeno'],
      sizeCm: 8, lengthCm: 9, widthCm: 2.6, profile: [0.05, 0.6, 0.9, 1.0, 0.96, 0.86, 0.7, 0.5, 0.28, 0],
      color: [0.80, 0.10, 0.08], bend: 0.35,
      stem: { lengthCm: 2.4, widthCm: 0.5, at: 0.46, color: [0.28, 0.44, 0.16] },
      skin: 'waxy', skinAmt: 0.04, skinShade: 0.10,
      family: 'Solanaceae, the nightshades', binomial: 'Capsicum annuum', type: 'berry',
      origin: 'the Americas — Capsicum annuum was domesticated in Mexico',
      facts: [
        'the burn is capsaicin, and birds cannot taste it at all. The plant is spicy specifically at mammals, because birds swallow seeds whole and fly them somewhere useful while mammals chew them up',
        'most of the heat is in the pale pith the seeds attach to, not the seeds themselves',
        'black pepper and chilli peppers are completely unrelated. Columbus was looking for one and named the other after it, and the name stuck for five centuries'
      ],
      taste: 'not a taste at all — capsaicin binds a heat receptor, so your mouth reports temperature that is not there'
    },
    {
      id: 'cacao', name: 'cacao pod', match: ['cacao', 'cocoa', 'chocolate', 'theobroma'],
      sizeCm: 20, lengthCm: 20, widthCm: 9, profile: OVOID, ribs: 10, ribDepth: 0.11,
      color: [0.72, 0.30, 0.09], gloss: false,
      skin: 'pitted', skinAmt: 0.24, skinShade: 0.24,
      family: 'Malvaceae, alongside okra and cotton', binomial: 'Theobroma cacao', type: 'berry',
      origin: 'the upper Amazon basin; used in Mesoamerica for thousands of years',
      facts: [
        'the pods grow straight out of the trunk, not the branches. It is called cauliflory and it looks deeply wrong the first time you see it',
        'the raw seeds taste nothing like chocolate. The flavour is manufactured by fermenting the pulp-covered beans for days, then roasting them',
        'it is pollinated mainly by tiny midges, which is part of why cacao is such a difficult crop'
      ],
      taste: 'the white pulp around the beans is sweet and citrusy — most people never taste it, and it is the nicest part of the fruit'
    },
    {
      id: 'coffee', name: 'coffee cherry', match: ['coffee', 'coffea', 'bean', 'espresso'],
      sizeCm: 1.5, lengthCm: 1.7, widthCm: 1.4, profile: SPHERE,
      color: [0.72, 0.08, 0.10],
      family: 'Rubiaceae', binomial: 'Coffea arabica', type: 'drupe',
      origin: 'the forests of Ethiopia',
      facts: [
        'a coffee bean is a seed, and the fruit around it is a small red drupe — a cherry, structurally like a tiny plum',
        'most cherries hold two seeds pressed flat against each other, which is why a coffee bean has one flat face',
        'Arabica is a natural hybrid and self-pollinating, so the global crop has famously little genetic diversity'
      ],
      taste: 'the fruit is mildly sweet; everything you associate with coffee is created later, by roasting'
    },
    {
      id: 'mango', name: 'mango', match: ['mango', 'mangoes', 'mangifera'],
      sizeCm: 12, lengthCm: 13, widthCm: 8.5, profile: ELLIPSOID, lie: true,
      color: [0.86, 0.45, 0.10],
      skin: 'waxy', skinAmt: 0.06, skinShade: 0.18,
      paint: { blush: { color: [0.70, 0.14, 0.10], dir: [0.35, 0.72, 0.6], power: 1.3, amount: 0.9 } },
      family: 'Anacardiaceae', binomial: 'Mangifera indica', type: 'drupe',
      origin: 'South Asia',
      facts: [
        'a mango is a drupe — same structure as a peach or an olive: one seed in a stone, wrapped in flesh',
        'it is in the same family as the cashew, and also as poison ivy. The skin contains related compounds, and some people react to it',
        'it has been cultivated in South Asia for thousands of years, with named varieties long predating European contact'
      ],
      taste: 'sweet and resinous — that pine-like edge is a genuine terpene note, and it is the family resemblance to the cashew showing through'
    },
    {
      id: 'peach', name: 'peach', match: ['peach', 'peaches', 'nectarine', 'prunus persica'],
      sizeCm: 7.5, lengthCm: 7, widthCm: 7.5, profile: SPHERE,
      color: [0.92, 0.48, 0.32],
      leaves: { count: 1, lengthCm: 5, widthCm: 1.4, at: 0.48, tilt: 0.8 },
      skin: 'waxy', skinAmt: 0.06, skinShade: 0.20,
      paint: { blush: { color: [0.72, 0.16, 0.10], dir: [0.4, 0.5, 0.77], power: 1.4, amount: 0.85 } },
      family: 'Rosaceae, the rose family', binomial: 'Prunus persica', type: 'drupe',
      origin: 'China',
      facts: [
        'the species name persica means Persian, because Europeans met it on the trade route rather than at its source. It is Chinese',
        'a nectarine is not a different fruit. It is a peach with a recessive mutation that switches off the fuzz',
        'almonds are the seed of a very close relative — you are eating the stone instead of the flesh'
      ],
      taste: 'sweet and floral, and the aroma leans on lactones, which is why peach and coconut smell faintly related'
    },
    {
      id: 'coconut', name: 'coconut', match: ['coconut', 'coconuts', 'cocos'],
      sizeCm: 15, lengthCm: 16, widthCm: 14, profile: ELLIPSOID,
      color: [0.42, 0.28, 0.16], gloss: false,
      skin: 'freckled', skinAmt: 0.24, skinShade: 0.22,
      family: 'Arecaceae, the palms', binomial: 'Cocos nucifera', type: 'drupe',
      origin: 'the Indo-Pacific; it spread across the tropics partly by floating',
      facts: [
        'a coconut is not a nut. It is a drupe, like a peach — the husk is the flesh and the shell is the stone',
        'it is built to travel. The fibrous husk floats and the seed inside can survive months at sea and still germinate on a beach',
        'coconut water is liquid endosperm — the seed\'s own packed lunch, which later solidifies into the white flesh'
      ],
      taste: 'the water is faintly sweet and salty; the flesh is rich because it is largely saturated fat'
    },
    {
      id: 'aubergine', name: 'aubergine', match: ['aubergine', 'eggplant', 'brinjal', 'melongena'],
      sizeCm: 18, lengthCm: 20, widthCm: 9, profile: PEAR,
      color: [0.24, 0.10, 0.28],
      stem: { lengthCm: 3.5, widthCm: 1.2, at: 0.44, color: [0.26, 0.40, 0.16] },
      skin: 'waxy', skinAmt: 0.04, skinShade: 0.10,
      family: 'Solanaceae, the nightshades', binomial: 'Solanum melongena', type: 'berry',
      origin: 'South and East Asia',
      facts: [
        'an aubergine is a berry, and a nightshade — so it is a close cousin of the tomato and the potato',
        'the English name eggplant comes from early European varieties that were small, white and genuinely egg-shaped',
        'the spongy texture is air. The flesh is full of tiny cavities, which is why it drinks oil so alarmingly'
      ],
      taste: 'bitter raw, savoury cooked — heat collapses the structure and the bitterness goes with it'
    },
    {
      id: 'lettuce', name: 'lettuce', match: ['lettuce', 'salad', 'lactuca'],
      sizeCm: 15, lengthCm: 14, widthCm: 16, profile: SPHERE, ribs: 14, ribDepth: 0.12,
      color: [0.52, 0.72, 0.28], gloss: false,
      family: 'Asteraceae, the daisy family', binomial: 'Lactuca sativa', type: 'leaf',
      origin: 'the eastern Mediterranean; the Egyptians grew it first for its oil seed',
      facts: [
        'lettuce is in the daisy family. You are eating a sunflower relative in your sandwich',
        'it was originally grown for seed oil, not leaves — the salad came later',
        'when it bolts it goes bitter fast and leaks a milky latex. That latex is where the name Lactuca comes from'
      ],
      taste: 'mild and watery by design — centuries of breeding aimed at removing the bitterness'
    },
    {
      id: 'wheat', name: 'wheat', match: ['wheat', 'triticum', 'grain', 'bread'],
      sizeCm: 9, lengthCm: 9, widthCm: 1.8, profile: ROD, ribs: 8, ribDepth: 0.22,
      color: [0.82, 0.68, 0.30], gloss: false,
      family: 'Poaceae, the grasses', binomial: 'Triticum aestivum', type: 'grain',
      origin: 'the Fertile Crescent',
      facts: [
        'bread wheat is not a simple species. It carries three complete genomes from three different grasses that hybridised twice',
        'the key domestication change was the rachis: wild grasses shatter to scatter seed, and we selected the mutants that held on to it so it could be harvested',
        'oats, rice, maize, barley and sugarcane are all grasses too. Most of what humanity eats is grass'
      ],
      taste: 'faintly sweet and nutty raw; almost everything you taste in bread is created by fermentation and heat'
    }
  ];

  /* Lookup index, longest alias first so "sweetcorn" wins over "corn". */
  let INDEX = [];
  function reindex() {
    INDEX = [];
    K.ENTRIES.forEach(function (e) {
      e.match.forEach(function (m) { INDEX.push({ token: m, entry: e }); });
    });
    INDEX.sort(function (a, b) { return b.token.length - a.token.length; });
  }
  reindex();

  /* Anything else it can be. The atlas proper is food plants — checked, cited,
     and the reason its answers are trustworthy — but "I can be anything" is a
     claim that has to survive being asked for something that is not a plant.
     Registered separately so the two never get confused for one another. */
  K.register = function (entries) {
    for (let i = 0; i < entries.length; i++) K.ENTRIES.push(entries[i]);
    reindex();
  };

  /* Find the first entry mentioned anywhere in a phrase. */
  K.find = function (text) {
    const t = ' ' + String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    let best = null, bestAt = Infinity;
    for (let i = 0; i < INDEX.length; i++) {
      const at = t.indexOf(' ' + INDEX[i].token + ' ');
      if (at !== -1 && at < bestAt) { bestAt = at; best = INDEX[i].entry; }
    }
    return best;
  };

  K.byId = function (id) {
    for (let i = 0; i < K.ENTRIES.length; i++) if (K.ENTRIES[i].id === id) return K.ENTRIES[i];
    return null;
  };

  K.names = function () {
    return K.ENTRIES.map(function (e) { return e.name; });
  };

  NG.K = K;
})(window.NG = window.NG || {});
