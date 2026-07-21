import type { CategoryMeta } from "../types";

/**
 * Category palette — botanical inks tuned to read on warm parchment
 * (herbarium aesthetic). Used for the plant illustrations, labels, and map.
 */
export const CATEGORIES: CategoryMeta[] = [
  { id: "cereal", label: "Cereals & Grains", color: "#b0802b" },
  { id: "fruit", label: "Fruits", color: "#a83f2f" },
  { id: "vegetable", label: "Vegetables", color: "#4e7c4a" },
  { id: "legume", label: "Legumes", color: "#7c792f" },
  { id: "tuber", label: "Roots & Tubers", color: "#96562f" },
  { id: "beverage", label: "Beverage & Stimulant", color: "#6b4d80" },
  { id: "oil", label: "Oil & Sugar", color: "#3f7d74" },
  { id: "spice", label: "Herbs & Spices", color: "#b3671f" },
  { id: "nut", label: "Nuts & Seeds", color: "#7a5636" },
];

export const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.color]),
);
