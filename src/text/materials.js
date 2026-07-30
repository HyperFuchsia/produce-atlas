import { Color, MeshPhysicalMaterial } from 'three';

/**
 * Per-role material recipes. Titles are polished chrome so they mirror the
 * sunset; body copy is softer and slightly self-lit so it stays legible when it
 * is backlit by the sun.
 */
const RECIPES = {
  title: { key: 'title', metalness: 0.96, roughness: 0.15, emissive: 0.035, clearcoat: 1, env: 1.2 },
  heading: { key: 'heading', metalness: 0.72, roughness: 0.24, emissive: 0.3, clearcoat: 0.7, env: 1.1 },
  body: { key: 'body', metalness: 0.34, roughness: 0.38, emissive: 0.16, clearcoat: 0.25, env: 0.9 },
  quote: { key: 'quote', metalness: 0.3, roughness: 0.45, emissive: 0.22, clearcoat: 0.2, env: 0.85 },
  stat: { key: 'stat', metalness: 0.88, roughness: 0.18, emissive: 0.26, clearcoat: 0.9, env: 1.15 },
  accent: { key: 'accent', metalness: 0.55, roughness: 0.3, emissive: 0.45, clearcoat: 0.4, env: 1.0 },
};

export class MaterialLibrary {
  constructor(palette) {
    this.palette = palette;
    this.base = new Map();
    this.build();
  }

  build() {
    for (const [role, recipe] of Object.entries(RECIPES)) {
      const color = new Color(this.palette.type[recipe.key] ?? this.palette.type.body);
      const material = new MeshPhysicalMaterial({
        color,
        metalness: recipe.metalness,
        roughness: recipe.roughness,
        emissive: color.clone(),
        emissiveIntensity: recipe.emissive,
        clearcoat: recipe.clearcoat,
        clearcoatRoughness: 0.15,
        envMapIntensity: recipe.env,
        transparent: true,
        opacity: 1,
      });
      material.userData.baseEmissive = recipe.emissive;
      this.base.set(role, material);
    }
  }

  setPalette(palette) {
    this.palette = palette;
    for (const [role, recipe] of Object.entries(RECIPES)) {
      const material = this.base.get(role);
      const color = new Color(palette.type[recipe.key] ?? palette.type.body);
      material.color.copy(color);
      material.emissive.copy(color);
    }
  }

  /** A per-glyph clone so each character can flash and fade on its own. */
  instance(role) {
    const base = this.base.get(role) ?? this.base.get('body');
    const clone = base.clone();
    clone.userData.baseEmissive = base.userData.baseEmissive;
    return clone;
  }

  dispose() {
    for (const material of this.base.values()) material.dispose();
    this.base.clear();
  }
}
