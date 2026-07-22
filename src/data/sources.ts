import type { Source, MaturityMeta } from "../types";

/**
 * The count of plant species documented as human food in Kew's World Checklist
 * of Useful Plants (Diazgranados et al., 2020) — the reference "universe" the
 * atlas measures its coverage against.
 */
export const HUMAN_FOOD_SPECIES = 7039;

/**
 * Shared source registry. Claim packets reference these by id so every
 * flagship assertion is individually traceable. Citations are real, standard
 * references in archaeobotany, plant genetics, and food history; per-page
 * locators and expert review are still outstanding (see each claim's `review`).
 */
export const SOURCES: Source[] = [
  {
    id: "wcups",
    url: "https://doi.org/10.5063/F1CV4G34",
    citation:
      "Diazgranados, M. et al. (2020). World Checklist of Useful Plant Species. Royal Botanic Gardens, Kew. (≈7,039 species carry a Human Food use.)",
    kind: "database",
    year: 2020,
  },
  {
    id: "zohary2012",
    url: "https://doi.org/10.1093/acprof:osobl/9780199549061.001.0001",
    citation:
      "Zohary, D., Hopf, M. & Weiss, E. (2012). Domestication of Plants in the Old World (4th ed.). Oxford University Press.",
    kind: "book",
    year: 2012,
  },
  {
    id: "purugganan2009",
    url: "https://doi.org/10.1038/nature07895",
    citation:
      "Purugganan, M. D. & Fuller, D. Q. (2009). The nature of selection during plant domestication. Nature, 457, 843–848.",
    kind: "journal",
    year: 2009,
  },
  {
    id: "powo",
    url: "https://powo.science.kew.org/",
    citation:
      "Plants of the World Online (POWO). Royal Botanic Gardens, Kew. Facilitated by the World Flora Online.",
    kind: "database",
    year: 2024,
  },
  {
    id: "faostat",
    url: "https://www.fao.org/faostat/en/",
    citation:
      "FAO (2023). FAOSTAT Crops and Livestock Products database. Food and Agriculture Organization of the United Nations.",
    kind: "database",
    year: 2023,
  },
  {
    id: "cornille2014",
    url: "https://doi.org/10.1016/j.tig.2013.10.002",
    citation:
      "Cornille, A., Giraud, T., Smulders, M. J. M., Roldán-Ruiz, I. & Gladieux, P. (2014). The domestication and evolutionary ecology of apples. Trends in Genetics, 30(2), 57–65.",
    kind: "journal",
    year: 2014,
  },
  {
    id: "duan2017",
    url: "https://doi.org/10.1038/s41467-017-00336-7",
    citation:
      "Duan, N. et al. (2017). Genome re-sequencing reveals the history of apple and supports a two-stage model for fruit enlargement. Nature Communications, 8, 249.",
    kind: "journal",
    year: 2017,
  },
  {
    id: "denham2003",
    url: "https://doi.org/10.1126/science.1085255",
    citation:
      "Denham, T. P. et al. (2003). Origins of agriculture at Kuk Swamp in the Highlands of New Guinea. Science, 301(5630), 189–193.",
    kind: "journal",
    year: 2003,
  },
  {
    id: "perrier2011",
    url: "https://doi.org/10.1073/pnas.1102001108",
    citation:
      "Perrier, X. et al. (2011). Multidisciplinary perspectives on banana (Musa spp.) domestication. PNAS, 108(28), 11311–11318.",
    kind: "journal",
    year: 2011,
  },
  {
    id: "spooner2005",
    url: "https://doi.org/10.1073/pnas.0507400102",
    citation:
      "Spooner, D. M., McLean, K., Ramsay, G., Waugh, R. & Bryan, G. J. (2005). A single domestication for potato based on multilocus amplified fragment length polymorphism genotyping. PNAS, 102(41), 14694–14699.",
    kind: "journal",
    year: 2005,
  },
  {
    id: "hawkes1990",
    url: "https://search.worldcat.org/title/21894919",
    citation:
      "Hawkes, J. G. (1990). The Potato: Evolution, Biodiversity and Genetic Resources. Belhaven Press.",
    kind: "book",
    year: 1990,
  },
  {
    id: "razifard2020",
    url: "https://doi.org/10.1093/molbev/msz297",
    citation:
      "Razifard, H. et al. (2020). Genomic evidence for complex domestication history of the cultivated tomato in Latin America. Molecular Biology and Evolution, 37(4), 1118–1132.",
    kind: "journal",
    year: 2020,
  },
  {
    id: "blanca2015",
    url: "https://doi.org/10.1186/s12864-015-1444-1",
    citation:
      "Blanca, J. et al. (2015). Genomic variation in tomato, from wild ancestors to contemporary breeding accessions. BMC Genomics, 16, 257.",
    kind: "journal",
    year: 2015,
  },
  {
    id: "ravindran2000",
    url: "https://doi.org/10.1201/9780203303870",
    citation:
      "Ravindran, P. N. (ed.) (2000). Black Pepper: Piper nigrum. Medicinal and Aromatic Plants — Industrial Profiles. Harwood Academic.",
    kind: "book",
    year: 2000,
  },
  {
    id: "hajibabaei2014",
    url: "https://www.sciencedirect.com/book/9780123918659/agronomy-and-economy-of-black-pepper-and-cardamom",
    citation:
      "Nair, K. P. P. (2011). Agronomy and Economy of Black Pepper and Cardamom: The 'King' and 'Queen' of Spices. Elsevier.",
    kind: "book",
    year: 2011,
  },
  {
    id: "sauer1993",
    url: "https://doi.org/10.4324/9780203751909",
    citation:
      "Sauer, J. D. (1993). Historical Geography of Crop Plants: A Select Roster. CRC Press.",
    kind: "book",
    year: 1993,
  },
  {
    id: "kiple2000",
    url: "https://www.cambridge.org/core/books/cambridge-world-history-of-food/FD5B325285F43821E7B1FC9FAD4D56B9",
    citation:
      "Kiple, K. F. & Ornelas, K. C. (eds.) (2000). The Cambridge World History of Food. Cambridge University Press.",
    kind: "book",
    year: 2000,
  },
  {
    id: "reader2009",
    url: "https://search.worldcat.org/title/262432286",
    citation:
      "Reader, J. (2009). Potato: A History of the Propitious Esculent. Yale University Press.",
    kind: "book",
    year: 2009,
  },
  {
    id: "smith1994",
    url: "https://search.worldcat.org/title/30036150",
    citation:
      "Smith, A. F. (1994). The Tomato in America: Early History, Culture, and Cookery. University of South Carolina Press.",
    kind: "book",
    year: 1994,
  },
  {
    id: "juniper2006",
    url: "https://search.worldcat.org/search?q=Story+of+the+Apple+Juniper+Mabberley",
    citation:
      "Juniper, B. E. & Mabberley, D. J. (2006). The Story of the Apple. Timber Press.",
    kind: "book",
    year: 2006,
  },
  {
    id: "koeppel2008",
    url: "https://www.penguinrandomhouse.com/books/299017/banana-by-dan-koeppel/",
    citation:
      "Koeppel, D. (2008). Banana: The Fate of the Fruit That Changed the World. Hudson Street Press.",
    kind: "book",
    year: 2008,
  },
  {
    id: "dalby2000",
    url: "https://search.worldcat.org/title/44979585",
    citation:
      "Dalby, A. (2000). Dangerous Tastes: The Story of Spices. University of California Press.",
    kind: "book",
    year: 2000,
  },
];

export const SOURCE_BY_ID: Record<string, Source> = Object.fromEntries(
  SOURCES.map((s) => [s.id, s]),
);

export const MATURITY: MaturityMeta[] = [
  {
    id: "flagship",
    label: "Flagship — claim packet",
    short: "Flagship",
    color: "#3f7d74",
    note: "Carries a formal packet of individually source-linked claims. Expert review is still pending.",
  },
  {
    id: "authored",
    label: "Individually authored",
    short: "Authored",
    color: "#b0802b",
    note: "Bespoke atlas record with a full origin, domestication, and spread dossier.",
  },
  {
    id: "baseline",
    label: "Baseline record",
    short: "Baseline",
    color: "#8a8071",
    note: "A real edible species included for breadth, not yet individually researched. No origin is claimed.",
  },
];

export const MATURITY_BY_ID: Record<string, MaturityMeta> = Object.fromEntries(
  MATURITY.map((m) => [m.id, m]),
);
