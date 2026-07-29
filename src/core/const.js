// Global constants. The internal framebuffer is deliberately GBA-sized.
export const SCREEN_W = 240;
export const SCREEN_H = 160;
export const TILE = 16;

// Overworld movement timing (ms per tile).
export const WALK_MS = 190;
export const RUN_MS = 112;

export const DIR = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };
export const DIR_VEC = [
  { x: 0, y: 1 },
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];
export const DIR_NAME = ['down', 'up', 'left', 'right'];
