// Map definitions. Layouts are painted with a tiny builder rather than hand
// typed character grids — far easier to keep consistent.

class Painter {
  constructor(w, h, fill = '.', objFill = '.') {
    this.w = w;
    this.h = h;
    this.g = Array.from({ length: h }, () => new Array(w).fill(fill));
    this.o = Array.from({ length: h }, () => new Array(w).fill(objFill));
  }
  set(x, y, ch) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.g[y][x] = ch;
  }
  rect(x, y, w, h, ch) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, ch);
    return this;
  }
  hline(x, y, len, ch) { return this.rect(x, y, len, 1, ch); }
  vline(x, y, len, ch) { return this.rect(x, y, 1, len, ch); }
  border(ch) {
    this.rect(0, 0, this.w, 1, ch);
    this.rect(0, this.h - 1, this.w, 1, ch);
    this.rect(0, 0, 1, this.h, ch);
    this.rect(this.w - 1, 0, 1, this.h, ch);
    return this;
  }
  obj(x, y, ch) {
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.o[y][x] = ch;
    return this;
  }
  objRow(x, y, len, ch, step = 1) {
    for (let i = 0; i < len; i += step) this.obj(x + i, y, ch);
    return this;
  }
  objCol(x, y, len, ch, step = 1) {
    for (let i = 0; i < len; i += step) this.obj(x, y + i, ch);
    return this;
  }
  /** Scatter a character deterministically inside a rect. */
  scatter(x, y, w, h, ch, n, seed = 1) {
    let s = seed * 2654435761;
    for (let i = 0; i < n; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const px = x + (s >>> 7) % w;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const py = y + (s >>> 7) % h;
      this.set(px, py, ch);
    }
    return this;
  }
  /**
   * Deterministically scatter props on open grass. Keeps clear of roads,
   * anything already placed, and a margin around every doorway, so the town
   * gets dense without ever walling the player in.
   */
  scatterObjs(chars, count, seed, keepClear = []) {
    let s = (seed * 2654435761) >>> 0;
    const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return (s >>> 7) / 0x1000000; };
    let placed = 0;
    for (let tries = 0; tries < count * 40 && placed < count; tries++) {
      const x = Math.floor(rnd() * this.w);
      const y = Math.floor(rnd() * this.h);
      const g = this.g[y][x];
      if (g !== '.' && g !== ',') continue;
      if (this.o[y][x] !== '.') continue;
      let blocked = false;
      for (let dy = -1; dy <= 1 && !blocked; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= this.w || ny >= this.h) continue;
          if (this.g[ny][nx] === ':') { blocked = true; break; }   // keep roads open
          if (this.o[ny][nx] !== '.') { blocked = true; break; }   // no clumping
        }
      }
      if (blocked) continue;
      if (keepClear.some(([kx, ky, r]) => Math.abs(kx - x) <= r && Math.abs(ky - y) <= r)) continue;
      this.obj(x, y, chars[Math.floor(rnd() * chars.length)]);
      placed++;
    }
    return this;
  }

  ground() { return this.g.map((r) => r.join('')); }
  objs() { return this.o.map((r) => r.join('')); }
}

// ---------------------------------------------------------------------------
/** Shared interior shell: 15x11 so it exactly fills the screen. */
function room(w, h, floor, doorX) {
  const p = new Painter(w, h, floor);
  p.rect(0, 0, w, 2, 'W');
  p.vline(0, 0, h, 'W');
  p.vline(w - 1, 0, h, 'W');
  p.hline(0, h - 1, w, 'W');
  p.set(doorX, h - 1, floor);
  p.obj(doorX, h - 1, 'D');
  p.obj(doorX, h - 2, '.');
  return p;
}

function homeInterior() {
  const p = room(15, 11, 'w', 7);
  p.rect(4, 5, 5, 4, 'c');
  p.obj(1, 2, 'k'); p.obj(2, 2, 'k');
  p.obj(5, 2, 'v');
  p.obj(12, 2, 'b');          // bed (2 tall)
  p.obj(9, 2, 'l');
  p.obj(5, 5, 'a');           // table, 2 wide
  p.obj(5, 7, 'C');
  p.obj(1, 8, 'x');
  p.obj(13, 8, 'l');
  return {
    id: 'home', name: 'YOUR HOUSE', indoor: true, music: 'town',
    ground: p.ground(), objs: p.objs(),
    warps: [{ x: 7, y: 10, to: 'hearthstead', tx: 4, ty: 9, dir: 0, kind: 'door' }],
    npcs: [{
      x: 3, y: 7, dir: 3, pal: 'mom', name: 'MOM', face: true,
      lines: [
        'MOM: There you are! PROFESSOR YARROW came by twice this morning.',
        'MOM: She said the WILDBOOK is finally bound and there is one with your name in it.',
        'MOM: Go on — the STUDY is the green-roofed one by the north path.',
      ],
    }],
    signs: [
      { x: 5, y: 2, text: 'The screen shows a KINDRED sleeping in a field. It has been on all week.' },
    ],
  };
}

function neighbourHouse() {
  const p = room(15, 11, 'w', 7);
  p.obj(1, 2, 'k'); p.obj(2, 2, 'k'); p.obj(3, 2, 'k');
  p.obj(12, 2, 'b');
  p.obj(6, 5, 'a');
  p.obj(1, 8, 'x'); p.obj(2, 8, 'x');
  p.obj(13, 7, 'l');
  p.obj(9, 2, 'v');
  return {
    id: 'house1', name: 'HEARTHSTEAD HOUSE', indoor: true, music: 'town',
    ground: p.ground(), objs: p.objs(),
    warps: [{ x: 7, y: 10, to: 'hearthstead', tx: 10, ty: 9, dir: 0, kind: 'door' }],
    npcs: [
      { x: 10, y: 6, dir: 2, pal: 'elder', name: 'GRAN', face: true,
        lines: [
          'GRAN: In my day we called them the KINDRED. Nobody wrote them down.',
          'GRAN: A creature you have properly met will not run from you. Remember that.',
        ] },
      { x: 4, y: 5, dir: 0, pal: 'villager2', name: 'BOY', face: true, move: 'look',
        lines: [
          'BOY: Tall grass is full of them! Walk through it and something always turns up.',
          'BOY: If your KINDRED are worn out, the REST HALL fixes them for free. Wild, right?',
        ] },
    ],
  };
}

function study() {
  const p = room(15, 11, 'L', 7);
  p.obj(1, 2, 'k'); p.obj(2, 2, 'k'); p.obj(3, 2, 'k');
  p.obj(11, 2, 'k'); p.obj(12, 2, 'k'); p.obj(13, 2, 'k');
  p.obj(1, 6, 'd');           // lab desk, 2 wide
  p.obj(12, 6, 'd');
  p.obj(5, 5, 'd');           // the starter bench: covers x=5,6
  p.obj(7, 5, 'd');           // covers x=7,8
  p.obj(1, 9, 'x');
  p.obj(13, 9, 'l');
  return {
    id: 'study', name: "YARROW'S STUDY", indoor: true, music: 'hall',
    ground: p.ground(), objs: p.objs(),
    warps: [{ x: 7, y: 10, to: 'hearthstead', tx: 19, ty: 8, dir: 0, kind: 'door' }],
    npcs: [
      { x: 7, y: 4, dir: 0, pal: 'prof', name: 'YARROW', face: true, action: 'yarrow' },
    ],
    objects: [
      { x: 5, y: 5, action: 'starter', which: 'sproutle' },
      { x: 6, y: 5, action: 'starter', which: 'emberet' },
      { x: 7, y: 5, action: 'starter', which: 'rilldrop' },
    ],
    signs: [
      { x: 12, y: 2, text: 'A shelf of field journals. Most of the spines say YARROW.' },
      { x: 2, y: 2, text: 'Pressed leaves, labelled in a hand too small to read.' },
    ],
  };
}

function restHall() {
  const p = new Painter(15, 11, 'w');
  p.rect(0, 0, 15, 2, 'W');
  p.vline(0, 0, 11, 'W');
  p.vline(14, 0, 11, 'W');
  p.hline(0, 10, 15, 'W');
  p.set(7, 10, 'w');
  p.obj(7, 10, 'D');
  p.rect(1, 4, 4, 1, 'K');    // healing counter
  p.rect(10, 4, 4, 1, 'K');   // supply counter
  p.rect(5, 7, 5, 3, 'c');
  p.obj(1, 2, 'h');           // heal machine, 2 wide
  p.obj(11, 2, 'x'); p.obj(12, 2, 'x');
  p.obj(6, 2, 'l'); p.obj(8, 2, 'l');
  return {
    id: 'resthall', name: 'REST HALL', indoor: true, music: 'hall',
    ground: p.ground(), objs: p.objs(),
    warps: [{ x: 7, y: 10, to: 'hearthstead', tx: 7, ty: 19, dir: 0, kind: 'door' }],
    npcs: [
      { x: 2, y: 3, dir: 0, pal: 'nurse', name: 'WARDEN OF REST', action: 'heal' },
      { x: 11, y: 3, dir: 0, pal: 'clerk', name: 'SUPPLIER', action: 'shop' },
      { x: 11, y: 8, dir: 2, pal: 'trainer_bug', name: 'FORAGER', face: true,
        lines: ['FORAGER: Rest here before the HOLLOW. Nobody comes out of it on the first try.'] },
    ],
    signs: [],
  };
}

function hearthstead() {
  const W = 28;
  const H = 24;
  const p = new Painter(W, H, '.');
  // north road out of town
  p.rect(13, 0, 2, 22, ':');
  // main east-west road
  p.hline(3, 9, 20, ':');
  p.hline(6, 18, 15, ':');
  // door approaches
  p.vline(4, 8, 1, ':');
  p.vline(10, 8, 1, ':');
  p.vline(19, 7, 2, ':');
  p.vline(19, 17, 1, ':');
  // pond
  p.rect(2, 19, 5, 4, '_');
  p.rect(3, 20, 3, 2, '~');
  // decorative flowers
  p.set(8, 11, ','); p.set(9, 12, ','); p.set(20, 11, ','); p.set(21, 12, ',');
  p.set(3, 12, ','); p.set(24, 20, ','); p.set(23, 6, ',');
  // tree wall
  p.objRow(0, 0, 12, 'T', 2);
  p.objRow(15, 0, 12, 'T', 2);
  p.obj(27, 0, 't');
  p.objCol(0, 1, 22, 'T', 2);
  p.objCol(26, 1, 22, 'T', 2);
  p.objRow(0, 23, 28, 'T', 2);
  // town dressing
  p.obj(6, 8, 's');          // sign by the player's house
  p.obj(16, 8, 's');         // sign by the study
  p.obj(8, 18, 's');
  p.obj(2, 13, 't'); p.obj(24, 13, 't'); p.obj(23, 21, 't');
  p.obj(11, 20, 'r'); p.obj(22, 3, 'r');
  p.obj(7, 4, 'p'); p.obj(12, 12, 'p'); p.obj(17, 20, 'p');
  p.obj(9, 3, 'Y'); p.obj(23, 16, 'Y'); p.obj(3, 16, 'Y');
  for (let x = 8; x <= 12; x++) p.obj(x, 22, 'f');
  // garden fences either side of the road, as in the reference
  for (let x = 2; x <= 4; x++) p.obj(x, 4, 'f');
  for (let x = 22; x <= 24; x++) p.obj(x, 11, 'f');
  // flower beds and hedges, then a loose scatter of small trees and bushes
  p.obj(2, 10, 'p'); p.obj(24, 8, 'p'); p.obj(6, 21, 'p'); p.obj(21, 22, 'p');
  p.scatterObjs(['y', 'u', 't', 'p', 'p'], 26, 991, [
    [4, 8, 2], [10, 8, 2], [19, 7, 2], [7, 18, 2], [19, 17, 2],
    [13, 0, 2], [14, 0, 2],
  ]);

  return {
    id: 'hearthstead', name: 'HEARTHSTEAD', music: 'town',
    ground: p.ground(), objs: p.objs(),
    structures: [
      { type: 'house_red', x: 3, y: 6 },
      { type: 'house_blue', x: 9, y: 6 },
      { type: 'study', x: 17, y: 4 },
      { type: 'rest_hall', x: 5, y: 15 },
      { type: 'house_green', x: 18, y: 15 },
    ],
    warps: [
      { x: 4, y: 8, to: 'home', tx: 7, ty: 9, dir: 1, kind: 'door' },
      { x: 10, y: 8, to: 'house1', tx: 7, ty: 9, dir: 1, kind: 'door' },
      { x: 19, y: 7, to: 'study', tx: 7, ty: 9, dir: 1, kind: 'door' },
      { x: 7, y: 18, to: 'resthall', tx: 7, ty: 9, dir: 1, kind: 'door' },
      { x: 19, y: 17, to: 'house1', tx: 7, ty: 9, dir: 1, kind: 'door' },
      { x: 13, y: 0, to: 'route1', tx: 9, ty: 34, dir: 1, kind: 'edge' },
      { x: 14, y: 0, to: 'route1', tx: 10, ty: 34, dir: 1, kind: 'edge' },
    ],
    signs: [
      { x: 6, y: 8, text: 'HEARTHSTEAD\nWhere the road north begins and, mostly, ends.' },
      { x: 16, y: 8, text: "YARROW'S STUDY\nKnock. Then knock louder." },
      { x: 8, y: 18, text: 'REST HALL\nYour KINDRED rest free. You pay for tea.' },
    ],
    npcs: [
      { x: 16, y: 12, dir: 0, pal: 'villager1', name: 'FARMER', face: true, move: 'wander',
        lines: [
          'FARMER: North of here the grass gets tall and the KINDRED get bold.',
          'FARMER: Never walk it without one of your own. That is not superstition, that is arithmetic.',
        ] },
      { x: 21, y: 19, dir: 2, pal: 'villager2', name: 'TRAVELLER', face: true,
        lines: [
          'TRAVELLER: The HOLLOW at the end of the route? I got three steps in and turned round.',
          'TRAVELLER: Something in there knows the way better than you do.',
        ] },
      { x: 11, y: 10, dir: 1, pal: 'elder', name: 'ELDER', face: true,
        lines: ['ELDER: A BOND ORB only works on a creature that has already decided about you.'] },
    ],
  };
}

function route1() {
  const W = 20;
  const H = 36;
  const p = new Painter(W, H, '.');
  // the road
  p.rect(9, 24, 2, 12, ':');
  p.rect(9, 20, 8, 4, ':');
  p.rect(15, 12, 2, 9, ':');
  p.rect(6, 10, 11, 3, ':');
  p.rect(6, 4, 2, 7, ':');
  p.rect(6, 3, 5, 2, ':');
  p.rect(9, 1, 2, 3, ':');
  // grass fields
  p.rect(2, 26, 6, 7, '"');
  p.rect(12, 26, 6, 6, '"');
  p.rect(11, 14, 4, 5, '"');
  p.rect(12, 4, 6, 5, '"');
  p.rect(2, 6, 3, 3, '"');
  // ledges: a one-way drop back toward town
  p.hline(11, 25, 6, 'l');
  // A raised bluff on the west shoulder. Dirt cliff all the way round, so the
  // ladder on its south face is the only way up.
  p.rect(0, 13, 9, 8, 'F');
  p.rect(1, 14, 7, 5, '.');
  p.rect(2, 14, 6, 4, '"');
  p.set(4, 19, 'A');
  p.set(4, 20, 'A');
  // cliff wall across the north with the hollow mouth in it
  p.rect(0, 0, W, 1, 'F');
  p.rect(11, 0, 9, 3, 'F');
  p.rect(0, 0, 6, 3, 'F');
  p.rect(9, 0, 2, 1, ':');
  // a stream across the meadow, with the road bridging it
  p.rect(0, 29, 20, 2, '~');
  p.rect(9, 29, 2, 2, 'B');
  p.set(4, 23, ','); p.set(13, 22, ','); p.set(8, 35, ',');

  // tree walls
  p.objCol(0, 3, 33, 'T', 2);
  p.objCol(18, 3, 33, 'T', 2);
  p.objRow(0, 35, 20, 'T', 2);
  p.obj(9, 35, '.'); p.obj(10, 35, '.');
  // scattered woodland
  p.obj(4, 34, 'Y'); p.obj(14, 34, 'T'); p.obj(2, 24, 'Y'); p.obj(15, 23, 'T');
  p.obj(3, 12, 'T'); p.obj(12, 12, 'Y'); p.obj(2, 3, 'T'); p.obj(16, 9, 'Y');
  p.obj(6, 15, 't'); p.obj(13, 30, 't'); p.obj(4, 30, 'r'); p.obj(16, 16, 'r');
  p.obj(8, 22, 'r'); p.obj(11, 6, 't'); p.obj(3, 9, '-');
  p.obj(8, 29, 'F'); p.obj(8, 30, 'F');
  p.obj(11, 29, 'F'); p.obj(11, 30, 'F');
  p.obj(12, 34, 's');
  p.obj(8, 2, 'm');          // the hollow's mouth
  p.obj(5, 15, 'o');         // the reward for climbing the bluff
  p.obj(17, 27, 'o');
  p.scatterObjs(['y', 'u', 't', 'p', 'r'], 30, 4242, [
    [9, 35, 2], [10, 35, 2], [9, 0, 2], [10, 0, 2],
    [6, 27, 2], [13, 16, 2], [9, 6, 2], [5, 15, 1], [17, 27, 1], [9, 30, 3], [10, 30, 3],
    [4, 18, 1], [4, 20, 1],
  ]);

  return {
    id: 'route1', name: 'ROUTE 1 - LONG MEADOW', music: 'route',
    ground: p.ground(), objs: p.objs(),
    warps: [
      { x: 9, y: 35, to: 'hearthstead', tx: 13, ty: 1, dir: 0, kind: 'edge' },
      { x: 10, y: 35, to: 'hearthstead', tx: 14, ty: 1, dir: 0, kind: 'edge' },
      { x: 9, y: 0, to: 'hollow', tx: 12, ty: 20, dir: 1, kind: 'cave' },
      { x: 10, y: 0, to: 'hollow', tx: 13, ty: 20, dir: 1, kind: 'cave' },
    ],
    signs: [
      { x: 12, y: 34, text: 'ROUTE 1\nNorth: THE HOLLOW. Keep to the road after dark.' },
    ],
    items: [
      { x: 5, y: 15, item: 'bondorb', count: 3, flag: 'r1_orbs' },
      { x: 17, y: 27, item: 'tonic', count: 1, flag: 'r1_tonic' },
    ],
    npcs: [
      { x: 6, y: 27, dir: 3, pal: 'trainer_bug', name: 'FORAGER PIP', kind: 'trainer',
        sight: 4, flag: 'trainer_pip',
        intro: 'PIP: You are walking my grass! That is a challenge where I come from!',
        defeat: 'PIP: Fair. Very fair.',
        after: 'PIP: The grass over the ledge has different KINDRED in it. Warmer ones.',
        reward: 320,
        team: [['voltpip', 5], ['wispwing', 6]] },
      { x: 13, y: 16, dir: 2, pal: 'trainer_hiker', name: 'HIKER BRAM', kind: 'trainer',
        sight: 4, flag: 'trainer_bram',
        intro: 'BRAM: Road ends at the HOLLOW. Let me see if you should be going in.',
        defeat: 'BRAM: All right. You should be going in.',
        after: 'BRAM: Stone KINDRED shrug off fire. Take something green or wet down there.',
        reward: 480,
        team: [['pebblit', 7], ['pebblit', 7], ['shadeling', 8]] },
      { x: 9, y: 6, dir: 0, pal: 'rival', name: 'WREN', kind: 'trainer',
        sight: 0, flag: 'rival_route',
        intro: "WREN: Knew you'd come this way. YARROW gave me one too, you know.\nWREN: Let's see whose is further along.",
        defeat: "WREN: …Fine. Yours is further along.",
        after: "WREN: I'm going in ahead of you. Try to keep up.",
        reward: 700,
        rival: true,
        team: [['voltpip', 8], ['RIVAL_STARTER', 9]] },
      { x: 3, y: 21, dir: 0, pal: 'villager1', name: 'WALKER', face: true, move: 'wander',
        lines: ['WALKER: Ledges only go one way. Saves your knees on the way home.',
                'WALKER: There is a ladder up that bluff. Somebody left a stash on top.'] },
    ],
    encounters: {
      rate: 0.11,
      table: [
        { id: 'voltpip', min: 3, max: 6, w: 26 },
        { id: 'wispwing', min: 3, max: 6, w: 26 },
        { id: 'pebblit', min: 4, max: 7, w: 20 },
        { id: 'shadeling', min: 4, max: 6, w: 14 },
        { id: 'sproutle', min: 4, max: 6, w: 5 },
        { id: 'emberet', min: 4, max: 6, w: 5 },
        { id: 'rilldrop', min: 4, max: 6, w: 4 },
      ],
    },
  };
}

function hollow() {
  const W = 26;
  const H = 22;
  const p = new Painter(W, H, 'X');
  // carved chambers
  p.rect(9, 15, 8, 6, '#');
  p.rect(3, 12, 20, 4, '#');
  p.rect(3, 5, 5, 8, '#');
  p.rect(3, 4, 12, 3, '#');
  p.rect(18, 5, 5, 8, '#');
  p.rect(12, 4, 11, 3, '#');
  p.rect(9, 8, 8, 5, '#');
  // underground pool
  p.rect(19, 9, 3, 3, '=');
  p.rect(4, 9, 2, 2, '=');
  // the deep floor where AURELITH waits
  p.rect(10, 1, 6, 4, '#');
  p.set(12, 20, '#'); p.set(13, 20, '#');
  p.obj(6, 14, 'r'); p.obj(20, 14, 'r'); p.obj(11, 10, 'r');
  p.obj(15, 6, 'r'); p.obj(4, 7, 'r'); p.obj(21, 7, 'r');
  p.obj(14, 17, 'x'); p.obj(10, 18, 'x');
  p.obj(13, 13, 'o');

  return {
    id: 'hollow', name: 'THE HOLLOW', music: 'cave', dark: 1, indoor: true,
    ground: p.ground(), objs: p.objs(),
    warps: [
      { x: 12, y: 20, to: 'route1', tx: 9, ty: 1, dir: 0, kind: 'cave' },
      { x: 13, y: 20, to: 'route1', tx: 10, ty: 1, dir: 0, kind: 'cave' },
    ],
    items: [
      { x: 13, y: 13, item: 'greatorb', count: 2, flag: 'hollow_orbs' },
    ],
    npcs: [
      { x: 12, y: 6, dir: 0, pal: 'elder', name: 'HOLLOW WARDEN', kind: 'trainer',
        sight: 3, flag: 'warden',
        intro: 'WARDEN: Far enough. What lives past this point does not want visitors.\nWARDEN: Show me you can look after yourself.',
        defeat: 'WARDEN: …Then go. Quietly.',
        after: 'WARDEN: It only shows itself to someone who came the whole way on their own feet.',
        reward: 1600,
        team: [['boulderon', 16], ['duskmaw', 17], ['galehawk', 18]] },
    ],
    statics: [
      { x: 12, y: 2, species: 'aurelith', level: 22, flag: 'aurelith', music: 'boss',
        pre: 'Something is folded up in the dark at the end of the hollow.\nIt unfolds.' },
    ],
    encounters: {
      rate: 0.13,
      table: [
        { id: 'pebblit', min: 9, max: 13, w: 24 },
        { id: 'shadeling', min: 9, max: 13, w: 22 },
        { id: 'boulderon', min: 13, max: 16, w: 10 },
        { id: 'voltpip', min: 10, max: 13, w: 14 },
        { id: 'wispwing', min: 10, max: 13, w: 14 },
        { id: 'duskmaw', min: 14, max: 16, w: 6 },
        { id: 'rilldrop', min: 10, max: 13, w: 10 },
      ],
    },
  };
}

export const MAP_DEFS = {
  home: homeInterior(),
  house1: neighbourHouse(),
  study: study(),
  resthall: restHall(),
  hearthstead: hearthstead(),
  route1: route1(),
  hollow: hollow(),
};
