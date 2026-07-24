/**
 * Dev-only pose sheet. Renders Marcus at print scale in every animation state
 * so the character art can be judged without squinting at gameplay frames.
 * Not part of the shipped bundle.
 */
import { drawCharacter } from '../src/render/character';
import { Player, type PlayerState } from '../src/game/player';
import { SKINS } from '../src/game/tuning';

const canvas = document.getElementById('sheet') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

interface Cell {
  label: string;
  state: PlayerState;
  cycle: number;
  vy?: number;
  stateT?: number;
  airTime?: number;
}

const CELLS: Cell[] = [
  { label: 'run 0', state: 'run', cycle: 0 },
  { label: 'run ¼', state: 'run', cycle: Math.PI * 0.5 },
  { label: 'run ½', state: 'run', cycle: Math.PI },
  { label: 'run ¾', state: 'run', cycle: Math.PI * 1.5 },
  { label: 'jump rise', state: 'air', cycle: 0, vy: 10, airTime: 0.12 },
  { label: 'jump fall', state: 'air', cycle: 0, vy: -8, airTime: 0.5 },
  { label: 'vault start', state: 'vault', cycle: 0, stateT: 0.04 },
  { label: 'vault mid', state: 'vault', cycle: 0, stateT: 0.14 },
  { label: 'dive', state: 'dive', cycle: 0, vy: -20 },
  { label: 'slide', state: 'slide', cycle: 0, stateT: 0.3 },
  { label: 'hurt', state: 'hurt', cycle: 0, stateT: 0.1 },
  { label: 'run fast', state: 'run', cycle: Math.PI * 0.75 },
];

const SCALE = 150; // px per metre

const render = (skinIndex: number, time: number): void => {
  ctx.fillStyle = '#0a0f1c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cols = 6;
  const cw = canvas.width / cols;
  const ch = canvas.height / 2;

  CELLS.forEach((cell, i) => {
    const cx = (i % cols) * cw + cw * 0.5;
    const cy = Math.floor(i / cols) * ch + ch - 40;

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(cx - cw * 0.45, cy);
    ctx.lineTo(cx + cw * 0.45, cy);
    ctx.stroke();

    const p = new Player();
    p.reset(0);
    p.state = cell.state;
    p.cycle = cell.cycle;
    p.vy = cell.vy ?? 0;
    p.stateT = cell.stateT ?? 0;
    p.airTime = cell.airTime ?? 0;
    p.onGround = cell.state === 'run' || cell.state === 'slide';

    drawCharacter({
      ctx,
      x: cx,
      y: cy,
      scale: SCALE,
      player: p,
      skin: SKINS[skinIndex].palette,
      accent: '#45f5ff',
      speedT: 0.6,
      ghost: 1,
      flow: 0,
      overdrive: false,
    });

    ctx.fillStyle = 'rgba(200,220,240,0.7)';
    ctx.font = '600 13px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(cell.label, cx, cy + 24);
  });

  ctx.fillStyle = 'rgba(200,220,240,0.9)';
  ctx.font = '700 16px system-ui';
  ctx.textAlign = 'left';
  ctx.fillText(`skin: ${SKINS[skinIndex].name}  ·  t=${time.toFixed(2)}`, 16, 26);
};

let skin = 0;
render(skin, 0);

(window as unknown as { SHEET: unknown }).SHEET = {
  render: (s: number) => {
    skin = s;
    render(skin, 0);
  },
};
