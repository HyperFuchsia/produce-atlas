import { TYPE, WORLD } from '../config.js';
import { parseContent } from './parse.js';

/** Vertical room a single card may occupy, in world units. */
const MAX_CARD_HEIGHT = 8.8;
const CAP = 0.72; // cap height as a fraction of the type size

/** Current layout frame; set for the duration of a compose pass. */
let frame = { wrapScale: 1 };

/** Applies the frame's measure to a style, leaving the original untouched. */
function scaled(style) {
  return frame.wrapScale === 1 ? style : { ...style, wrap: style.wrap * frame.wrapScale };
}

function styleFor(kind, block) {
  switch (kind) {
    case 'title':
      return scaled(TYPE.title);
    case 'heading': {
      const level = block?.level ?? 2;
      if (level <= 2) return scaled(TYPE.heading);
      return scaled({ ...TYPE.heading, size: TYPE.heading.size * 0.78 });
    }
    case 'bullets':
      return scaled(TYPE.bullet);
    case 'quote':
      return scaled(TYPE.quote);
    case 'stat':
      return scaled(TYPE.stat);
    case 'label':
      return scaled(TYPE.label);
    case 'kvValue':
      return scaled(TYPE.kvValue);
    default:
      return scaled(TYPE.body);
  }
}

/**
 * Expands one block into a flat list of typeset lines.
 * @returns {Array<{style: object, text: string, gapBefore: number, marker?: boolean, rule?: boolean, divider?: boolean, groupKey: number}>}
 */
function linesForBlock(block, typeface, groupKey) {
  const out = [];

  const add = (style, text, gapBefore, extra = {}) =>
    out.push({ style, text: typeface.sanitize(text, style.font), gapBefore, groupKey, ...extra });

  switch (block.kind) {
    case 'title': {
      const style = styleFor('title');
      const wrapped = typeface.wrap(typeface.sanitize(block.text, style.font), style);
      wrapped.forEach((line, i) => add(style, line, i === 0 ? 0 : 0.1));
      out[out.length - 1].rule = true;
      break;
    }
    case 'heading': {
      const style = styleFor('heading', block);
      const wrapped = typeface.wrap(typeface.sanitize(block.text, style.font), style);
      wrapped.forEach((line, i) => add(style, line, i === 0 ? 0.5 : 0.08));
      out[out.length - 1].rule = true;
      break;
    }
    case 'stat': {
      const style = styleFor('stat');
      add(style, block.value, 0.5);
      if (block.label) {
        add(styleFor('label'), block.label.toUpperCase(), 0.28);
      }
      break;
    }
    case 'kv': {
      add(styleFor('label'), block.key.toUpperCase(), 0.5);
      const style = styleFor('kvValue');
      const wrapped = typeface.wrap(typeface.sanitize(block.value, style.font), style);
      wrapped.forEach((line, i) => add(style, line, i === 0 ? 0.12 : 0.05));
      break;
    }
    case 'quote': {
      const style = styleFor('quote');
      const wrapped = typeface.wrap(typeface.sanitize(`"${block.text}"`, style.font), style);
      wrapped.forEach((line, i) => add(style, line, i === 0 ? 0.6 : 0.05));
      break;
    }
    case 'bullets': {
      const style = styleFor('bullets');
      block.items.forEach((item, index) => {
        const wrapped = typeface.wrap(typeface.sanitize(item, style.font), style);
        wrapped.forEach((line, i) =>
          add(style, line, i === 0 ? (index === 0 ? 0.5 : 0.3) : 0.02, { marker: i === 0 }),
        );
      });
      break;
    }
    case 'divider': {
      out.push({ style: styleFor('label'), text: '', gapBefore: 0.7, divider: true, groupKey });
      break;
    }
    default: {
      const style = styleFor('body');
      const wrapped = typeface.wrap(typeface.sanitize(block.text, style.font), style);
      wrapped.forEach((line, i) => add(style, line, i === 0 ? 0.5 : 0.04));
    }
  }

  return out;
}

const lineHeightOf = (line) =>
  line.divider ? 0.3 : line.style.size * line.style.lineHeight;

/** Packs typeset lines into cards that fit the reading frame. */
function packCards(blocks, typeface) {
  const cards = [];
  let current = { lines: [], height: 0, kinds: new Set() };
  let groupKey = 0;

  const commit = () => {
    if (current.lines.length) cards.push(current);
    current = { lines: [], height: 0, kinds: new Set() };
  };

  for (const block of blocks) {
    const lines = linesForBlock(block, typeface, groupKey++);
    if (!lines.length) continue;

    // Headlines and hero numbers always open a fresh card.
    const startsCard = block.kind === 'title' || block.kind === 'heading' || block.kind === 'stat';
    if (startsCard && current.lines.length) commit();

    for (const line of lines) {
      const h = lineHeightOf(line) + line.gapBefore;
      if (current.height + h > MAX_CARD_HEIGHT && current.lines.length) {
        commit();
        line.gapBefore = 0; // continuation starts clean at the top
      }
      current.lines.push(line);
      current.height += lineHeightOf(line) + line.gapBefore;
      current.kinds.add(block.kind);
    }
  }
  commit();
  return cards;
}

/** Lays a card out into absolute glyph placements centred on its own origin. */
function layoutCard(card, typeface, index) {
  const glyphs = [];
  const rules = [];
  const markers = [];

  // Left-aligned runs share a common left edge, so measure their widest line.
  const groupWidth = new Map();
  for (const line of card.lines) {
    const w = typeface.measure(line.text, line.style);
    groupWidth.set(line.groupKey, Math.max(groupWidth.get(line.groupKey) ?? 0, w));
  }

  let cursor = 0;
  let minX = Infinity;
  let maxX = -Infinity;
  let lineIndex = 0;

  for (const line of card.lines) {
    cursor -= line.gapBefore;
    const { style } = line;
    const baseline = cursor - style.size * CAP;
    const width = typeface.measure(line.text, style);
    const startX =
      style.align === 'left' ? -(groupWidth.get(line.groupKey) ?? width) / 2 : -width / 2;

    if (line.divider) {
      rules.push({ y: baseline + style.size * 0.35, width: 4.5, kind: 'divider' });
      cursor -= lineHeightOf(line);
      continue;
    }

    if (line.marker) {
      markers.push({ x: startX - style.size * 0.62, y: baseline + style.size * 0.26, size: style.size });
      minX = Math.min(minX, startX - style.size * 0.9);
    }

    let pen = startX;
    let col = 0;
    const chars = Array.from(line.text);
    for (const char of chars) {
      const advance = typeface.advance(style.font, char);
      if (char !== ' ') {
        const glyph = typeface.glyph(style.font, char, style.profile);
        if (glyph) {
          glyphs.push({
            char,
            font: style.font,
            profile: style.profile,
            role: style.role,
            size: style.size,
            x: pen + glyph.cx * style.size,
            y: baseline + glyph.cy * style.size,
            line: lineIndex,
            col,
            colCount: chars.length,
          });
        }
      }
      pen += (advance + style.tracking) * style.size;
      col++;
    }

    minX = Math.min(minX, startX);
    maxX = Math.max(maxX, startX + width);

    if (line.rule) {
      rules.push({ y: baseline - style.size * 0.42, width: Math.max(width, 2.5), kind: 'rule' });
    }

    cursor -= lineHeightOf(line);
    lineIndex++;
  }

  const height = -cursor;
  const shift = height / 2;
  for (const g of glyphs) g.y += shift;
  for (const r of rules) r.y += shift;
  for (const m of markers) m.y += shift;

  const headlineLine = card.lines.find((l) => l.style.role === 'title' || l.style.role === 'heading');

  return {
    index,
    glyphs,
    rules,
    markers,
    width: Number.isFinite(minX) ? maxX - minX : 4,
    height,
    lineCount: lineIndex,
    kinds: [...card.kinds],
    headline: headlineLine ? headlineLine.text : card.lines[0]?.text ?? '',
    charCount: glyphs.length,
  };
}

/**
 * Full pipeline: raw text in, laid-out cards out. No WebGL objects are created
 * here — the stage turns these descriptors into meshes on demand.
 */
export function composeCards(raw, typeface, layoutFrame = { wrapScale: 1 }) {
  frame = layoutFrame;
  const blocks = parseContent(raw);
  const cards = packCards(blocks, typeface).map((card, i) => layoutCard(card, typeface, i));

  // Guard against someone pasting a novel.
  let total = 0;
  const kept = [];
  for (const card of cards) {
    if (total + card.charCount > WORLD.maxChars && kept.length) break;
    total += card.charCount;
    kept.push(card);
  }
  kept.forEach((card, i) => {
    card.index = i;
  });

  return { cards: kept, truncated: kept.length < cards.length, glyphCount: total };
}
