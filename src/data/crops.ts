import type { Crop } from "../types";

/**
 * Curated, evidence-led dataset of food-plant origins.
 *
 * Centers of origin follow the Vavilov centers framework as refined by modern
 * archaeobotany and genetics. Dates are given as approximate years before
 * present (BP) for the onset of domestication and are necessarily ranges;
 * dispersal legs summarise well-attested historical movements rather than
 * every route. Evidence notes describe the *kind* of support (macrofossils,
 * starch grains, genomics) behind each attribution.
 */
export const CROPS: Crop[] = [
  {
    id: "maize",
    name: "Maize",
    scientificName: "Zea mays",
    family: "Poaceae",
    category: "cereal",
    glyph: "🌽",
    originCenter: "Balsas River Valley",
    originRegion: "Central Mexico",
    origin: [17.9, -99.5],
    domesticatedBP: 9000,
    domestication:
      "Domesticated from teosinte in the tropical lowlands of the Balsas basin; a handful of regulatory genes converted a branching grass into a single cob-bearing crop.",
    progenitor: "Balsas teosinte (Zea mays ssp. parviglumis)",
    evidence:
      "Starch grains and phytoliths on grinding stones plus whole-genome data pinpoint a single Balsas domestication ~9,000 BP.",
    availability:
      "The world's largest cereal crop by volume; grown on every inhabited continent for food, feed, and industry.",
    spread: [
      { to: "Andes & Amazonia", coords: [-12, -77], period: "by ~6,000 BP", order: 1 },
      { to: "Eastern North America", coords: [38, -90], period: "~2,000 BP", order: 2 },
      { to: "Iberia & Europe", coords: [40, -4], period: "16th c. CE", order: 3 },
      { to: "West Africa", coords: [9, 8], period: "16th–17th c. CE", order: 4 },
      { to: "East & South Asia", coords: [28, 100], period: "16th–17th c. CE", order: 5 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Kernels (grain)", cautionParts: "", note: "Eaten as grain, fresh vegetable, and flour." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The plant the world grows as Zea mays is called \"maize\" almost everywhere except the United States, Canada, and Australia, where it is \"corn.\" That split is a linguistic trap: in older English \"corn\" simply meant the leading grain of a place — wheat in England, oats in Scotland — so American colonists naturally called their staple \"Indian corn,\" later shortened to corn. The international name comes from mahiz, the word Taíno people of the Caribbean gave the Spanish, who wrote it maíz.",
          "Maize is a giant grass, and a botanical oddity: male flowers form the tassel at the top, female flowers the cob lower down, each silk a thread leading to one future kernel. It is one of the most productive plants on Earth partly because it runs the efficient C4 form of photosynthesis, thriving in heat and strong sun.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "The teosinte puzzle",
        paragraphs: [
          "For a long time maize had no obvious wild ancestor, because its ancestor looks almost nothing like it. That ancestor is teosinte, a scrubby Mexican grass whose \"ear\" is a handful of hard, stony seeds locked in shells, borne on many branches. How such a plant became a single fat cob of soft, naked kernels was one of botany's great mysteries, argued over for most of the twentieth century.",
          "The answer, from genetics pioneered by George Beadle and others, is that a surprisingly small number of control genes account for the transformation — regulators such as tb1, which suppresses branching into one main stalk, and tga1, which unwrapped the kernels from their hard cases. A few mutations, seized on by early farmers, turned a wild grass into the world's most productive cereal.",
        ],
        sourceIds: ["purugganan2009", "sauer1993"],
      },
      {
        heading: "Domestication in the Balsas",
        paragraphs: [
          "The cradle was the tropical lowlands of the Balsas River valley in south-central Mexico, where the specific wild grass involved, Balsas teosinte (Zea mays ssp. parviglumis), still grows. Starch grains and phytoliths recovered from ancient grinding stones at rock shelters there push maize use back to roughly 9,000 years ago, and genome-wide data point to a single domestication from that Balsas population.",
          "From that one origin, Indigenous farmers across the Americas bred maize into thousands of landraces suited to deserts, highlands, and rainforests, in every colour from white and yellow to red, blue, and black — a diversity that still underpins the crop's breeding today.",
        ],
        sourceIds: ["purugganan2009", "sauer1993"],
      },
      {
        heading: "Nixtamal — the knowledge that made maize safe",
        paragraphs: [
          "Maize carries a hidden nutritional flaw: its niacin (vitamin B3) is chemically bound and largely unavailable, and it is low in certain amino acids. Mesoamerican peoples solved this with nixtamalization — soaking and cooking the grain in an alkaline solution of lime or wood ash. The process frees the niacin, improves the protein, loosens the hulls, and lets the dough bind into tortillas, tamales, and hominy.",
          "This was culinary chemistry of the first order, and its absence proved deadly. When maize spread to Europe, Africa, and the American South as a cheap staple without the accompanying nixtamal knowledge, populations that lived on it suffered epidemics of pellagra — the niacin-deficiency disease of \"the four Ds\": dermatitis, diarrhoea, dementia, and death. The crop travelled the world; the wisdom that made it wholesome often did not.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "Around the world & into industry",
        paragraphs: [
          "After 1492 maize spread with astonishing speed. It became a field staple in southern Europe, a major food across sub-Saharan Africa, and a fixture in China and South Asia within a couple of centuries, valued for high yields on marginal land. In much of Africa today maize is the single most important food crop.",
          "In the twentieth century maize was transformed again — this time by science and industry. The discovery of hybrid vigour produced hybrid corn from the 1930s, multiplying yields; maize now feeds livestock far more than people directly, and flows into ethanol fuel, corn starch, oils, and the high-fructose corn syrup woven through the modern processed diet. By sheer tonnage it is the largest cereal crop grown anywhere on Earth.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "wheat",
    name: "Bread Wheat",
    scientificName: "Triticum aestivum",
    family: "Poaceae",
    category: "cereal",
    glyph: "🌾",
    originCenter: "Fertile Crescent (Karacadağ)",
    originRegion: "Southeastern Anatolia",
    origin: [37.7, 39.3],
    domesticatedBP: 10000,
    domestication:
      "Emmer and einkorn were domesticated in the Fertile Crescent; hexaploid bread wheat arose later when cultivated emmer hybridised with a wild goatgrass.",
    progenitor: "Wild emmer (T. dicoccoides) × Aegilops tauschii",
    evidence:
      "Charred grain and rachis fragments from early Neolithic villages, corroborated by the geography of wild progenitor DNA.",
    availability:
      "A staple for roughly a third of humanity; the dominant grain across temperate zones worldwide.",
    spread: [
      { to: "Nile Valley", coords: [26, 32], period: "~7,000 BP", order: 1 },
      { to: "Europe", coords: [48, 10], period: "~7,000–5,000 BP", order: 2 },
      { to: "Indus Valley", coords: [28, 70], period: "~7,000 BP", order: 3 },
      { to: "North China", coords: [35, 110], period: "~4,500 BP", order: 4 },
      { to: "Americas & Australia", coords: [39, -98], period: "16th–19th c. CE", order: 5 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Grain (caryopsis)", cautionParts: "", note: "Contains gluten; unsuitable for coeliac diets." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The English \"wheat\" comes from an old Germanic root meaning \"white,\" for the pale flour it yields — the same instinct that named it in many European tongues after its bread or its colour. The bread wheat that dominates world trade is Triticum aestivum, but \"wheat\" covers a family of related grains, from ancient einkorn and emmer to hard durum, the pasta and semolina wheat.",
          "Genetically, bread wheat is a marvel of accidental engineering: it is hexaploid, carrying three complete ancestral genomes stacked together (labelled A, B, and D). That triple genome is the reason wheat flour, uniquely among grains, forms strong, stretchy gluten — the protein network that traps gas and makes a risen loaf possible.",
        ],
        sourceIds: ["powo", "zohary2012"],
      },
      {
        heading: "The wild ancestors",
        paragraphs: [
          "Wheat begins with wild grasses of the Fertile Crescent: wild einkorn and wild emmer (Triticum dicoccoides), which still grow across the hills of the Near East, with a likely heartland around the Karacadağ mountains of southeastern Anatolia. Their seed heads shatter when ripe, scattering grain to reseed — excellent for a wild plant, useless for a farmer.",
          "The pivotal domestication trait was a mutation for a tough, non-shattering rachis: seed heads that hold together until harvest, so the whole crop can be reaped and threshed. Selecting those non-shattering, plump-grained plants — knowingly or not — is the essence of how wheat became a crop, and the same principle underlies the domestication of nearly every cereal.",
        ],
        sourceIds: ["zohary2012", "purugganan2009"],
      },
      {
        heading: "How bread wheat was born",
        paragraphs: [
          "Domestication came in stages. Diploid einkorn and tetraploid emmer were among the founder crops of Neolithic farming more than 10,000 years ago. Bread wheat itself did not yet exist — it arose only after farming had begun, when cultivated emmer chanced to hybridise with a wild goatgrass, Aegilops tauschii, somewhere near the southern Caspian.",
          "That hybridisation added the third, \"D,\" genome, and with it cold-hardiness, adaptability, and superior breadmaking gluten. In other words the world's most important bread grain is a hybrid that could only have appeared inside human fields — a crop that domestication created rather than merely tamed.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "The grain of civilisations",
        paragraphs: [
          "Wheat spread outward from the Fertile Crescent as the backbone of the Neolithic farming package, reaching Egypt and the Balkans, then temperate Europe by around 7,000 years ago, the Indus Valley, and eventually northern China. Wherever it took hold it supported dense, settled populations; the granaries, bread, and beer of Mesopotamia, Egypt, Greece, and Rome all rest on it.",
          "Carried by European colonists into the Americas, southern Africa, and Australia from the sixteenth century onward, wheat became a truly global grain, and today feeds roughly a third of humanity across the temperate world.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The Green Revolution & today",
        paragraphs: [
          "Wheat sits at the centre of the twentieth century's Green Revolution. Working in Mexico, the agronomist Norman Borlaug bred semi-dwarf wheats that put their energy into grain rather than tall stalks and responded to fertiliser without toppling. Spread across South Asia in the 1960s, these varieties dramatically raised yields and are credited with averting mass famine, work for which Borlaug received the Nobel Peace Prize.",
          "That productivity made wheat a pillar of global food security, though it also concentrated the crop's genetics and its thirst for inputs. Wheat's very ubiquity keeps it under scrutiny today — from coeliac disease and gluten sensitivity to the race to breed varieties that withstand heat, drought, and new strains of rust.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "rice",
    name: "Asian Rice",
    scientificName: "Oryza sativa",
    family: "Poaceae",
    category: "cereal",
    glyph: "🌾",
    originCenter: "Middle & Lower Yangtze",
    originRegion: "Southern China",
    origin: [30.0, 112.0],
    domesticatedBP: 9000,
    domestication:
      "Japonica rice was domesticated from wild rice along the Yangtze; the indica subspecies emerged as those alleles introgressed into South Asian wild populations.",
    progenitor: "Wild rice (Oryza rufipogon)",
    evidence:
      "Waterlogged husks and phytoliths in Yangtze wetland sites, with genomics tracing the key non-shattering allele to a single origin.",
    availability:
      "Primary food for over half the world; overwhelmingly grown across monsoon and tropical Asia.",
    spread: [
      { to: "Southeast Asia", coords: [15, 105], period: "~5,000 BP", order: 1 },
      { to: "South Asia", coords: [25, 82], period: "~4,000 BP", order: 2 },
      { to: "Near East & Africa", coords: [15, 38], period: "1st millennium CE", order: 3 },
      { to: "Mediterranean Europe", coords: [40, 0], period: "8th–15th c. CE", order: 4 },
      { to: "The Americas", coords: [32, -90], period: "17th c. CE", order: 5 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Grain", cautionParts: "", note: "Staple cereal, in polished and wholegrain forms." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The word \"rice\" travelled west along the trade routes it rode as a grain — through Greek oryza, itself borrowed from an eastern source, into Latin and the Romance and Germanic languages. The crop that feeds more people than any other is Oryza sativa, Asian rice, which comes in two great subspecies: japonica, the shorter, stickier temperate and tropical rice, and indica, the long-grained rice of the tropics.",
          "There is also a second, separate rice. In the inland delta of the Niger in West Africa, farmers independently domesticated African rice, Oryza glaberrima, from a different wild ancestor — a reminder that rice-growing was invented more than once.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "The wild ancestor",
        paragraphs: [
          "Asian rice descends from the wild perennial Oryza rufipogon, a plant of monsoon wetlands and swamp margins. Like wild wheat, wild rice shatters, dropping its grain to survive; and like wheat, its domestication turned on selecting a mutation — here the sh4 gene — that keeps the grain attached for harvest.",
          "Rice's genius as a crop is its love of standing water. Grown in flooded paddies, it out-competes weeds, draws nutrients from the water, and can be cultivated on the same land year after year — the agronomic basis for some of the densest rural populations the world has ever known.",
        ],
        sourceIds: ["purugganan2009", "sauer1993"],
      },
      {
        heading: "Two subspecies, one origin",
        paragraphs: [
          "The core domestication of japonica rice took place along China's Yangtze River, where waterlogged sites such as those of the Hemudu and Shangshan cultures preserve husks and phytoliths reaching back some 9,000 years. Genetics traces the key non-shattering allele to a single origin in that japonica lineage.",
          "The tropical indica rice of South Asia then arose in a more complex way: as the domestication genes from Chinese japonica spread and introgressed into local South Asian wild rice populations, combining the domestic traits with regionally adapted stock. Rice's story is thus one origin of the crucial mutations, elaborated across a continent.",
        ],
        sourceIds: ["purugganan2009", "sauer1993"],
      },
      {
        heading: "Across Asia and beyond",
        paragraphs: [
          "From its Yangtze and South Asian heartlands rice spread through Southeast Asia, became the ritual and dietary centre of civilisations from India to Japan, and moved west into the Near East, Africa, and — through Moorish Spain and the Po Valley — Mediterranean Europe. Terraced hillsides and elaborate irrigation across monsoon Asia are monuments to it.",
          "Rice reached the Americas in the seventeenth century, and its history there is inseparable from slavery: the lucrative \"Carolina Gold\" rice plantations depended on the agricultural expertise of enslaved West Africans, who already knew how to grow the grain their captors did not. It is one of the clearest cases of the Atlantic slave trade moving not just people but their knowledge.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "Feeding half the world",
        paragraphs: [
          "Rice is the daily staple for more than half of humanity, overwhelmingly grown and eaten across Asia, where it supplies the bulk of calories for billions of people. No other single crop feeds so many mouths directly.",
          "That dependence made rice a second front of the Green Revolution: the semi-dwarf variety IR8, released from the International Rice Research Institute in the Philippines in the 1960s, roughly doubled yields and helped stave off famine in Asia. Today rice breeders work on flood- and drought-tolerance, on reducing the methane that flooded paddies emit, and on biofortified types such as vitamin-A \"golden\" rice.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "potato",
    name: "Potato",
    scientificName: "Solanum tuberosum",
    family: "Solanaceae",
    category: "tuber",
    glyph: "🥔",
    originCenter: "Lake Titicaca Basin",
    originRegion: "Andean Peru & Bolivia",
    origin: [-15.8, -69.3],
    domesticatedBP: 8000,
    domestication:
      "Domesticated in the high Andes from a complex of wild tuber-bearing species; Andean farmers bred thousands of frost- and altitude-adapted landraces.",
    progenitor: "Solanum brevicaule complex",
    evidence:
      "Preserved tubers and starch in highland sites, backed by genetics rooting cultivars in southern Peru.",
    availability:
      "The world's leading non-cereal food crop; a staple across Europe, Asia, and the Americas.",
    spread: [
      { to: "Spain & Europe", coords: [43, -3], period: "late 16th c. CE", order: 1 },
      { to: "British Isles", coords: [53, -7], period: "17th c. CE", order: 2 },
      { to: "South & East Asia", coords: [30, 90], period: "17th–19th c. CE", order: 3 },
      { to: "North America", coords: [44, -72], period: "18th c. CE", order: 4 },
    ],
    maturity: "flagship",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Tubers (cooked)", cautionParts: "Green skin, sprouts, and foliage", note: "Green and sprouted parts accumulate solanine glycoalkaloids; discard them." },
    claims: [
      { id: "potato-identity", kind: "identity", statement: "The potato is Solanum tuberosum, family Solanaceae.", sourceIds: ["powo", "spooner2005"], confidence: "high", review: "pending" },
      { id: "potato-domestication", kind: "domestication", statement: "It was domesticated in the Andes; multilocus genotyping supports a single origin from the northern Solanum brevicaule complex in southern Peru.", sourceIds: ["spooner2005", "hawkes1990"], confidence: "high", review: "pending" },
      { id: "potato-spread", kind: "spread", statement: "Introduced to Europe in the later 16th century, the potato spread across Europe, Asia, and North America to become a global staple.", sourceIds: ["hawkes1990", "zohary2012"], confidence: "medium", review: "pending" },
      { id: "potato-availability", kind: "availability", statement: "The potato is the world's leading non-cereal food crop by production.", sourceIds: ["faostat"], confidence: "high", review: "pending" },
    ],
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "In the Andean homeland the plant is papa, its Quechua name, and papa remains the word across most of Spanish-speaking South America. The English \"potato\" is a colonial accident: Spanish patata blended the Taíno batata (the sweet potato, an unrelated plant) with Quechua papa, and the muddle was carried into English, French pomme de terre (\"apple of the earth\"), and the German, Dutch, and Slavic terms built on the same idea of an earth-fruit.",
          "Botanically it is Solanum tuberosum, a member of the nightshade family alongside the tomato, aubergine, chili, and tobacco. The part we eat is not a root but a stem tuber — a swollen underground stem whose \"eyes\" are buds, which is why a potato left in a cupboard sprouts. The cultivated potato is usually tetraploid (four chromosome sets), a genetic richness that helped Andean farmers generate extraordinary diversity.",
        ],
        sourceIds: ["powo", "reader2009"],
      },
      {
        heading: "The wild ancestor",
        paragraphs: [
          "Wild potatoes belong to the Solanum brevicaule complex, a swarm of closely related tuber-bearing species scattered through the Andes from Venezuela to Argentina. Their tubers are small, knobbly, and often intensely bitter with glycoalkaloids — chemical defenses that can sicken or kill. That toxicity was a design problem the first cultivators had to solve.",
          "They solved it twice over: by selecting milder plants, and by inventing processing that removed the poison. Andean communities learned to leach and detoxify bitter tubers, and famously to make chuño — potatoes trodden and left out over successive Altiplano nights so that hard frost and daytime sun freeze-dried them into a light, storable food that keeps for years. Bitter, frost-hardy potatoes that no one could eat raw thus became a foundation of high-altitude life above 3,800 metres, where little else grows.",
        ],
        sourceIds: ["spooner2005", "reader2009"],
      },
      {
        heading: "Domestication in the high Andes",
        paragraphs: [
          "Domestication centered on the highlands around Lake Titicaca in what is now southern Peru and Bolivia, beginning perhaps 8,000–10,000 years ago. Multilocus genetic studies point to a single principal origin from the northern members of the brevicaule complex, from which the whole cultivated lineage radiated.",
          "What Andean farmers did next has few parallels in agriculture: rather than narrowing the crop to one ideal type, they multiplied it. Thousands of landraces were bred for specific altitudes, soils, frost regimes, and uses — waxy and floury, yellow, purple, red, and blue-fleshed, some for boiling, some only for chuño. A single mountain community might tend dozens of named varieties in one field as insurance against frost, drought, and disease, an indigenous strategy of diversity that modern breeders now study as a model of resilience.",
        ],
        sourceIds: ["spooner2005", "hawkes1990"],
      },
      {
        heading: "Crossing to the Old World",
        paragraphs: [
          "Spanish ships carried the potato back across the Atlantic in the later sixteenth century, likely reaching Spain and the Canary Islands in the 1560s–1570s and spreading from there. Europe was in no hurry to eat it. It appeared in no scripture, grew from unsettling underground tubers, belonged to the suspect nightshade family, and was blamed for everything from leprosy to immorality. For decades it was grown as a botanical curiosity and animal fodder.",
          "There was also a hidden agronomic obstacle: Andean potatoes were adapted to the short, equal days of the tropics and tuberized late in Europe's long summer days. Generations of selection produced long-day-adapted varieties that filled out before autumn. Adoption was then pushed by advocates and rulers — Antoine-Augustin Parmentier championing it in France, Frederick the Great ordering its planting in Prussia — until the potato's sheer productivity won. Acre for acre it yielded more calories, faster, than grain, and historians credit it with helping fuel the population growth behind northern Europe's industrial rise.",
        ],
        sourceIds: ["reader2009", "hawkes1990"],
      },
      {
        heading: "The Great Famine & the danger of sameness",
        paragraphs: [
          "The potato's rise carried a warning that the Andes never forgot but Europe ignored. The European crop descended from a narrow founding stock, and in Ireland especially, the rural poor came to depend on a single high-yielding variety, the \"Lumper,\" grown as a near-monoculture that fed millions on tiny plots.",
          "When the water mould Phytophthora infestans — late blight — arrived from the Americas in 1845, it swept through those genetically uniform fields and rotted the harvest in the ground. The resulting Great Famine of 1845–1852 killed roughly a million people and drove a million or more to emigrate, permanently reshaping Ireland and the Irish diaspora. It remains the textbook case for why genetic diversity in a food crop is not a luxury but a safeguard — the very lesson embodied in the Andean fields the crop came from.",
        ],
        sourceIds: ["reader2009", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The potato is now the world's leading non-cereal food crop and the third most important food crop for direct human consumption after rice and wheat. Once an American plant, it is today grown most heavily in Asia and Europe; China is the single largest producer, followed by India.",
          "Its Andean birthplace still guards the crop's future. The International Potato Center (CIP) in Lima maintains a living gene bank of thousands of native varieties and wild relatives — the raw material breeders draw on to fight new strains of blight and to adapt the potato to heat and drought. From a bitter mountain tuber that had to be detoxified to be eaten, it has become one of the four crops that feed the world.",
        ],
        sourceIds: ["faostat", "reader2009"],
      },
    ],
  },
  {
    id: "tomato",
    name: "Tomato",
    scientificName: "Solanum lycopersicum",
    family: "Solanaceae",
    category: "vegetable",
    glyph: "🍅",
    originCenter: "Mesoamerica (from Andean wild stock)",
    originRegion: "Mexico",
    origin: [19.4, -99.1],
    domesticatedBP: 2500,
    domestication:
      "Wild cherry-sized tomatoes of western South America were carried north; full domestication into large-fruited forms took place in Mesoamerica.",
    progenitor: "Solanum lycopersicum var. cerasiforme",
    evidence:
      "Linguistic and historical records plus population genomics showing a two-step South America → Mesoamerica pathway.",
    availability:
      "One of the most widely grown vegetables on Earth, in field and greenhouse across all temperate and tropical zones.",
    spread: [
      { to: "Spain & Italy", coords: [41, 12], period: "16th c. CE", order: 1 },
      { to: "Wider Europe", coords: [50, 8], period: "17th–18th c. CE", order: 2 },
      { to: "Middle East & Asia", coords: [30, 70], period: "18th–19th c. CE", order: 3 },
    ],
    maturity: "flagship",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Ripe fruit", cautionParts: "Leaves and stems", note: "Foliage contains glycoalkaloids; only the fruit is eaten." },
    claims: [
      { id: "tomato-identity", kind: "identity", statement: "The tomato is Solanum lycopersicum, family Solanaceae.", sourceIds: ["powo", "blanca2015"], confidence: "high", review: "pending" },
      { id: "tomato-domestication", kind: "domestication", statement: "Genomic evidence indicates a multi-step history: cherry-type wild and weedy populations in South America gave rise to intermediate forms, with full domestication in Mesoamerica.", sourceIds: ["razifard2020", "blanca2015"], confidence: "medium", review: "pending" },
      { id: "tomato-spread", kind: "spread", statement: "Carried to Europe in the 16th century, the tomato spread through the Mediterranean and then globally as a major culinary vegetable.", sourceIds: ["blanca2015"], confidence: "medium", review: "pending" },
      { id: "tomato-availability", kind: "availability", statement: "The tomato is among the most widely grown vegetables worldwide, in open field and protected cultivation.", sourceIds: ["faostat"], confidence: "high", review: "pending" },
    ],
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The word comes from the Nahuatl of the Aztecs. They called the fruit tomatl, and the large red one xitomatl; Spanish shortened it to tomate, which English borrowed and then reshaped into \"tomato\" by analogy with \"potato.\" Early Italian gardeners called it pomo d'oro, the golden apple — a hint that some of the first tomatoes Europe saw were yellow — and the name survives in the modern Italian pomodoro.",
          "For two centuries botanists filed it under its own genus as Lycopersicon esculentum, \"the edible wolf-peach.\" Genetic work has since folded it back into the nightshade genus Solanum, vindicating Linnaeus's original placement, so its correct name is Solanum lycopersicum. Despite the US Supreme Court's 1893 ruling in Nix v. Hedden — which classed it a vegetable so it could be taxed as one — the tomato is botanically a berry, a true fruit.",
        ],
        sourceIds: ["blanca2015", "smith1994"],
      },
      {
        heading: "The wild ancestor",
        paragraphs: [
          "The tomato's wild relatives are a group of small-fruited species clinging to the dry western slopes of the Andes, in coastal Peru, Ecuador, and northern Chile. Their fruits are tiny — pea- to cherry-sized — and the group as a whole is the crop's centre of genetic diversity, even though the plant was not fully domesticated there.",
          "The immediate progenitor is the cherry tomato, Solanum lycopersicum var. cerasiforme, a weedy, semi-wild form that grew readily on disturbed ground and around early settlements. Being a camp-follower plant that thrived where people lived, it was well placed to be picked up, carried, and gradually improved as populations moved northward out of South America.",
        ],
        sourceIds: ["razifard2020", "blanca2015"],
      },
      {
        heading: "A two-step domestication",
        paragraphs: [
          "The tomato's origin has an unusual geography: its wild diversity is Andean, but its domestication was Mesoamerican. Recent population genomics reconstructs a stepwise journey — wild Ecuadorian cherry tomatoes gave rise to intermediate weedy populations, which were carried north into Mexico, where selection produced the large, fleshy, multi-chambered fruit we recognise. It was in Mesoamerica, among the peoples the Spanish later encountered, that the tomato became a true crop and a kitchen staple.",
          "The details are still actively debated. Some genomic signals suggest the intermediate forms were already partly domesticated before moving north, and possibly even a partial \"re-wilding\" along the way, so the confidence attached to the exact sequence is deliberately moderate rather than settled.",
        ],
        sourceIds: ["razifard2020", "blanca2015"],
      },
      {
        heading: "Feared, then embraced, in Europe",
        paragraphs: [
          "Spanish contact carried the tomato to Europe in the sixteenth century; the physician Pietro Andrea Mattioli described it in Italy by 1544. Northern Europe kept it at arm's length for generations. As an obvious nightshade it was assumed poisonous, grown mainly as an ornamental \"love apple,\" and there is a persuasive material reason for its deadly reputation: the acidic fruit, eaten off the pewter plates of the wealthy, leached lead from the alloy, so tomato-eating could genuinely cause sickness that had nothing to do with the fruit itself.",
          "Southern Europe had no such fears. In the kitchens of Naples, Spain, and the wider Mediterranean the tomato was cooked, stewed, and dried, and by the eighteenth and nineteenth centuries it had become inseparable from the region's food. The tomato–pasta pairing and the Neapolitan pizza are entirely post-Columbian inventions — a reminder that many \"timeless\" national cuisines were reshaped by American crops only a few centuries ago.",
        ],
        sourceIds: ["smith1994", "kiple2000"],
      },
      {
        heading: "Around the world & into the modern kitchen",
        paragraphs: [
          "From the Mediterranean the tomato spread outward along trade and colonial routes — into the Middle East, South and East Asia, and, somewhat later and reluctantly, back into North America, where it was still being defended as safe to eat in the early nineteenth century. Everywhere it landed it was absorbed into local cooking, from Indian and Middle Eastern sauces to West African stews.",
          "Its most industrial descendant is ketchup. The name traces to a Southeast Asian fermented-fish sauce (kê-tsiap in Hokkien); English cooks made \"ketchups\" of mushrooms and walnuts long before Americans in the nineteenth century fixed the word to the sweet, tomato-based condiment now sold worldwide.",
        ],
        sourceIds: ["smith1994", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The tomato is now one of the most widely grown and economically important vegetables on Earth, cultivated in open fields and in vast climate-controlled greenhouses from the Netherlands to Almería to China, which is the largest producer. A parallel processing industry turns millions of tonnes into paste, sauce, and canned tomatoes.",
          "Modern breeding brought uniform ripening, shipping durability, and disease resistance — and, notoriously, sometimes traded away flavour, prompting a counter-movement to recover heirloom varieties and the genes of those Andean wild relatives that still hold traits, from sweetness to stress tolerance, missing from the commercial crop.",
        ],
        sourceIds: ["faostat", "blanca2015"],
      },
    ],
  },
  {
    id: "common-bean",
    name: "Common Bean",
    scientificName: "Phaseolus vulgaris",
    family: "Fabaceae",
    category: "legume",
    glyph: "🫘",
    originCenter: "Mesoamerican & Andean centers",
    originRegion: "Mexico & the Andes",
    origin: [19.5, -102.5],
    domesticatedBP: 8000,
    domestication:
      "Independently domesticated twice — in Mesoamerica and the Andes — from the same wild species, producing two distinct gene pools.",
    progenitor: "Wild Phaseolus vulgaris",
    evidence:
      "Ancient seed finds plus genomics showing two parallel domestications from a Mesoamerican wild ancestor.",
    availability:
      "The most important grain legume for direct human consumption worldwide.",
    spread: [
      { to: "Andean South America", coords: [-13, -73], period: "~8,000 BP", order: 1 },
      { to: "Europe", coords: [45, 5], period: "16th c. CE", order: 2 },
      { to: "Africa & Asia", coords: [5, 35], period: "16th–18th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Seeds and pods (cooked)", cautionParts: "Raw or undercooked seeds", note: "Raw beans contain phytohaemagglutinin; boil thoroughly before eating." },
  },
  {
    id: "chili",
    name: "Chili Pepper",
    scientificName: "Capsicum annuum",
    family: "Solanaceae",
    category: "vegetable",
    glyph: "🌶️",
    originCenter: "East-Central Mexico",
    originRegion: "Mexico",
    origin: [20.5, -98.5],
    domesticatedBP: 6000,
    domestication:
      "Domesticated in the highlands of Mexico; selection favoured non-deciduous, larger, and pungent fruits from small wild chiltepines.",
    progenitor: "Wild Capsicum annuum (chiltepín)",
    evidence:
      "Starch microremains and macrofossils across Mesoamerica, with genomics centering origin in east-central Mexico.",
    availability:
      "Grown pantropically and in temperate summers; a foundation of cuisines across Asia, Africa, and the Americas.",
    spread: [
      { to: "Caribbean & South America", coords: [5, -65], period: "pre-1492", order: 1 },
      { to: "Iberia & Europe", coords: [40, -4], period: "late 15th c. CE", order: 2 },
      { to: "West & East Africa", coords: [6, 20], period: "16th c. CE", order: 3 },
      { to: "South & East Asia", coords: [22, 88], period: "16th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit", cautionParts: "", note: "Capsaicin is a strong irritant to eyes and skin." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Chili\" comes straight from chīlli, the word in Nahuatl, the language of the Aztecs. The confusing alternative name — \"pepper\" — is Columbus's mistake: sent to find the black pepper of the Indies, he met the burning fruits of a completely unrelated American plant and called them pimiento, \"pepper,\" and the misnomer stuck across many languages.",
          "Botanically these are the fruits of the genus Capsicum, in the nightshade family. Crucially, \"chili\" is not one plant but at least five separately domesticated species — Capsicum annuum (from bell peppers to jalapeños and cayenne), C. chinense (the fiery habaneros and Scotch bonnets), C. baccatum (the South American ajíes), C. frutescens (tabasco), and C. pubescens (the Andean rocoto).",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Why chilies burn",
        paragraphs: [
          "The heat is a chemical called capsaicin, and its purpose is an evolutionary tale. Capsaicin binds to the same receptor that senses actual heat, which is why the mouth feels \"burned\" though nothing is hot. Wild chilies load it into their fruit as a targeted deterrent: mammals, whose teeth would destroy the seeds, feel the pain and stay away, while birds, which are insensitive to capsaicin and pass the seeds intact, eat freely and disperse them.",
          "Humans are the great exception — a species that sought out the very defence meant to repel it. The intensity is measured on the Scoville scale, from the mild bell pepper at zero to super-hot cultivars bred past a million units, a range that plant breeders keep pushing to extremes.",
        ],
        sourceIds: ["kiple2000", "powo"],
      },
      {
        heading: "Domestication across the Americas",
        paragraphs: [
          "Chilies were among the earliest plants cultivated in the Americas, with the widespread Capsicum annuum domesticated in Mexico several thousand years ago and the other species taken up independently in the Amazon, the Andes, and lowland South America. They were central to Mesoamerican and South American cooking, medicine, and ritual long before European contact.",
          "That deep, multi-region history is why chilies are so varied: different peoples in different places tamed different wild Capsicums, each lineage carrying its own flavours, shapes, and heat.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "The fastest conquest in food history",
        paragraphs: [
          "No American crop went global faster. Within decades of 1492, Portuguese and Spanish ships had carried chilies to Africa, India, Southeast Asia, and China, and Portuguese trade around the Indian Ocean was especially important in spreading them. They were easy to grow, easy to dry, and packed more pungency into less space than the costly Asian spices.",
          "The result reshaped the world's kitchens so thoroughly that the chili now seems native to them. Indian curries, Thai and Sichuan cooking, Korean gochujang, Hungarian paprika, and the fiery stews of West Africa are all, in their modern form, less than five centuries old — built on a fruit from the Americas.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Chilies are now grown throughout the warm regions of the world, as fresh vegetables, dried spices, powders, pastes, and sauces, and as the mild sweet peppers eaten by the kilogram. They range from a market staple to a global subculture obsessed with record-breaking heat.",
          "Beyond the plate, capsaicin has found uses from pain-relief creams to pepper spray — the plant's ancient chemical defence turned to new human purposes, just as its burn was long ago turned into pleasure.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "cacao",
    name: "Cacao",
    scientificName: "Theobroma cacao",
    family: "Malvaceae",
    category: "beverage",
    glyph: "🍫",
    originCenter: "Upper Amazon",
    originRegion: "Ecuador / NW Amazonia",
    origin: [-4.0, -78.6],
    domesticatedBP: 5300,
    domestication:
      "Earliest use and likely first domestication lie in the Upper Amazon; cacao was later a prized cultivated and ceremonial crop in Mesoamerica.",
    progenitor: "Wild Theobroma cacao",
    evidence:
      "Residues, starch, and ancient DNA on Upper Amazonian ceramics push domestication back to ~5,300 BP.",
    availability:
      "Now cultivated across the equatorial belt; West Africa supplies the majority of world cocoa.",
    spread: [
      { to: "Mesoamerica", coords: [16, -92], period: "~4,000 BP", order: 1 },
      { to: "Europe (as chocolate)", coords: [40, -4], period: "16th–17th c. CE", order: 2 },
      { to: "West Africa", coords: [6, -1], period: "19th c. CE", order: 3 },
      { to: "Southeast Asia", coords: [1, 114], period: "19th–20th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fermented, roasted seeds", cautionParts: "", note: "Contains theobromine, which is toxic to many pets though not to people at food levels." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "Both key words are Mesoamerican. \"Cacao\" descends from cacahuatl and \"chocolate\" from xocolatl, terms from Nahuatl and neighbouring languages. When Linnaeus formally named the tree he reached for Greek and called it Theobroma cacao — \"food of the gods\" — a rare case of a botanist matching the reverence a plant had long been given.",
          "The tree itself is strange and tropical. Its flowers and heavy pods sprout directly from the trunk and oldest branches, a habit called cauliflory, and each pod holds seeds — cacao \"beans\" — cushioned in sweet white pulp. Those seeds are bitter and, on their own, taste nothing like chocolate.",
        ],
        sourceIds: ["powo", "kiple2000"],
      },
      {
        heading: "An Amazonian origin",
        paragraphs: [
          "Cacao's wild home is the humid lowland forest of the upper Amazon, on the eastern slopes of the Andes, where its greatest genetic diversity survives. Long thought to have been first used in Mesoamerica, the tree is now known to have been domesticated far earlier in South America: residues on pottery from sites such as Santa Ana-La Florida in Ecuador show people were using cacao more than 5,000 years ago.",
          "From that South American beginning the plant and the knowledge of it travelled north into Mesoamerica, where it became a cultural obsession.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "Money that grew on trees",
        paragraphs: [
          "For the Olmec, Maya, and Aztec, cacao was wealth, ritual, and drink all at once. The beans were literally currency — you could buy goods with them, and counterfeiters faked them with clay — and the ground seeds were whisked with water, chili, maize, and spices into a bitter, frothy beverage reserved largely for elites, warriors, and ceremony. There was no sugar in it; sweet chocolate is a European invention.",
          "The fermentation and roasting that unlock chocolate's flavour were already understood: the pulp-covered beans must be fermented and dried before the familiar aromas can even form. This was sophisticated food technology, not a lucky accident.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "Europe sweetens the gods' food",
        paragraphs: [
          "Spanish colonists carried cacao back across the Atlantic in the sixteenth and seventeenth centuries, and Europe's decisive change was to sweeten it with sugar and warm it into a fashionable drink; chocolate houses spread through the cities much as coffee houses did. For three centuries chocolate was something you drank.",
          "The nineteenth century turned it into something you eat. A Dutch process for pressing out cocoa butter and making smooth cocoa powder (1828), the first solid eating chocolate (1847), and the Swiss invention of milk chocolate (1870s) between them created the modern confection — and, with it, a mass-market industry.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "In a striking geographic reversal, most of the world's cacao no longer comes from the Americas at all. Colonial powers spread the tree to West Africa, and today Côte d'Ivoire and Ghana grow the majority of the global crop, mostly on smallholdings, with more from Indonesia and Latin America.",
          "That trade carries hard realities alongside the pleasure: cacao farmers often earn very little, and the sector has struggled with poverty and child labour, driving fair-trade and traceability efforts. A fruit once used as money still sits at the centre of questions about who is paid what.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "coffee",
    name: "Arabica Coffee",
    scientificName: "Coffea arabica",
    family: "Rubiaceae",
    category: "beverage",
    glyph: "☕",
    originCenter: "Southwestern Ethiopian Highlands",
    originRegion: "Ethiopia",
    origin: [7.3, 36.2],
    domesticatedBP: 1000,
    domestication:
      "Arabica arose as a natural hybrid in the Ethiopian highlands and was taken into cultivation; systematic farming developed around the Red Sea.",
    progenitor: "Coffea eugenioides × Coffea canephora",
    evidence:
      "Wild forests of Arabica in southwest Ethiopia plus genomics showing very low diversity from a narrow founding population.",
    availability:
      "One of the most traded commodities; grown across the tropical 'coffee belt' of the Americas, Africa, and Asia.",
    spread: [
      { to: "Yemen & Arabia", coords: [15, 44], period: "15th c. CE", order: 1 },
      { to: "Ottoman world & Europe", coords: [41, 29], period: "16th–17th c. CE", order: 2 },
      { to: "Java & South Asia", coords: [-7, 110], period: "17th–18th c. CE", order: 3 },
      { to: "Caribbean & Brazil", coords: [-15, -47], period: "18th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Roasted seeds (brewed)", cautionParts: "", note: "Beverage crop; the seeds contain caffeine." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Coffee\" reached European languages through Turkish kahve, from the Arabic qahwa — a word that once named wine and was transferred to the dark, stimulating drink that, in the Islamic world, took wine's social place. The port of Mocha in Yemen lent its name to the coffee it shipped, and later to the coffee-and-chocolate flavour.",
          "The plant is a tropical shrub of the genus Coffea. Two species carry world trade: prized Coffea arabica, mild and aromatic, and hardier, more bitter, more caffeinated Coffea canephora, or robusta. What we call a coffee \"bean\" is the seed — usually two per fruit — of a small red \"cherry.\"",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Born in the Ethiopian highlands",
        paragraphs: [
          "Arabica coffee is native to the montane forests of southwestern Ethiopia, where it still grows wild in the shade of the highland canopy. Genetically it is a natural hybrid, an allotetraploid that arose from the crossing of robusta with another wild species, Coffea eugenioides — which is why arabica is so distinct from its parents.",
          "Ethiopian tradition tells of Kaldi, a goatherd who noticed his flock grow lively after eating the bright cherries. The legend is charming but late; what is clear is that the wild plant and its stimulating berries belong, first, to the Horn of Africa.",
        ],
        sourceIds: ["powo", "kiple2000"],
      },
      {
        heading: "Cultivated in Arabia",
        paragraphs: [
          "Coffee as a roasted, brewed drink took shape not in Ethiopia but across the Red Sea in Yemen, where by the fifteenth century Sufi communities were using it to stay awake through night-long devotions. Yemeni farmers cultivated the shrub on mountain terraces, and the drink spread through the holy cities and then the great centres of the Islamic world — Mecca, Cairo, Istanbul — where the coffee house was born as a place of talk, music, and sometimes suspicion from authorities.",
          "For a long time Yemen guarded its monopoly, even reportedly treating exported beans so they could not be germinated elsewhere. The world's coffee habit began as an Arabian one.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The plant that circled the globe",
        paragraphs: [
          "Coffee reached Europe in the seventeenth century, and the coffee house followed — the London establishments nicknamed \"penny universities\" for the conversation a cheap cup bought, and where enterprises such as Lloyd's of London grew out of the clientele. Demand soon outran Yemen.",
          "The Dutch broke the monopoly by carrying live plants to Java; the French took a seedling to the Caribbean; and from a small number of such plants sprang the vast plantations of the colonial tropics. Coffee-growing spread across a \"bean belt\" around the equator, above all to Brazil, which became — and remains — by far the largest producer. Much of this expansion was built on colonial plantations and enslaved or coerced labour.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Coffee is one of the most valuable agricultural commodities in world trade and the livelihood of many millions of smallholder farmers across Latin America, Africa, and Asia. Arabica supplies most of the quality market; robusta fills instant coffee and blends and is rising as it withstands heat and disease better.",
          "That difference now matters urgently. Arabica is finicky about temperature, and climate change threatens the cool highland conditions it needs, pushing growers upslope and driving efforts to breed and rediscover more resilient varieties — including from the wild coffee forests of Ethiopia where the crop began.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "banana",
    name: "Banana & Plantain",
    scientificName: "Musa acuminata",
    family: "Musaceae",
    category: "fruit",
    glyph: "🍌",
    originCenter: "New Guinea Highlands",
    originRegion: "New Guinea",
    origin: [-5.8, 144.3],
    domesticatedBP: 7000,
    domestication:
      "First cultivated in the New Guinea highlands; edible seedless bananas emerged through hybridisation and selection for parthenocarpy.",
    progenitor: "Musa acuminata (with M. balbisiana in hybrids)",
    evidence:
      "Banana phytoliths in ancient wetland agriculture at Kuk Swamp document cultivation by ~7,000 BP.",
    availability:
      "The most exported fresh fruit worldwide and a starchy staple across the humid tropics.",
    spread: [
      { to: "Island Southeast Asia", coords: [0, 120], period: "by ~4,000 BP", order: 1 },
      { to: "South Asia", coords: [12, 78], period: "~3,000 BP", order: 2 },
      { to: "East Africa", coords: [-1, 34], period: "1st millennium CE", order: 3 },
      { to: "The Americas", coords: [10, -75], period: "16th c. CE", order: 4 },
    ],
    maturity: "flagship",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit", cautionParts: "", note: "Plantains are cooked; dessert bananas are eaten raw." },
    claims: [
      { id: "banana-identity", kind: "identity", statement: "Cultivated bananas and plantains derive mainly from Musa acuminata (A genome), often hybridised with M. balbisiana (B genome); family Musaceae.", sourceIds: ["perrier2011", "powo"], confidence: "high", review: "pending" },
      { id: "banana-domestication", kind: "domestication", statement: "Cultivation began in the New Guinea highlands, where wetland agriculture and selection for seedless (parthenocarpic) fruit are documented by about 7,000 BP.", sourceIds: ["denham2003", "perrier2011"], confidence: "high", review: "pending" },
      { id: "banana-spread", kind: "spread", statement: "Bananas dispersed through Island Southeast Asia and South Asia, reached East Africa in the first millennium CE, and the Americas in the 16th century.", sourceIds: ["perrier2011", "zohary2012"], confidence: "medium", review: "pending" },
      { id: "banana-availability", kind: "availability", statement: "Bananas are the most exported fresh fruit worldwide and a starchy staple across the humid tropics.", sourceIds: ["faostat"], confidence: "high", review: "pending" },
    ],
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The name \"banana\" reached Europe through Portuguese and Spanish traders on the West African coast, who borrowed a word from a language of the Wolof or wider Mande region; it displaced the older European term, which derived from the \"fig of India\" of classical writers. English keeps a rough split between the sweet dessert banana and the starchy \"plantain,\" but the two are not distinct species — they are different uses of the same intertwined family of cultivars, and most of the world simply calls them all bananas.",
          "The plant itself defies expectations. It is not a tree but the world's largest herb: its \"trunk\" is a pseudostem of tightly rolled leaf bases, and it dies back after fruiting. And the fruit is, botanically, a berry. The banana you buy is also, genetically, a curiosity — most edible types are triploid, seedless, and sterile, unable to reproduce without human hands.",
        ],
        sourceIds: ["powo", "koeppel2008"],
      },
      {
        heading: "The wild ancestor",
        paragraphs: [
          "Cultivated bananas descend chiefly from two wild Southeast Asian species: Musa acuminata, which contributes the \"A\" genome, and the hardier Musa balbisiana, source of the \"B\" genome. Wild bananas look nothing like the supermarket fruit — they are short, angular, and packed with hard, bullet-like black seeds set in only a little flesh.",
          "The transformation that made them food was the fixing of parthenocarpy: fruit that develops sweet, seedless pulp without fertilisation. Early cultivators selected these rare seedless mutants and, because such plants could not set seed, propagated them vegetatively from suckers and cuttings — the beginning of a crop that has been cloned by hand ever since.",
        ],
        sourceIds: ["perrier2011", "denham2003"],
      },
      {
        heading: "Domestication in New Guinea & island Asia",
        paragraphs: [
          "The banana was one of the first plants humans farmed. At Kuk Swamp in the highlands of New Guinea, archaeologists have found evidence of banana cultivation reaching back some 7,000 years and probably earlier, making the region one of the world's independent cradles of agriculture. Selection for seedless, parthenocarpic fruit was underway across island Southeast Asia and New Guinea in deep prehistory.",
          "As people carried these plants between islands and regions, the two wild genomes were repeatedly hybridised and the chromosome sets doubled and trebled, producing the sterile triploids — AAA dessert types, AAB and ABB cooking types — that dominate today. The modern banana is therefore not a single domestication but a long, mobile process of human-guided hybridisation.",
        ],
        sourceIds: ["denham2003", "perrier2011"],
      },
      {
        heading: "Across the oceans",
        paragraphs: [
          "Being sterile clones, bananas travelled only as living plants, and their spread traces some of history's great migrations. Austronesian voyagers moved them through the Pacific; along the Indian Ocean they reached East Africa well over a thousand years ago, where highland farmers bred a distinct group of East African cooking bananas — the matoke that anchors diets in Uganda and the Great Lakes region to this day.",
          "The Atlantic leg came with European empire: Portuguese traders carried bananas from West Africa to the Canary Islands, and from there to the Caribbean and the Americas in the sixteenth century. Only in the late nineteenth century, with steamships and railways, did the banana become a cheap, everyday fruit in temperate cities far from where it grows.",
        ],
        sourceIds: ["sauer1993", "koeppel2008"],
      },
      {
        heading: "One clone, and its peril",
        paragraphs: [
          "The global banana trade is built on genetic uniformity that would alarm any Andean potato farmer. For the first half of the twentieth century the export fruit was a single cultivar, \"Gros Michel.\" Because every plant was an identical clone, the soil fungus that causes Panama disease (Fusarium wilt) spread through the plantations unchecked and, by the 1950s–60s, destroyed Gros Michel as a commercial crop.",
          "The industry replaced it with another single clone, the \"Cavendish,\" which resisted that strain and now accounts for essentially all bananas in world trade. History is repeating: a new race of the fungus, Tropical Race 4, is lethal to Cavendish and is spreading across continents. A fruit that reproduces only by cloning has almost no way to evolve its own defence — the export banana's greatest strength and its greatest vulnerability are the same fact.",
        ],
        sourceIds: ["koeppel2008", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Bananas and plantains are among the most important food crops on the planet — the most exported fresh fruit by volume, and, far more significantly, a starchy staple that feeds hundreds of millions in the humid tropics of Africa, Asia, and Latin America, where cooking bananas are a daily source of calories rather than a snack.",
          "The trade also carries a heavy history. The twentieth-century dominance of companies like the United Fruit Company over Central American economies and politics gave the world the phrase \"banana republic,\" a reminder that this cheap, cheerful fruit sits atop one of the more fraught stories in the history of global agriculture.",
        ],
        sourceIds: ["faostat", "koeppel2008"],
      },
    ],
  },
  {
    id: "soybean",
    name: "Soybean",
    scientificName: "Glycine max",
    family: "Fabaceae",
    category: "legume",
    glyph: "🫛",
    originCenter: "Central & Northern China",
    originRegion: "China",
    origin: [34.5, 113.5],
    domesticatedBP: 7000,
    domestication:
      "Domesticated from wild soybean in China; selection increased seed size, oil, and protein and reduced hard-seededness.",
    progenitor: "Wild soybean (Glycine soja)",
    evidence:
      "Increasing seed size in Chinese archaeological assemblages, supported by genome-wide domestication signals.",
    availability:
      "The world's dominant oilseed and protein legume; leading producers are now in the Americas.",
    spread: [
      { to: "Korea & Japan", coords: [36, 128], period: "~2,000 BP", order: 1 },
      { to: "Southeast & South Asia", coords: [20, 100], period: "1st millennium CE", order: 2 },
      { to: "Europe", coords: [48, 12], period: "18th c. CE", order: 3 },
      { to: "The Americas", coords: [-20, -50], period: "19th–20th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Seeds (processed or cooked)", cautionParts: "Raw beans", note: "Raw soybeans contain trypsin inhibitors and lectins and require processing or cooking." },
  },
  {
    id: "sugarcane",
    name: "Sugarcane",
    scientificName: "Saccharum officinarum",
    family: "Poaceae",
    category: "oil",
    glyph: "🎋",
    originCenter: "New Guinea",
    originRegion: "New Guinea",
    origin: [-6.0, 143.5],
    domesticatedBP: 8000,
    domestication:
      "The thick, sweet 'noble cane' was domesticated in New Guinea; later hybrids with wild canes produced the crop of the sugar industry.",
    progenitor: "Saccharum robustum",
    evidence:
      "Ethnobotanical and genetic evidence places noble-cane origins in New Guinea, with dispersal along Austronesian routes.",
    availability:
      "Supplies most of the world's sugar and a large share of bioethanol; grown throughout the tropics and subtropics.",
    spread: [
      { to: "Island SE Asia", coords: [0, 120], period: "by ~4,000 BP", order: 1 },
      { to: "India", coords: [22, 80], period: "~2,500 BP", order: 2 },
      { to: "Mediterranean & Levant", coords: [33, 35], period: "1st millennium CE", order: 3 },
      { to: "Caribbean & Americas", coords: [18, -70], period: "16th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Stem juice (sugar)", cautionParts: "", note: "Grown for sucrose and ethanol rather than direct eating." },
  },
  {
    id: "apple",
    name: "Apple",
    scientificName: "Malus domestica",
    family: "Rosaceae",
    category: "fruit",
    glyph: "🍎",
    originCenter: "Tian Shan Mountains",
    originRegion: "Kazakhstan & Central Asia",
    origin: [43.2, 76.9],
    domesticatedBP: 4000,
    domestication:
      "The cultivated apple descends chiefly from a large-fruited wild apple of the Tian Shan, with later hybridisation along Silk Road trade.",
    progenitor: "Malus sieversii (with M. sylvestris introgression)",
    evidence:
      "Genomics traces the domestic apple to Tian Shan wild stock, refined by grafting and Silk Road exchange.",
    availability:
      "Among the most widely grown temperate fruits; commercial orchards span both hemispheres.",
    spread: [
      { to: "Persia & the Near East", coords: [35, 52], period: "1st millennium BCE", order: 1 },
      { to: "Greece & Rome", coords: [41, 15], period: "Classical antiquity", order: 2 },
      { to: "Western Europe", coords: [48, 2], period: "Roman–medieval", order: 3 },
      { to: "The Americas", coords: [42, -75], period: "17th c. CE", order: 4 },
    ],
    maturity: "flagship",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit flesh", cautionParts: "Seeds in quantity", note: "Seeds contain cyanogenic amygdalin; incidental swallowing is harmless." },
    claims: [
      { id: "apple-identity", kind: "identity", statement: "The cultivated apple is Malus domestica, family Rosaceae.", sourceIds: ["powo", "cornille2014"], confidence: "high", review: "pending" },
      { id: "apple-domestication", kind: "domestication", statement: "Its principal wild ancestor is Malus sieversii from the Tian Shan of Central Asia, with later hybridisation, notably with the European crab apple (M. sylvestris).", sourceIds: ["cornille2014", "duan2017"], confidence: "high", review: "pending" },
      { id: "apple-spread", kind: "spread", statement: "The apple diversified along Silk Road trade through Persia and the Greco-Roman world into Europe, reaching the Americas in the 17th century.", sourceIds: ["cornille2014", "zohary2012"], confidence: "medium", review: "pending" },
      { id: "apple-availability", kind: "availability", statement: "Apples are among the most widely produced temperate fruits, grown commercially across both hemispheres.", sourceIds: ["faostat"], confidence: "high", review: "pending" },
    ],
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Apple\" is one of the oldest fruit words in English, and for much of its history it was almost generic: in Old English æppel could mean fruit in general, which is why exotic novelties arrived as the \"apple\" of somewhere else — the pineapple, the pomegranate (\"seeded apple\"), and the tomato as pomme d'amour. The fruit's shadow even falls on the Garden of Eden, though no apple is named in the text; medieval European artists simply painted the fruit they knew.",
          "The cultivated apple is Malus domestica (also written Malus pumila), a member of the rose family alongside pears, cherries, and almonds. Its defining trait as a crop is genetic: apples are extraordinarily heterozygous and largely self-incompatible, so a seed almost never grows into a tree resembling its parent. Every named variety — every Gala, Bramley, or Cox — is therefore a single original seedling perpetuated by grafting, a living clone that may be centuries old.",
        ],
        sourceIds: ["powo", "juniper2006"],
      },
      {
        heading: "The wild ancestor",
        paragraphs: [
          "The domestic apple's principal wild ancestor is Malus sieversii, which still forms wild fruit forests in the Tian Shan mountains of Central Asia, on the borders of Kazakhstan and China. The former capital, Almaty, takes its name from the apple; the region is, quite literally, the fruit's cradle. Remarkably, some wild Tian Shan trees already bear large, sweet, apple-sized fruit — unusual among wild relatives, most of which are sour crabs.",
          "Genetic studies explain that head start. Large fruit evolved first to attract large animals — bears and horses — that ate the apples and dispersed the seeds, favouring ever-bigger, sweeter fruit long before humans were involved. When people entered the story they inherited a wild tree already primed for the orchard.",
        ],
        sourceIds: ["cornille2014", "duan2017"],
      },
      {
        heading: "Grafting, the Silk Road, and a second parent",
        paragraphs: [
          "Because apples will not come true from seed, the domestic apple could not exist without grafting — splicing a shoot of a desirable tree onto a rootstock so the fruit is reproduced exactly. Grafting was developed in the ancient Near East and China, and it is the true engine of apple domestication: it let growers freeze a lucky seedling into a permanent variety.",
          "The apple then travelled the Silk Road in both directions, and in doing so acquired a second parent. Genomic work shows that as Tian Shan apples moved west they hybridised extensively with the European wild crab, Malus sylvestris, contributing much of the modern apple's genome and giving it firmness and flavour. The result is a two-stage story: fruit enlargement first in the wild by animal dispersal, then a second transformation through Silk Road hybridisation and human selection.",
        ],
        sourceIds: ["duan2017", "cornille2014"],
      },
      {
        heading: "Greece, Rome & the medieval orchard",
        paragraphs: [
          "Classical Greece and Rome turned the apple into a cultivated art. Roman writers on agriculture described grafting in detail and listed dozens of named varieties, and Roman orchards and techniques spread the fruit across the empire, including to Britain. After Rome's fall, European monasteries preserved and extended this pomological knowledge, maintaining varieties and cider-making through the medieval centuries.",
          "Apples reached the Americas with European colonists. Most early colonial apples were not eaten but pressed: in a world of unsafe water, hard cider was a daily drink. The folk hero John Chapman — \"Johnny Appleseed\" — really did plant orchards across the American frontier, but from seed, not grafts, meaning he was chiefly producing sour cider apples, not the dessert fruit of legend.",
        ],
        sourceIds: ["juniper2006", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Thousands of apple varieties exist — well over 7,500 named cultivars — yet global commerce rests on a few dozen, and supermarket shelves on fewer still, a narrowing that heirloom growers and gene banks work to counter. Orchards themselves have been reinvented: modern trees are grafted onto dwarfing rootstocks that keep them small and quick to fruit, planted in dense, trellised rows more like a vineyard than the spreading orchards of the past.",
          "The apple is now one of the most widely grown temperate fruits on Earth, produced across both hemispheres, with China by far the largest grower. Controlled-atmosphere storage — chilled, low-oxygen rooms that halt ripening — means the \"fresh\" apple has become a year-round fruit, some sold months after harvest.",
        ],
        sourceIds: ["faostat", "juniper2006"],
      },
    ],
  },
  {
    id: "grape",
    name: "Grapevine",
    scientificName: "Vitis vinifera",
    family: "Vitaceae",
    category: "fruit",
    glyph: "🍇",
    originCenter: "South Caucasus",
    originRegion: "Georgia & Transcaucasia",
    origin: [41.7, 45.0],
    domesticatedBP: 8000,
    domestication:
      "The wine grape was domesticated in the South Caucasus and the Near East from wild vines, selected for larger, sweeter, hermaphroditic-flowered berries.",
    progenitor: "Wild grape (Vitis vinifera ssp. sylvestris)",
    evidence:
      "Earliest wine residues in Georgian Neolithic jars, with a large genome study confirming Caucasian and Near Eastern domestications.",
    availability:
      "Grown for wine, table fruit, and raisins across every temperate wine region worldwide.",
    spread: [
      { to: "Levant & Egypt", coords: [31, 34], period: "~5,000 BP", order: 1 },
      { to: "Greece & Rome", coords: [40, 16], period: "1st millennium BCE", order: 2 },
      { to: "Western Europe", coords: [45, 2], period: "Roman era", order: 3 },
      { to: "New World wine regions", coords: [-33, -70], period: "16th–19th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit", cautionParts: "", note: "Eaten fresh, dried as raisins, and fermented as wine." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Grape\" comes from an Old French word for a bunch or hook (the tool used to pick it), while the deeper vocabulary of the plant — vine, vineyard, viticulture, and wine itself — descends from Latin vitis and vinum. The domesticated grape is Vitis vinifera, \"the wine-bearing vine,\" and a single species accounts for almost all the world's wine, table grapes, and raisins.",
          "That one species has been split by millennia of selection into thousands of named cultivars — Cabernet, Chardonnay, Thompson Seedless, and the rest — each maintained not from seed but by cuttings, so that a variety is effectively one ancient plant reproduced endlessly. Some famous wine grapes are clones that have been propagated, unchanged, for centuries.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "The wild vine & a crucial change of sex",
        paragraphs: [
          "The ancestor is the wild grape, Vitis vinifera subsp. sylvestris, a forest climber of the Near East and Mediterranean. Wild grapevines are mostly dioecious — individual plants are either male or female — which makes reliable fruiting a gamble.",
          "The key domestication trait was a shift to hermaphroditic vines, bearing flowers with both male and female parts that can pollinate themselves. Selecting these self-fertile plants gave dependable, heavy crops of larger, sweeter berries, and turned an unpredictable wild climber into the foundation of an industry.",
        ],
        sourceIds: ["zohary2012", "powo"],
      },
      {
        heading: "Domestication & the birth of wine",
        paragraphs: [
          "Grapes were domesticated in the South Caucasus and the northern Near East roughly 8,000 years ago, and their history is inseparable from wine. Some of the earliest chemical evidence of winemaking anywhere comes from Neolithic sites in Georgia, where residues in large clay jars date back some 8,000 years, with comparably ancient traces from the Zagros Mountains of Iran.",
          "Wine gave the grape a value far beyond food: a storable, tradable, intoxicating, ritually charged drink. That is why the vine spread as a cultural force, carried by peoples who prized what its fermented juice could do.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "Around the Mediterranean & the world",
        paragraphs: [
          "From the Near East, viticulture moved to Egypt and then out across the Mediterranean with the Phoenicians and Greeks, who planted vines wherever they settled. Rome carried the vine and winemaking deep into Europe — Gaul, Iberia, the Rhine and Danube — laying down many of the classic wine regions, and medieval monasteries later preserved and refined the craft, developing the fine attention to place now called terroir.",
          "European colonists then took the vine worldwide, establishing the wine industries of the Americas, South Africa, and Australia. Table grapes and raisins spread along the same routes, so that a Near Eastern vine now fruits on every temperate continent.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "Phylloxera & the crop today",
        paragraphs: [
          "In the late nineteenth century the European vine nearly died. Phylloxera, a tiny sap-sucking insect accidentally imported from North America, attacked the roots of Vitis vinifera, which had no defence, and devastated vineyards across France and beyond. The rescue was botanical: growers grafted their vinifera vines onto the resistant roots of American grape species, and virtually all of the world's wine grapes still grow on American rootstocks to this day.",
          "The grape remains one of the most widely planted fruit crops on Earth, its harvest split between wine, fresh table grapes, and raisins. Few crops carry so much culture in their berries — or wear their history, from Georgian jars to grafted American roots, so plainly.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
    ],
  },
  {
    id: "sorghum",
    name: "Sorghum",
    scientificName: "Sorghum bicolor",
    family: "Poaceae",
    category: "cereal",
    glyph: "🌾",
    originCenter: "Eastern Sahel / Sudan",
    originRegion: "Northeast Africa",
    origin: [13.0, 30.0],
    domesticatedBP: 6000,
    domestication:
      "Domesticated from wild sorghum in the savannas of northeastern Africa; drought tolerance made it a keystone of Sahelian farming.",
    progenitor: "Sorghum bicolor ssp. verticilliflorum",
    evidence:
      "Impressions and grains across Sahelian sites plus genetic diversity centered on the Sudan region.",
    availability:
      "A leading dryland cereal; vital across Africa and South Asia and grown for grain and forage worldwide.",
    spread: [
      { to: "Sahel & West Africa", coords: [12, 0], period: "~4,000 BP", order: 1 },
      { to: "Arabia & India", coords: [20, 74], period: "~4,000 BP", order: 2 },
      { to: "East Asia", coords: [30, 110], period: "1st millennium CE", order: 3 },
      { to: "The Americas", coords: [33, -97], period: "17th–19th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Grain", cautionParts: "Fresh or stressed foliage", note: "Fresh sorghum foliage can accumulate cyanogenic compounds (a fodder caution)." },
  },
  {
    id: "sweet-potato",
    name: "Sweet Potato",
    scientificName: "Ipomoea batatas",
    family: "Convolvulaceae",
    category: "tuber",
    glyph: "🍠",
    originCenter: "Tropical Central & South America",
    originRegion: "Central America / NW South America",
    origin: [-8.0, -74.0],
    domesticatedBP: 5000,
    domestication:
      "Domesticated in tropical America; remarkably, it reached Polynesia in pre-Columbian times, carried across the Pacific.",
    progenitor: "Wild Ipomoea species (I. trifida complex)",
    evidence:
      "Ancient tubers in Peruvian sites and the Polynesian name 'kumara' point to early trans-Pacific contact.",
    availability:
      "A major tropical root crop; China is by far the largest producer today.",
    spread: [
      { to: "Polynesia", coords: [-17, -149], period: "pre-1000 CE", order: 1 },
      { to: "Iberia & Europe", coords: [40, -4], period: "16th c. CE", order: 2 },
      { to: "East & Southeast Asia", coords: [25, 115], period: "16th–17th c. CE", order: 3 },
      { to: "Africa", coords: [0, 25], period: "16th–18th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Storage roots and young leaves", cautionParts: "", note: "Both the roots and young leaves are eaten." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The sweet potato is Ipomoea batatas, and it is not a potato at all — it belongs to the morning glory family and is unrelated to the true potato of the nightshades. Its name is in fact the older one: the Taíno word batata first meant this plant, and only later did \"potato\" attach to the Andean tuber that overtook it in Europe.",
          "The part eaten is a swollen storage root, not a stem tuber, and it comes in white, yellow, orange, and deep purple flesh; the young leaves are eaten as a green as well.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "The sweet potato was domesticated in the tropical Americas — most likely Central America or northern South America — thousands of years ago, and was widely grown across the warm New World long before European contact. Hardy, productive on poor soils, and rich in energy and vitamins, it was a dependable staple.",
          "After 1492 it was among the first American crops carried to the Old World, reaching Europe even before the common potato, then spreading rapidly to Africa and Asia, where it took especially firm root.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The Polynesian puzzle",
        paragraphs: [
          "The sweet potato holds one of the great mysteries of prehistory. Long before Columbus, it was already growing across the islands of Polynesia, thousands of miles from its American home — and the Polynesian name for it, kumara, strikingly resembles words for the plant in the Andes. How an American crop crossed the Pacific in pre-Columbian times is fiercely debated: it points either to direct contact between Polynesian voyagers and South America, or to a remarkable natural or human long-distance dispersal.",
          "Either way, the humble sweet potato is a key piece of evidence that the Pacific and the Americas were not as sealed off from one another as once assumed.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The sweet potato is a major world food crop, and today China grows the vast majority of it, though it is a dietary mainstay across much of Africa and the Pacific too. It is prized in development work for its resilience and nutrition: orange-fleshed, vitamin-A-rich varieties have been promoted across sub-Saharan Africa to combat childhood vitamin A deficiency — an ancient American root enlisted against modern malnutrition.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "squash",
    name: "Squash & Pumpkin",
    scientificName: "Cucurbita pepo",
    family: "Cucurbitaceae",
    category: "vegetable",
    glyph: "🎃",
    originCenter: "Central & Southern Mexico",
    originRegion: "Mexico",
    origin: [18.5, -97.0],
    domesticatedBP: 10000,
    domestication:
      "Among the earliest domesticates of the Americas; squashes were grown for seeds and flesh long before maize and beans joined the 'Three Sisters'.",
    progenitor: "Wild Cucurbita pepo",
    evidence:
      "Domesticated squash seeds and rinds in Mexican caves date cultivation to ~10,000 BP.",
    availability:
      "Grown globally as vegetables, ornamental gourds, and seed crops across temperate and tropical zones.",
    spread: [
      { to: "Eastern North America", coords: [38, -88], period: "~5,000 BP", order: 1 },
      { to: "South America", coords: [-15, -60], period: "pre-Columbian", order: 2 },
      { to: "Europe & Old World", coords: [45, 10], period: "16th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit and seeds", cautionParts: "Rare intensely bitter fruit", note: "Unusually bitter squash can contain toxic cucurbitacins; do not eat it." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Squash\" is a shortening of the Narragansett word askutasquash, from the Indigenous peoples of the northeastern Americas — a rare everyday English word taken directly from a Native American language. The name covers several species of the genus Cucurbita, and among them an enormous range of fruits: pumpkins, zucchini, acorn and butternut squash, marrows, and many ornamental gourds.",
          "All are New World plants, and all bear the gourd family's hard-rinded berry, the pepo. Wild squashes are bitter and toxic with cucurbitacins; the edible crop is the result of selecting the rare non-bitter mutants — which is why a stray bitter squash should still be taken seriously.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Among the first American crops",
        paragraphs: [
          "Squash is one of the oldest domesticated plants of the Americas. Remains from a cave in Oaxaca, Mexico, push the domestication of Cucurbita pepo back some 10,000 years — as early as, or earlier than, maize — and squash was domesticated more than once, independently in Mexico, eastern North America, and South America, from different wild species.",
          "Its early value may have been as much the protein-rich seeds and the hard, hollowable rind (usable as a container or float) as the flesh, with sweeter, fleshier types selected over time.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The Three Sisters & vanished dispersers",
        paragraphs: [
          "Across the Americas squash was grown as one of the \"Three Sisters,\" interplanted with maize and beans in a mutually supporting trio: the maize gave the beans a pole, the beans fixed nitrogen, and the broad squash leaves shaded out weeds and held moisture. It was one of the world's great sustainable farming systems.",
          "Like the avocado, wild squashes seem to have relied on the giant Ice Age mammals to eat their bitter fruit and spread the seeds; when that megafauna died out, the plants leaned increasingly on human cultivators, who had already begun to favour the sweeter, edible forms.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "After 1492 squashes and pumpkins spread across the Old World, taken up from Europe to Africa to Asia; the zucchini, for instance, is an Italian refinement of an American Cucurbita pepo developed only in the nineteenth century. Today the group is grown globally as food and ornament — summer squashes eaten young and tender, winter squashes and pumpkins stored hard-rinded for months, and the seeds eaten in their own right.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "peanut",
    name: "Peanut",
    scientificName: "Arachis hypogaea",
    family: "Fabaceae",
    category: "legume",
    glyph: "🥜",
    originCenter: "Southern Bolivia / NW Argentina",
    originRegion: "South-central South America",
    origin: [-21.0, -63.5],
    domesticatedBP: 7500,
    domestication:
      "The peanut arose as a hybrid between two wild species in the southern Andean foothills, combining their genomes into one cultivated crop.",
    progenitor: "Arachis duranensis × A. ipaensis",
    evidence:
      "Ancient pods in coastal Peru and genome sequencing confirming the two wild parents and their hybrid origin.",
    availability:
      "A major oil and protein legume; leading producers are now in Asia and Africa.",
    spread: [
      { to: "Andes & Amazonia", coords: [-10, -70], period: "~5,000 BP", order: 1 },
      { to: "Africa", coords: [8, 5], period: "16th c. CE", order: 2 },
      { to: "Asia", coords: [25, 110], period: "16th–17th c. CE", order: 3 },
      { to: "North America", coords: [33, -84], period: "18th–19th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Seeds", cautionParts: "Common allergen", note: "A major food allergen; poorly stored nuts may carry aflatoxin." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The peanut is not a true nut but a legume — a bean whose relatives are peas and lentils — and its other name, \"groundnut,\" is the more honest one. A third name, \"goober,\" comes from nguba in the Kongo language of Central Africa, a word carried to the American South by enslaved Africans and a small linguistic monument to the crop's Atlantic journey.",
          "Its botanical name, Arachis hypogaea, means \"under the earth,\" describing the plant's most extraordinary trick: after its flowers are pollinated above ground, the stalks bend down and push the developing pods into the soil to ripen underground. This habit, called geocarpy, is why we dig for peanuts.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "A South American origin",
        paragraphs: [
          "The peanut was domesticated in South America, in the foothills of the Andes around southern Bolivia and northern Argentina, where its wild relatives grow. The cultivated peanut is a natural hybrid of two wild species whose chromosomes combined and doubled, giving the crop we grow.",
          "From that heartland, Indigenous farmers spread the peanut widely across South America well before European contact, and it was a familiar food from the Andes to the Caribbean by the time the Spanish and Portuguese arrived.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "An Atlantic and Pacific crossing",
        paragraphs: [
          "Portuguese and Spanish traders carried the peanut out of the Americas in the sixteenth century, and it thrived especially in West Africa and, via the Pacific trade, in China and Southeast Asia. In Africa it slotted into local farming and cooking so thoroughly that it became a staple — and then, through the transatlantic slave trade, African peanuts and African culinary knowledge of them returned across the ocean to North America.",
          "In the United States the peanut long carried that history and a lowly reputation until, in the early twentieth century, the scientist George Washington Carver promoted it as a soil-restoring rotation crop for the cotton South and publicised hundreds of uses, helping cement it in American agriculture and diet.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The peanut is a major world crop, grown across the warm regions of Asia, Africa, and the Americas, with China and India the largest producers. It is eaten roasted, ground into peanut butter and into the rich sauces of West African and Southeast Asian cooking, and pressed for one of the world's important cooking oils.",
          "Two cautions travel with it: peanuts are among the most serious food allergens, and when poorly stored they can develop aflatoxin, a mould toxin — reasons the crop is closely monitored for safety.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "tea",
    name: "Tea",
    scientificName: "Camellia sinensis",
    family: "Theaceae",
    category: "beverage",
    glyph: "🍵",
    originCenter: "Yunnan & the Assam borderlands",
    originRegion: "Southwest China / Upper Myanmar",
    origin: [24.5, 100.5],
    domesticatedBP: 3000,
    domestication:
      "Tea was domesticated in the montane forests where southwest China meets Southeast Asia; distinct China and Assam varieties were selected for leaf quality.",
    progenitor: "Wild Camellia sinensis",
    evidence:
      "Historical records of tea use in China and genomics separating the China (sinensis) and Assam (assamica) lineages.",
    availability:
      "After water, the most consumed beverage worldwide; grown across humid highlands of Asia and Africa.",
    spread: [
      { to: "China heartland", coords: [30, 112], period: "1st millennium BCE–CE", order: 1 },
      { to: "Japan & Korea", coords: [35, 136], period: "1st millennium CE", order: 2 },
      { to: "Europe (trade)", coords: [52, 0], period: "17th c. CE", order: 3 },
      { to: "India & Sri Lanka", coords: [12, 78], period: "19th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Leaves (infused)", cautionParts: "", note: "Beverage crop; the leaves contain caffeine." },
  },
  {
    id: "olive",
    name: "Olive",
    scientificName: "Olea europaea",
    family: "Oleaceae",
    category: "oil",
    glyph: "🫒",
    originCenter: "Eastern Mediterranean / Levant",
    originRegion: "Levant",
    origin: [32.5, 35.2],
    domesticatedBP: 6000,
    domestication:
      "The olive was domesticated in the eastern Mediterranean, where oleasters were selected and propagated by cuttings for oil-rich fruit.",
    progenitor: "Wild olive / oleaster (Olea europaea var. sylvestris)",
    evidence:
      "Olive stones and wood at Levantine and Aegean sites, with genetics pointing to a primary eastern Mediterranean origin.",
    availability:
      "The defining oil crop of Mediterranean climates; now also grown in the Americas, South Africa, and Australia.",
    spread: [
      { to: "Aegean & Greece", coords: [38, 24], period: "~5,000 BP", order: 1 },
      { to: "Italy & Iberia", coords: [40, 5], period: "1st millennium BCE", order: 2 },
      { to: "North Africa", coords: [34, 5], period: "Classical antiquity", order: 3 },
      { to: "New World Mediterranean zones", coords: [-33, -71], period: "16th–19th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit (cured) and oil", cautionParts: "Raw fresh fruit", note: "Raw olives are intensely bitter and are cured before eating." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The olive gave its name to oil itself: Greek elaia and Latin oliva are the root of \"oil\" in the European languages, because for the ancient Mediterranean, oil simply meant olive oil. The tree is Olea europaea, an evergreen that can live for many centuries — some groves hold trees more than a thousand years old, still fruiting.",
          "A raw olive is inedible, mouth-puckeringly bitter with a compound called oleuropein, and must be cured in brine, salt, or lye before eating — or crushed for its oil. That double life, as both table fruit and the Mediterranean's great source of fat and lamp-light, made it one of the most valuable trees of the ancient world.",
        ],
        sourceIds: ["powo", "zohary2012"],
      },
      {
        heading: "The wild ancestor & domestication",
        paragraphs: [
          "The cultivated olive was tamed from the oleaster, the wild Olea europaea that still grows as a scrubby, small-fruited shrub around the Mediterranean and the Levant. Domestication — chiefly the selection of larger, oilier fruit and the propagation of good trees by cuttings and grafting rather than seed — took place in the eastern Mediterranean roughly 6,000 years ago.",
          "Because favoured trees were cloned, prized varieties could be fixed and carried anywhere, and the same lineage kept for millennia. Olive cultivation and the pressing of oil became a defining technology of Bronze Age and classical Mediterranean economies.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "The sacred tree of the Mediterranean",
        paragraphs: [
          "Few plants carry so much symbolism. Greek myth had Athena win Athens by giving the olive; Olympic victors were crowned with its leaves; its oil lit lamps, anointed athletes and kings, and consecrated the sacred. The very word \"Christ\" means \"the anointed one,\" anointed with oil. The olive branch remains a universal emblem of peace.",
          "Phoenician, Greek, and Roman traders and settlers carried the tree across the whole Mediterranean basin, planting the groves of Iberia, Italy, North Africa, and the Levant that still define the region's landscape and cooking.",
        ],
        sourceIds: ["zohary2012", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Spanish missionaries carried the olive to the Americas, and it later reached California, Australia, and Argentina, but production remains overwhelmingly Mediterranean — Spain alone grows a large share of the world's olives, followed by Italy, Greece, and the countries of North Africa and the Levant.",
          "Olive oil is now a global commodity and the emblematic fat of the much-studied \"Mediterranean diet,\" carrying an ancient tree's produce onto tables far from any grove.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "black-pepper",
    name: "Black Pepper",
    scientificName: "Piper nigrum",
    family: "Piperaceae",
    category: "spice",
    glyph: "🧂",
    originCenter: "Malabar Coast / Western Ghats",
    originRegion: "Southwest India",
    origin: [10.5, 76.5],
    domesticatedBP: 3000,
    domestication:
      "Domesticated from wild vines in the monsoon forests of the Western Ghats and long cultivated on the Malabar Coast, from where it became the dominant spice of Indian Ocean and Roman trade.",
    progenitor: "Wild Piper nigrum (Western Ghats)",
    evidence:
      "Peppercorns in ancient Egyptian and Roman contexts and early Tamil trade records document Malabar cultivation and export.",
    availability:
      "The world's most traded spice; Vietnam, India, Brazil, and Indonesia are the leading producers today.",
    spread: [
      { to: "Roman Mediterranean", coords: [30, 31], period: "1st c. BCE–2nd c. CE", order: 1 },
      { to: "Island Southeast Asia", coords: [0, 110], period: "1st millennium CE", order: 2 },
      { to: "Medieval Europe", coords: [45, 12], period: "12th–15th c. CE", order: 3 },
      { to: "Tropical Americas & Africa", coords: [-3, -60], period: "16th–20th c. CE", order: 4 },
    ],
    maturity: "flagship",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Dried fruit (peppercorns)", cautionParts: "", note: "Culinary spice; piperine gives its pungency." },
    claims: [
      { id: "black-pepper-identity", kind: "identity", statement: "Black pepper is Piper nigrum, family Piperaceae.", sourceIds: ["powo", "ravindran2000"], confidence: "high", review: "pending" },
      { id: "black-pepper-domestication", kind: "domestication", statement: "It was domesticated from wild vines in the Western Ghats of southwest India and cultivated on the Malabar Coast.", sourceIds: ["ravindran2000", "hajibabaei2014"], confidence: "medium", review: "pending" },
      { id: "black-pepper-spread", kind: "spread", statement: "Pepper was the dominant spice of ancient Indian Ocean and Roman trade and of medieval European commerce, and was later planted across the tropics.", sourceIds: ["ravindran2000"], confidence: "medium", review: "pending" },
      { id: "black-pepper-availability", kind: "availability", statement: "Black pepper is the most traded spice in the world; Vietnam, India, Brazil, and Indonesia lead production.", sourceIds: ["faostat", "hajibabaei2014"], confidence: "high", review: "pending" },
    ],
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The English \"pepper\" descends through Latin piper and Greek peperi from the Sanskrit pippali — which, confusingly, named long pepper, a related but different spice that Europe prized before black pepper eclipsed it. The name later travelled sideways onto an unrelated New World plant: when Columbus sought the pepper of the Indies and found the pungent fruits of Capsicum instead, he called them \"peppers\" too, and the borrowed name stuck to chilies forever.",
          "True pepper is Piper nigrum, a tropical woody climbing vine, and the source of black, white, and green peppercorns alike. Its heat is not from capsaicin but from an alkaloid called piperine. Black pepper is the whole unripe berry, briefly cooked and sun-dried until the skin blackens and wrinkles; white pepper is the same berry ripened and hulled; green pepper is the unripe fruit preserved before it can dry.",
        ],
        sourceIds: ["ravindran2000", "dalby2000"],
      },
      {
        heading: "Home in the Western Ghats",
        paragraphs: [
          "Pepper is a child of the monsoon forests of the Western Ghats along India's Malabar Coast — modern Kerala — where the wild vine climbs forest trees in the humid, shaded understorey. It was gathered and then cultivated there in deep antiquity, trained up living trees and posts in exactly the way it still is.",
          "For most of history the Malabar Coast was the world's pepper, and control of that narrow strip of Indian shore shaped the fortunes of traders and empires far beyond it. The vine's specific demands — heat, heavy rain, and something to climb — long kept its cultivation tied to a handful of tropical regions.",
        ],
        sourceIds: ["ravindran2000", "hajibabaei2014"],
      },
      {
        heading: "The spice that moved the ancient world",
        paragraphs: [
          "Pepper was among the most valuable commodities of antiquity. Roman ships rode the monsoon winds from Egypt to the Malabar port of Muziris to load it, and Rome's appetite was vast enough that the naturalist Pliny the Elder grumbled about the fortune in silver draining east to pay for it. Pepper filled Rome's spice warehouses and seasoned the recipes of the Roman cookbook attributed to Apicius.",
          "Its prestige is captured in a famous episode: when the Visigoth king Alaric besieged Rome in 408 CE, the ransom he demanded reportedly included three thousand pounds of pepper alongside the gold and silver. Through the Middle Ages pepper remained so precious in Europe that it was counted out by the corn, used to pay rents and taxes, and traded by a specialist guild of \"pepperers\" — the ancestors, in London, of the Grocers' Company.",
        ],
        sourceIds: ["dalby2000", "kiple2000"],
      },
      {
        heading: "The spice that moved the modern world",
        paragraphs: [
          "The hunger for pepper helped launch the age of European exploration. The overland and Middle Eastern routes were long controlled by Arab and Venetian middlemen, and the dream of reaching the source directly drove the Portuguese around Africa: Vasco da Gama's arrival at Calicut on the Malabar Coast in 1498 opened a sea road to the pepper lands and broke the old monopolies.",
          "What followed was centuries of contest over the spice. The Portuguese, then the Dutch East India Company (VOC) and the English, fought to command pepper production and its trade across India and the Indonesian archipelago. Pepper — more than gold, more than any single luxury — was among the commodities that built the first global trading empires.",
        ],
        sourceIds: ["dalby2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Pepper cultivation long ago spread beyond India to Indonesia, Malaysia, and Madagascar, and across the Atlantic to Brazil. In a historical reversal, the largest producer and exporter today is Vietnam, which became a pepper powerhouse only in recent decades, though India, Brazil, and Indonesia remain major growers.",
          "Still called the \"king of spices,\" black pepper is the most heavily traded spice in the world and a fixture on tables everywhere. The commodity that once ransomed a city and lured fleets around a continent is now so cheap and universal that its extraordinary history is easy to forget.",
        ],
        sourceIds: ["faostat", "dalby2000"],
      },
    ],
  },
  {
    id: "mango",
    name: "Mango",
    scientificName: "Mangifera indica",
    family: "Anacardiaceae",
    category: "fruit",
    glyph: "🥭",
    originCenter: "Indo-Burma",
    originRegion: "NE India & Myanmar",
    origin: [24.5, 92],
    domesticatedBP: 4000,
    domestication:
      "Domesticated in the Indo-Burmese region and cultivated across South Asia for thousands of years, with countless landraces selected for sweet, fibreless flesh.",
    progenitor: "Wild Mangifera indica",
    evidence:
      "A long history in South Asian texts and horticulture, with genetic diversity centred on the Indo-Burma region.",
    availability:
      "The dominant tropical fruit of South Asia and widely grown across the tropics.",
    spread: [
      { to: "Southeast Asia", coords: [10, 105], period: "by ~1,500 BP", order: 1 },
      { to: "East Africa", coords: [-6, 39], period: "~10th c. CE", order: 2 },
      { to: "Tropical Americas", coords: [-12, -40], period: "18th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Ripe fruit", cautionParts: "Skin and sap", note: "The peel and sap contain urushiol-related compounds that can irritate sensitive skin; the flesh is safe." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Mango\" reached English through Portuguese manga, itself borrowed from Tamil and Malayalam words for the fruit on India's southwest coast, where Portuguese traders first met it. The tree is Mangifera indica, and its species name — \"of India\" — reflects the country that domesticated it and remains its heartland.",
          "Surprisingly, the mango belongs to the same family as cashews and poison ivy, and its skin and sap carry urushiol-related compounds that can irritate sensitive skin — though the ripe flesh is one of the world's most beloved fruits, so central to South Asia that it is often called the king of fruits.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "The mango was domesticated in South Asia — the region spanning eastern India, Bangladesh, and Myanmar — where its wild relatives grow in the monsoon forests. It has been cultivated there for several thousand years, and Indian growers long ago learned to graft it, fixing hundreds of named varieties from the fibrous wild fruit into the smooth, aromatic types prized today.",
          "That deep history left the mango woven into Indian culture: it appears in Hindu and Buddhist symbolism, its leaves mark auspicious occasions, and it is the national fruit of India.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "Across the tropics",
        paragraphs: [
          "From India the mango spread with traders and monks into Southeast Asia and, carried by Persian and Arab merchants and then Portuguese ships, on to East Africa, Brazil, and the wider tropics from the sixteenth century onward. Warm, frost-free climates everywhere took it up.",
          "Different regions fixed their own famous cultivars — India's Alphonso and Kesar, Southeast Asia's fragrant types, the fibreless Tommy Atkins and Kent grown for export — each a grafted clone of a single lucky seedling.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The mango is one of the most important fruits of the tropical world, grown across Asia, the Americas, and Africa, with India by far the largest producer and consumer — though much of its crop is eaten at home rather than exported. It is eaten ripe and fresh, dried, juiced, and, when green and unripe, cooked and pickled into chutneys and relishes.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "orange",
    name: "Sweet Orange",
    scientificName: "Citrus × sinensis",
    family: "Rutaceae",
    category: "fruit",
    glyph: "🍊",
    originCenter: "Southern China",
    originRegion: "China & SE Asia",
    origin: [25, 102],
    domesticatedBP: 2500,
    domestication:
      "A cultivated hybrid of pomelo and mandarin, selected in southern China and mainland Southeast Asia.",
    progenitor: "Citrus maxima × Citrus reticulata",
    evidence:
      "Genomic studies identify the sweet orange as an ancient pomelo–mandarin hybrid of East Asian origin.",
    availability:
      "The most produced citrus fruit worldwide; Brazil, China, and the USA lead.",
    spread: [
      { to: "India & Persia", coords: [30, 60], period: "1st millennium CE", order: 1 },
      { to: "Mediterranean Europe", coords: [40, 10], period: "15th c. CE", order: 2 },
      { to: "The Americas", coords: [-15, -47], period: "16th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit (flesh and juice)", cautionParts: "", note: "The peel yields aromatic oils; the flesh is eaten fresh and juiced." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The word \"orange\" travelled the length of Eurasia: from the Sanskrit nāraṅga through Persian and Arabic nāranj to Spanish naranja and onward. The colour is named after the fruit, not the other way round — before oranges reached Europe, English had no single word for that shade. In several languages the sweet orange is still called \"the Portugal fruit,\" after the traders who introduced it.",
          "The sweet orange, Citrus × sinensis, is not a pure wild species at all but a hybrid. Almost all cultivated citrus descends from crosses among a few wild ancestors — mandarin, pomelo, citron, and a wild papeda — and the orange is essentially a mandarin–pomelo cross, refined in China.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "A Chinese fruit comes west",
        paragraphs: [
          "The sweet orange was developed in China and Southeast Asia, where citrus had been cultivated and hybridised for a very long time. Its bitter cousin, the sour orange, reached the Mediterranean earlier, carried by Arab traders through the medieval Islamic world; the sweet orange followed later, spread into Europe by Genoese and especially Portuguese merchants around the sixteenth century.",
          "Prized and delicate, oranges became luxuries of the wealthy, grown in the heated \"orangeries\" of European palaces long before they were everyday fruit.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "Citrus crosses the Atlantic",
        paragraphs: [
          "Spanish and Portuguese voyagers carried citrus to the Americas from the very first crossings, and oranges took hold in the warm zones of the New World, eventually building the great citrus industries of Florida, Brazil, and California. Two mutations shaped the modern fruit: the seedless navel orange, which arose as a single bud mutation in Brazil and is propagated entirely by grafting, and the juice-perfect Valencia.",
          "Because every orange variety is maintained by grafting, a navel orange today is, in effect, a cutting of that one original Brazilian tree — every one a clone.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The orange is the world's most widely grown citrus fruit, with Brazil and the United States long dominating the vast market for orange juice, and China and the Mediterranean supplying much of the fresh fruit. Its high vitamin C once made citrus a cure for the scurvy that plagued sailors.",
          "That global crop now faces a serious threat in citrus greening (Huanglongbing), a bacterial disease spread by an insect that has devastated orchards, above all in Florida, and against which growers and researchers are still struggling.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "onion",
    name: "Onion",
    scientificName: "Allium cepa",
    family: "Amaryllidaceae",
    category: "vegetable",
    glyph: "🧅",
    originCenter: "Central Asia",
    originRegion: "Central Asia",
    origin: [39, 66],
    domesticatedBP: 5000,
    domestication:
      "Domesticated in Central Asia and grown across the ancient Near East and Egypt as a staple vegetable and flavouring.",
    progenitor: "Wild Allium of the A. cepa lineage (exact ancestor uncertain)",
    evidence:
      "Depicted in ancient Egyptian tomb art and recorded throughout Near Eastern antiquity.",
    availability:
      "One of the most widely grown vegetables on Earth.",
    spread: [
      { to: "Near East & Egypt", coords: [30, 31], period: "~4,500 BP", order: 1 },
      { to: "Europe", coords: [47, 9], period: "antiquity", order: 2 },
      { to: "Worldwide", coords: [20, 80], period: "15th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Bulb (and green leaves)", cautionParts: "Toxic to dogs and cats", note: "Alliums are toxic to many pets, though safe for people." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The onion's name comes from the Latin unio — \"a single one,\" or a large pearl — a nod to the single, self-contained bulb the plant makes of its own swollen leaf bases. That bulb is really a compressed underground bud, its concentric layers the reason a sliced onion falls into rings.",
          "It also has a defence that everyone knows: cut the flesh and its enzymes release a volatile sulfur compound that drifts up and stings the eyes to tears. That same sulfur chemistry gives the onion its pungency raw and its deep sweetness when slowly cooked.",
        ],
        sourceIds: ["powo", "zohary2012"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "The onion is one of the oldest cultivated vegetables, but a slightly mysterious one: no wild Allium cepa is known to survive, so its exact wild ancestor and birthplace are uncertain, somewhere in the broad arc of Central and Southwest Asia. It was domesticated deep in prehistory and spread through the ancient Near East before written records.",
          "Its success owed much to practicality. Onions are easy to grow, store for months, and travel well dried, making them a dependable source of flavour and nutrition through winters and long journeys alike.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "A sacred and universal flavouring",
        paragraphs: [
          "In ancient Egypt the onion was both food and symbol; its concentric layers were seen as an image of eternity, onions were placed in tombs and offered to the gods, and workers were fed them. From Mesopotamia and Egypt through Greece and Rome, the onion was a staple seasoning of the common table, and it became a base flavour in cuisines across the entire Old World.",
          "Carried worldwide by Europeans — though the Americas had their own wild onions too — it is now foundational almost everywhere people cook.",
        ],
        sourceIds: ["kiple2000", "zohary2012"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The onion is among the most widely grown vegetables on the planet, led by China and India, and eaten in nearly every cuisine as the quiet foundation of countless dishes — sautéed, caramelised, raw, pickled, or dried. Few foods are so universal and so easy to overlook.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "garlic",
    name: "Garlic",
    scientificName: "Allium sativum",
    family: "Amaryllidaceae",
    category: "vegetable",
    glyph: "🧄",
    originCenter: "Central Asia",
    originRegion: "Central Asia",
    origin: [41, 70],
    domesticatedBP: 5000,
    domestication:
      "Domesticated from wild garlic in Central Asia; propagated clonally, it is effectively sterile in cultivation.",
    progenitor: "Allium longicuspis (wild garlic)",
    evidence:
      "Ancient use across Mesopotamia, Egypt, and East Asia, with clonal landraces spanning Eurasia.",
    availability:
      "A globally ubiquitous culinary aromatic.",
    spread: [
      { to: "Near East & Mediterranean", coords: [34, 35], period: "antiquity", order: 1 },
      { to: "East Asia", coords: [34, 110], period: "antiquity", order: 2 },
      { to: "Worldwide", coords: [20, 80], period: "15th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Bulb (cloves)", cautionParts: "Toxic to dogs and cats", note: "Alliums are toxic to many pets, though safe for people." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Garlic\" comes from the Old English gārlēac — \"spear-leek\" — for the spear-like leaves of this most pungent of the onion tribe. Each bulb is a cluster of cloves, and therein lies a peculiarity: cultivated garlic is effectively sterile, rarely setting viable seed, so it has been propagated for thousands of years by replanting its cloves. Every garlic plant is a clone.",
          "Its ferocity is chemical and deliberately triggered. An intact clove is nearly odourless; only when the flesh is crushed or cut does an enzyme convert a stored compound into allicin, the sharp, biting molecule behind garlic's flavour and much of its reputed medicinal power.",
        ],
        sourceIds: ["powo", "zohary2012"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "Garlic was domesticated in Central Asia from a wild ancestor in the same lineage, and like the onion it spread across the ancient Near East in deep prehistory. Its sterility means it could only have been maintained by deliberate human replanting from the very beginning — a crop wholly dependent on people.",
          "It reached the Mediterranean, India, and China early and became embedded in their cooking and medicine alike.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "Food, medicine & folklore",
        paragraphs: [
          "Garlic has always been more than a flavouring. Egyptian records describe it being fed to the labourers who built the great monuments, and Greek and Roman soldiers and workers ate it for strength; across the world it has been used as a folk medicine against infection — a belief with some real basis, since allicin is genuinely antimicrobial. It also gathered a thick layer of superstition, from warding off the evil eye to repelling vampires.",
          "That double life as seasoning and remedy carried garlic into nearly every cuisine of the Old World.",
        ],
        sourceIds: ["kiple2000", "zohary2012"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Garlic is grown around the world, but production is overwhelmingly dominated by China, which grows the great majority of the global crop. From a sterile Central Asian bulb, tended clove by clove for millennia, it has become one of the most universal and beloved flavours in cooking.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "carrot",
    name: "Carrot",
    scientificName: "Daucus carota",
    family: "Apiaceae",
    category: "vegetable",
    glyph: "🥕",
    originCenter: "Persian Plateau",
    originRegion: "Iran & Central Asia",
    origin: [34, 60],
    domesticatedBP: 1100,
    domestication:
      "The cultivated carrot arose in the Iranian and Central Asian region; orange roots were later selected in Europe from the 16th–17th centuries.",
    progenitor: "Wild carrot (Daucus carota)",
    evidence:
      "Historical records trace purple and yellow carrots to Central Asia, with genomics confirming that origin.",
    availability:
      "A globally common root vegetable.",
    spread: [
      { to: "Near East", coords: [33, 44], period: "~10th c. CE", order: 1 },
      { to: "Europe", coords: [48, 7], period: "12th–16th c. CE", order: 2 },
      { to: "Worldwide", coords: [20, 80], period: "17th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Storage root (and leaves)", cautionParts: "", note: "Roots are eaten raw and cooked; the leaves are also edible." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The carrot is the cultivated form of Daucus carota, whose wild version — the white-rooted, forked, faintly bitter \"Queen Anne's lace\" — still grows as a common wayside weed across the Northern Hemisphere. The edible carrot is that plant's taproot, bred long, straight, sweet, and tender.",
          "Its most famous feature, the bright orange colour, is not original and not universal. Carrots come, and historically came, in purple, yellow, red, and white; the orange carrot is a comparatively recent human creation.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "The carrot was domesticated relatively late, around a thousand years ago, in Central Asia — the region of modern Afghanistan and Persia — where the first cultivated roots were purple and yellow. From there it spread in two directions: eastward into Asia and westward into the Arab world and Mediterranean Europe by the medieval period.",
          "These early carrots were prized as much for their aromatic leaves and seeds as for the root, and selection gradually turned a thin, tough, bitter taproot into a sweet, fleshy vegetable.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "How the carrot turned orange",
        paragraphs: [
          "The familiar orange carrot emerged in Europe, especially the Netherlands, around the sixteenth and seventeenth centuries, selected from yellow forms into a root rich in beta-carotene — the orange pigment the body converts to vitamin A. A popular tale holds that Dutch growers bred it orange to honour the royal House of Orange; it is a charming story but not well supported by evidence.",
          "What is certain is that the orange carrot proved sweet, vividly coloured, and nutritious, and it displaced the older purples and yellows so completely that most people now assume it was always so.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The carrot is one of the world's major vegetables, grown across temperate regions with China the largest producer, eaten raw, cooked, juiced, and grated into everything from salads to cakes. Its reputation as a food for eyesight is real in part — the vitamin A matters — but was famously exaggerated by wartime British propaganda that credited carrots, rather than secret radar, for pilots' night vision.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "cucumber",
    name: "Cucumber",
    scientificName: "Cucumis sativus",
    family: "Cucurbitaceae",
    category: "vegetable",
    glyph: "🥒",
    originCenter: "Indian Subcontinent",
    originRegion: "South Asia",
    origin: [23, 80],
    domesticatedBP: 4000,
    domestication:
      "Domesticated in the Indian subcontinent and later cultivated widely across Asia and the Roman world.",
    progenitor: "Cucumis sativus var. hardwickii",
    evidence:
      "A long cultivation history in South Asia, where wild relatives persist in the Himalayan foothills.",
    availability:
      "A widely grown salad and pickling vegetable worldwide.",
    spread: [
      { to: "Near East & Rome", coords: [37, 25], period: "antiquity", order: 1 },
      { to: "East Asia", coords: [32, 112], period: "1st millennium CE", order: 2 },
      { to: "Europe & the Americas", coords: [45, 5], period: "9th–16th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit", cautionParts: "", note: "Eaten raw and pickled." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The cucumber, Cucumis sativus, is a member of the gourd family, and — like the melon and squash it is related to — its edible part is botanically a fruit, a kind of berry with a firm rind called a pepo, even though it is used as a vegetable. Around ninety-five percent water, it is valued for crispness and cool more than for flavour or nourishment.",
          "Wild and unimproved cucumbers can be intensely bitter from compounds called cucurbitacins; domestication and breeding largely bred that bitterness out, though it can still surface in stressed plants.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "The cucumber was domesticated in South Asia, in the foothills of the Himalayas in India, from a bitter wild relative, and has been cultivated there for several thousand years. From India it travelled westward into Persia, the Near East, and the classical Mediterranean.",
          "It reached Europe in antiquity and was carried by early European voyagers to the Americas, becoming one of the more widely dispersed of the Old World vegetables.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The emperor's greenhouse",
        paragraphs: [
          "The cucumber has a claim to one of the earliest greenhouses in history. The Roman emperor Tiberius was said to be so fond of it that his gardeners grew cucumbers year-round, moving the plants on wheeled beds into the sun and sheltering them under frames glazed with translucent stone — an ingenious forerunner of protected cultivation, devised two thousand years ago to satisfy a single ruler's daily craving.",
          "Through the Middle Ages and beyond the cucumber remained a staple of gardens across Europe and Asia, eaten fresh and, crucially, pickled for keeping.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Cucumbers are grown worldwide, in open fields and in vast greenhouses, with China producing by far the most. The crop leads a double life: eaten fresh in salads as the slicing cucumber, and grown as small \"gherkin\" types destined for the pickle jar — one of humanity's oldest ways of preserving a vegetable.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "ginger",
    name: "Ginger",
    scientificName: "Zingiber officinale",
    family: "Zingiberaceae",
    category: "spice",
    glyph: "🫚",
    originCenter: "Maritime Southeast Asia",
    originRegion: "Island SE Asia",
    origin: [3, 110],
    domesticatedBP: 5000,
    domestication:
      "An ancient cultigen unknown in the wild, domesticated in Maritime Southeast Asia and dispersed by early Austronesian and Indian Ocean trade.",
    progenitor: "Unknown wild Zingiber (no wild populations known)",
    evidence:
      "The absence of wild forms and early records across South and East Asia indicate very deep cultivation.",
    availability:
      "A globally important culinary and medicinal rhizome.",
    spread: [
      { to: "South Asia", coords: [20, 78], period: "antiquity", order: 1 },
      { to: "China", coords: [28, 112], period: "antiquity", order: 2 },
      { to: "Mediterranean & Europe", coords: [40, 15], period: "Roman–medieval", order: 3 },
      { to: "The Americas", coords: [15, -75], period: "16th c. CE", order: 4 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Rhizome", cautionParts: "", note: "Used fresh, dried, and ground." },
  },
  {
    id: "turmeric",
    name: "Turmeric",
    scientificName: "Curcuma longa",
    family: "Zingiberaceae",
    category: "spice",
    glyph: "🟡",
    originCenter: "Indian Subcontinent",
    originRegion: "South Asia",
    origin: [20, 78],
    domesticatedBP: 4000,
    domestication:
      "A sterile triploid cultigen domesticated in South Asia and propagated clonally for its vivid orange rhizome.",
    progenitor: "Derived from wild Curcuma (the C. aromatica complex)",
    evidence:
      "Deep culinary, dye, and ritual use across South Asia, with no truly wild form known.",
    availability:
      "The principal source of culinary turmeric and curcumin worldwide.",
    spread: [
      { to: "Southeast Asia", coords: [10, 105], period: "antiquity", order: 1 },
      { to: "East Asia", coords: [26, 112], period: "1st millennium CE", order: 2 },
      { to: "Africa & beyond", coords: [5, 35], period: "medieval", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Rhizome", cautionParts: "", note: "Used fresh and as a dried powder; also a natural dye." },
  },
  {
    id: "cinnamon",
    name: "Cinnamon",
    scientificName: "Cinnamomum verum",
    family: "Lauraceae",
    category: "spice",
    glyph: "🟤",
    originCenter: "Sri Lanka",
    originRegion: "Sri Lanka & S India",
    origin: [7.5, 80.7],
    domesticatedBP: 3000,
    domestication:
      "True cinnamon is the inner bark of a Sri Lankan tree, cultivated on the island and traded across the Indian Ocean since antiquity.",
    progenitor: "Wild Cinnamomum verum",
    evidence:
      "Cinnamon appears in ancient Egyptian and classical trade records; Sri Lanka remains the centre of cultivation.",
    availability:
      "Ceylon cinnamon and related cassia species supply the global spice trade.",
    spread: [
      { to: "Indian Ocean trade", coords: [12, 50], period: "antiquity", order: 1 },
      { to: "Mediterranean", coords: [32, 31], period: "antiquity", order: 2 },
      { to: "Colonial plantations", coords: [3, 105], period: "16th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Inner bark", cautionParts: "", note: "Ceylon cinnamon; cassia is a related, coumarin-richer substitute." },
  },
  {
    id: "avocado",
    name: "Avocado",
    scientificName: "Persea americana",
    family: "Lauraceae",
    category: "fruit",
    glyph: "🥑",
    originCenter: "South-Central Mexico",
    originRegion: "Mesoamerica",
    origin: [18, -97],
    domesticatedBP: 7000,
    domestication:
      "Domesticated in Mesoamerica, with distinct Mexican, Guatemalan, and West Indian races selected over millennia.",
    progenitor: "Wild Persea americana",
    evidence:
      "Avocado remains in Mexican caves record use back around 10,000 years, with domestication over the following millennia.",
    availability:
      "A globally traded fruit; Mexico is the leading producer.",
    spread: [
      { to: "Central & South America", coords: [5, -75], period: "pre-Columbian", order: 1 },
      { to: "Caribbean", coords: [18, -70], period: "pre-Columbian–16th c.", order: 2 },
      { to: "Worldwide subtropics", coords: [-30, 140], period: "19th–20th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit flesh", cautionParts: "Leaves and pit", note: "Foliage and the seed contain persin, which is toxic to some animals; the flesh is safe for people." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Avocado\" is a softened Spanish rendering of the Nahuatl āhuacatl; English speakers who found even aguacate awkward once called it the \"alligator pear,\" for its bumpy skin and shape. The plant, Persea americana, is a member of the laurel family, and its fruit is a large berry with a single enormous seed and flesh that is unusually rich in oil rather than sugar.",
          "That high fat content sets the avocado apart from almost every other fruit and underlies both its buttery texture and its modern popularity as a savoury food rather than a sweet one.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "A fruit built for vanished giants",
        paragraphs: [
          "The avocado poses an evolutionary riddle: why grow a fruit around a seed too big for any living animal to swallow and disperse? The likely answer is that the avocado evolved for animals that no longer exist — the giant ground sloths and other megafauna of the Americas, which could gulp the fruit whole and carry the seed away. When they went extinct, the avocado was left an \"evolutionary anachronism,\" a fruit whose natural gardeners had vanished.",
          "It survived because humans stepped into the megafauna's role, and had likely been doing so for thousands of years by the time it was domesticated.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "Domestication & the Hass tree",
        paragraphs: [
          "The avocado was domesticated in south-central Mexico and Central America, where three distinct races — Mexican, Guatemalan, and West Indian — were cultivated for several thousand years. Spanish colonists spread it, but its global rise is a twentieth-century story.",
          "Nearly every avocado in world trade today is a single variety, the Hass, and every Hass tree traces to one seedling grown by a mail carrier named Rudolph Hass in California in the 1920s. He patented it in 1935; because avocados are propagated by grafting, the billions of Hass avocados sold since are all clones of that one original tree, which stood until the early 2000s.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Once a regional fruit, the avocado has become a global commodity on the back of a remarkable boom in demand, with Mexico as the dominant producer. That success has a cost: the crop is thirsty, its expansion has driven deforestation and water stress in growing regions, and in parts of Mexico its value has drawn organised crime — hard modern questions attached to a fruit once dispersed by ground sloths.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "watermelon",
    name: "Watermelon",
    scientificName: "Citrullus lanatus",
    family: "Cucurbitaceae",
    category: "fruit",
    glyph: "🍉",
    originCenter: "Northeast Africa",
    originRegion: "Sudan / NE Africa",
    origin: [13, 30],
    domesticatedBP: 4300,
    domestication:
      "Domesticated in northeastern Africa, where sweet, red-fleshed forms were selected from a pale, bitter-fleshed ancestor.",
    progenitor: "Wild Citrullus (Kordofan melon lineage)",
    evidence:
      "Seeds and tomb paintings in ancient Egypt, plus genomics pointing to a Sudanese ancestor.",
    availability:
      "A major summer fruit across warm regions worldwide.",
    spread: [
      { to: "Nile Valley & Near East", coords: [27, 31], period: "~4,000 BP", order: 1 },
      { to: "Mediterranean & Asia", coords: [35, 45], period: "antiquity–medieval", order: 2 },
      { to: "The Americas", coords: [30, -90], period: "16th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit (flesh, seeds, and rind)", cautionParts: "", note: "The flesh, seeds, and rind are all edible." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The watermelon wears its nature in its name: Citrullus lanatus is a fruit that is roughly ninety percent water, a sweet, cool reservoir on a vine. It belongs to the gourd family alongside cucumbers, melons, and squashes, and — like them — is technically a kind of berry with a hard rind, a pepo.",
          "Every part is usable: the familiar red flesh, the seeds (roasted and eaten across Africa, the Middle East, and Asia), and even the rind, pickled or cooked. But the sweet, deep-red flesh we take for granted is itself a product of long human selection.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "An African origin",
        paragraphs: [
          "The watermelon is an African fruit. Its domestication centred on northeastern Africa, and genetic work points to a wild relative from the Kordofan region of Sudan — a non-bitter, pale-fleshed melon — as the closest ancestor of the cultivated crop, rather than the bitter desert gourds once assumed.",
          "Wild and early melons were watery but pale, hard, and often bitter; generations of selection turned them sweet, tender, and red. The fruit's original value in dry country may have been as much its water as its taste — a living canteen that could be stored for weeks.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "From the Nile to the world",
        paragraphs: [
          "Watermelons were grown in ancient Egypt, where seeds and paintings survive and fruits were even placed in tombs as provisions for the afterlife — a sign the sweet, storable types were already valued more than four thousand years ago. From the Nile the crop spread through the Mediterranean and the Near East.",
          "It travelled east to India and China — where it is now grown and eaten more than anywhere else — and moved into Europe, while the Atlantic slave trade carried African watermelon knowledge and seed to the Americas.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The watermelon is one of the most widely grown fruits on Earth, a fixture of hot-weather eating across every warm continent, with China producing and consuming by far the most. Modern breeding has added seedless (triploid) types and a rainbow of flesh colours, but the appeal is unchanged since the Nile: cold, sweet water in a rind.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "date-palm",
    name: "Date Palm",
    scientificName: "Phoenix dactylifera",
    family: "Arecaceae",
    category: "fruit",
    glyph: "🌴",
    originCenter: "Persian Gulf & Mesopotamia",
    originRegion: "Arabia & Mesopotamia",
    origin: [29, 49],
    domesticatedBP: 7000,
    domestication:
      "Domesticated around the Persian Gulf and Mesopotamia, the date palm has sustained desert oasis agriculture for millennia.",
    progenitor: "Wild Phoenix dactylifera and relatives",
    evidence:
      "Date stones and cuneiform records document early Mesopotamian and Arabian cultivation.",
    availability:
      "A staple fruit of North Africa and the Middle East, and widely exported.",
    spread: [
      { to: "North Africa", coords: [30, 10], period: "antiquity", order: 1 },
      { to: "South Asia", coords: [25, 68], period: "antiquity", order: 2 },
      { to: "New World deserts", coords: [33, -115], period: "18th–20th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit", cautionParts: "", note: "Eaten fresh and dried; very high in sugars." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The date takes its English name from the Greek daktylos, \"finger,\" for the shape of the fruit, while its botanical name Phoenix dactylifera again nods to the Phoenicians who traded it. It is the fruit of a tall desert palm, borne in enormous hanging clusters that a single tree can yield for a century.",
          "Dates are among the sweetest of all fruits, and when dried they become almost pure, storable sugar — a concentrated, transportable energy source that could sustain people and caravans across the driest places on Earth. In the desert, the date palm was less a fruit tree than the foundation of life.",
        ],
        sourceIds: ["powo", "zohary2012"],
      },
      {
        heading: "Domestication in the desert",
        paragraphs: [
          "The date palm was domesticated around the head of the Persian Gulf and across Mesopotamia, Arabia, and North Africa some 7,000 years ago — one of the oldest fruit crops of the Old World. It is dioecious, with separate male and female trees, so growers learned very early to hand-pollinate, dusting the female flowers with pollen from selected males, a practice depicted in ancient Mesopotamian and Egyptian art.",
          "Choice trees were then cloned from offshoots at the base of the trunk, fixing named varieties that have been grown for thousands of years. This mastery of pollination and propagation is some of humanity's earliest sophisticated horticulture.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "The tree of the oasis",
        paragraphs: [
          "The date palm made oasis civilisation possible. Its high canopy shaded the crops beneath it, its fruit fed people and animals, and its trunks and fronds built and roofed their homes and wove their baskets and ropes — every part put to use. It stands at the centre of Mesopotamian, ancient Egyptian, and Arabian life and scripture, a recurring emblem of sustenance and paradise.",
          "Along desert trade routes the date was the traveller's ration, and the palm groves of oases were wealth worth fighting for.",
        ],
        sourceIds: ["zohary2012", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Date growing remains centred on its ancient homeland — Egypt, Saudi Arabia, Iran, and the wider Middle East and North Africa are the leading producers — with newer industries in California's Coachella Valley, built in the twentieth century from Middle Eastern offshoots. Eaten fresh or dried, pressed into syrup, or fermented, the date is still the sweetness of the desert.",
        ],
        sourceIds: ["faostat", "sauer1993"],
      },
    ],
  },
  {
    id: "lemon",
    name: "Lemon",
    scientificName: "Citrus limon",
    family: "Rutaceae",
    category: "fruit",
    glyph: "🍋",
    originCenter: "Northeast India & Myanmar",
    originRegion: "S / SE Asia",
    origin: [27, 95],
    domesticatedBP: 2500,
    domestication:
      "A cultivated hybrid that arose in the region where South Asia meets Southeast Asia.",
    progenitor: "Citrus medica × Citrus × aurantium (hybrid)",
    evidence:
      "Genomic studies place the lemon as a citron-based hybrid of Asian origin.",
    availability:
      "A globally grown acid citrus for juice, zest, and flavouring.",
    spread: [
      { to: "Near East & Mediterranean", coords: [33, 35], period: "1st millennium CE", order: 1 },
      { to: "Europe", coords: [40, 12], period: "12th–15th c. CE", order: 2 },
      { to: "The Americas", coords: [25, -100], period: "16th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit (juice and zest)", cautionParts: "", note: "Peel oils and juice are widely used; the fruit is very acidic." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Lemon\" comes through Arabic and Persian līmūn, a general word for citrus that European languages narrowed to this one sharp yellow fruit. Like the orange, the lemon (Citrus × limon) is a hybrid rather than a wild species — a cross between the bitter orange and the citron, one of citrus's ancient founding species.",
          "Its defining quality is acidity: a lemon is too sour to eat like other fruit, and its value lies in juice and aromatic peel that brighten food, preserve it, and clean and scent the home. It also happens to bear fruit through much of the year, an unusually generous habit.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & westward spread",
        paragraphs: [
          "The lemon arose in the citrus homelands of northeastern India, Myanmar, and China, and moved west through Persia to the Mediterranean. Arab agriculture spread it across the medieval Islamic world and into Spain and Sicily by around the tenth to twelfth centuries, at first as much an ornamental and medicinal curiosity as a food.",
          "By the Renaissance the lemon was established in Mediterranean gardens and kitchens, and Spanish and Portuguese voyagers — including Columbus — carried citrus seeds to the Americas, where lemons and limes spread through the warm New World.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The sailor's fruit",
        paragraphs: [
          "The lemon's most famous role was medical. Scurvy — caused by vitamin C deficiency — killed more sailors on long voyages than storms or battle, and by the eighteenth century the British navy had learned that lemons and limes prevented it. Issuing citrus juice to crews transformed sea power, and left a lasting nickname: British sailors became \"limeys.\"",
          "Neither the sailors nor their surgeons knew why it worked — vitamin C would not be identified for another century and a half — but the humble lemon quietly reshaped the reach of empires.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Lemons and their close relative the lime are grown across the warm temperate and tropical world, with India, Mexico, and the Mediterranean among the leading producers. Indispensable in cooking, drinks, preserves, and cleaning, the fruit is a year-round kitchen staple far from the Himalayan foothills where its parentage began.",
        ],
        sourceIds: ["faostat", "powo"],
      },
    ],
  },
  {
    id: "fig",
    name: "Fig",
    scientificName: "Ficus carica",
    family: "Moraceae",
    category: "fruit",
    glyph: "🟣",
    originCenter: "Jordan Valley & Near East",
    originRegion: "Levant",
    origin: [32, 35],
    domesticatedBP: 11000,
    domestication:
      "Among the earliest domesticated plants; seedless (parthenocarpic) figs appear in the Jordan Valley around 11,000 years ago.",
    progenitor: "Wild Ficus carica",
    evidence:
      "Preserved figs at early Neolithic Jordan Valley sites predate cereal domestication.",
    availability:
      "A classic Mediterranean fruit, eaten fresh and dried worldwide.",
    spread: [
      { to: "Mediterranean", coords: [38, 20], period: "antiquity", order: 1 },
      { to: "Europe & North Africa", coords: [42, 5], period: "antiquity–medieval", order: 2 },
      { to: "The Americas & beyond", coords: [34, -118], period: "16th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit (syconium)", cautionParts: "Milky latex", note: "The plant's latex can irritate skin; ripe fruit is safe." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "The fig is Ficus carica, and its \"fruit\" is one of nature's great illusions. What we eat is a syconium — a fleshy, hollow receptacle lined on the inside with hundreds of tiny flowers turned outside-in. Botanically the fig is not a single fruit but an entire inflorescence enclosing itself, which is why a ripe fig is full of soft, crunchy \"seeds.\"",
          "This strange architecture depends, in the wild, on an equally strange partnership: fig trees and fig wasps are locked in an obligate mutualism, each unable to reproduce without the other, the wasp entering the closed fig to pollinate it. The common eating figs of the orchard sidestep all this — they are parthenocarpic, ripening sweet fruit without any wasp or pollination at all.",
        ],
        sourceIds: ["powo", "zohary2012"],
      },
      {
        heading: "Perhaps the first domesticated tree",
        paragraphs: [
          "The fig may be the oldest domesticated fruit tree known. At an early Neolithic site in the Jordan Valley, archaeologists found preserved figs of a parthenocarpic type — figs that cannot reproduce on their own and must be propagated by human cuttings — dating back roughly 11,400 years, older than the first domesticated cereals at the same sites.",
          "That makes the fig a candidate for the very first plant humans deliberately propagated, snapping off and replanting branches of a favoured, seedless tree long before agriculture as we usually picture it had begun.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "Fruit of the ancient world",
        paragraphs: [
          "Fresh and, above all, dried, figs were a staple sweet and a portable, storable food across the ancient Near East and Mediterranean. They thread through its cultures and scriptures — the fig leaf of Eden, the barren fig tree of parable, the fig trees under which philosophers and prophets sat — and were prized by Greeks and Romans alike.",
          "The tree spread with Mediterranean civilisation and later with European empire to the Americas and beyond, though its heart remained the hot, dry lands where it was first tamed.",
        ],
        sourceIds: ["zohary2012", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Figs are grown around the Mediterranean and in similar climates worldwide, eaten fresh where they can be picked ripe and, more widely, sold dried — a form in which they keep for months and travel well. Türkiye is the leading producer, heir to one of the world's oldest fruit traditions.",
        ],
        sourceIds: ["faostat", "sauer1993"],
      },
    ],
  },
  {
    id: "pomegranate",
    name: "Pomegranate",
    scientificName: "Punica granatum",
    family: "Lythraceae",
    category: "fruit",
    glyph: "🔴",
    originCenter: "Iran & Central Asia",
    originRegion: "Iran / Central Asia",
    origin: [35, 52],
    domesticatedBP: 5000,
    domestication:
      "Domesticated in the Iranian–Central Asian region and cultivated across the ancient Near East and Mediterranean.",
    progenitor: "Wild Punica granatum",
    evidence:
      "Pomegranate remains and imagery appear across Bronze Age Near Eastern and Mediterranean sites.",
    availability:
      "Grown across warm-temperate regions for fresh fruit and juice.",
    spread: [
      { to: "Near East & Egypt", coords: [31, 31], period: "antiquity", order: 1 },
      { to: "Mediterranean", coords: [38, 15], period: "antiquity", order: 2 },
      { to: "South Asia & beyond", coords: [28, 73], period: "antiquity–medieval", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Seeds and arils", cautionParts: "", note: "The juicy arils are eaten; the rind and bark are not foods." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Pomegranate\" means, literally, \"seeded apple\" — from the Latin pomum granatum — a fair description of a leathery globe packed with hundreds of juicy, jewel-like arils, each wrapped around a seed. Its botanical name, Punica granatum, carries a second history: Punica points to the Phoenicians (the Punic people), through whom Rome first knew the fruit.",
          "Unusually, the pomegranate is eaten seed and all — the sweet-tart aril is the edible part, and the whole crimson interior is the point of the fruit. Its thick rind lets it store and travel remarkably well, a trait that helped carry it across the ancient world.",
        ],
        sourceIds: ["powo", "zohary2012"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "The pomegranate was domesticated in the arid belt running from Iran and the Caucasus through Central Asia to northern India, and was already an established crop by the Bronze Age. Remains and depictions appear across the ancient Near East, in Mesopotamia, and in Egypt, where the fruit was placed in tombs.",
          "Like the olive, fig, and grape, it was one of the classic long-lived orchard and garden plants of the Old World's dry lands, propagated from cuttings and prized as much for beauty as for food.",
        ],
        sourceIds: ["zohary2012", "sauer1993"],
      },
      {
        heading: "A fruit heavy with meaning",
        paragraphs: [
          "Few foods carry such a load of symbolism, nearly always of fertility, abundance, and life-and-death. In Greek myth it is the pomegranate that binds Persephone to the underworld for part of each year, giving the world its seasons. Jewish tradition links its many seeds to the commandments; it recurs in Islamic and Zoroastrian imagery and in Christian art as a sign of resurrection.",
          "The city of Granada and the French word for the grenade both echo the fruit's clustered, seed-packed form — the pomegranate's shape lodged deep in language.",
        ],
        sourceIds: ["kiple2000", "zohary2012"],
      },
      {
        heading: "Spread & the crop today",
        paragraphs: [
          "Carried west across the Mediterranean and east along the Silk Road to China, and later by the Spanish to the Americas, the pomegranate settled into warm, dry regions everywhere. Iran and India remain major growers, alongside the Mediterranean and, more recently, California.",
          "In the twenty-first century the fruit had a second life as pomegranate juice, marketed hard for its antioxidant content — an ancient symbol of health repackaged for the modern wellness market.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "pineapple",
    name: "Pineapple",
    scientificName: "Ananas comosus",
    family: "Bromeliaceae",
    category: "fruit",
    glyph: "🍍",
    originCenter: "Paraná–Paraguay Basin",
    originRegion: "S. Brazil / Paraguay",
    origin: [-24, -56],
    domesticatedBP: 6000,
    domestication:
      "Domesticated by Indigenous peoples of tropical South America and carried across the Caribbean before European contact.",
    progenitor: "Wild Ananas relatives",
    evidence:
      "Widespread Indigenous cultivation was recorded at contact; origin traces to the Paraná–Paraguay region.",
    availability:
      "A major tropical fruit; Costa Rica, the Philippines, and Brazil lead production.",
    spread: [
      { to: "Caribbean & Mesoamerica", coords: [12, -70], period: "pre-Columbian", order: 1 },
      { to: "Europe (hothouses)", coords: [51, 0], period: "16th–18th c. CE", order: 2 },
      { to: "Tropical Asia & Africa", coords: [7, 120], period: "16th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit", cautionParts: "Unripe fruit and stem enzymes", note: "Unripe fruit and bromelain can irritate the mouth; ripe fruit is safe." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "Europeans called it \"pine-apple\" because it looked like a pine cone; most other languages use ananas, from the Tupi–Guaraní nanas, said to mean \"excellent fruit.\" Its botanical name, Ananas comosus, keeps that Indigenous word. The plant is a bromeliad, a relative of the spiky air plants, and what looks like one fruit is actually dozens of small fruits fused around a central core — a multiple fruit.",
          "The pineapple carries bromelain, a protein-digesting enzyme so active that eating a lot of raw fruit can leave the mouth tingling, and that makes green pineapple a traditional meat tenderiser. Because good cultivars are seedless, the plant is grown from crowns and offshoots — clones of the parent.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "A South American fruit",
        paragraphs: [
          "The pineapple was domesticated by Indigenous peoples of South America, in the region of the Paraná–Paraguay river basins and southern Brazil, and long before Europeans arrived it had been carried by Native cultivators across tropical South and Central America and into the Caribbean.",
          "By the time Columbus reached Guadeloupe in 1493 and became the first European to record the fruit, the pineapple was already a well-travelled, fully domesticated crop of the American tropics.",
        ],
        sourceIds: ["sauer1993", "powo"],
      },
      {
        heading: "The fruit of kings",
        paragraphs: [
          "Europe was captivated. Sweet, dramatic, and almost impossible to ship before it rotted, the pineapple became a symbol of wealth and hospitality; the rich competed to grow single fruits in heated glass \"pineries,\" a feat that could take years and cost a fortune, so that a pineapple on the table announced status more than appetite. Its crowned silhouette still tops gateposts and decorates architecture as an emblem of welcome.",
          "Spanish and Portuguese ships spread the hardy, easily transported crop across the tropics — to Africa, India, Southeast Asia, and the Pacific — far faster than the fragile fruit itself could travel.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Twentieth-century canning, famously centred on Hawaii, turned the pineapple from a rare luxury into an everyday fruit, and improved shipping later restored the fresh fruit to markets worldwide. Today Costa Rica, the Philippines, and other tropical nations lead a large global trade in fresh pineapples, juice, and canned fruit — the one-time fruit of kings now stacked on every supermarket shelf.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "papaya",
    name: "Papaya",
    scientificName: "Carica papaya",
    family: "Caricaceae",
    category: "fruit",
    glyph: "🍈",
    originCenter: "Mesoamerica",
    originRegion: "Central America / S Mexico",
    origin: [17, -91],
    domesticatedBP: 4000,
    domestication:
      "Domesticated in lowland Mesoamerica and spread rapidly through the tropics after European contact.",
    progenitor: "Wild Carica papaya",
    evidence:
      "Early Mesoamerican cultivation, with genetic diversity centred on Central America.",
    availability:
      "A ubiquitous tropical fruit and the source of the enzyme papain.",
    spread: [
      { to: "Caribbean", coords: [18, -70], period: "pre-Columbian–16th c.", order: 1 },
      { to: "SE Asia & Pacific", coords: [5, 120], period: "16th–17th c. CE", order: 2 },
      { to: "Tropical Africa", coords: [0, 20], period: "16th–18th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Ripe fruit", cautionParts: "Unripe fruit and latex", note: "Unripe-fruit latex can irritate and is traditionally avoided in pregnancy; ripe fruit is safe." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Papaya\" comes from a Carib or Arawak word of the Caribbean, picked up by the Spanish and spread worldwide — though in parts of the tropics it is the \"pawpaw\" or, in southern Africa and Australia, the \"papaw.\" The plant, Carica papaya, is not really a tree but a fast-growing giant herb with a soft, hollow stem, able to fruit within a year of sprouting and rarely living long.",
          "Its most remarkable substance is papain, an enzyme in the milky latex of the unripe fruit and stem that breaks down protein. It is extracted as a meat tenderiser and used in traditional medicine, and it is why green papaya is treated with more caution than the sweet, harmless ripe flesh.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & rapid spread",
        paragraphs: [
          "The papaya was domesticated in the lowland tropics of southern Mexico and Central America. After 1492 it proved one of the fastest-travelling of all American crops: Spanish and Portuguese ships carried it to the Caribbean, then across the Pacific to the Philippines on the Manila galleons, and on into India, Southeast Asia, and Africa, all within little more than a century.",
          "Its speed of spread owed everything to its biology — quick to grow, quick to fruit, and easy to raise from seed — so that a plant unknown outside the Americas in 1500 was a tropical dooryard staple around the world by 1700.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "Two fruits in one plant",
        paragraphs: [
          "The papaya leads a double culinary life. Ripe, it is a soft, sweet, orange-fleshed breakfast fruit. Unripe and green, it is treated as a vegetable — shredded raw into the fiery Southeast Asian salad som tam, or cooked in curries and stews across the tropics — its enzymes also serving to tenderise tough meat.",
          "Most papaya plants are dioecious or of mixed sex, which historically made reliable orchards a challenge, and selecting dependable, self-fruiting types has been part of the crop's improvement.",
        ],
        sourceIds: ["kiple2000", "powo"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The papaya is grown throughout the tropics, with India the largest producer by far, and it is a case study in modern crop science: when ringspot virus threatened to wipe out Hawaii's papaya industry in the 1990s, a genetically engineered virus-resistant papaya was developed that rescued the crop — one of the first successful transgenic fruit and still one of the most cited.",
        ],
        sourceIds: ["faostat", "sauer1993"],
      },
    ],
  },
  {
    id: "eggplant",
    name: "Eggplant",
    scientificName: "Solanum melongena",
    family: "Solanaceae",
    category: "vegetable",
    glyph: "🍆",
    originCenter: "South & Southeast Asia",
    originRegion: "India / SE Asia",
    origin: [22, 80],
    domesticatedBP: 2500,
    domestication:
      "Domesticated in the South and Southeast Asian region from a spiny wild ancestor.",
    progenitor: "Solanum insanum (wild ancestor)",
    evidence:
      "Early records in South Asia and China, with genetic diversity centred on tropical Asia.",
    availability:
      "A widely grown vegetable across Asia, the Mediterranean, and beyond.",
    spread: [
      { to: "East Asia", coords: [30, 112], period: "1st millennium CE", order: 1 },
      { to: "Near East & Mediterranean", coords: [34, 35], period: "medieval", order: 2 },
      { to: "Europe & the Americas", coords: [42, 5], period: "15th–17th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Fruit (cooked)", cautionParts: "Foliage (glycoalkaloids)", note: "Like other nightshades the leaves contain glycoalkaloids; the cooked fruit is eaten." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "This one plant carries three different names across the English-speaking world, each a clue to its history. \"Eggplant\" recalls the small, white, egg-shaped fruits of some early cultivars; \"aubergine\" traces through French, Catalan, and Arabic al-bāḏinjān back to Persian and Sanskrit roots; and \"brinjal,\" used in South Asia and Africa, comes from the same source down another branch. The plant is Solanum melongena, a nightshade and thus a cousin of the tomato, potato, and chili.",
          "Despite the archetype of a glossy purple teardrop, eggplants come in white, green, striped, orange, and every shape from tiny peas to long fingers — a diversity that reflects a long domestication in Asia.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & domestication",
        paragraphs: [
          "The eggplant is one of the few major vegetables of Old World tropical origin, domesticated in South and Southeast Asia — across India, Myanmar, and China — from wild, often spiny and bitter Solanum relatives. It has been cultivated and diversified there for well over a thousand years, which is why Asia holds the crop's greatest variety.",
          "From its Asian heartland the eggplant moved west through the medieval Islamic world, spread by Arab agriculture into the Mediterranean.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "A nightshade under suspicion",
        paragraphs: [
          "Medieval and early-modern Europeans met the eggplant with unease. As an obvious member of the nightshade family — many of whose wild relatives are poisonous — it was treated warily, and one old name, mala insana or \"mad apple,\" reflected a belief that eating it could cause madness. For a time it was grown more as a curiosity than a food north of the Mediterranean.",
          "Southern Europe and the Islamic world had no such qualms, folding the eggplant into rich culinary traditions, and it eventually won acceptance across the continent and, with European expansion, around the world.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The eggplant is a staple vegetable across Asia, the Mediterranean, and beyond, with China and India together growing the overwhelming majority of the world's crop. Its dense, spongy flesh soaks up oil and flavour, making it central to dishes from baba ghanoush and moussaka to countless curries and stir-fries.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "cabbage",
    name: "Cabbage",
    scientificName: "Brassica oleracea",
    family: "Brassicaceae",
    category: "vegetable",
    glyph: "🥬",
    originCenter: "Coastal Western Europe",
    originRegion: "W Europe / Mediterranean",
    origin: [43, 7],
    domesticatedBP: 2500,
    domestication:
      "A single wild species domesticated in coastal Europe into cabbage, kale, broccoli, cauliflower, and more.",
    progenitor: "Wild cabbage (Brassica oleracea)",
    evidence:
      "Classical Greek and Roman sources describe both leafy and heading forms.",
    availability:
      "Its many cultivar groups are staples of temperate agriculture worldwide.",
    spread: [
      { to: "Mediterranean & Europe", coords: [45, 10], period: "antiquity", order: 1 },
      { to: "Asia", coords: [35, 110], period: "medieval–modern", order: 2 },
      { to: "The Americas", coords: [40, -80], period: "16th–18th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Leaves (and other cultivar parts)", cautionParts: "", note: "Eaten raw, cooked, and fermented." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Cabbage\" comes through Old French from the Latin caput, \"head,\" for the tight ball of leaves it forms. But the head cabbage is only one face of an astonishing plant: Brassica oleracea is a single species that human selection has sculpted into an entire vegetable aisle. Cabbage, kale, broccoli, cauliflower, Brussels sprouts, kohlrabi, and collards are all the same species — each one the result of breeding a different part of the plant to extremes.",
          "Grow the terminal bud into a dense head and you have cabbage; the leaves alone, kale and collards; the side buds, Brussels sprouts; the flower clusters, broccoli and cauliflower; the swollen stem, kohlrabi. It is the textbook example of artificial selection, cited by Darwin himself.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "From sea cliff to garden",
        paragraphs: [
          "The wild ancestor is a tough, leafy \"sea cabbage\" that still clings to the coastal cliffs of the Atlantic and Mediterranean shores of Europe. Domestication began around the Mediterranean, where the Greeks and Romans grew loose, leafy kale-like forms and valued them as food and medicine.",
          "The tightly headed cabbage we picture came later, developed in medieval Europe, while other lineages diverged elsewhere — cauliflower and sprouting broccoli refined in Italy, Brussels sprouts around the Low Countries — each region shaping the same pliant species to its own taste.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "Kraut, keeping & the sea",
        paragraphs: [
          "Cabbage's great practical virtue is that it keeps. Whole heads store through winter, and shredded cabbage fermented in salt becomes sauerkraut, which lasts for months and — crucially — retains vitamin C. That made fermented cabbage a lifesaver at sea: long voyages that once lost crews to scurvy could be protected by a barrel of kraut, a link famously exploited on Captain Cook's Pacific expeditions.",
          "Cheap, hardy, and nourishing, cabbage became a backbone of poorer diets across Europe and Asia, and fermented cabbage dishes remain central from German kraut to the wider family of pickled-vegetable traditions.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Cabbages and their kin are grown throughout the temperate world and increasingly beyond it, with China, India, and Russia among the largest producers. As a group, the Brassica oleracea vegetables are nutritional powerhouses and one of the clearest living demonstrations of how far selective breeding can push a single wild plant.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "lettuce",
    name: "Lettuce",
    scientificName: "Lactuca sativa",
    family: "Asteraceae",
    category: "vegetable",
    glyph: "🥗",
    originCenter: "Nile Valley & Near East",
    originRegion: "Egypt / Near East",
    origin: [30, 31],
    domesticatedBP: 5000,
    domestication:
      "Domesticated from a wild relative in the Near East, first for its oil-rich seeds and later for its leaves.",
    progenitor: "Prickly lettuce (Lactuca serriola)",
    evidence:
      "Depicted in ancient Egyptian art and recorded across the classical Mediterranean.",
    availability:
      "The world's most important salad leaf.",
    spread: [
      { to: "Mediterranean & Europe", coords: [41, 12], period: "antiquity", order: 1 },
      { to: "Asia", coords: [34, 110], period: "1st millennium CE", order: 2 },
      { to: "The Americas", coords: [39, -90], period: "16th–18th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Leaves", cautionParts: "", note: "Eaten raw; wild relatives are bitter and not cultivated for food." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Lettuce\" comes from the Latin lactuca, from lac, \"milk,\" for the bitter white latex that seeps from a cut stem — a defence the plant inherited from its wild ancestor. That ancestor is prickly lettuce, Lactuca serriola, a bitter, spiny roadside weed; the crop is what happens when you breed the bitterness and prickles out and the tender leaf up.",
          "Lettuce is grown for its leaves, is mostly water, and is one of the few major vegetables eaten almost entirely raw — a delicate salad plant selected out of an unpromising weed.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & the sacred Egyptian plant",
        paragraphs: [
          "Lettuce was domesticated in the eastern Mediterranean and Near East, and ancient Egypt gives us its earliest clear story. There, tall lettuce resembling modern romaine was a sacred plant of the fertility god Min, depicted in temple art and grown both for its leaves and for oil pressed from its seeds. The Egyptians associated its milky sap and upright form with fertility and regeneration.",
          "Greeks and Romans took up lettuce as food and noted a curious effect: its latex, related to a mild sedative, gave the plant a reputation for encouraging sleep, and it was sometimes eaten at the end of a meal for that reason.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "Spread & diversification",
        paragraphs: [
          "From the Mediterranean, lettuce spread through Europe, where growers selected the major types we know — loose leaf lettuces, the upright romaine or cos, the soft butterheads, and, much later, the dense crisphead or iceberg bred to survive long-distance shipping. Columbus and later voyagers carried it to the Americas, where it became a garden standard.",
          "Each type is the same species pushed in a different direction, from open rosettes of loose leaves to tight, pale, travel-hardy balls.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Lettuce is one of the world's most important salad crops, grown intensively for fresh markets with China and the United States among the leading producers. Low in calories and eaten fresh, it anchors the modern salad — a long way from the bitter, milky weed on the roadside from which it was coaxed.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "cassava",
    name: "Cassava",
    scientificName: "Manihot esculenta",
    family: "Euphorbiaceae",
    category: "tuber",
    glyph: "🌱",
    originCenter: "Southern Amazonia",
    originRegion: "Brazil / Amazonia",
    origin: [-11, -56],
    domesticatedBP: 8000,
    domestication:
      "Domesticated in southern Amazonia and now a leading tropical carbohydrate source.",
    progenitor: "Manihot esculenta subsp. flabellifolia",
    evidence:
      "Genetic evidence roots cassava in a wild subspecies of the southern Amazon.",
    availability:
      "A staple for hundreds of millions across Africa, Asia, and Latin America.",
    spread: [
      { to: "Caribbean & Mesoamerica", coords: [12, -70], period: "pre-Columbian", order: 1 },
      { to: "West & Central Africa", coords: [5, 15], period: "16th–17th c. CE", order: 2 },
      { to: "Tropical Asia", coords: [10, 105], period: "18th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Storage roots (processed)", cautionParts: "Raw roots (cyanogenic)", note: "Raw cassava contains cyanogenic compounds; it must be peeled and cooked or soaked before eating." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "This one plant answers to many names — cassava, manioc, yuca, and, as a processed starch, tapioca. It is Manihot esculenta, a woody shrub of the spurge family grown for its large, starchy storage roots, and it is one of the most important sources of calories in the tropical world, feeding hundreds of millions.",
          "Its great advantages are toughness and patience: cassava grows in poor soils and endures drought that would kill most crops, and its roots can be left in the ground for months as a living store, dug only when needed — a natural insurance against famine.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Origin & the mastery of poison",
        paragraphs: [
          "Cassava was domesticated in the southern Amazon basin of Brazil, on the order of 8,000 to 10,000 years ago, from wild Manihot. But it came with a lethal catch: cassava roots, especially the \"bitter\" types, are laced with cyanogenic compounds that release cyanide, and eaten raw they can poison and kill.",
          "Indigenous Amazonian peoples solved this with sophisticated processing — peeling, grating, and pressing the pulp (often in a woven tube press) to squeeze out the toxic juice, then washing, fermenting, and heating it. Only through this chain of steps does a poisonous root become safe flour, bread, and drink. It is one of humanity's most impressive feats of food technology.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "An American root feeds Africa",
        paragraphs: [
          "Portuguese traders carried cassava from Brazil to Africa in the sixteenth century, along with, in places, the knowledge of how to detoxify it. On a continent with challenging soils and rainfall, its drought-resistance and reliability made it a triumph, and it became a dominant staple across large parts of sub-Saharan Africa in forms such as gari and fufu.",
          "Where the processing knowledge travelled incompletely, however, reliance on poorly detoxified cassava has caused real harm, including the paralysing disease konzo in times of hardship — a reminder that the crop and the craft of preparing it must go together.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "Cassava is now grown across the tropics of Africa, Asia, and the Americas, and in a geographic turnabout Africa produces far more of it than its native continent, with Nigeria the world's largest grower. Beyond food, it is a major source of industrial starch and tapioca and a feedstock for biofuel — a resilient Amazonian root that has become one of the pillars of tropical food security.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "yam",
    name: "Yam",
    scientificName: "Dioscorea rotundata",
    family: "Dioscoreaceae",
    category: "tuber",
    glyph: "🍠",
    originCenter: "West African Yam Belt",
    originRegion: "West Africa",
    origin: [7, 3],
    domesticatedBP: 7000,
    domestication:
      "White yam was domesticated in the West African yam belt, a centre of independent African agriculture.",
    progenitor: "Wild Dioscorea (rotundata–cayenensis complex)",
    evidence:
      "Long cultivation across West Africa, with distinct African and Asian yam domestications.",
    availability:
      "A cultural and dietary staple across West Africa.",
    spread: [
      { to: "Central Africa", coords: [2, 20], period: "antiquity", order: 1 },
      { to: "Caribbean", coords: [18, -72], period: "16th–18th c. CE", order: 2 },
      { to: "Tropical Americas", coords: [5, -55], period: "16th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Tubers (cooked)", cautionParts: "Raw tubers of some species", note: "Some yams contain irritants or alkaloids when raw; cultivated yams are cooked before eating." },
    dossier: [
      {
        heading: "Name & identity",
        paragraphs: [
          "\"Yam\" comes from West African languages — words like nyami, meaning \"to eat\" — carried into English through Portuguese and Spanish. True yams are large starchy tubers of the genus Dioscorea, climbing vines quite unrelated to the sweet potato. This causes lasting confusion: the soft orange \"yams\" sold in North American shops are actually sweet potatoes, while real yams are a different plant altogether, central to the tropics of Africa and Asia.",
          "Yam tubers can be enormous, sometimes weighing tens of kilograms, and some wild species are bitter or toxic raw, requiring cooking or processing before they are safe.",
        ],
        sourceIds: ["powo", "sauer1993"],
      },
      {
        heading: "Domesticated on several continents",
        paragraphs: [
          "The yam is not one crop with one origin but several. West Africa independently domesticated its own species — notably the white and yellow Guinea yams — some 7,000 or more years ago, making yams one of Africa's foundational native crops. Separately, Southeast Asia and the Pacific domesticated the water yam, Dioscorea alata, and other species were taken up in the Americas.",
          "This pattern of parallel domestication, continent by continent, marks the yam as a crop that many different peoples arrived at on their own, wherever the wild vines grew.",
        ],
        sourceIds: ["sauer1993", "kiple2000"],
      },
      {
        heading: "The cultural heart of the yam belt",
        paragraphs: [
          "In West Africa's \"yam belt\" — above all Nigeria — the yam is far more than food. Its cultivation is labour-intensive and prestigious, a marker of a good farmer and of wealth; yams feature in dowries and rites, and new-yam festivals mark the harvest with celebration and thanksgiving across many communities. Few crops are so deeply woven into social and ceremonial life.",
          "African yams were later carried on the ships of the Atlantic slave trade to the Caribbean and the Americas, where they and their names took root in the cooking of the diaspora.",
        ],
        sourceIds: ["kiple2000", "sauer1993"],
      },
      {
        heading: "The crop today",
        paragraphs: [
          "The great majority of the world's yams are grown in West Africa, with Nigeria alone accounting for a huge share of global production, complemented by the water yams of Asia and the Pacific. Pounded into stiff dough, boiled, fried, or roasted, the yam remains a staple and a cultural cornerstone for hundreds of millions of people — and a plant not to be confused with the sweet potato that borrowed its name.",
        ],
        sourceIds: ["faostat", "kiple2000"],
      },
    ],
  },
  {
    id: "barley",
    name: "Barley",
    scientificName: "Hordeum vulgare",
    family: "Poaceae",
    category: "cereal",
    glyph: "🌾",
    originCenter: "Fertile Crescent",
    originRegion: "Near East",
    origin: [33, 44],
    domesticatedBP: 10000,
    domestication:
      "One of the founder crops of the Fertile Crescent, domesticated from wild barley.",
    progenitor: "Wild barley (Hordeum spontaneum)",
    evidence:
      "Charred grains and non-shattering rachises at early Neolithic Near Eastern sites.",
    availability:
      "A leading cereal for brewing, animal feed, and food.",
    spread: [
      { to: "Nile Valley & Europe", coords: [35, 20], period: "~8,000 BP", order: 1 },
      { to: "Central & South Asia", coords: [30, 70], period: "~7,000 BP", order: 2 },
      { to: "East Asia", coords: [35, 105], period: "~5,000 BP", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Grain", cautionParts: "", note: "Used for food and malt; contains gluten-related proteins." },
  },
  {
    id: "lentil",
    name: "Lentil",
    scientificName: "Lens culinaris",
    family: "Fabaceae",
    category: "legume",
    glyph: "🫘",
    originCenter: "Fertile Crescent",
    originRegion: "Near East",
    origin: [37, 39],
    domesticatedBP: 10000,
    domestication:
      "A Neolithic founder legume of the Fertile Crescent.",
    progenitor: "Wild lentil (Lens orientalis)",
    evidence:
      "Among the earliest pulses in Near Eastern Neolithic assemblages.",
    availability:
      "A globally important pulse, especially across South Asia and the Middle East.",
    spread: [
      { to: "Nile Valley & Europe", coords: [38, 20], period: "~8,000 BP", order: 1 },
      { to: "South Asia", coords: [27, 72], period: "~7,000 BP", order: 2 },
      { to: "Worldwide", coords: [20, 80], period: "modern", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Seeds (cooked)", cautionParts: "", note: "Cooked before eating; a rich source of plant protein." },
  },
  {
    id: "chickpea",
    name: "Chickpea",
    scientificName: "Cicer arietinum",
    family: "Fabaceae",
    category: "legume",
    glyph: "🟤",
    originCenter: "Southeastern Anatolia",
    originRegion: "Near East",
    origin: [37, 39],
    domesticatedBP: 10000,
    domestication:
      "Domesticated in southeastern Anatolia from its wild progenitor, a Fertile Crescent founder crop.",
    progenitor: "Cicer reticulatum (wild chickpea)",
    evidence:
      "Early finds in the northern Fertile Crescent, with a very narrow wild-ancestor range.",
    availability:
      "A staple pulse across South Asia, the Middle East, and the Mediterranean.",
    spread: [
      { to: "Mediterranean & Europe", coords: [40, 15], period: "antiquity", order: 1 },
      { to: "South Asia", coords: [25, 75], period: "antiquity", order: 2 },
      { to: "Worldwide", coords: [15, 40], period: "modern", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Seeds (cooked)", cautionParts: "", note: "Cooked before eating; the basis of hummus and many dishes." },
  },
  {
    id: "basil",
    name: "Basil",
    scientificName: "Ocimum basilicum",
    family: "Lamiaceae",
    category: "spice",
    glyph: "🌿",
    originCenter: "Tropical Asia",
    originRegion: "India / SE Asia",
    origin: [20, 78],
    domesticatedBP: 3000,
    domestication:
      "Long cultivated as a culinary and sacred herb across tropical Asia.",
    progenitor: "Wild Ocimum basilicum complex",
    evidence:
      "Deep cultural and culinary use in South Asia, with many cultivated forms.",
    availability:
      "A globally popular culinary herb, central to Italian and Southeast Asian cooking.",
    spread: [
      { to: "Near East & Mediterranean", coords: [34, 25], period: "antiquity", order: 1 },
      { to: "Europe", coords: [44, 11], period: "antiquity–medieval", order: 2 },
      { to: "The Americas", coords: [30, -90], period: "16th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Leaves", cautionParts: "", note: "Used fresh and dried as a culinary herb." },
  },
  {
    id: "coriander",
    name: "Coriander / Cilantro",
    scientificName: "Coriandrum sativum",
    family: "Apiaceae",
    category: "spice",
    glyph: "🌿",
    originCenter: "Near East & Mediterranean",
    originRegion: "Levant",
    origin: [33, 35],
    domesticatedBP: 8000,
    domestication:
      "One of the oldest known herbs, used in the Near East since the Neolithic.",
    progenitor: "Wild Coriandrum sativum",
    evidence:
      "Coriander mericarps appear in Near Eastern Neolithic and ancient Egyptian contexts.",
    availability:
      "Both the leaf (cilantro) and seed (coriander) are used worldwide.",
    spread: [
      { to: "Mediterranean & Europe", coords: [40, 15], period: "antiquity", order: 1 },
      { to: "South & East Asia", coords: [26, 85], period: "antiquity–medieval", order: 2 },
      { to: "The Americas", coords: [20, -100], period: "16th–18th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Leaves and seeds", cautionParts: "", note: "Both the fresh leaves and dried seeds are used." },
  },
  {
    id: "clove",
    name: "Clove",
    scientificName: "Syzygium aromaticum",
    family: "Myrtaceae",
    category: "spice",
    glyph: "🟤",
    originCenter: "Maluku Islands",
    originRegion: "Indonesia (Moluccas)",
    origin: [0, 127],
    domesticatedBP: 2000,
    domestication:
      "Harvested from trees native to the Maluku 'Spice Islands' and central to the historic spice trade.",
    progenitor: "Wild Syzygium aromaticum",
    evidence:
      "Cloves reached Rome and China from the Moluccas via ancient maritime trade.",
    availability:
      "A global culinary spice; Indonesia and Madagascar lead production.",
    spread: [
      { to: "China & South Asia", coords: [22, 90], period: "antiquity", order: 1 },
      { to: "Near East & Europe", coords: [33, 35], period: "antiquity–medieval", order: 2 },
      { to: "Zanzibar & the tropics", coords: [-6, 39], period: "18th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Dried flower buds", cautionParts: "Concentrated clove oil", note: "The spice is safe in culinary amounts; concentrated clove oil (eugenol) can irritate." },
  },
  {
    id: "nutmeg",
    name: "Nutmeg",
    scientificName: "Myristica fragrans",
    family: "Myristicaceae",
    category: "spice",
    glyph: "🌰",
    originCenter: "Banda Islands",
    originRegion: "Indonesia (Banda)",
    origin: [-4, 130],
    domesticatedBP: 2000,
    domestication:
      "Native to the tiny Banda Islands, for centuries the sole source of nutmeg and mace.",
    progenitor: "Wild Myristica fragrans",
    evidence:
      "Banda's monopoly on nutmeg shaped centuries of Indian Ocean and colonial trade.",
    availability:
      "A global baking and savoury spice; Indonesia and Grenada are major producers.",
    spread: [
      { to: "South Asia & Near East", coords: [20, 75], period: "antiquity–medieval", order: 1 },
      { to: "Europe", coords: [48, 5], period: "medieval–16th c.", order: 2 },
      { to: "Caribbean (Grenada)", coords: [12, -61], period: "18th–19th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Seed (and mace aril)", cautionParts: "Large doses (myristicin)", note: "Culinary amounts are safe; large doses of nutmeg are toxic and psychoactive." },
  },
  {
    id: "vanilla",
    name: "Vanilla",
    scientificName: "Vanilla planifolia",
    family: "Orchidaceae",
    category: "spice",
    glyph: "🌼",
    originCenter: "Mesoamerica",
    originRegion: "Mexico",
    origin: [18, -96],
    domesticatedBP: 1000,
    domestication:
      "An orchid domesticated by the Totonac and Maya of Mesoamerica; its pods are cured to develop flavour.",
    progenitor: "Wild Vanilla planifolia",
    evidence:
      "Mesoamerican use predates European contact; global cultivation awaited 19th-century hand-pollination.",
    availability:
      "The world's second most costly spice; Madagascar and Indonesia lead.",
    spread: [
      { to: "Europe (as flavour)", coords: [45, 2], period: "16th–17th c. CE", order: 1 },
      { to: "Réunion & Madagascar", coords: [-20, 47], period: "19th c. CE", order: 2 },
      { to: "Tropical Asia & Pacific", coords: [-8, 110], period: "19th–20th c. CE", order: 3 },
    ],
    maturity: "authored",
    coordinatePrecision: "representative",
    safety: { edibleParts: "Cured seed pods", cautionParts: "", note: "The cured pods and their extract flavour foods; the fresh plant is not eaten." },
  },
];
