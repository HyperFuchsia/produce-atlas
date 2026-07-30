/**
 * Converts TrueType fonts into the three.js "typeface" JSON format so glyphs can
 * be extruded into real 3-D geometry at runtime.
 *
 * Source fonts are not vendored in this repo (only the generated JSON is). To
 * regenerate, drop the TTFs listed in FONTS below into `fonts-src/` and run:
 *
 *     node scripts/build-fonts.mjs
 *
 * Both faces are SIL Open Font License 1.1; the license texts live next to the
 * generated JSON in public/fonts/.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import opentype from 'opentype.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const FONTS = [
  {
    src: 'fonts-src/Orbitron-Bold.ttf',
    out: 'public/fonts/orbitron-bold.typeface.json',
    // The variable-font instancer keeps the Regular name table, so label it here.
    family: 'Orbitron Bold',
  },
  {
    src: 'fonts-src/Rajdhani-SemiBold.ttf',
    out: 'public/fonts/rajdhani-semibold.typeface.json',
    family: 'Rajdhani SemiBold',
  },
];

// Latin glyph coverage plus the punctuation that shows up in pasted prose.
const CHARSET = [
  ...range(0x20, 0x7e), // printable ASCII
  ...range(0xa0, 0xff), // Latin-1 supplement (accents, ±, °, ×, ÷…)
  ...'‘’‚“”„–—…•‹›™€™→←↑↓∞≈≠≤≥',
];

function range(from, to) {
  const out = [];
  for (let c = from; c <= to; c++) out.push(String.fromCharCode(c));
  return out;
}

/** Serialises an opentype path into the compact typeface outline string. */
function outline(path, round) {
  const parts = [];
  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        parts.push('m', round(cmd.x), round(cmd.y));
        break;
      case 'L':
        parts.push('l', round(cmd.x), round(cmd.y));
        break;
      // three.js reads the *end point first*, then the control point(s).
      case 'Q':
        parts.push('q', round(cmd.x), round(cmd.y), round(cmd.x1), round(cmd.y1));
        break;
      case 'C':
        parts.push(
          'b',
          round(cmd.x),
          round(cmd.y),
          round(cmd.x1),
          round(cmd.y1),
          round(cmd.x2),
          round(cmd.y2),
        );
        break;
      case 'Z':
        break; // ShapePath closes sub-paths on its own
      default:
        break;
    }
  }
  return parts.join(' ');
}

function convert(font, familyOverride) {
  const upm = font.unitsPerEm;
  // Normalise every face to a 1000-unit em so type sizes are interchangeable.
  const k = 1000 / upm;
  const round = (v) => Math.round(v * k * 10) / 10;

  const glyphs = {};
  let missing = 0;

  for (const char of CHARSET) {
    const glyph = font.charToGlyph(char);
    if (!glyph || (glyph.index === 0 && char !== ' ')) {
      missing++;
      continue;
    }
    // `glyph.path` is raw font units with y pointing up, which is what the
    // typeface format expects. (`getPath()` would flip y into screen space.)
    const path = glyph.path;
    const bbox = glyph.getBoundingBox();
    glyphs[char] = {
      ha: round(glyph.advanceWidth ?? 0),
      x_min: round(bbox.x1 || 0),
      x_max: round(bbox.x2 || 0),
      o: outline(path, round),
    };
  }

  const head = font.tables.head;
  return {
    data: {
      glyphs,
      familyName: familyOverride ?? font.names.fullName?.en ?? 'unknown',
      ascender: round(font.ascender),
      descender: round(font.descender),
      underlinePosition: round(font.tables.post?.underlinePosition ?? -100),
      underlineThickness: round(font.tables.post?.underlineThickness ?? 50),
      boundingBox: {
        yMin: round(head.yMin),
        xMin: round(head.xMin),
        yMax: round(head.yMax),
        xMax: round(head.xMax),
      },
      resolution: 1000,
      original_font_information: {
        format: 0,
        copyright: font.names.copyright?.en ?? '',
        fontFamily: font.names.fontFamily?.en ?? '',
        fontSubfamily: font.names.fontSubfamily?.en ?? '',
        license: font.names.license?.en ?? '',
      },
    },
    stats: { glyphs: Object.keys(glyphs).length, missing },
  };
}

for (const { src, out, family } of FONTS) {
  const buf = readFileSync(resolve(root, src));
  const font = opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
  const { data, stats } = convert(font, family);
  writeFileSync(resolve(root, out), JSON.stringify(data));
  const kb = (JSON.stringify(data).length / 1024).toFixed(0);
  console.log(
    `${data.familyName}: ${stats.glyphs} glyphs (${stats.missing} unavailable) -> ${out} (${kb} kB)`,
  );
}
