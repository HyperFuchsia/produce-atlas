import { ExtrudeGeometry } from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { PROFILES } from '../config.js';

const FONT_FILES = {
  display: 'fonts/orbitron-bold.typeface.json',
  body: 'fonts/rajdhani-semibold.typeface.json',
};

/** Characters we can gracefully rewrite when a face lacks the glyph. */
const FOLD = new Map([
  ['\t', ' '],
  ['\u00a0', ' '], // no-break space
  ['\u2007', ' '], // figure space
  ['\u202f', ' '], // narrow no-break space
  ['\u200b', ''], // zero-width space
  ['\u00b7', '\u2022'], // middot -> bullet
  ['\u2043', '\u2022'], // hyphen bullet -> bullet
  ['\u2212', '-'], // minus -> hyphen
  ['\u2018', "'"],
  ['\u2019', "'"],
  ['\u201c', '"'],
  ['\u201d', '"'],
]);

/**
 * Owns both faces, turns characters into cached extruded geometry, and answers
 * the metric questions the layout engine asks (advance widths, wrapping).
 */
export class Typeface {
  static async load(baseUrl = import.meta.env?.BASE_URL ?? './') {
    const loader = new FontLoader();
    const prefix = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const [display, body] = await Promise.all([
      loader.loadAsync(prefix + FONT_FILES.display),
      loader.loadAsync(prefix + FONT_FILES.body),
    ]);
    return new Typeface({ display, body });
  }

  constructor(fonts) {
    this.fonts = fonts;
    this.cache = new Map();
    this.missing = new Set();
  }

  /** Rewrites text so every remaining character can actually be drawn. */
  sanitize(text, fontKey = 'body') {
    const glyphs = this.fonts[fontKey].data.glyphs;
    let out = '';
    for (const ch of text.normalize('NFC')) {
      if (ch === '\n') {
        out += ch;
        continue;
      }
      const folded = FOLD.has(ch) ? FOLD.get(ch) : ch;
      for (const c of folded) {
        if (glyphs[c]) out += c;
        else if (/\s/.test(c)) out += ' ';
        else this.missing.add(c);
      }
    }
    return out;
  }

  /** Advance width of a character in em units (size 1). */
  advance(fontKey, char) {
    const data = this.fonts[fontKey].data;
    const glyph = data.glyphs[char] ?? data.glyphs['?'];
    return glyph ? glyph.ha / data.resolution : 0;
  }

  /** Width of a string in world units for a given type style. */
  measure(text, style) {
    let w = 0;
    for (const ch of text) w += (this.advance(style.font, ch) + style.tracking) * style.size;
    return w - (text.length ? style.tracking * style.size : 0);
  }

  /**
   * Extruded geometry for one character at em size 1, recentred on its own
   * bounding box so it can be spun about its middle.
   * @returns {{geometry: ExtrudeGeometry, cx: number, cy: number, w: number, h: number}|null}
   */
  glyph(fontKey, char, profileKey) {
    if (char === ' ') return null;
    const key = `${fontKey}|${profileKey}|${char}`;
    const hit = this.cache.get(key);
    if (hit) return hit;

    const font = this.fonts[fontKey];
    const shapes = font.generateShapes(char, 1);
    if (!shapes.length) return null;

    const profile = PROFILES[profileKey];
    const geometry = new ExtrudeGeometry(shapes, {
      depth: profile.depth,
      bevelEnabled: true,
      bevelThickness: profile.bevelThickness,
      bevelSize: profile.bevelSize,
      bevelOffset: 0,
      bevelSegments: profile.bevelSegments,
      curveSegments: profile.curveSegments,
      steps: 1,
    });

    geometry.computeBoundingBox();
    const bb = geometry.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const cz = (bb.min.z + bb.max.z) / 2;
    geometry.translate(-cx, -cy, -cz);

    const entry = {
      geometry,
      cx,
      cy,
      w: bb.max.x - bb.min.x,
      h: bb.max.y - bb.min.y,
    };
    this.cache.set(key, entry);
    return entry;
  }

  /** Greedy word wrap; over-long single words are split by character. */
  wrap(text, style) {
    const max = style.wrap;
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';

    const push = () => {
      if (line) lines.push(line);
      line = '';
    };

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (this.measure(candidate, style) <= max || !line) {
        if (this.measure(word, style) > max && !line) {
          // Hard-break a word that cannot fit on its own line.
          let chunk = '';
          for (const ch of word) {
            if (this.measure(chunk + ch, style) > max && chunk) {
              lines.push(chunk);
              chunk = '';
            }
            chunk += ch;
          }
          line = chunk;
        } else {
          line = candidate;
        }
      } else {
        push();
        line = word;
      }
    }
    push();
    return lines.length ? lines : [''];
  }

  dispose() {
    for (const entry of this.cache.values()) entry.geometry.dispose();
    this.cache.clear();
  }
}
