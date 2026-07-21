import type { CategoryMeta } from "../types";

/** Category palette — warm, editorial, botanical. Keyed to marker + arc color. */
export const CATEGORIES: CategoryMeta[] = [
  { id: "cereal", label: "Cereals & Grains", color: "#E7B84B" },
  { id: "fruit", label: "Fruits", color: "#EF6E7B" },
  { id: "vegetable", label: "Vegetables", color: "#6FBF8B" },
  { id: "legume", label: "Legumes", color: "#D9A441" },
  { id: "tuber", label: "Roots & Tubers", color: "#D07B4E" },
  { id: "beverage", label: "Beverage & Stimulant", color: "#B58BD6" },
  { id: "oil", label: "Oil & Sugar", color: "#5FB5B3" },
  { id: "spice", label: "Herbs & Spices", color: "#C98A5E" },
  { id: "nut", label: "Nuts & Seeds", color: "#B08D57" },
];

export const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.color]),
);
