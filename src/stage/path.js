import { MathUtils, Vector3 } from 'three';
import { WORLD } from '../config.js';

/**
 * The flight path. Cards are strung along -Z with a lazy lateral sway; the
 * reading distance is derived from the card's own size and the shape of the
 * viewport, so a card frames the same way on a widescreen monitor and on a
 * portrait phone.
 */
export function cardPosition(index, card) {
  const height = card ? card.height : 4;
  const sway = Math.sin(index * 0.85) * WORLD.sway;
  const lift = Math.max(WORLD.altitude, height / 2 + WORLD.clearance);
  return new Vector3(sway, lift, -index * WORLD.sceneSpacing);
}

/** How far back the camera must sit for this card to fit the frame. */
export function readDistance(card, view) {
  const height = card ? card.height : 4;
  const width = card ? card.width : 8;
  const halfV = Math.tan(MathUtils.degToRad(view.fov) / 2);
  const halfH = halfV * view.aspect;
  const byHeight = height / 2 / (halfV * WORLD.fillHeight);
  const byWidth = width / 2 / (halfH * WORLD.fillWidth);
  return MathUtils.clamp(
    Math.max(byHeight, byWidth),
    WORLD.readDistanceMin,
    WORLD.readDistanceMax,
  );
}

/**
 * Where the camera sits, and what it looks at, when reading card `index`.
 * @param {{aspect: number, fov: number}} view
 */
export function readPose(index, card, view) {
  const position = cardPosition(index, card);
  const height = card ? card.height : 4;
  const distance = readDistance(card, view);
  const lateral = Math.cos(index * 1.31) * Math.min(3.4, distance * 0.2);

  // The eye sits well below the card so the camera tilts up: that lifts the
  // whole block clear of the waterline instead of letting the last lines sink
  // into the glitter.
  const drop = WORLD.eyeDrop + height * 0.55;
  const eye = new Vector3(
    position.x + lateral,
    Math.max(WORLD.waterLevel + 1.6, position.y - drop),
    position.z + distance,
  );

  return { eye, target: position.clone().add(new Vector3(0, -0.15, 0)), position };
}

/**
 * Narrow viewports need a shorter measure, otherwise the camera has to retreat
 * so far that the type turns to soup. Returns the layout frame for an aspect.
 */
export function frameFor(aspect) {
  return { wrapScale: MathUtils.clamp(aspect / 1.35, 0.42, 1) };
}
