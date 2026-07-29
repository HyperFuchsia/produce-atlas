import { SCREEN_W, SCREEN_H } from '../core/const.js';
import { input } from '../core/input.js';
import { audio } from '../core/audio.js';
import { Coro, wait, call, tween, waitUntil } from '../core/coro.js';
import { rng } from '../core/rng.js';
import { clamp, easeOutQuad, easeInQuad } from '../core/util.js';
import { drawText, drawTextRight } from '../gfx/font.js';
import { drawWindow, drawBar, hpColor, drawCursor, drawTypeChip } from '../gfx/ui.js';
import { PAL } from '../gfx/palette.js';
import { battleBg, platform } from '../gfx/battlebg.js';
import { monSprite, monSilhouette } from '../gfx/monsprites.js';
import { orbSprite } from '../gfx/props.js';
import { Dialog } from '../game/dialog.js';
import { app } from '../game/app.js';
import { G, removeItem, markCaught, addToParty, partyAlive, firstHealthy } from '../game/state.js';
import { SPECIES } from '../data/species.js';
import { MOVES } from '../data/moves.js';
import { ITEMS } from '../data/items.js';
import { TYPE_COLOR } from '../data/types.js';
import {
  makeSide, calcDamage, accuracyCheck, effLabel, captureRoll, chooseAiMove,
  STAT_LABEL, effectiveStat,
} from '../game/battlecalc.js';
import { gainXp, evolveInto, xpAward, xpProgress, isFainted, STATUS_LABEL, STATUS_COLOR, makeMove } from '../game/creature.js';
import { PartyState } from './party.js';
import { BagState } from './bag.js';

const FOE_X = 172;
const FOE_Y = 58;
const ME_X = 58;
const ME_Y = 106;

const STRUGGLE = { id: '__flail', name: 'FLAIL', type: 'Wild', cat: 'phys', pow: 40, acc: 100, pp: 1, recoil: 0.25, desc: '' };

export class BattleState {
  constructor(cfg) {
    this.cfg = cfg;
    this.dialog = new Dialog();
    this.dialog.linesPerPage = 2;
    this.isTrainer = !!cfg.trainer;
    this.bgKind = G.player.map === 'hollow' ? 'cave'
      : (G.player.map === 'home' || G.player.map === 'house1' || G.player.map === 'study' || G.player.map === 'resthall') ? 'indoor'
        : 'field';
    this.t = 0;
    this.result = null;
    this.uiMode = 'msg';
    this.cursor = 0;
    this.moveCursor = 0;
    this.forgetCursor = 0;
    this.participants = new Set();

    this.foeTeam = this.isTrainer ? cfg.trainer.team : [cfg.wild];
    this.foeIndex = 0;
    this.meIndex = Math.max(0, firstHealthy());

    this.me = makeSide(G.party[this.meIndex], true);
    this.foe = makeSide(this.foeTeam[0], false);

    // display state (tweened separately from the true values)
    this.fx = {
      foeX: 90, meX: -90, foeY: 0, meY: 0,
      foeAlpha: 1, meAlpha: 1, flashFoe: 0, flashMe: 0,
      hpFoe: this.foe.creature.hp, hpMe: this.me.creature.hp,
      xpShown: xpProgress(this.me.creature),
      orb: null, particles: [], foeHide: false, meHide: false,
      whiteFlash: 0,
    };
    this.showFoeBox = false;
    this.showMeBox = false;
  }

  enter() {
    audio.playMusic(this.cfg.music || (this.isTrainer ? 'boss' : 'battle'), { restart: true });
    this.participants.add(this.meIndex);
    this.script = new Coro(runBattle, this);
  }

  say(text, opts) {
    return this.dialog.task(text, opts);
  }
  msg(text) {
    return this.dialog.task(text, { wait: false, hold: 620 });
  }

  update(dt) {
    this.t += dt;
    G.playtime += dt / 1000;
    if (this.fx.flashFoe > 0) this.fx.flashFoe -= dt;
    if (this.fx.flashMe > 0) this.fx.flashMe -= dt;
    if (this.fx.whiteFlash > 0) this.fx.whiteFlash -= dt;
    for (const p of this.fx.particles) { p.t += dt; }
    this.fx.particles = this.fx.particles.filter((p) => p.t < p.life);
    if (this.script && this.script.update(dt)) {
      this.script = null;
      this.finish();
    }
  }

  finish() {
    // The callback must run before the pop so the overworld's resume() sees any
    // follow-up script it was handed.
    this.cfg.onDone?.(this.result);
    app.pop();
  }

  // ---- animation helpers --------------------------------------------------
  lunge(side) {
    const key = side.isPlayer ? 'meX' : 'foeX';
    const dir = side.isPlayer ? 1 : -1;
    const fx = this.fx;
    let t = 0;
    return {
      update(dt) {
        t += dt;
        const p = Math.min(1, t / 240);
        fx[key] = Math.sin(p * Math.PI) * 12 * dir;
        return p >= 1;
      },
    };
  }
  flash(side, ms = 420) {
    const fx = this.fx;
    if (side.isPlayer) fx.flashMe = ms; else fx.flashFoe = ms;
    return wait(ms * 0.7);
  }
  projectile(from, to, color, count = 5) {
    const fx = this.fx;
    let t = 0;
    const total = 380;
    let spawned = 0;
    return {
      update(dt) {
        t += dt;
        while (spawned < count && t > (spawned * total) / (count * 2)) {
          fx.particles.push({
            x0: from.x, y0: from.y, x1: to.x, y1: to.y,
            t: 0, life: 300, color, size: 3 - (spawned % 2),
          });
          spawned++;
        }
        return t >= total;
      },
    };
  }
  hpTween(side, to, ms) {
    const key = side.isPlayer ? 'hpMe' : 'hpFoe';
    return tween(this.fx, key, to, ms);
  }

  // ---- action selection ---------------------------------------------------
  selectAction() {
    const self = this;
    self.uiMode = 'main';
    self.cursor = 0;
    self.pendingSub = null;
    self.dialog.start(`What will ${self.me.creature.nick} do?`, { wait: false, hold: 1e9 });
    return {
      update() {
        // returning from a pushed sub-state
        if (self.pendingSub === 'bag' && self.chosenItem !== undefined) {
          const item = self.chosenItem;
          self.chosenItem = undefined;
          self.pendingSub = null;
          if (item) { this.result = { type: 'item', item }; return true; }
          self.uiMode = 'main';
        }
        if (self.pendingSub === 'party' && self.switchTo !== undefined) {
          const idx = self.switchTo;
          self.switchTo = undefined;
          self.pendingSub = null;
          if (idx !== null && idx !== self.meIndex) { this.result = { type: 'switch', index: idx }; return true; }
          self.uiMode = 'main';
        }

        if (self.uiMode === 'main') {
          const before = self.cursor;
          if (input.repeat('LEFT')) self.cursor &= ~1;
          if (input.repeat('RIGHT')) self.cursor |= 1;
          if (input.repeat('UP')) self.cursor &= ~2;
          if (input.repeat('DOWN')) self.cursor |= 2;
          if (self.cursor !== before) audio.sfx('cursor');
          if (input.pressed('A')) {
            audio.sfx('select');
            if (self.cursor === 0) { self.uiMode = 'moves'; self.moveCursor = 0; }
            else if (self.cursor === 1) { self.pendingSub = 'bag'; app.push(new BagState({ mode: 'battle', onPick: (id, target) => { self.chosenItem = id; self.itemTarget = target; } })); }
            else if (self.cursor === 2) { self.pendingSub = 'party'; app.push(new PartyState({ mode: 'switch', currentIndex: self.meIndex, onPick: (i) => { self.switchTo = i; } })); }
            else { this.result = { type: 'run' }; return true; }
          }
          return false;
        }

        if (self.uiMode === 'moves') {
          const moves = self.me.creature.moves;
          const before = self.moveCursor;
          if (input.repeat('LEFT')) self.moveCursor = Math.max(0, self.moveCursor - 1);
          if (input.repeat('RIGHT')) self.moveCursor = Math.min(moves.length - 1, self.moveCursor + 1);
          if (input.repeat('UP')) self.moveCursor = Math.max(0, self.moveCursor - 2);
          if (input.repeat('DOWN')) self.moveCursor = Math.min(moves.length - 1, self.moveCursor + 2);
          if (self.moveCursor !== before) audio.sfx('cursor');
          if (input.pressed('B')) { audio.sfx('cancel'); self.uiMode = 'main'; return false; }
          if (input.pressed('A')) {
            const mv = moves[self.moveCursor];
            if (!mv || mv.pp <= 0) { audio.sfx('bump'); return false; }
            audio.sfx('select');
            this.result = { type: 'move', move: mv };
            return true;
          }
          return false;
        }
        return false;
      },
    };
  }

  /** Inline list used when a creature must forget a move. */
  selectForget(newMoveId) {
    const self = this;
    self.uiMode = 'forget';
    self.forgetCursor = 0;
    self.forgetNew = newMoveId;
    return {
      update() {
        const n = self.me.creature.moves.length + 1;
        const before = self.forgetCursor;
        if (input.repeat('UP')) self.forgetCursor = (self.forgetCursor + n - 1) % n;
        if (input.repeat('DOWN')) self.forgetCursor = (self.forgetCursor + 1) % n;
        if (self.forgetCursor !== before) audio.sfx('cursor');
        if (input.pressed('A')) {
          audio.sfx('select');
          this.result = self.forgetCursor >= n - 1 ? -1 : self.forgetCursor;
          self.uiMode = 'msg';
          return true;
        }
        if (input.pressed('B')) {
          audio.sfx('cancel');
          this.result = -1;
          self.uiMode = 'msg';
          return true;
        }
        return false;
      },
    };
  }

  // ---- rendering ----------------------------------------------------------
  render(ctx) {
    const fx = this.fx;
    ctx.drawImage(battleBg(this.bgKind), 0, 0);

    // platforms
    const foePlat = platform(34, 9, this.bgKind);
    const mePlat = platform(46, 12, this.bgKind);
    ctx.drawImage(foePlat, Math.round(FOE_X - foePlat.width / 2 + fx.foeX), FOE_Y - 9);
    ctx.drawImage(mePlat, Math.round(ME_X - mePlat.width / 2 + fx.meX), ME_Y - 12);

    // creatures
    if (!fx.foeHide) this.drawMon(ctx, this.foe.creature, false, FOE_X + fx.foeX, FOE_Y + fx.foeY, fx.flashFoe, fx.foeAlpha);
    if (!fx.meHide) this.drawMon(ctx, this.me.creature, true, ME_X + fx.meX, ME_Y + fx.meY, fx.flashMe, fx.meAlpha);

    // particles
    for (const p of fx.particles) {
      const t = Math.min(1, p.t / p.life);
      const x = Math.round(p.x0 + (p.x1 - p.x0) * t);
      const y = Math.round(p.y0 + (p.y1 - p.y0) * t - Math.sin(t * Math.PI) * 14);
      ctx.fillStyle = p.color;
      ctx.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(x - 1, y - 1, 2, 2);
    }

    // capture orb
    if (fx.orb) {
      const o = fx.orb;
      if (!this._orb) this._orb = orbSprite();
      ctx.drawImage(this._orb, Math.round(o.x) - 8, Math.round(o.y) - 8);
    }

    if (this.showFoeBox) this.drawFoeBox(ctx);
    if (this.showMeBox) this.drawMeBox(ctx);

    if (fx.whiteFlash > 0) {
      ctx.globalAlpha = Math.min(1, fx.whiteFlash / 160);
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
      ctx.globalAlpha = 1;
    }

    this.drawUI(ctx);
  }

  drawMon(ctx, creature, back, cx, cy, flash, alpha) {
    const spr = monSprite(creature.id, back);
    const b = spr.bounds;
    const x = Math.round(cx - spr.w / 2);
    const y = Math.round(cy - (b.y + b.h));
    // ground shadow
    ctx.fillStyle = 'rgba(16,12,24,0.28)';
    const sw = Math.round(b.w * 0.42);
    ctx.fillRect(Math.round(cx - sw), Math.round(cy - 2), sw * 2, 3);
    if (alpha < 1) ctx.globalAlpha = alpha;
    if (flash > 0 && Math.floor(flash / 70) % 2 === 0) {
      ctx.drawImage(monSilhouette(creature.id, back, '#ffffff'), x, y);
    } else {
      ctx.drawImage(spr.canvas, x, y);
    }
    ctx.globalAlpha = 1;
  }

  drawFoeBox(ctx) {
    const c = this.foe.creature;
    const x = 6;
    const y = 8;
    const w = 106;
    drawWindow(ctx, x, y, w, 30);
    drawText(ctx, c.nick, x + 6, y + 4, { color: PAL.ink, shadow: PAL.inkShadow });
    drawTextRight(ctx, `Lv${c.level}`, x + w - 6, y + 4, { color: PAL.ink, shadow: PAL.inkShadow });
    drawText(ctx, 'HP', x + 6, y + 16, { color: '#c07a20', shadow: PAL.inkShadow });
    const frac = clamp(this.fx.hpFoe / c.maxhp, 0, 1);
    drawBar(ctx, x + 20, y + 19, 76, frac, hpColor(frac));
    if (c.status) this.drawStatus(ctx, x + 6, y + 24, c.status);
  }

  drawMeBox(ctx) {
    const c = this.me.creature;
    const x = 118;
    const y = 68;
    const w = 116;
    drawWindow(ctx, x, y, w, 40);
    drawText(ctx, c.nick, x + 6, y + 4, { color: PAL.ink, shadow: PAL.inkShadow });
    drawTextRight(ctx, `Lv${c.level}`, x + w - 6, y + 4, { color: PAL.ink, shadow: PAL.inkShadow });
    drawText(ctx, 'HP', x + 6, y + 16, { color: '#c07a20', shadow: PAL.inkShadow });
    const frac = clamp(this.fx.hpMe / c.maxhp, 0, 1);
    drawBar(ctx, x + 20, y + 19, 84, frac, hpColor(frac));
    drawTextRight(ctx, `${Math.max(0, Math.round(this.fx.hpMe))}/${c.maxhp}`, x + w - 6, y + 26, {
      color: PAL.ink, shadow: PAL.inkShadow,
    });
    drawBar(ctx, x + 6, y + 35, w - 12, this.fx.xpShown, PAL.xpBlue, { h: 2, bg: '#4a5a70' });
    if (c.status) this.drawStatus(ctx, x + 6, y + 25, c.status);
  }

  drawStatus(ctx, x, y, status) {
    const label = STATUS_LABEL[status];
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(x, y, 22, 9);
    ctx.fillStyle = STATUS_COLOR[status];
    ctx.fillRect(x + 1, y + 1, 20, 7);
    drawText(ctx, label, x + 3, y, { color: '#2a2018', shadow: null });
  }

  drawUI(ctx) {
    const mode = this.uiMode;
    if (mode === 'main') {
      drawWindow(ctx, 0, 116, 132, 44);
      drawText(ctx, 'What will', 10, 126, { color: PAL.ink, shadow: PAL.inkShadow });
      drawText(ctx, `${this.me.creature.nick} do?`, 10, 139, { color: PAL.ink, shadow: PAL.inkShadow });
      drawWindow(ctx, 132, 116, 108, 44);
      const labels = ['FIGHT', 'BAG', 'KINDRED', 'RUN'];
      for (let i = 0; i < 4; i++) {
        const cx = 138 + (i & 1) * 52;
        const cy = 124 + (i >> 1) * 16;
        drawText(ctx, labels[i], cx + 9, cy, { color: PAL.ink, shadow: PAL.inkShadow });
        if (this.cursor === i) drawCursor(ctx, cx, cy + 1, this.t);
      }
      return;
    }
    if (mode === 'moves') {
      const moves = this.me.creature.moves;
      drawWindow(ctx, 0, 116, 164, 44);
      for (let i = 0; i < 4; i++) {
        const mv = moves[i];
        const cx = 10 + (i & 1) * 78;
        const cy = 124 + (i >> 1) * 16;
        if (!mv) { drawText(ctx, '-', cx + 8, cy, { color: '#9a8a78', shadow: null }); continue; }
        const m = MOVES[mv.id];
        drawText(ctx, m.name, cx + 8, cy, { color: mv.pp > 0 ? PAL.ink : '#b05040', shadow: PAL.inkShadow });
        if (this.moveCursor === i) drawCursor(ctx, cx, cy + 1, this.t);
      }
      drawWindow(ctx, 164, 116, 76, 44);
      const cur = moves[this.moveCursor];
      if (cur) {
        const m = MOVES[cur.id];
        drawText(ctx, `PP ${cur.pp}/${cur.maxpp}`, 172, 124, { color: PAL.ink, shadow: PAL.inkShadow });
        drawTypeChip(ctx, m.type, 172, 137);
      }
      return;
    }
    if (mode === 'forget') {
      const moves = this.me.creature.moves;
      drawWindow(ctx, 0, 96, SCREEN_W, 64);
      drawText(ctx, 'Forget which move?', 10, 100, { color: PAL.ink, shadow: PAL.inkShadow });
      for (let i = 0; i < moves.length; i++) {
        const m = MOVES[moves[i].id];
        drawText(ctx, `${m.name}`, 20, 112 + i * 11, { color: PAL.ink, shadow: PAL.inkShadow });
        drawTextRight(ctx, `${moves[i].pp}/${moves[i].maxpp}`, 118, 112 + i * 11, { color: PAL.ink, shadow: PAL.inkShadow });
        if (this.forgetCursor === i) drawCursor(ctx, 10, 113 + i * 11, this.t);
      }
      const keepY = 112 + moves.length * 11;
      drawText(ctx, `KEEP ${MOVES[this.forgetNew].name}`, 20, keepY, { color: PAL.ink, shadow: PAL.inkShadow });
      if (this.forgetCursor === moves.length) drawCursor(ctx, 10, keepY + 1, this.t);
      const cur = MOVES[moves[Math.min(this.forgetCursor, moves.length - 1)].id];
      drawText(ctx, cur.desc, 128, 112, { color: PAL.ink, shadow: PAL.inkShadow });
      return;
    }
    this.dialog.render(ctx, { h: 44, y: 116 });
  }
}

// ---------------------------------------------------------------------------
// The battle script.
function* runBattle(B) {
  const fx = B.fx;
  app.fade.alpha = 1;
  yield app.fadeTo(0, 300);
  yield call(() => { B.uiMode = 'msg'; });

  if (B.isTrainer) {
    yield B.say(`${B.cfg.trainer.name} wants to battle!`);
  }
  // slide the foe in
  yield tween(fx, 'foeX', 0, 420, easeOutQuad);
  yield call(() => { B.showFoeBox = true; });
  yield B.msg(B.isTrainer
    ? `${B.cfg.trainer.name} sent out ${B.foe.creature.nick}!`
    : `A wild ${B.foe.creature.nick} appeared!`);
  yield tween(fx, 'meX', 0, 380, easeOutQuad);
  yield call(() => { B.showMeBox = true; });
  yield B.msg(`Go! ${B.me.creature.nick}!`);

  let running = true;
  while (running) {
    const action = yield B.selectAction();
    yield call(() => { B.uiMode = 'msg'; });

    if (action.type === 'run') {
      if (B.isTrainer) {
        yield B.say('There is no running from a challenge!');
        continue;
      }
      const odds = (B.me.creature.stats.spe * 128) / Math.max(1, B.foe.creature.stats.spe) + 30 * (B.me.turns + 1);
      if (rng.int(256) < odds) {
        audio.sfx('flee');
        yield B.say('Got away safely!');
        B.result = 'fled';
        return;
      }
      yield B.msg("Couldn't get away!");
      yield* enemyPhase(B);
      if (yield* checkEnd(B)) return;
      continue;
    }

    if (action.type === 'item') {
      const done = yield* useItem(B, action.item);
      if (done === 'caught') { B.result = 'caught'; return; }
      if (done !== 'nothing') {
        yield* enemyPhase(B);
        if (yield* checkEnd(B)) return;
      }
      continue;
    }

    if (action.type === 'switch') {
      yield B.msg(`${B.me.creature.nick}, come back!`);
      yield* swapIn(B, action.index);
      yield* enemyPhase(B);
      if (yield* checkEnd(B)) return;
      continue;
    }

    // ---- both sides act, fastest first ----
    const foeMove = chooseAiMove(B.foe, B.me) || null;
    const myMove = action.move;
    const myPri = MOVES[myMove.id].priority || 0;
    const foePri = foeMove ? (MOVES[foeMove.id].priority || 0) : 0;
    const mySpe = effectiveStat(B.me, 'spe');
    const foeSpe = effectiveStat(B.foe, 'spe');
    const meFirst = myPri !== foePri ? myPri > foePri
      : mySpe !== foeSpe ? mySpe > foeSpe : rng.chance(0.5);

    const order = meFirst ? [[B.me, B.foe, myMove], [B.foe, B.me, foeMove]]
      : [[B.foe, B.me, foeMove], [B.me, B.foe, myMove]];

    for (const [atk, def, mv] of order) {
      if (isFainted(atk.creature) || isFainted(def.creature)) continue;
      yield* takeTurn(B, atk, def, mv);
      if (yield* handleFaints(B)) { if (B.result) return; }
      if (isFainted(atk.creature) || isFainted(def.creature)) break;
    }

    // end of turn residuals
    for (const side of [B.me, B.foe]) {
      if (isFainted(side.creature)) continue;
      if (side.creature.status === 'burn') {
        const dmg = Math.max(1, Math.floor(side.creature.maxhp / 16));
        side.creature.hp = Math.max(0, side.creature.hp - dmg);
        audio.sfx('hit_weak');
        yield B.msg(`${side.creature.nick} is hurt by its burn!`);
        yield B.hpTween(side, side.creature.hp, 420);
      }
      side.turns++;
    }
    if (yield* handleFaints(B)) { if (B.result) return; }
    if (yield* checkEnd(B)) return;
  }
}

function* takeTurn(B, atk, def, mv) {
  const c = atk.creature;
  if (!mv) mv = { id: '__flail', pp: 1, maxpp: 1 };
  const move = mv.id === '__flail' ? STRUGGLE : MOVES[mv.id];

  if (c.status === 'sleep') {
    c.sleep--;
    if (c.sleep <= 0) {
      c.status = null;
      yield B.msg(`${c.nick} woke up!`);
    } else {
      yield B.msg(`${c.nick} is fast asleep.`);
      return;
    }
  }
  if (atk.flinch) {
    atk.flinch = false;
    yield B.msg(`${c.nick} flinched!`);
    return;
  }
  if (c.status === 'para' && rng.chance(0.25)) {
    yield B.msg(`${c.nick} is paralysed! It can't move!`);
    return;
  }

  if (mv.pp > 0) mv.pp--;
  yield B.msg(`${c.nick} used ${move.name}!`);

  if (!accuracyCheck(atk, def, move)) {
    audio.sfx('flee');
    yield B.msg(`${c.nick}'s attack missed!`);
    return;
  }

  if (move.cat === 'status') {
    yield* applyStatusMove(B, atk, def, move);
    return;
  }

  const from = atk.isPlayer ? { x: ME_X + 12, y: ME_Y - 22 } : { x: FOE_X - 12, y: FOE_Y - 20 };
  const to = atk.isPlayer ? { x: FOE_X, y: FOE_Y - 20 } : { x: ME_X, y: ME_Y - 22 };
  if (move.cat === 'phys') {
    yield B.lunge(atk);
  } else {
    yield B.projectile(from, to, TYPE_COLOR[move.type] || '#fff', 6);
  }

  const { damage, eff, crit } = calcDamage(atk, def, move);
  if (eff === 0) {
    yield B.msg(`It doesn't affect ${def.creature.nick}…`);
    return;
  }
  audio.sfx(eff >= 2 ? 'hit_super' : eff <= 0.5 ? 'hit_weak' : 'hit');
  if (eff >= 2) app.addShake(3, 260);
  def.creature.hp = Math.max(0, def.creature.hp - damage);
  yield B.flash(def, 380);
  yield B.hpTween(def, def.creature.hp, Math.min(900, 220 + damage * 8));
  if (crit) yield B.msg('A critical hit!');
  const lbl = effLabel(eff);
  if (lbl) yield B.msg(lbl);

  if (move.drain) {
    const heal = Math.max(1, Math.floor(damage * move.drain));
    atk.creature.hp = Math.min(atk.creature.maxhp, atk.creature.hp + heal);
    yield B.msg(`${def.creature.nick} had its energy drained!`);
    yield B.hpTween(atk, atk.creature.hp, 380);
  }
  if (move.recoil) {
    const hurt = Math.max(1, Math.floor(damage * move.recoil));
    atk.creature.hp = Math.max(0, atk.creature.hp - hurt);
    yield B.msg(`${c.nick} is hit by the recoil!`);
    yield B.hpTween(atk, atk.creature.hp, 380);
  }
  if (move.status && move.chance && rng.chance(move.chance) && !def.creature.status && !isFainted(def.creature)) {
    yield* inflict(B, def, move.status);
  }
  if (move.flinch && rng.chance(move.flinch)) def.flinch = true;
}

function* applyStatusMove(B, atk, def, move) {
  if (move.heal) {
    if (atk.creature.hp >= atk.creature.maxhp) {
      yield B.msg("But it failed!");
      return;
    }
    atk.creature.hp = Math.min(atk.creature.maxhp, atk.creature.hp + Math.floor(atk.creature.maxhp * move.heal));
    audio.sfx('heal');
    yield B.msg(`${atk.creature.nick} regained health!`);
    yield B.hpTween(atk, atk.creature.hp, 520);
    return;
  }
  if (move.stat) {
    const [who, key, stages] = move.stat;
    const target = who === 'self' ? atk : def;
    const cur = target.stages[key] || 0;
    if ((stages > 0 && cur >= 6) || (stages < 0 && cur <= -6)) {
      yield B.msg(`${target.creature.nick}'s ${STAT_LABEL[key]} won't go ${stages > 0 ? 'higher' : 'lower'}!`);
      return;
    }
    target.stages[key] = clamp(cur + stages, -6, 6);
    audio.sfx(stages > 0 ? 'stat_up' : 'stat_down');
    const word = Math.abs(stages) > 1 ? (stages > 0 ? 'sharply rose' : 'sharply fell') : (stages > 0 ? 'rose' : 'fell');
    yield B.msg(`${target.creature.nick}'s ${STAT_LABEL[key]} ${word}!`);
    return;
  }
  if (move.status) {
    if (def.creature.status) {
      yield B.msg(`${def.creature.nick} is already affected!`);
      return;
    }
    yield* inflict(B, def, move.status);
    return;
  }
  yield B.msg('But nothing happened!');
}

function* inflict(B, side, status) {
  side.creature.status = status;
  if (status === 'sleep') side.creature.sleep = rng.range(2, 4);
  audio.sfx('stat_down');
  const text = {
    burn: `${side.creature.nick} was burned!`,
    para: `${side.creature.nick} is paralysed! It may be unable to move!`,
    sleep: `${side.creature.nick} fell asleep!`,
  }[status];
  yield B.msg(text);
}

function* enemyPhase(B) {
  if (isFainted(B.foe.creature) || isFainted(B.me.creature)) return;
  const mv = chooseAiMove(B.foe, B.me);
  yield* takeTurn(B, B.foe, B.me, mv);
  yield* handleFaints(B);
}

function* handleFaints(B) {
  let any = false;
  if (isFainted(B.foe.creature)) {
    any = true;
    audio.sfx('faint');
    yield tween(B.fx, 'foeY', 34, 420, easeInQuad);
    yield tween(B.fx, 'foeAlpha', 0, 200);
    yield call(() => { B.fx.foeHide = true; B.showFoeBox = false; });
    yield B.say(`${B.isTrainer ? B.cfg.trainer.name + "'s " : 'The wild '}${B.foe.creature.nick} fainted!`);
    yield* awardXp(B);
    const next = B.foeTeam.findIndex((c, i) => i > B.foeIndex && c.hp > 0);
    if (next >= 0) {
      B.foeIndex = next;
      B.foe = makeSide(B.foeTeam[next], false);
      B.fx.hpFoe = B.foe.creature.hp;
      B.fx.foeY = 0; B.fx.foeAlpha = 1; B.fx.foeHide = false; B.fx.foeX = 90;
      yield B.say(`${B.cfg.trainer.name} sent out ${B.foe.creature.nick}!`);
      yield tween(B.fx, 'foeX', 0, 380, easeOutQuad);
      yield call(() => { B.showFoeBox = true; });
    }
  }
  if (isFainted(B.me.creature)) {
    any = true;
    audio.sfx('faint');
    yield tween(B.fx, 'meY', 34, 420, easeInQuad);
    yield tween(B.fx, 'meAlpha', 0, 200);
    yield call(() => { B.fx.meHide = true; B.showMeBox = false; });
    yield B.say(`${B.me.creature.nick} fainted!`);
    if (!partyAlive()) {
      B.result = 'lost';
      yield B.say(`${G.player.name} is out of usable KINDRED!`);
      yield app.fadeTo(1, 420);
      return true;
    }
    // force a switch
    let chosen = null;
    while (chosen === null) {
      B.switchTo = undefined;
      app.push(new PartyState({ mode: 'switch', force: true, onPick: (i) => { B.switchTo = i; } }));
      yield waitUntil(() => B.switchTo !== undefined);
      if (B.switchTo !== null && G.party[B.switchTo] && G.party[B.switchTo].hp > 0) chosen = B.switchTo;
    }
    yield* swapIn(B, chosen);
  }
  return any;
}

function* swapIn(B, index) {
  B.meIndex = index;
  B.me = makeSide(G.party[index], true);
  B.participants.add(index);
  B.fx.hpMe = B.me.creature.hp;
  B.fx.xpShown = xpProgress(B.me.creature);
  B.fx.meY = 0; B.fx.meAlpha = 1; B.fx.meHide = false; B.fx.meX = -90;
  B.showMeBox = false;
  yield B.msg(`Go! ${B.me.creature.nick}!`);
  yield tween(B.fx, 'meX', 0, 360, easeOutQuad);
  yield call(() => { B.showMeBox = true; });
}

function* awardXp(B) {
  const amount = xpAward(B.foe.creature, B.isTrainer);
  const share = Math.max(1, Math.floor(amount / Math.max(1, B.participants.size)));
  for (const idx of B.participants) {
    const c = G.party[idx];
    if (!c || c.hp <= 0) continue;
    const isActive = idx === B.meIndex;
    yield B.msg(`${c.nick} gained ${share} EXP. Points!`);
    const before = xpProgress(c);
    const res = gainXp(c, share);
    if (isActive) {
      if (res.levels > 0) {
        yield tween(B.fx, 'xpShown', 1, 420);
        B.fx.xpShown = 0;
      }
      yield tween(B.fx, 'xpShown', xpProgress(c), 480);
      void before;
    }
    if (res.levels > 0) {
      audio.sfx('levelup');
      B.fx.whiteFlash = 160;
      if (isActive) B.fx.hpMe = c.hp;
      yield B.say(`${c.nick} grew to Lv${c.level}!`);
    }
    for (const id of res.learned) {
      yield B.say(`${c.nick} learned ${MOVES[id].name}!`);
    }
    for (const id of res.pending) {
      if (!isActive) {
        // off-field creatures simply skip the new move
        continue;
      }
      yield B.say(`${c.nick} wants to learn ${MOVES[id].name}.`);
      yield B.say(`But ${c.nick} already knows four moves. Forget one?`);
      const slot = yield B.selectForget(id);
      if (slot >= 0) {
        const old = MOVES[c.moves[slot].id].name;
        c.moves[slot] = makeMove(id);
        yield B.say(`${c.nick} forgot ${old} and learned ${MOVES[id].name}!`);
      } else {
        yield B.say(`${c.nick} did not learn ${MOVES[id].name}.`);
      }
    }
    if (res.evolve) c.pendingEvolve = res.evolve;
  }
}

function* useItem(B, itemId) {
  const item = ITEMS[itemId];
  if (!item) return 'nothing';
  if (item.kind === 'orb') {
    if (B.isTrainer) {
      yield B.say("You can't take another trainer's KINDRED!");
      return 'nothing';
    }
    removeItem(itemId, 1);
    yield B.msg(`${G.player.name} threw a ${item.name}!`);
    audio.sfx('throw');
    const orb = { x: ME_X, y: ME_Y - 20 };
    B.fx.orb = orb;
    let t = 0;
    yield {
      update(dt) {
        t += dt;
        const p = Math.min(1, t / 480);
        orb.x = ME_X + (FOE_X - ME_X) * p;
        orb.y = (ME_Y - 20) + ((FOE_Y - 24) - (ME_Y - 20)) * p - Math.sin(p * Math.PI) * 40;
        return p >= 1;
      },
    };
    B.fx.whiteFlash = 140;
    B.fx.foeHide = true;
    B.showFoeBox = false;
    yield wait(320);
    orb.y = FOE_Y - 6;
    const roll = captureRoll(B.foe.creature, item.rate);
    for (let i = 0; i < Math.max(1, roll.shakes); i++) {
      audio.sfx('click');
      let s = 0;
      yield {
        update(dt) {
          s += dt;
          orb.x = FOE_X + Math.sin(s / 60) * 5;
          return s >= 520;
        },
      };
    }
    if (roll.caught) {
      audio.sfx('caught');
      yield B.say(`Gotcha! ${B.foe.creature.nick} was caught!`);
      markCaught(B.foe.creature.id);
      const where = addToParty(B.foe.creature);
      B.fx.orb = null;
      if (where === 'box') yield B.say(`${B.foe.creature.nick} was sent to the RESERVE.`);
      else yield B.say(`${B.foe.creature.nick} joined the party!`);
      yield app.fadeTo(1, 380);
      return 'caught';
    }
    audio.sfx('break');
    B.fx.orb = null;
    B.fx.foeHide = false;
    B.showFoeBox = true;
    const lines = ['Oh no! It broke free!', 'Aargh! Almost had it!', 'So close! And yet so far.'];
    yield B.say(lines[Math.min(2, roll.shakes)] || lines[0]);
    return 'used';
  }

  // healing items are applied to the chosen party member by the bag screen
  const target = B.itemTarget ?? B.meIndex;
  const c = G.party[target];
  B.itemTarget = undefined;
  if (item.kind === 'heal') {
    const amount = Math.min(item.amount, c.maxhp - c.hp);
    c.hp += amount;
    removeItem(itemId, 1);
    audio.sfx('heal');
    yield B.msg(`${G.player.name} used ${item.name}.`);
    if (target === B.meIndex) yield B.hpTween(B.me, c.hp, 520);
    yield B.say(`${c.nick} recovered ${amount} HP!`);
    return 'used';
  }
  if (item.kind === 'status') {
    c.status = null;
    c.sleep = 0;
    removeItem(itemId, 1);
    audio.sfx('heal');
    yield B.msg(`${G.player.name} used ${item.name}.`);
    yield B.say(`${c.nick} is feeling better!`);
    return 'used';
  }
  if (item.kind === 'revive') {
    c.hp = Math.max(1, Math.floor(c.maxhp * item.frac));
    removeItem(itemId, 1);
    audio.sfx('heal');
    yield B.say(`${c.nick} was revived!`);
    return 'used';
  }
  if (item.kind === 'ether') {
    const mv = c.moves.find((m) => m.pp < m.maxpp);
    if (!mv) { yield B.say('It would have no effect.'); return 'nothing'; }
    mv.pp = Math.min(mv.maxpp, mv.pp + item.amount);
    removeItem(itemId, 1);
    audio.sfx('heal');
    yield B.say(`${MOVES[mv.id].name} regained PP!`);
    return 'used';
  }
  return 'nothing';
}

function* checkEnd(B) {
  if (isFainted(B.foe.creature)) {
    const more = B.foeTeam.some((c) => c.hp > 0);
    if (!more) {
      if (B.isTrainer) {
        audio.playMusic('victory', { restart: true });
        yield B.say(`${G.player.name} defeated ${B.cfg.trainer.name}!`);
        const prize = B.cfg.trainer.reward || 200;
        G.money += prize;
        yield B.say(`${G.player.name} got ${prize} MARKS for winning!`);
      } else {
        audio.playMusic('victory', { restart: true });
      }
      B.result = B.result || 'won';
      yield* evolutionPhase(B);
      yield app.fadeTo(1, 420);
      return true;
    }
  }
  if (!partyAlive()) {
    B.result = 'lost';
    yield app.fadeTo(1, 420);
    return true;
  }
  return false;
}

function* evolutionPhase(B) {
  for (const c of G.party) {
    if (!c.pendingEvolve) continue;
    const into = c.pendingEvolve;
    c.pendingEvolve = null;
    B.showFoeBox = false;
    B.showMeBox = false;
    B.fx.foeHide = true;
    B.fx.meHide = false;
    const keep = B.me;
    B.me = makeSide(c, true);
    B.fx.meX = 0; B.fx.meY = 0; B.fx.meAlpha = 1;
    yield B.say(`What? ${c.nick} is acting strangely…`);
    for (let i = 0; i < 6; i++) {
      B.fx.flashMe = 200;
      audio.sfx('stat_up');
      yield wait(180 - i * 18);
    }
    B.fx.whiteFlash = 300;
    audio.sfx('levelup');
    yield call(() => evolveInto(c, into));
    yield wait(500);
    yield B.say(`Congratulations! ${c.nick} is now a ${SPECIES[into].name}!`);
    markCaught(into);
    B.me = keep;
  }
}
