import { SCREEN_W, SCREEN_H, TILE, DIR, DIR_VEC, DIR_NAME, WALK_MS, RUN_MS } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { makeCanvas } from '../core/screen.js';
import { Coro, wait } from '../core/coro.js';
import { rng } from '../core/rng.js';
import { clamp, easeOutQuad } from '../core/util.js';
import { PAL } from '../gfx/palette.js';
import { drawText, drawTextCentered } from '../gfx/font.js';
import { drawWindow } from '../gfx/ui.js';
import { getWalker } from '../gfx/chars.js';
import { tallGrassFront } from '../gfx/terrain.js';
import { buildMap, TILES } from '../world/tilemap.js';
import { MAP_DEFS } from '../world/maps.js';
import { Dialog } from '../game/dialog.js';
import { app } from '../game/app.js';
import {
  G, flag, setFlag, addItem, healParty, addToParty, markSeen,
} from '../game/state.js';
import { makeCreature } from '../game/creature.js';
import { SPECIES } from '../data/species.js';
import { ITEMS } from '../data/items.js';
import { BattleState } from './battle.js';
import { MenuState } from './menu.js';
import { ShopState } from './shop.js';

const mapCache = new Map();
function getMap(id) {
  if (!mapCache.has(id)) mapCache.set(id, buildMap(MAP_DEFS[id]));
  return mapCache.get(id);
}

const OPPOSITE = [1, 0, 3, 2];
const RIVAL_PICK = { sproutle: 'emberet', emberet: 'rilldrop', rilldrop: 'sproutle' };

function makeDarkMask(radius) {
  const c = makeCanvas(SCREEN_W * 2, SCREEN_H * 2);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(8,6,16,0.90)';
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'destination-out';
  const cx = c.width / 2;
  const cy = c.height / 2;
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const d = Math.hypot(x - cx, y - cy) / radius;
      if (d >= 1.25) continue;
      let a = d < 0.6 ? 1 : 1 - (d - 0.6) / 0.65;
      // ordered dither so the falloff stays chunky and period-correct
      a += (((x & 3) * 5 + (y & 3) * 3) % 16) / 16 * 0.16 - 0.08;
      if (a <= 0.02) continue;
      g.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`;
      g.fillRect(x, y, 1, 1);
    }
  }
  return c;
}

let darkMask = null;

export class Overworld {
  constructor() {
    this.dialog = new Dialog();
    this.script = null;
    this.map = null;
    this.frameT = 0;
    this.banner = 0;
    this.bannerText = '';
    this.stepsSinceEncounter = 0;
    this.player = {
      x: G.player.x, y: G.player.y, dir: G.player.dir,
      px: 0, py: 0, moving: false, moveT: 0, moveDur: WALK_MS,
      frame: 0, step: 0, pal: 'player', hop: 0, hopH: 0,
    };
    this.turnDelay = 0;
    this.cam = { x: 0, y: 0 };
    this.pendingBattle = null;
  }

  enter() {
    this.loadMap(G.player.map, G.player.x, G.player.y, G.player.dir, true);
    app.fade.alpha = 1;
    this.script = new Coro(function* (self) {
      yield app.fadeTo(0, 320);
    }, this);
  }

  resume() {
    // Coming back from a battle or a menu.
    if (this.map) audio.playMusic(this.map.music);
    const after = this.afterBattle;
    this.afterBattle = null;
    if (app.fade.alpha > 0 || after) {
      this.startScript(function* (self) {
        if (app.fade.alpha > 0) yield app.fadeTo(0, 380);
        if (after) yield* after(self);
      });
    }
  }

  loadMap(id, x, y, dir, silent = false) {
    this.map = getMap(id);
    G.player.map = id;
    this.player.x = x;
    this.player.y = y;
    this.player.dir = dir ?? this.player.dir;
    this.player.px = 0;
    this.player.py = 0;
    this.player.moving = false;
    this.npcs = (this.map.def.npcs || []).map((n) => ({
      ...n,
      px: 0, py: 0, moving: false, moveT: 0, moveDur: WALK_MS, frame: 0, step: 0,
      hx: n.x, hy: n.y, wanderT: 600 + rng.int(2400),
      defeated: n.flag ? flag(n.flag) : false,
    }));
    this.updateCamera(true);
    audio.playMusic(this.map.music);
    this.banner = 0;
    if (!silent && !this.map.indoor) {
      this.banner = 2100;
      this.bannerText = this.map.name;
    }
    if (this.map.dark && !darkMask) darkMask = makeDarkMask(78);
  }

  // ---- helpers ------------------------------------------------------------
  npcAt(x, y) {
    return this.npcs.find((n) => n.x === x && n.y === y && n.solid !== false);
  }
  blocked(x, y) {
    if (this.map.solidAt(x, y)) return true;
    if (this.npcAt(x, y)) return true;
    return false;
  }
  warpAt(x, y) {
    return this.map.warps.find((w) => w.x === x && w.y === y);
  }
  signAt(x, y) {
    return (this.map.signs || []).find((s) => s.x === x && s.y === y);
  }
  itemAt(x, y) {
    return (this.map.items || []).find((i) => i.x === x && i.y === y && !flag(i.flag));
  }
  objActionAt(x, y) {
    return (this.map.def.objects || []).find((o) => o.x === x && o.y === y);
  }
  staticAt(x, y) {
    return (this.map.def.statics || []).find((s) => s.x === x && s.y === y && !flag(s.flag));
  }

  startScript(genFn, ...args) {
    this.script = new Coro(genFn, this, ...args);
  }
  say(text, opts) {
    return this.dialog.task(text, opts);
  }

  // ---- update -------------------------------------------------------------
  update(dt) {
    this.frameT += dt;
    G.playtime += dt / 1000;
    if (this.banner > 0) this.banner -= dt;

    if (this.script) {
      if (this.script.update(dt)) this.script = null;
      this.updateEntities(dt, true);
      this.updateCamera();
      return;
    }
    if (this.dialog.active) {
      this.dialog.update(dt);
      this.updateEntities(dt, true);
      return;
    }

    if (input.pressed('START')) {
      audio.sfx('menu');
      app.push(new MenuState());
      return;
    }
    if (input.pressed('A')) {
      this.interact();
      if (this.script || this.dialog.active) return;
    }

    this.handleMovement(dt);
    this.updateEntities(dt, false);
    this.updateCamera();
    this.checkTrainers();
  }

  handleMovement(dt) {
    const p = this.player;
    if (p.moving) return;
    const d = input.dir();
    if (d < 0) {
      this.turnDelay = 0;
      p.step = 0;
      p.frame = 0;
      return;
    }
    if (p.dir !== d) {
      p.dir = d;
      this.turnDelay = 90;
      return;
    }
    if (this.turnDelay > 0) {
      this.turnDelay -= dt;
      if (this.turnDelay > 0) return;
    }
    const v = DIR_VEC[d];
    const nx = p.x + v.x;
    const ny = p.y + v.y;

    // ledge hop: only downward, only onto free ground
    const li = ny >= 0 && ny < this.map.h && nx >= 0 && nx < this.map.w ? this.map.ledge[ny * this.map.w + nx] : -1;
    if (li === 0 && d === DIR.DOWN && !this.blocked(nx, ny + 1)) {
      p.moving = true;
      p.moveT = 0;
      p.moveDur = 300;
      p.target = { x: nx, y: ny + 1 };
      p.hop = 1;
      audio.sfx('ledge');
      return;
    }
    if (this.blocked(nx, ny)) {
      if (!this.bumpCd || this.bumpCd <= 0) {
        audio.sfx('bump');
        this.bumpCd = 320;
      }
      p.step += dt;
      return;
    }
    p.moving = true;
    p.moveT = 0;
    p.moveDur = input.held('SELECT') ? RUN_MS : WALK_MS;
    p.target = { x: nx, y: ny };
    p.hop = 0;
  }

  updateEntities(dt, freezePlayer) {
    if (this.bumpCd > 0) this.bumpCd -= dt;
    const p = this.player;
    if (p.moving) {
      p.moveT += dt;
      const t = Math.min(1, p.moveT / p.moveDur);
      const dx = p.target.x - p.x;
      const dy = p.target.y - p.y;
      p.px = dx * TILE * t;
      p.py = dy * TILE * t;
      p.hopH = p.hop ? Math.sin(t * Math.PI) * 12 : 0;
      p.frame = 1 + (Math.floor(t * 2) % 2);
      if (t >= 1) {
        p.x = p.target.x;
        p.y = p.target.y;
        p.px = 0;
        p.py = 0;
        p.hopH = 0;
        p.hop = 0;
        p.moving = false;
        p.frame = 0;
        this.onStep();
      }
    }
    for (const n of this.npcs) {
      if (n.moving) {
        n.moveT += dt;
        const t = Math.min(1, n.moveT / n.moveDur);
        n.px = (n.target.x - n.x) * TILE * t;
        n.py = (n.target.y - n.y) * TILE * t;
        n.frame = 1 + (Math.floor(t * 2) % 2);
        if (t >= 1) {
          n.x = n.target.x; n.y = n.target.y; n.px = 0; n.py = 0; n.moving = false; n.frame = 0;
        }
      } else if (!freezePlayer && n.move) {
        n.wanderT -= dt;
        if (n.wanderT <= 0) {
          n.wanderT = 1400 + rng.int(3200);
          if (n.move === 'look') {
            n.dir = rng.int(4);
          } else if (n.move === 'wander') {
            const d = rng.int(4);
            const v = DIR_VEC[d];
            const tx = n.x + v.x;
            const ty = n.y + v.y;
            n.dir = d;
            const near = Math.abs(tx - n.hx) <= 2 && Math.abs(ty - n.hy) <= 2;
            const free = !this.map.solidAt(tx, ty) && !this.npcAt(tx, ty) &&
              !(this.player.x === tx && this.player.y === ty);
            if (near && free) {
              n.moving = true; n.moveT = 0; n.moveDur = 260; n.target = { x: tx, y: ty };
            }
          }
        }
      }
    }
  }

  onStep() {
    const p = this.player;
    const w = this.warpAt(p.x, p.y);
    if (w) { this.doWarp(w); return; }
    const st = this.staticAt(p.x, p.y);
    if (st) { this.startScript(staticScript, st); return; }
    const i = p.y * this.map.w + p.x;
    if (this.map.tallgrass[i]) audio.sfx('grass');
    if (this.map.encounter[i] && this.map.encounters && G.party.length) {
      this.stepsSinceEncounter++;
      const rate = this.map.encounters.rate * (this.stepsSinceEncounter > 4 ? 1 : 0.4);
      if (rng.chance(rate)) {
        this.stepsSinceEncounter = 0;
        this.startWildBattle();
      }
    }
  }

  startWildBattle() {
    const table = this.map.encounters.table;
    const total = table.reduce((a, e) => a + e.w, 0);
    let r = rng.int(total);
    let pick = table[0];
    for (const e of table) { r -= e.w; if (r < 0) { pick = e; break; } }
    const level = rng.range(pick.min, pick.max);
    const wild = makeCreature(pick.id, level);
    markSeen(pick.id);
    this.startScript(function* (self) {
      audio.sfx('encounter');
      yield app.fadeTo(1, 420, '#000');
      yield wait(120);
      app.push(new BattleState({ wild, onDone: (r2) => self.onBattleDone(r2) }));
    }, this);
  }

  onBattleDone(result) {
    if (result === 'lost') {
      this.afterBattle = whiteOutScript;
    }
  }

  doWarp(w) {
    const self = this;
    this.startScript(function* () {
      if (w.kind === 'door') audio.sfx('door');
      yield app.fadeTo(1, 240);
      yield wait(80);
      self.loadMap(w.to, w.tx, w.ty, w.dir);
      G.player.x = w.tx; G.player.y = w.ty; G.player.dir = w.dir ?? 0;
      yield wait(60);
      yield app.fadeTo(0, 280);
    });
  }

  checkTrainers() {
    if (this.script || this.dialog.active) return;
    for (const n of this.npcs) {
      if (n.kind !== 'trainer' || n.defeated || !n.sight) continue;
      const v = DIR_VEC[n.dir];
      for (let d = 1; d <= n.sight; d++) {
        const cx = n.x + v.x * d;
        const cy = n.y + v.y * d;
        if (this.map.solidAt(cx, cy)) break;
        if (this.player.x === cx && this.player.y === cy) {
          this.startScript(trainerSpotScript, n, d);
          return;
        }
      }
    }
  }

  interact() {
    const p = this.player;
    const v = DIR_VEC[p.dir];
    let tx = p.x + v.x;
    let ty = p.y + v.y;

    let npc = this.npcAt(tx, ty) || this.npcs.find((n) => n.x === tx && n.y === ty);
    // Reach across anything one tile deep — a shop counter, a lab bench, a
    // table. Without this you have to walk around the furniture to be served.
    if (!npc && this.map.solidAt(tx, ty)) {
      npc = this.npcs.find((n) => n.x === tx + v.x && n.y === ty + v.y);
    }
    if (npc) {
      if (npc.face !== false && npc.kind !== 'trainer') npc.dir = OPPOSITE[p.dir];
      this.startScript(npcScript, npc);
      return;
    }
    const item = this.itemAt(tx, ty);
    if (item) { this.startScript(pickupScript, item); return; }
    const sign = this.signAt(tx, ty);
    if (sign) { this.startScript(function* (self) { yield self.say(sign.text); }); return; }
    const obj = this.objActionAt(tx, ty);
    if (obj && obj.action === 'starter') { this.startScript(starterScript, obj); return; }
    // flavour for a few tiles
    const ch = this.map.at(tx, ty);
    if (ch === '~' || ch === '=') {
      this.startScript(function* (self) { yield self.say('The water is clear and very cold.'); });
    }
  }

  // ---- camera + render ----------------------------------------------------
  updateCamera(snap = false) {
    const p = this.player;
    const mw = this.map.w * TILE;
    const mh = this.map.h * TILE;
    let cx = p.x * TILE + p.px + TILE / 2 - SCREEN_W / 2;
    let cy = p.y * TILE + p.py + TILE / 2 - SCREEN_H / 2 - 4;
    cx = mw <= SCREEN_W ? (mw - SCREEN_W) / 2 : clamp(cx, 0, mw - SCREEN_W);
    cy = mh <= SCREEN_H ? (mh - SCREEN_H) / 2 : clamp(cy, 0, mh - SCREEN_H);
    this.cam.x = Math.round(cx);
    this.cam.y = Math.round(cy);
  }

  render(ctx) {
    const map = this.map;
    const cam = this.cam;
    ctx.fillStyle = map.indoor ? '#0d0d14' : '#2c4a2c';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // The ground is pre-composited; maps with water hold one frame per phase.
    const frames = map.groundFrames;
    const ground = frames.length > 1
      ? frames[Math.floor(this.frameT / 190) % frames.length]
      : frames[0];
    ctx.drawImage(ground, cam.x, cam.y, SCREEN_W, SCREEN_H, 0, 0, SCREEN_W, SCREEN_H);

    // sprite list, sorted back-to-front
    const list = [];
    for (const o of map.objects) {
      const sx = o.x * TILE + o.ox - cam.x;
      const sy = (o.y + o.fh - 1) * TILE + TILE - o.sprite.height + o.oy - cam.y + 16;
      if (sx > SCREEN_W || sx + o.sprite.width < 0 || sy > SCREEN_H || sy + o.sprite.height < 0) continue;
      list.push({ sortY: o.sortY, draw: () => ctx.drawImage(o.sprite, Math.round(sx), Math.round(sy)) });
    }
    for (const n of this.npcs) list.push(this.entitySprite(n, cam, ctx));
    list.push(this.entitySprite(this.player, cam, ctx, true));

    // grass blades in front of whatever is standing in them
    const x0 = Math.floor(cam.x / TILE);
    const y0 = Math.floor(cam.y / TILE);
    for (let y = y0; y <= y0 + SCREEN_H / TILE + 1; y++) {
      for (let x = x0; x <= x0 + SCREEN_W / TILE + 1; x++) {
        if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue;
        if (!map.tallgrass[y * map.w + x]) continue;
        const sx = x * TILE - cam.x;
        const sy = y * TILE - cam.y;
        list.push({ sortY: (y + 1) * TILE + 1, draw: () => tallGrassFront(ctx, sx, sy) });
      }
    }
    // static legendary shimmer
    for (const s of map.def.statics || []) {
      if (flag(s.flag)) continue;
      const sx = s.x * TILE - cam.x + 8;
      const sy = s.y * TILE - cam.y + 8;
      list.push({ sortY: (s.y + 1) * TILE, draw: () => this.drawShimmer(ctx, sx, sy) });
    }

    list.sort((a, b) => a.sortY - b.sortY);
    for (const e of list) e.draw();

    if (this.exclaim && this.exclaim.t > 0) {
      this.exclaim.t -= 16;
      const n = this.exclaim.npc;
      const bx = Math.round(n.x * TILE + n.px - cam.x + 4);
      const by = Math.round(n.y * TILE + n.py - cam.y - 22);
      drawWindow(ctx, bx, by, 12, 14);
      drawText(ctx, '!', bx + 5, by + 3, { color: '#c02818', shadow: '#f0c0a0' });
    }

    if (map.dark && darkMask) {
      const px = this.player.x * TILE + this.player.px + 8 - cam.x;
      const py = this.player.y * TILE + this.player.py + 4 - cam.y;
      ctx.drawImage(darkMask, Math.round(px - SCREEN_W), Math.round(py - SCREEN_H));
    }
    if (map.tint) {
      ctx.globalAlpha = map.tint.a;
      ctx.fillStyle = map.tint.c;
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.globalAlpha = 1;
    }

    if (this.banner > 0) {
      const t = Math.min(1, (2100 - this.banner) / 200);
      const w = 116;
      const x = Math.round(-w + (w + 8) * easeOutQuad(Math.min(1, this.banner > 300 ? t : this.banner / 300)));
      drawWindow(ctx, x, 6, w, 20);
      drawTextCentered(ctx, this.bannerText, x + w / 2, 11, { color: PAL.ink, shadow: PAL.inkShadow });
    }

    this.dialog.render(ctx);
  }

  entitySprite(e, cam, ctx, isPlayer = false) {
    const walker = getWalker(e.pal || 'villager1');
    const frames = walker[DIR_NAME[e.dir]] || walker.down;
    const spr = frames[e.moving ? e.frame : 0];
    const ex = e.x * TILE + e.px - cam.x;
    const ey = e.y * TILE + e.py - cam.y - (e.hopH || 0);
    return {
      sortY: (e.y + 1) * TILE + e.py + (isPlayer ? 0.5 : 0),
      draw: () => {
        ctx.fillStyle = 'rgba(18,14,26,0.30)';
        const shy = e.y * TILE + e.py - cam.y + 13;
        ctx.fillRect(Math.round(ex + 4), Math.round(shy), 8, 3);
        ctx.fillRect(Math.round(ex + 3), Math.round(shy + 1), 10, 1);
        ctx.drawImage(spr, Math.round(ex), Math.round(ey - 8));
      },
    };
  }

  drawShimmer(ctx, x, y) {
    const t = this.frameT / 420;
    for (let i = 0; i < 5; i++) {
      const a = t + i * 1.256;
      const r = 6 + Math.sin(t * 2 + i) * 3;
      ctx.fillStyle = i % 2 ? 'rgba(240,200,255,0.75)' : 'rgba(255,240,180,0.6)';
      ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.6), 2, 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Scripts
function* npcScript(self, npc) {
  if (npc.action === 'heal') {
    yield self.say('WARDEN: Welcome to the REST HALL. Shall I look after your KINDRED?');
    yield self.say('Your KINDRED are taken to the back room…');
    audio.sfx('heal');
    yield wait(900);
    healParty();
    yield self.say('WARDEN: All mended. Come back whenever the road is unkind.');
    return;
  }
  if (npc.action === 'shop') {
    yield self.say('SUPPLIER: Orbs, salves, the usual. What do you need?');
    app.push(new ShopState());
    return;
  }
  if (npc.action === 'yarrow') {
    yield* yarrowScript(self, npc);
    return;
  }
  if (npc.kind === 'trainer') {
    if (npc.defeated) { yield self.say(npc.after); return; }
    yield* trainerBattleScript(self, npc);
    return;
  }
  const lines = (npc.doneFlag && flag(npc.doneFlag) && npc.after) ? npc.after : npc.lines;
  for (const line of lines || ['…']) yield self.say(line);
  if (npc.doneFlag) setFlag(npc.doneFlag);
}

function* yarrowScript(self, npc) {
  if (!G.starter) {
    yield self.say('YARROW: Ah — good. I was starting to think you had gone back to bed.');
    yield self.say("YARROW: This is the WILDBOOK. Every KINDRED you meet writes itself in.");
    yield self.say('YARROW: Three of them on the desk are ready to travel. Take the one that looks back at you.');
    setFlag('yarrow_intro');
    return;
  }
  if (!flag('yarrow_after')) {
    setFlag('yarrow_after');
    addItem('bondorb', 5);
    yield self.say('YARROW: Take these BOND ORBS. Five is not many. Use them on something you mean to keep.');
    yield self.say('YARROW: Go north when you are ready. And do not go into the HOLLOW until you have to.');
    return;
  }
  yield self.say('YARROW: The HOLLOW keeps its own hours. Whatever is at the bottom of it was there first.');
}

function* starterScript(self, obj) {
  if (G.starter) {
    yield self.say('The other orbs are cold. Whatever was in them has already gone.');
    return;
  }
  if (!flag('yarrow_intro')) {
    yield self.say('Three orbs rest in a padded tray. Best to ask YARROW first.');
    return;
  }
  const sp = SPECIES[obj.which];
  yield self.say(`The orb holds a ${sp.name}. Take it?`);
  const c = makeCreature(obj.which, 5, { ot: G.player.name });
  G.starter = obj.which;
  G.rivalStarter = RIVAL_PICK[obj.which];
  addToParty(c);
  markSeen(obj.which);
  G.caught[obj.which] = true;
  audio.sfx('caught');
  yield wait(400);
  yield self.say(`${G.player.name} received ${sp.name}!`);
  yield self.say(`YARROW: A fine one. It will not thank you for it, but it will follow you anywhere.`);
  yield wait(200);
  yield self.say(`WREN: Then I'll take the one that beats it. Obviously.`);
  setFlag('starter_taken');
}

function* pickupScript(self, item) {
  const it = ITEMS[item.item];
  audio.sfx('item');
  addItem(item.item, item.count || 1);
  setFlag(item.flag);
  const obj = self.map.objects.findIndex((o) => o.ch === 'o' && o.x === item.x && o.y === item.y);
  if (obj >= 0) self.map.objects.splice(obj, 1);
  yield self.say(`${G.player.name} found ${it.name}${item.count > 1 ? ' x' + item.count : ''}!`);
}

function* trainerSpotScript(self, npc, dist) {
  audio.sfx('encounter');
  self.exclaim = { npc, t: 700 };
  yield wait(500);
  // walk the trainer up to the player
  const v = DIR_VEC[npc.dir];
  for (let i = 0; i < dist - 1; i++) {
    npc.moving = true; npc.moveT = 0; npc.moveDur = 190;
    npc.target = { x: npc.x + v.x, y: npc.y + v.y };
    yield wait(190);
  }
  self.player.dir = OPPOSITE[npc.dir];
  yield* trainerBattleScript(self, npc);
}

function* trainerBattleScript(self, npc) {
  for (const line of String(npc.intro).split('\n')) yield self.say(line);
  const team = npc.team.map(([id, lv]) => {
    const sid = id === 'RIVAL_STARTER' ? (G.rivalStarter || 'emberet') : id;
    return makeCreature(sid, lv);
  });
  audio.sfx('encounter');
  yield app.fadeTo(1, 420, '#000');
  yield wait(120);
  app.push(new BattleState({
    trainer: { name: npc.name, team, reward: npc.reward, pal: npc.pal },
    onDone: (r) => {
      if (r === 'won') {
        npc.defeated = true;
        if (npc.flag) setFlag(npc.flag);
        self.afterBattle = function* (s) {
          yield s.say(npc.defeat);
          if (npc.rival) yield s.say(npc.after);
        };
      } else if (r === 'lost') {
        self.afterBattle = whiteOutScript;
      }
    },
  }));
}

function* staticScript(self, st) {
  yield self.say(st.pre);
  const wild = makeCreature(st.species, st.level, { perfect: true });
  markSeen(st.species);
  audio.sfx('encounter');
  yield app.fadeTo(1, 500, '#fff');
  yield wait(200);
  setFlag(st.flag);
  app.push(new BattleState({
    wild, music: st.music || 'boss', legendary: true,
    onDone: (r) => {
      // Slipping away or blacking out means it is still down there.
      if (r === 'fled' || r === 'lost') setFlag(st.flag, false);
      if (r === 'lost') self.afterBattle = whiteOutScript;
    },
  }));
}

function* whiteOutScript(self) {
  if (app.fade.alpha > 0) yield app.fadeTo(0, 300);
  yield self.say(`${G.player.name} has no KINDRED left standing…`);
  yield app.fadeTo(1, 500);
  healParty();
  self.loadMap('resthall', 7, 7, 1);
  G.player.map = 'resthall'; G.player.x = 7; G.player.y = 7; G.player.dir = 1;
  yield wait(300);
  yield app.fadeTo(0, 400);
  yield self.say('WARDEN: You were carried in. Everyone is patched up. Do try to be careful.');
}

/** Copy the live player entity back into the persistent state before saving. */
export function syncPlayer(ow) {
  G.player.x = ow.player.x;
  G.player.y = ow.player.y;
  G.player.dir = ow.player.dir;
  G.player.map = ow.map.id;
}
