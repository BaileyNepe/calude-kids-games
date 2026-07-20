/**
 * Doodle drawing primitives.
 *
 * All of Math World's art is drawn in code rather than loaded from image
 * files. To stop it looking like clean vector graphics, every line is
 * deliberately wobbled by a small amount — the same trick a child's felt-tip
 * pen does for free.
 *
 * The wobble comes from a *seeded* pseudo-random generator, so a shape drawn
 * with the same seed always wobbles identically. That matters because
 * textures get regenerated on resize; without a seed the art would shimmer.
 */

/** Colours used across the whole game. Tweak here to restyle everything. */
export const PALETTE = {
  ink: 0x2f2b3a, // outline colour — a soft near-black, never pure black
  paper: 0xfdf6e3, // cream "paper" background
  sky: 0x7ecbff,
  grass: 0x8ad46b,
  sun: 0xffd93d,
  red: 0xff5c5c,
  pink: 0xff79b0,
  orange: 0xffa84c,
  yellow: 0xffe066,
  green: 0x6bcf7f,
  teal: 0x4ecdc4,
  blue: 0x5b9bf5,
  purple: 0xa77bf3,
  brown: 0xb5703c,
  darkBrown: 0x8a5228,
  white: 0xfffdf7,
  sea: 0x3aa5d9,
  deepSea: 0x2b7fb0,
} as const;

/** Standard outline thickness. Chunky, like a thick marker pen. */
export const INK_WIDTH = 5;

/**
 * A tiny deterministic PRNG (mulberry32). Given the same seed it always
 * produces the same sequence, which keeps our wobble stable across redraws.
 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Turns any string into a stable numeric seed, so seeds can be readable names. */
export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A 2D point. */
export interface Point {
  x: number;
  y: number;
}

/**
 * Nudges a point by a random amount up to `amount` pixels in each axis.
 * This is the core of the hand-drawn look.
 */
function jitter(rng: () => number, p: Point, amount: number): Point {
  return {
    x: p.x + (rng() - 0.5) * 2 * amount,
    y: p.y + (rng() - 0.5) * 2 * amount,
  };
}

/**
 * Builds the points of a wobbly circle/ellipse.
 *
 * @param segments How many points around the ring. Fewer = lumpier.
 */
export function doodleEllipsePoints(
  rng: () => number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  wobble = 2.5,
  segments = 22,
): Point[] {
  const points: Point[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(
      jitter(
        rng,
        { x: cx + Math.cos(angle) * rx, y: cy + Math.sin(angle) * ry },
        wobble,
      ),
    );
  }
  return points;
}

/**
 * Builds the points of a wobbly rectangle, walking each edge in small steps
 * so the sides bow slightly rather than staying ruler-straight.
 */
export function doodleRectPoints(
  rng: () => number,
  x: number,
  y: number,
  w: number,
  h: number,
  wobble = 2.5,
): Point[] {
  const corners: Point[] = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ];
  const points: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    // Non-null: index arithmetic is bounded by corners.length.
    const from = corners[i]!;
    const to = corners[(i + 1) % corners.length]!;
    const steps = 4;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      points.push(
        jitter(
          rng,
          { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t },
          wobble,
        ),
      );
    }
  }
  return points;
}

/** Fills a closed polygon (no outline). */
export function fillShape(
  g: Phaser.GameObjects.Graphics,
  points: Point[],
  colour: number,
  alpha = 1,
): void {
  if (points.length < 3) return;
  g.fillStyle(colour, alpha);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i]!.x, points[i]!.y);
  g.closePath();
  g.fillPath();
}

/** Strokes a closed polygon outline. */
export function strokeShape(
  g: Phaser.GameObjects.Graphics,
  points: Point[],
  colour: number = PALETTE.ink,
  width: number = INK_WIDTH,
): void {
  if (points.length < 2) return;
  g.lineStyle(width, colour, 1);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i]!.x, points[i]!.y);
  g.closePath();
  g.strokePath();
}

/**
 * Draws a filled, outlined doodle shape in one call.
 *
 * The fill is drawn *slightly offset* from the outline, mimicking a child
 * colouring not-quite-inside the lines. It's a small detail that does a lot
 * of work for the aesthetic.
 */
export function doodleShape(
  g: Phaser.GameObjects.Graphics,
  points: Point[],
  fill: number,
  options: { offset?: number; outline?: number; lineWidth?: number } = {},
): void {
  const offset = options.offset ?? 2;
  const shifted = points.map((p) => ({ x: p.x + offset, y: p.y + offset * 0.6 }));
  fillShape(g, shifted, fill);
  strokeShape(g, points, options.outline ?? PALETTE.ink, options.lineWidth ?? INK_WIDTH);
}

/** Strokes an open (unclosed) wobbly line through the given points. */
export function doodleLine(
  g: Phaser.GameObjects.Graphics,
  points: Point[],
  colour: number = PALETTE.ink,
  width: number = INK_WIDTH,
): void {
  if (points.length < 2) return;
  g.lineStyle(width, colour, 1);
  g.beginPath();
  g.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) g.lineTo(points[i]!.x, points[i]!.y);
  g.strokePath();
}

/** A wobbly straight line from A to B, broken into jittered segments. */
export function doodleStroke(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  from: Point,
  to: Point,
  colour: number = PALETTE.ink,
  width: number = INK_WIDTH,
  wobble = 2,
): void {
  const steps = 6;
  const points: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
    // Leave the endpoints crisp so joins still meet up.
    points.push(i === 0 || i === steps ? p : jitter(rng, p, wobble));
  }
  doodleLine(g, points, colour, width);
}

/** Convenience: a wobbly filled circle. */
export function doodleCircle(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  cx: number,
  cy: number,
  r: number,
  fill: number,
  wobble = 2.5,
): void {
  doodleShape(g, doodleEllipsePoints(rng, cx, cy, r, r, wobble), fill);
}

/** A solid dot with no outline — good for eyes, freckles and pupils. */
export function dot(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  colour: number = PALETTE.ink,
): void {
  g.fillStyle(colour, 1);
  g.fillCircle(cx, cy, r);
}

/**
 * An upward or downward arc — the workhorse for smiles, frowns and eyebrows.
 *
 * @param openUp true draws a smile (curving down then up), false a frown.
 */
export function doodleArc(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  openUp: boolean,
  colour: number = PALETTE.ink,
  width: number = INK_WIDTH,
): void {
  const points: Point[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = Math.PI * t;
    points.push({
      x: cx - Math.cos(angle) * rx,
      y: cy + (openUp ? Math.sin(angle) : -Math.sin(angle)) * ry,
    });
  }
  doodleLine(g, points, colour, width);
}
