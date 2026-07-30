/**
 * Turns an arbitrary blob of text into typed blocks. Nothing here is required
 * markup — the point is that plain pasted prose still lands with a sensible
 * hierarchy, while light Markdown-ish hints (#, -, >, "key: value") are honoured
 * when they happen to be there.
 */

const BULLET = /^\s*(?:[-*•‣–—]|\d{1,2}[.)])\s+(.*)$/;
const HEADING = /^\s*(#{1,6})\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const DIVIDER = /^\s*(?:---+|===+|\*\*\*+|___+)\s*$/;
const KV = /^\s*([A-Za-z][A-Za-z0-9 /&'()+-]{0,28}):\s+(\S.*)$/;
const SETEXT = /^\s*(?:=+|-{3,})\s*$/;
/** A line that is essentially one number: 78%, 1493, €2.4bn, 12 000 t. */
const STAT = /^\s*([€$£¥]?\s?[0-9][0-9 .,]*(?:\s?[%‰]|\s?(?:k|m|bn|tn|kg|t|ha|km|mi|yr|BCE|CE|BC|AD)\b)?)\s*(?:[—–-]\s*(.*))?$/i;

const stripEmphasis = (s) =>
  s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/(^|\W)[*_](\S[^*_]*?)[*_](\W|$)/g, '$1$2$3')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .trim();

const isShouty = (s) => s.length > 2 && s === s.toUpperCase() && /[A-Z]/.test(s);

/**
 * @param {string} raw
 * @returns {Array<object>} blocks
 */
export function parseContent(raw) {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  let bullets = [];
  let quote = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const text = stripEmphasis(paragraph.join(' '));
    if (text) blocks.push({ kind: 'body', text });
    paragraph = [];
  };
  const flushBullets = () => {
    if (!bullets.length) return;
    blocks.push({ kind: 'bullets', items: bullets.slice() });
    bullets = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    blocks.push({ kind: 'quote', text: stripEmphasis(quote.join(' ')) });
    quote = [];
  };
  const flushAll = () => {
    flushParagraph();
    flushBullets();
    flushQuote();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    if (DIVIDER.test(trimmed) && !paragraph.length) {
      flushAll();
      blocks.push({ kind: 'divider' });
      continue;
    }

    // "Heading\n=======" / "Heading\n-------"
    const next = lines[i + 1];
    if (next !== undefined && SETEXT.test(next) && !BULLET.test(line) && trimmed.length < 90) {
      flushAll();
      blocks.push({
        kind: 'heading',
        level: next.trim().startsWith('=') ? 1 : 2,
        text: stripEmphasis(trimmed),
      });
      i++;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushAll();
      blocks.push({
        kind: 'heading',
        level: heading[1].length,
        text: stripEmphasis(heading[2]),
      });
      continue;
    }

    const quoted = QUOTE.exec(line);
    if (quoted) {
      flushParagraph();
      flushBullets();
      quote.push(stripEmphasis(quoted[1]));
      continue;
    }
    flushQuote();

    const bullet = BULLET.exec(line);
    if (bullet) {
      flushParagraph();
      const item = stripEmphasis(bullet[1]);
      if (item) bullets.push(item);
      continue;
    }
    flushBullets();

    // A short standalone numeric line becomes a hero statistic.
    if (!paragraph.length && trimmed.length <= 34) {
      const stat = STAT.exec(trimmed);
      if (stat && /\d/.test(stat[1])) {
        flushAll();
        blocks.push({
          kind: 'stat',
          value: stat[1].replace(/\s+/g, ' ').trim(),
          label: stat[2] ? stripEmphasis(stat[2]) : '',
        });
        continue;
      }
    }

    const kv = KV.exec(line);
    if (kv && !paragraph.length && kv[2].length <= 64 && !/https?$/i.test(kv[1])) {
      flushAll();
      blocks.push({ kind: 'kv', key: stripEmphasis(kv[1]), value: stripEmphasis(kv[2]) });
      continue;
    }

    // An all-caps or short lone line reads as a heading even without markup.
    if (!paragraph.length && (isShouty(trimmed) || (trimmed.length <= 44 && !/[.;:,]$/.test(trimmed) && looksStandalone(lines, i)))) {
      flushAll();
      blocks.push({ kind: 'heading', level: isShouty(trimmed) ? 2 : 3, text: stripEmphasis(trimmed) });
      continue;
    }

    paragraph.push(trimmed);
  }

  flushAll();

  // The first heading in the document is promoted to the opening title card.
  const firstHeading = blocks.findIndex((b) => b.kind === 'heading');
  if (firstHeading !== -1 && firstHeading <= 1) {
    blocks[firstHeading] = { kind: 'title', text: blocks[firstHeading].text };
  } else if (blocks.length && blocks[0].kind === 'body' && blocks[0].text.length <= 70) {
    blocks[0] = { kind: 'title', text: blocks[0].text };
  }

  return blocks;
}

/** True when the line is surrounded by blank lines (or document edges). */
function looksStandalone(lines, i) {
  const before = i === 0 || !lines[i - 1].trim();
  const after = i === lines.length - 1 || !lines[i + 1].trim();
  return before && after;
}
