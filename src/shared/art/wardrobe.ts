/**
 * Drawing the wardrobe items.
 *
 * Hats and collars are drawn as separate textures and laid over the top of
 * the character or cat sprite, rather than baked into every combination —
 * six hats times five characters would be thirty kid textures, and that
 * multiplies again with every item added.
 *
 * Outfits are the exception: they recolour the tunic itself, so they're
 * applied by rebaking the character with different colours.
 */

import Phaser from 'phaser';
import {
  PALETTE,
  makeRng,
  seedFrom,
  doodleShape,
  doodleEllipsePoints,
  doodleStroke,
  dot,
  type Point,
} from './doodle';
import { WARDROBE, type WardrobeItem } from '../wardrobe';

function bake(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics, rng: () => number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g, makeRng(seedFrom(key)));
  g.generateTexture(key, width, height);
  g.destroy();
}

/** Draws one hat, centred in a 200x160 box with the brim near the bottom. */
function drawHat(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  item: WardrobeItem,
): void {
  const cx = 100;
  const baseY = 128;
  const accent = item.accent ?? PALETTE.white;

  switch (item.id) {
    case 'hat-bow': {
      // Two loops and a knot.
      for (const dir of [-1, 1]) {
        doodleShape(
          g,
          doodleEllipsePoints(rng, cx + dir * 34, baseY - 16, 30, 24, 2.5, 16),
          item.colour,
          { offset: 0, lineWidth: 5 },
        );
      }
      doodleShape(g, doodleEllipsePoints(rng, cx, baseY - 16, 15, 15, 2, 14), item.colour, {
        offset: 0,
        lineWidth: 5,
      });
      break;
    }

    case 'hat-cap': {
      // Dome plus a peak sticking out to the right.
      const dome: Point[] = [];
      for (let i = 0; i <= 14; i++) {
        const angle = Math.PI + (i / 14) * Math.PI;
        dome.push({ x: cx + Math.cos(angle) * 52, y: baseY + Math.sin(angle) * 46 });
      }
      dome.push({ x: cx + 52, y: baseY });
      doodleShape(g, dome, item.colour, { offset: 0, lineWidth: 5 });
      doodleShape(
        g,
        [
          { x: cx + 44, y: baseY - 6 },
          { x: cx + 96, y: baseY + 2 },
          { x: cx + 92, y: baseY + 16 },
          { x: cx + 42, y: baseY + 10 },
        ],
        accent,
        { offset: 0, lineWidth: 4 },
      );
      break;
    }

    case 'hat-party': {
      doodleShape(
        g,
        [
          { x: cx - 40, y: baseY },
          { x: cx + 40, y: baseY },
          { x: cx, y: baseY - 100 },
        ],
        item.colour,
        { offset: 0, lineWidth: 5 },
      );
      // Stripes up the cone, and a pom-pom on top.
      for (let i = 1; i <= 2; i++) {
        const t = i / 3;
        doodleStroke(
          g,
          rng,
          { x: cx - 40 * (1 - t), y: baseY - 100 * t },
          { x: cx + 40 * (1 - t), y: baseY - 100 * t },
          accent,
          5,
          1.5,
        );
      }
      doodleShape(g, doodleEllipsePoints(rng, cx, baseY - 104, 14, 14, 2, 14), accent, {
        offset: 0,
        lineWidth: 4,
      });
      break;
    }

    case 'hat-wizard': {
      doodleShape(
        g,
        [
          { x: cx - 52, y: baseY },
          { x: cx + 52, y: baseY },
          { x: cx + 14, y: baseY - 116 },
        ],
        item.colour,
        { offset: 0, lineWidth: 5 },
      );
      // Brim.
      doodleShape(g, doodleEllipsePoints(rng, cx, baseY + 2, 64, 15, 2, 18), item.colour, {
        offset: 0,
        lineWidth: 5,
      });
      // Stars.
      for (const p of [
        { x: cx - 12, y: baseY - 40 },
        { x: cx + 4, y: baseY - 74 },
      ]) {
        drawStar(g, p.x, p.y, 11, accent);
      }
      break;
    }

    case 'hat-pirate': {
      const brim: Point[] = [
        { x: cx - 62, y: baseY },
        { x: cx + 62, y: baseY },
        { x: cx + 38, y: baseY - 22 },
        { x: cx, y: baseY - 56 },
        { x: cx - 38, y: baseY - 22 },
      ];
      doodleShape(g, brim, item.colour, { offset: 0, lineWidth: 5 });
      // A little skull.
      doodleShape(g, doodleEllipsePoints(rng, cx, baseY - 22, 15, 13, 1.5, 14), accent, {
        offset: 0,
        lineWidth: 3,
      });
      dot(g, cx - 5, baseY - 25, 3, item.colour);
      dot(g, cx + 5, baseY - 25, 3, item.colour);
      break;
    }

    case 'hat-crown': {
      const crown: Point[] = [
        { x: cx - 46, y: baseY },
        { x: cx - 46, y: baseY - 46 },
        { x: cx - 23, y: baseY - 24 },
        { x: cx, y: baseY - 58 },
        { x: cx + 23, y: baseY - 24 },
        { x: cx + 46, y: baseY - 46 },
        { x: cx + 46, y: baseY },
      ];
      doodleShape(g, crown, item.colour, { offset: 1, lineWidth: 5 });
      // Jewels.
      dot(g, cx, baseY - 14, 7, item.accent ?? PALETTE.red);
      dot(g, cx - 26, baseY - 8, 5, PALETTE.teal);
      dot(g, cx + 26, baseY - 8, 5, PALETTE.teal);
      break;
    }

    default:
      break;
  }
}

/** A small four-pointed twinkle. */
function drawStar(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  colour: number,
): void {
  const pts: Point[] = [
    { x: cx, y: cy - r },
    { x: cx + r * 0.3, y: cy - r * 0.3 },
    { x: cx + r, y: cy },
    { x: cx + r * 0.3, y: cy + r * 0.3 },
    { x: cx, y: cy + r },
    { x: cx - r * 0.3, y: cy + r * 0.3 },
    { x: cx - r, y: cy },
    { x: cx - r * 0.3, y: cy - r * 0.3 },
  ];
  doodleShape(g, pts, colour, { offset: 0, lineWidth: 2 });
}

/** Draws one cat collar, centred in a 160x90 box. */
function drawCollar(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  item: WardrobeItem,
): void {
  const cx = 80;
  const cy = 44;

  if (item.id === 'collar-bow') {
    // A bow tie rather than a band.
    for (const dir of [-1, 1]) {
      doodleShape(
        g,
        [
          { x: cx, y: cy },
          { x: cx + dir * 34, y: cy - 20 },
          { x: cx + dir * 34, y: cy + 20 },
        ],
        item.colour,
        { offset: 0, lineWidth: 4 },
      );
    }
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 10, 10, 1.5, 12), item.colour, {
      offset: 0,
      lineWidth: 4,
    });
    return;
  }

  // A band with a hanging tag or bell.
  doodleShape(
    g,
    [
      { x: cx - 56, y: cy - 11 },
      { x: cx + 56, y: cy - 11 },
      { x: cx + 56, y: cy + 11 },
      { x: cx - 56, y: cy + 11 },
    ],
    item.colour,
    { offset: 0, lineWidth: 4 },
  );
  doodleShape(
    g,
    doodleEllipsePoints(rng, cx, cy + 24, 13, 13, 1.5, 14),
    item.accent ?? PALETTE.sun,
    { offset: 0, lineWidth: 4 },
  );
}

/** Bakes every wardrobe texture. Keys are `item-<id>`. */
export function makeWardrobeTextures(scene: Phaser.Scene): void {
  for (const item of WARDROBE) {
    const key = `item-${item.id}`;
    if (item.slot === 'hat') {
      bake(scene, key, 200, 160, (g, rng) => drawHat(g, rng, item));
    } else if (item.slot === 'collar') {
      bake(scene, key, 160, 90, (g, rng) => drawCollar(g, rng, item));
    }
    // Outfits have no standalone texture: they recolour the character.
  }
}

/**
 * Where a hat sits on a character sprite.
 *
 * The hat art is drawn resting on a baseline near the bottom of its own
 * texture, so it's anchored low (originY) and then placed at the top of
 * the head rather than at the head's centre — otherwise the hat covers the
 * face. Every kid texture puts the head in the same place, so one pair of
 * numbers works for all of them.
 */
export const HAT_ORIGIN_Y = 0.82;

/** Height fraction, measured from the sprite's centre, of the top of the head. */
export const HAT_OFFSET_Y = -0.4;

/** Where a collar sits on a cat sprite, as a fraction of its height. */
export const COLLAR_OFFSET_Y = 0.04;
