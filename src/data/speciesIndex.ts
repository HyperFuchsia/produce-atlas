import type { Category, IndexSpecies } from "../types";
import { CROPS } from "./crops";
import { GENERATED_ROWS } from "./species.generated";

/**
 * Baseline scientific index — real edible plant species identified by common
 * name, scientific name, and family. These are the "baseline" tier: breadth
 * without an individually researched origin story, so they are searchable and
 * carry a specimen signature but are NOT plotted on the globe (no origin is
 * claimed). This is deliberately honest per the project's audit.
 *
 * To scale toward the full Kew "World Checklist of Useful Plants" (~7,039
 * human-food species), an importer can append rows in the same
 * [common, scientific, family, category] shape — see `scripts/`.
 */
type Row = [name: string, scientificName: string, family: string, category: Category];

const ROWS: Row[] = [
  // ---- Fruits ----
  ["Strawberry", "Fragaria × ananassa", "Rosaceae", "fruit"],
  ["Raspberry", "Rubus idaeus", "Rosaceae", "fruit"],
  ["Blackberry", "Rubus fruticosus", "Rosaceae", "fruit"],
  ["Blueberry", "Vaccinium corymbosum", "Ericaceae", "fruit"],
  ["Cranberry", "Vaccinium macrocarpon", "Ericaceae", "fruit"],
  ["Bilberry", "Vaccinium myrtillus", "Ericaceae", "fruit"],
  ["Sweet Cherry", "Prunus avium", "Rosaceae", "fruit"],
  ["Plum", "Prunus domestica", "Rosaceae", "fruit"],
  ["Peach", "Prunus persica", "Rosaceae", "fruit"],
  ["Apricot", "Prunus armeniaca", "Rosaceae", "fruit"],
  ["Pear", "Pyrus communis", "Rosaceae", "fruit"],
  ["Asian Pear", "Pyrus pyrifolia", "Rosaceae", "fruit"],
  ["Quince", "Cydonia oblonga", "Rosaceae", "fruit"],
  ["Loquat", "Eriobotrya japonica", "Rosaceae", "fruit"],
  ["Medlar", "Mespilus germanica", "Rosaceae", "fruit"],
  ["Kiwifruit", "Actinidia deliciosa", "Actinidiaceae", "fruit"],
  ["Guava", "Psidium guajava", "Myrtaceae", "fruit"],
  ["Passionfruit", "Passiflora edulis", "Passifloraceae", "fruit"],
  ["Lychee", "Litchi chinensis", "Sapindaceae", "fruit"],
  ["Longan", "Dimocarpus longan", "Sapindaceae", "fruit"],
  ["Rambutan", "Nephelium lappaceum", "Sapindaceae", "fruit"],
  ["Durian", "Durio zibethinus", "Malvaceae", "fruit"],
  ["Jackfruit", "Artocarpus heterophyllus", "Moraceae", "fruit"],
  ["Breadfruit", "Artocarpus altilis", "Moraceae", "fruit"],
  ["Mulberry", "Morus alba", "Moraceae", "fruit"],
  ["Carambola (Starfruit)", "Averrhoa carambola", "Oxalidaceae", "fruit"],
  ["Dragon Fruit", "Selenicereus undatus", "Cactaceae", "fruit"],
  ["Prickly Pear", "Opuntia ficus-indica", "Cactaceae", "fruit"],
  ["Persimmon", "Diospyros kaki", "Ebenaceae", "fruit"],
  ["Pomelo", "Citrus maxima", "Rutaceae", "fruit"],
  ["Grapefruit", "Citrus × paradisi", "Rutaceae", "fruit"],
  ["Lime", "Citrus × aurantiifolia", "Rutaceae", "fruit"],
  ["Mandarin", "Citrus reticulata", "Rutaceae", "fruit"],
  ["Kumquat", "Citrus japonica", "Rutaceae", "fruit"],
  ["Citron", "Citrus medica", "Rutaceae", "fruit"],
  ["Elderberry", "Sambucus nigra", "Adoxaceae", "fruit"],
  ["Gooseberry", "Ribes uva-crispa", "Grossulariaceae", "fruit"],
  ["Redcurrant", "Ribes rubrum", "Grossulariaceae", "fruit"],
  ["Blackcurrant", "Ribes nigrum", "Grossulariaceae", "fruit"],
  ["Muskmelon", "Cucumis melo", "Cucurbitaceae", "fruit"],
  ["Coconut", "Cocos nucifera", "Arecaceae", "fruit"],
  ["Tamarind", "Tamarindus indica", "Fabaceae", "fruit"],
  ["Soursop", "Annona muricata", "Annonaceae", "fruit"],
  ["Cherimoya", "Annona cherimola", "Annonaceae", "fruit"],
  ["Sugar Apple", "Annona squamosa", "Annonaceae", "fruit"],
  ["Sapodilla", "Manilkara zapota", "Sapotaceae", "fruit"],
  ["Mangosteen", "Garcinia mangostana", "Clusiaceae", "fruit"],
  ["Feijoa", "Acca sellowiana", "Myrtaceae", "fruit"],
  ["Jujube", "Ziziphus jujuba", "Rhamnaceae", "fruit"],
  ["Açaí", "Euterpe oleracea", "Arecaceae", "fruit"],
  ["Cape Gooseberry", "Physalis peruviana", "Solanaceae", "fruit"],
  ["Tomatillo", "Physalis philadelphica", "Solanaceae", "vegetable"],
  ["Wax Apple", "Syzygium samarangense", "Myrtaceae", "fruit"],
  ["Ackee", "Blighia sapida", "Sapindaceae", "fruit"],
  ["Rhubarb", "Rheum rhabarbarum", "Polygonaceae", "vegetable"],

  // ---- Vegetables ----
  ["Broccoli", "Brassica oleracea (Italica Group)", "Brassicaceae", "vegetable"],
  ["Cauliflower", "Brassica oleracea (Botrytis Group)", "Brassicaceae", "vegetable"],
  ["Kale", "Brassica oleracea (Acephala Group)", "Brassicaceae", "vegetable"],
  ["Brussels Sprout", "Brassica oleracea (Gemmifera Group)", "Brassicaceae", "vegetable"],
  ["Kohlrabi", "Brassica oleracea (Gongylodes Group)", "Brassicaceae", "vegetable"],
  ["Turnip", "Brassica rapa (Rapa Group)", "Brassicaceae", "vegetable"],
  ["Bok Choy", "Brassica rapa (Chinensis Group)", "Brassicaceae", "vegetable"],
  ["Napa Cabbage", "Brassica rapa (Pekinensis Group)", "Brassicaceae", "vegetable"],
  ["Rutabaga", "Brassica napus (Napobrassica Group)", "Brassicaceae", "vegetable"],
  ["Radish", "Raphanus sativus", "Brassicaceae", "vegetable"],
  ["Arugula", "Eruca vesicaria", "Brassicaceae", "vegetable"],
  ["Watercress", "Nasturtium officinale", "Brassicaceae", "vegetable"],
  ["Beetroot", "Beta vulgaris", "Amaranthaceae", "vegetable"],
  ["Swiss Chard", "Beta vulgaris (Cicla Group)", "Amaranthaceae", "vegetable"],
  ["Amaranth Greens", "Amaranthus tricolor", "Amaranthaceae", "vegetable"],
  ["Celery", "Apium graveolens", "Apiaceae", "vegetable"],
  ["Celeriac", "Apium graveolens (Rapaceum Group)", "Apiaceae", "vegetable"],
  ["Fennel", "Foeniculum vulgare", "Apiaceae", "vegetable"],
  ["Parsnip", "Pastinaca sativa", "Apiaceae", "vegetable"],
  ["Leek", "Allium ampeloprasum", "Amaryllidaceae", "vegetable"],
  ["Shallot", "Allium cepa (Aggregatum Group)", "Amaryllidaceae", "vegetable"],
  ["Welsh Onion", "Allium fistulosum", "Amaryllidaceae", "vegetable"],
  ["Asparagus", "Asparagus officinalis", "Asparagaceae", "vegetable"],
  ["Globe Artichoke", "Cynara cardunculus (Scolymus Group)", "Asteraceae", "vegetable"],
  ["Cardoon", "Cynara cardunculus", "Asteraceae", "vegetable"],
  ["Endive", "Cichorium endivia", "Asteraceae", "vegetable"],
  ["Chicory", "Cichorium intybus", "Asteraceae", "vegetable"],
  ["Okra", "Abelmoschus esculentus", "Malvaceae", "vegetable"],
  ["Pumpkin", "Cucurbita maxima", "Cucurbitaceae", "vegetable"],
  ["Bottle Gourd", "Lagenaria siceraria", "Cucurbitaceae", "vegetable"],
  ["Bitter Melon", "Momordica charantia", "Cucurbitaceae", "vegetable"],
  ["Chayote", "Sechium edule", "Cucurbitaceae", "vegetable"],
  ["Water Spinach", "Ipomoea aquatica", "Convolvulaceae", "vegetable"],
  ["Bamboo Shoot", "Bambusa vulgaris", "Poaceae", "vegetable"],
  ["Purslane", "Portulaca oleracea", "Portulacaceae", "vegetable"],
  ["Malabar Spinach", "Basella alba", "Basellaceae", "vegetable"],
  ["Moringa", "Moringa oleifera", "Moringaceae", "vegetable"],
  ["Corn Salad", "Valerianella locusta", "Caprifoliaceae", "vegetable"],

  // ---- Roots & Tubers ----
  ["Taro", "Colocasia esculenta", "Araceae", "tuber"],
  ["Jerusalem Artichoke", "Helianthus tuberosus", "Asteraceae", "tuber"],
  ["Lotus Root", "Nelumbo nucifera", "Nelumbonaceae", "tuber"],
  ["Water Chestnut", "Eleocharis dulcis", "Cyperaceae", "tuber"],
  ["Oca", "Oxalis tuberosa", "Oxalidaceae", "tuber"],
  ["Ulluco", "Ullucus tuberosus", "Basellaceae", "tuber"],
  ["Yacón", "Smallanthus sonchifolius", "Asteraceae", "tuber"],
  ["Arrowroot", "Maranta arundinacea", "Marantaceae", "tuber"],
  ["Konjac", "Amorphophallus konjac", "Araceae", "tuber"],
  ["Tigernut", "Cyperus esculentus", "Cyperaceae", "tuber"],

  // ---- Legumes ----
  ["Pea", "Pisum sativum", "Fabaceae", "legume"],
  ["Mung Bean", "Vigna radiata", "Fabaceae", "legume"],
  ["Cowpea", "Vigna unguiculata", "Fabaceae", "legume"],
  ["Adzuki Bean", "Vigna angularis", "Fabaceae", "legume"],
  ["Pigeon Pea", "Cajanus cajan", "Fabaceae", "legume"],
  ["Broad Bean", "Vicia faba", "Fabaceae", "legume"],
  ["Lima Bean", "Phaseolus lunatus", "Fabaceae", "legume"],
  ["Runner Bean", "Phaseolus coccineus", "Fabaceae", "legume"],
  ["Grass Pea", "Lathyrus sativus", "Fabaceae", "legume"],
  ["White Lupin", "Lupinus albus", "Fabaceae", "legume"],
  ["Winged Bean", "Psophocarpus tetragonolobus", "Fabaceae", "legume"],
  ["Hyacinth Bean", "Lablab purpureus", "Fabaceae", "legume"],
  ["Carob", "Ceratonia siliqua", "Fabaceae", "legume"],
  ["Bambara Groundnut", "Vigna subterranea", "Fabaceae", "legume"],

  // ---- Cereals & pseudocereals ----
  ["Rye", "Secale cereale", "Poaceae", "cereal"],
  ["Oat", "Avena sativa", "Poaceae", "cereal"],
  ["Pearl Millet", "Pennisetum glaucum", "Poaceae", "cereal"],
  ["Proso Millet", "Panicum miliaceum", "Poaceae", "cereal"],
  ["Finger Millet", "Eleusine coracana", "Poaceae", "cereal"],
  ["Foxtail Millet", "Setaria italica", "Poaceae", "cereal"],
  ["Teff", "Eragrostis tef", "Poaceae", "cereal"],
  ["Fonio", "Digitaria exilis", "Poaceae", "cereal"],
  ["Buckwheat", "Fagopyrum esculentum", "Polygonaceae", "cereal"],
  ["Quinoa", "Chenopodium quinoa", "Amaranthaceae", "cereal"],
  ["Grain Amaranth", "Amaranthus caudatus", "Amaranthaceae", "cereal"],
  ["Wild Rice", "Zizania palustris", "Poaceae", "cereal"],
  ["Spelt", "Triticum spelta", "Poaceae", "cereal"],
  ["Einkorn", "Triticum monococcum", "Poaceae", "cereal"],
  ["Emmer", "Triticum dicoccum", "Poaceae", "cereal"],
  ["Job's Tears", "Coix lacryma-jobi", "Poaceae", "cereal"],

  // ---- Nuts & seeds ----
  ["Almond", "Prunus dulcis", "Rosaceae", "nut"],
  ["Walnut", "Juglans regia", "Juglandaceae", "nut"],
  ["Pecan", "Carya illinoinensis", "Juglandaceae", "nut"],
  ["Hazelnut", "Corylus avellana", "Betulaceae", "nut"],
  ["Sweet Chestnut", "Castanea sativa", "Fagaceae", "nut"],
  ["Pistachio", "Pistacia vera", "Anacardiaceae", "nut"],
  ["Cashew", "Anacardium occidentale", "Anacardiaceae", "nut"],
  ["Macadamia", "Macadamia integrifolia", "Proteaceae", "nut"],
  ["Brazil Nut", "Bertholletia excelsa", "Lecythidaceae", "nut"],
  ["Pine Nut", "Pinus pinea", "Pinaceae", "nut"],
  ["Ginkgo Nut", "Ginkgo biloba", "Ginkgoaceae", "nut"],
  ["Sesame", "Sesamum indicum", "Pedaliaceae", "nut"],
  ["Sunflower Seed", "Helianthus annuus", "Asteraceae", "nut"],

  // ---- Oil & sugar ----
  ["Safflower", "Carthamus tinctorius", "Asteraceae", "oil"],
  ["Rapeseed (Canola)", "Brassica napus", "Brassicaceae", "oil"],
  ["Flax (Linseed)", "Linum usitatissimum", "Linaceae", "oil"],
  ["Oil Palm", "Elaeis guineensis", "Arecaceae", "oil"],
  ["Hemp Seed", "Cannabis sativa", "Cannabaceae", "oil"],
  ["Sugar Beet", "Beta vulgaris (Altissima Group)", "Amaranthaceae", "oil"],
  ["Niger Seed", "Guizotia abyssinica", "Asteraceae", "oil"],

  // ---- Herbs & spices ----
  ["Parsley", "Petroselinum crispum", "Apiaceae", "spice"],
  ["Dill", "Anethum graveolens", "Apiaceae", "spice"],
  ["Caraway", "Carum carvi", "Apiaceae", "spice"],
  ["Anise", "Pimpinella anisum", "Apiaceae", "spice"],
  ["Lovage", "Levisticum officinale", "Apiaceae", "spice"],
  ["Chervil", "Anthriscus cerefolium", "Apiaceae", "spice"],
  ["Cumin", "Cuminum cyminum", "Apiaceae", "spice"],
  ["Ajwain", "Trachyspermum ammi", "Apiaceae", "spice"],
  ["Asafoetida", "Ferula assa-foetida", "Apiaceae", "spice"],
  ["Thyme", "Thymus vulgaris", "Lamiaceae", "spice"],
  ["Oregano", "Origanum vulgare", "Lamiaceae", "spice"],
  ["Marjoram", "Origanum majorana", "Lamiaceae", "spice"],
  ["Rosemary", "Salvia rosmarinus", "Lamiaceae", "spice"],
  ["Sage", "Salvia officinalis", "Lamiaceae", "spice"],
  ["Spearmint", "Mentha spicata", "Lamiaceae", "spice"],
  ["Peppermint", "Mentha × piperita", "Lamiaceae", "spice"],
  ["Summer Savory", "Satureja hortensis", "Lamiaceae", "spice"],
  ["Lemon Balm", "Melissa officinalis", "Lamiaceae", "spice"],
  ["Perilla", "Perilla frutescens", "Lamiaceae", "spice"],
  ["Tarragon", "Artemisia dracunculus", "Asteraceae", "spice"],
  ["Bay Laurel", "Laurus nobilis", "Lauraceae", "spice"],
  ["Star Anise", "Illicium verum", "Schisandraceae", "spice"],
  ["Cardamom", "Elettaria cardamomum", "Zingiberaceae", "spice"],
  ["Galangal", "Alpinia galanga", "Zingiberaceae", "spice"],
  ["Grains of Paradise", "Aframomum melegueta", "Zingiberaceae", "spice"],
  ["Black Mustard", "Brassica nigra", "Brassicaceae", "spice"],
  ["White Mustard", "Sinapis alba", "Brassicaceae", "spice"],
  ["Horseradish", "Armoracia rusticana", "Brassicaceae", "spice"],
  ["Wasabi", "Eutrema japonicum", "Brassicaceae", "spice"],
  ["Fenugreek", "Trigonella foenum-graecum", "Fabaceae", "spice"],
  ["Chives", "Allium schoenoprasum", "Amaryllidaceae", "spice"],
  ["Saffron", "Crocus sativus", "Iridaceae", "spice"],
  ["Allspice", "Pimenta dioica", "Myrtaceae", "spice"],
  ["Sumac", "Rhus coriaria", "Anacardiaceae", "spice"],
  ["Juniper", "Juniperus communis", "Cupressaceae", "spice"],
  ["Curry Leaf", "Murraya koenigii", "Rutaceae", "spice"],
  ["Kaffir Lime", "Citrus hystrix", "Rutaceae", "spice"],
  ["Lemongrass", "Cymbopogon citratus", "Poaceae", "spice"],
  ["Nigella", "Nigella sativa", "Ranunculaceae", "spice"],
  ["Annatto", "Bixa orellana", "Bixaceae", "spice"],
  ["Epazote", "Dysphania ambrosioides", "Amaranthaceae", "spice"],
  ["Stevia", "Stevia rebaudiana", "Asteraceae", "spice"],
  ["Pandan", "Pandanus amaryllifolius", "Pandanaceae", "spice"],
  ["Sichuan Pepper", "Zanthoxylum piperitum", "Rutaceae", "spice"],
  ["Long Pepper", "Piper longum", "Piperaceae", "spice"],

  // ---- Beverage & stimulant ----
  ["Rooibos", "Aspalathus linearis", "Fabaceae", "beverage"],
  ["Yerba Mate", "Ilex paraguariensis", "Aquifoliaceae", "beverage"],
  ["Hops", "Humulus lupulus", "Cannabaceae", "beverage"],
  ["Guaraná", "Paullinia cupana", "Sapindaceae", "beverage"],
  ["Roselle", "Hibiscus sabdariffa", "Malvaceae", "beverage"],
  ["Kola Nut", "Cola acuminata", "Malvaceae", "beverage"],
];

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const atlasSci = new Set(CROPS.map((c) => c.scientificName.toLowerCase()));
const seen = new Set<string>();

export const INDEX_SPECIES: IndexSpecies[] = [...ROWS, ...GENERATED_ROWS]
  // never shadow a fully-authored atlas record, and de-duplicate by species
  .filter((r) => {
    const key = r[1].toLowerCase();
    if (atlasSci.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  })
  .map(([name, scientificName, family, category]) => ({
    id: `idx-${slug(name)}`,
    name,
    scientificName,
    family,
    category,
    maturity: "baseline" as const,
  }));
