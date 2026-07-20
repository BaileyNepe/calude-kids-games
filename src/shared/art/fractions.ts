/**
 * Drawing fractions as pictures.
 *
 * At this age fractions are understood visually long before they're
 * understood symbolically, so a fraction question shows a shape with some
 * parts shaded and asks "how much is shaded?".
 *
 * Both shapes are drawn live (rather than baked) because the number of
 * parts changes with every question.
 */

import Phaser from 'phaser';
import { PALETTE, INK_WIDTH, makeRng, doodleShape, doodleRectPoints, type Point } from './doodle';
import type { FractionVisual } from '../mathEngine';

/**
 * Draws a fraction picture centred on (x, y).
 *
 * @returns the Graphics object, so the caller can position or destroy it.
 */
export function drawFraction(
  scene: Phaser.Scene,
  x: number,
  y: number,
  visual: FractionVisual,
  size = 150,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const rng = makeRng(visual.numerator * 31 + visual.denominator * 7);

  if (visual.shape === 'circle') {
    drawCircleFraction(g, rng, x, y, size / 2, visual);
  } else {
    drawBarFraction(g, rng, x, y, size * 1.5, size * 0.62, visual);
  }
  return g;
}

/** A pie chart: the classic "slices of a cake" picture. */
function drawCircleFraction(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  cx: number,
  cy: number,
  radius: number,
  visual: FractionVisual,
): void {
  const { numerator, denominator } = visual;
  const slice = (Math.PI * 2) / denominator;
  // Start at the top, which is how a child expects a cake to be cut.
  const start = -Math.PI / 2;

  for (let i = 0; i < denominator; i++) {
    const from = start + i * slice;
    const to = from + slice;

    // Build the wedge as a polygon so it can use the doodle outline.
    const points: Point[] = [{ x: cx, y: cy }];
    const steps = Math.max(3, Math.ceil((slice / (Math.PI * 2)) * 28));
    for (let s = 0; s <= steps; s++) {
      const angle = from + (to - from) * (s / steps);
      points.push({
        x: cx + Math.cos(angle) * radius + (rng() - 0.5) * 3,
        y: cy + Math.sin(angle) * radius + (rng() - 0.5) * 3,
      });
    }

    // Shaded slices are warm and solid; unshaded ones are pale.
    doodleShape(g, points, i < numerator ? PALETTE.orange : PALETTE.white, {
      offset: 0,
      lineWidth: INK_WIDTH - 1,
    });
  }
}

/** A chocolate-bar style strip, divided into equal pieces. */
function drawBarFraction(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  cx: number,
  cy: number,
  width: number,
  height: number,
  visual: FractionVisual,
): void {
  const { numerator, denominator } = visual;
  const pieceWidth = width / denominator;
  const left = cx - width / 2;
  const top = cy - height / 2;

  for (let i = 0; i < denominator; i++) {
    doodleShape(
      g,
      doodleRectPoints(rng, left + i * pieceWidth, top, pieceWidth, height, 2),
      i < numerator ? PALETTE.orange : PALETTE.white,
      { offset: 0, lineWidth: INK_WIDTH - 1 },
    );
  }
}
