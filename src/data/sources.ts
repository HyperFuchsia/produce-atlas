import type { Source, MaturityMeta } from "../types";

/**
 * Shared source registry. Claim packets reference these by id so every
 * flagship assertion is individually traceable. Citations are real, standard
 * references in archaeobotany, plant genetics, and food history; per-page
 * locators and expert review are still outstanding (see each claim's `review`).
 */
export const SOURCES: Source[] = [
  {
    id: "zohary2012",
    citation:
      "Zohary, D., Hopf, M. & Weiss, E. (2012). Domestication of Plants in the Old World (4th ed.). Oxford University Press.",
    kind: "book",
    year: 2012,
  },
  {
    id: "purugganan2009",
    citation:
      "Purugganan, M. D. & Fuller, D. Q. (2009). The nature of selection during plant domestication. Nature, 457, 843–848.",
    kind: "journal",
    year: 2009,
  },
  {
    id: "powo",
    citation:
      "Plants of the World Online (POWO). Royal Botanic Gardens, Kew. Facilitated by the World Flora Online.",
    kind: "database",
    year: 2024,
  },
  {
    id: "faostat",
    citation:
      "FAO (2023). FAOSTAT Crops and Livestock Products database. Food and Agriculture Organization of the United Nations.",
    kind: "database",
    year: 2023,
  },
  {
    id: "cornille2014",
    citation:
      "Cornille, A., Giraud, T., Smulders, M. J. M., Roldán-Ruiz, I. & Gladieux, P. (2014). The domestication and evolutionary ecology of apples. Trends in Genetics, 30(2), 57–65.",
    kind: "journal",
    year: 2014,
  },
  {
    id: "duan2017",
    citation:
      "Duan, N. et al. (2017). Genome re-sequencing reveals the history of apple and supports a two-stage model for fruit enlargement. Nature Communications, 8, 249.",
    kind: "journal",
    year: 2017,
  },
  {
    id: "denham2003",
    citation:
      "Denham, T. P. et al. (2003). Origins of agriculture at Kuk Swamp in the Highlands of New Guinea. Science, 301(5630), 189–193.",
    kind: "journal",
    year: 2003,
  },
  {
    id: "perrier2011",
    citation:
      "Perrier, X. et al. (2011). Multidisciplinary perspectives on banana (Musa spp.) domestication. PNAS, 108(28), 11311–11318.",
    kind: "journal",
    year: 2011,
  },
  {
    id: "spooner2005",
    citation:
      "Spooner, D. M., McLean, K., Ramsay, G., Waugh, R. & Bryan, G. J. (2005). A single domestication for potato based on multilocus amplified fragment length polymorphism genotyping. PNAS, 102(41), 14694–14699.",
    kind: "journal",
    year: 2005,
  },
  {
    id: "hawkes1990",
    citation:
      "Hawkes, J. G. (1990). The Potato: Evolution, Biodiversity and Genetic Resources. Belhaven Press.",
    kind: "book",
    year: 1990,
  },
  {
    id: "razifard2020",
    citation:
      "Razifard, H. et al. (2020). Genomic evidence for complex domestication history of the cultivated tomato in Latin America. Molecular Biology and Evolution, 37(4), 1118–1132.",
    kind: "journal",
    year: 2020,
  },
  {
    id: "blanca2015",
    citation:
      "Blanca, J. et al. (2015). Genomic variation in tomato, from wild ancestors to contemporary breeding accessions. BMC Genomics, 16, 257.",
    kind: "journal",
    year: 2015,
  },
  {
    id: "ravindran2000",
    citation:
      "Ravindran, P. N. (ed.) (2000). Black Pepper: Piper nigrum. Medicinal and Aromatic Plants — Industrial Profiles. Harwood Academic.",
    kind: "book",
    year: 2000,
  },
  {
    id: "hajibabaei2014",
    citation:
      "Nair, K. P. P. (2011). Agronomy and Economy of Black Pepper and Cardamom: The 'King' and 'Queen' of Spices. Elsevier.",
    kind: "book",
    year: 2011,
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
    color: "#5FB5B3",
    note: "Carries a formal packet of individually source-linked claims. Expert review is still pending.",
  },
  {
    id: "authored",
    label: "Individually authored",
    short: "Authored",
    color: "#E7B84B",
    note: "Bespoke, individually written record. No formal claim packet or expert review yet.",
  },
  {
    id: "baseline",
    label: "Catalog baseline (template)",
    short: "Baseline",
    color: "#8a8f9c",
    note: "Structurally complete but expanded from shared templates. None present in this edition.",
  },
];

export const MATURITY_BY_ID: Record<string, MaturityMeta> = Object.fromEntries(
  MATURITY.map((m) => [m.id, m]),
);
