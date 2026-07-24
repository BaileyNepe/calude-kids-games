/**
 * Sprite factory.
 *
 * Every visual in Math World is drawn here with the doodle primitives and
 * baked into a Phaser texture exactly once (during BootScene). Scenes then
 * use plain `scene.add.image(...)` as if the art had been loaded from files.
 *
 * Baking up front matters because drawing is comparatively slow; doing it
 * per-scene would stutter on a tablet.
 */

import Phaser from 'phaser';
import {
  PALETTE,
  INK_WIDTH,
  makeRng,
  seedFrom,
  doodleShape,
  doodleEllipsePoints,
  doodleRectPoints,
  doodleStroke,
  doodleLine,
  doodleArc,
  doodleCircle,
  fillShape,
  strokeShape,
  dot,
  type Point,
} from './doodle';

/**
 * Draws into an off-screen Graphics object and registers the result as a
 * texture under `key`. The Graphics is destroyed afterwards.
 */
function bake(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (g: Phaser.GameObjects.Graphics, rng: () => number) => void,
): void {
  // Re-baking the same key would throw, so skip if it already exists.
  if (scene.textures.exists(key)) return;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  draw(g, makeRng(seedFrom(key)));
  g.generateTexture(key, width, height);
  g.destroy();
}

/* ------------------------------------------------------------------ *
 * Cats — the collectibles, and the star of Feed the Cat.
 * ------------------------------------------------------------------ */

/** Which face to draw. Feed the Cat swaps between these to react. */
export type CatFace = 'idle' | 'open' | 'happy' | 'noseUp';

/** The look of one collectible cat. Rarity decorations are additive. */
export interface CatLook {
  /** Main fur colour. */
  body: number;
  /** Stripe / patch colour. Omit for a plain cat. */
  accent?: number;
  /** Pattern drawn on top of the body. */
  pattern?: 'stripes' | 'patches' | 'none';
  /** Drawn for legendary cats. */
  crown?: boolean;
  /** Drawn for legendary cats. */
  wings?: boolean;
  /** Drawn for rare cats — a little sparkle. */
  sparkles?: boolean;
}

/**
 * Draws a complete cat centred in a 200x200 box.
 * Kept as a standalone function so both the pets screen and Feed the Cat
 * can render the same creature at different sizes.
 */
function drawCat(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  look: CatLook,
  face: CatFace,
): void {
  const cx = 100;
  const cy = 112;

  // Wings sit behind the body, so they're drawn first.
  if (look.wings) {
    for (const dir of [-1, 1]) {
      const wing = doodleEllipsePoints(rng, cx + dir * 58, cy - 8, 26, 38, 3, 16);
      doodleShape(g, wing, PALETTE.white, { offset: 1 });
    }
  }

  // Tail — a curl out to the right.
  const tail: Point[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    tail.push({
      x: cx + 40 + Math.sin(t * Math.PI * 0.9) * 34,
      y: cy + 44 - t * 46,
    });
  }
  doodleLine(g, tail, PALETTE.ink, INK_WIDTH + 4);
  doodleLine(g, tail, look.body, INK_WIDTH);

  // Body.
  doodleShape(g, doodleEllipsePoints(rng, cx, cy + 24, 46, 40, 3, 20), look.body);

  // Head.
  const head = doodleEllipsePoints(rng, cx, cy - 26, 44, 38, 3, 20);
  doodleShape(g, head, look.body);

  // Ears — triangles poking out of the head.
  for (const dir of [-1, 1]) {
    const ear: Point[] = [
      { x: cx + dir * 20, y: cy - 54 },
      { x: cx + dir * 40, y: cy - 50 },
      { x: cx + dir * 30, y: cy - 76 },
    ];
    doodleShape(g, ear, look.body);
    // Inner ear, in the accent colour if there is one.
    const inner: Point[] = [
      { x: cx + dir * 25, y: cy - 56 },
      { x: cx + dir * 34, y: cy - 54 },
      { x: cx + dir * 30, y: cy - 68 },
    ];
    doodleShape(g, inner, look.accent ?? PALETTE.pink, { offset: 0, lineWidth: 2 });
  }

  // Pattern on the body.
  if (look.pattern === 'stripes' && look.accent !== undefined) {
    for (let i = 0; i < 3; i++) {
      const y = cy + 6 + i * 16;
      doodleStroke(g, rng, { x: cx - 26, y }, { x: cx + 26, y }, look.accent, 6, 2);
    }
  } else if (look.pattern === 'patches' && look.accent !== undefined) {
    doodleShape(g, doodleEllipsePoints(rng, cx - 20, cy + 26, 16, 13, 2, 12), look.accent, {
      offset: 0,
      lineWidth: 2,
    });
    doodleShape(g, doodleEllipsePoints(rng, cx + 22, cy + 40, 13, 11, 2, 12), look.accent, {
      offset: 0,
      lineWidth: 2,
    });
  }

  /* --- Face --------------------------------------------------------- */
  const eyeY = cy - 32;
  if (face === 'happy') {
    // Closed, contented eyes — two upward arcs.
    doodleArc(g, cx - 16, eyeY + 2, 9, 7, false);
    doodleArc(g, cx + 16, eyeY + 2, 9, 7, false);
  } else if (face === 'noseUp') {
    // Turned-away eyes: closed and tilted, plus raised brows.
    doodleArc(g, cx - 16, eyeY, 9, 5, false);
    doodleArc(g, cx + 16, eyeY, 9, 5, false);
    doodleStroke(g, rng, { x: cx - 26, y: eyeY - 16 }, { x: cx - 8, y: eyeY - 20 }, PALETTE.ink, 4);
    doodleStroke(g, rng, { x: cx + 8, y: eyeY - 20 }, { x: cx + 26, y: eyeY - 16 }, PALETTE.ink, 4);
  } else {
    // Open eyes with a highlight, so the cat looks alive.
    dot(g, cx - 16, eyeY, 8);
    dot(g, cx + 16, eyeY, 8);
    dot(g, cx - 13, eyeY - 3, 3, PALETTE.white);
    dot(g, cx + 19, eyeY - 3, 3, PALETTE.white);
  }

  // Nose.
  const nose: Point[] = [
    { x: cx - 6, y: cy - 16 },
    { x: cx + 6, y: cy - 16 },
    { x: cx, y: cy - 8 },
  ];
  doodleShape(g, nose, PALETTE.pink, { offset: 0, lineWidth: 2 });

  // Mouth.
  if (face === 'open') {
    // A wide open mouth, ready for a fish.
    doodleShape(g, doodleEllipsePoints(rng, cx, cy + 4, 17, 14, 2, 14), PALETTE.red, {
      offset: 0,
      lineWidth: 3,
    });
    doodleShape(g, doodleEllipsePoints(rng, cx, cy + 9, 9, 6, 1.5, 12), PALETTE.pink, {
      offset: 0,
      lineWidth: 2,
    });
  } else if (face === 'noseUp') {
    // A flat, unimpressed line.
    doodleStroke(g, rng, { x: cx - 12, y: cy - 2 }, { x: cx + 12, y: cy - 2 }, PALETTE.ink, 4);
  } else {
    // Classic cat "w" mouth.
    doodleArc(g, cx - 7, cy - 8, 7, 6, true);
    doodleArc(g, cx + 7, cy - 8, 7, 6, true);
  }

  // Whiskers.
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const y = cy - 20 + i * 9;
      doodleStroke(
        g,
        rng,
        { x: cx + dir * 22, y },
        { x: cx + dir * 54, y: y - 6 + i * 5 },
        PALETTE.ink,
        3,
        1.5,
      );
    }
  }

  // Paws.
  doodleShape(g, doodleEllipsePoints(rng, cx - 24, cy + 58, 15, 11, 2, 14), look.body);
  doodleShape(g, doodleEllipsePoints(rng, cx + 24, cy + 58, 15, 11, 2, 14), look.body);

  // Rarity flourishes.
  if (look.crown) {
    const crown: Point[] = [
      { x: cx - 26, y: cy - 66 },
      { x: cx - 26, y: cy - 88 },
      { x: cx - 13, y: cy - 76 },
      { x: cx, y: cy - 94 },
      { x: cx + 13, y: cy - 76 },
      { x: cx + 26, y: cy - 88 },
      { x: cx + 26, y: cy - 66 },
    ];
    doodleShape(g, crown, PALETTE.sun, { offset: 1, lineWidth: 4 });
  }
  if (look.sparkles) {
    for (const p of [
      { x: cx - 58, y: cy - 56 },
      { x: cx + 60, y: cy - 40 },
      { x: cx + 46, y: cy + 62 },
    ]) {
      drawSparkle(g, p.x, p.y, 9, PALETTE.sun);
    }
  }
}

/** A four-pointed twinkle. */
function drawSparkle(
  g: Phaser.GameObjects.Graphics,
  cx: number,
  cy: number,
  r: number,
  colour: number,
): void {
  const pts: Point[] = [
    { x: cx, y: cy - r },
    { x: cx + r * 0.28, y: cy - r * 0.28 },
    { x: cx + r, y: cy },
    { x: cx + r * 0.28, y: cy + r * 0.28 },
    { x: cx, y: cy + r },
    { x: cx - r * 0.28, y: cy + r * 0.28 },
    { x: cx - r, y: cy },
    { x: cx - r * 0.28, y: cy - r * 0.28 },
  ];
  doodleShape(g, pts, colour, { offset: 0, lineWidth: 2 });
}

/** Bakes one cat texture. Key convention: `cat-<id>-<face>`. */
export function makeCatTexture(
  scene: Phaser.Scene,
  id: string,
  look: CatLook,
  face: CatFace = 'idle',
): string {
  const key = `cat-${id}-${face}`;
  bake(scene, key, 200, 210, (g, rng) => drawCat(g, rng, look, face));
  return key;
}

/**
 * Bakes every expression for one cat, if they don't already exist.
 *
 * Called by whichever scene is about to star a particular cat. With a
 * 152-cat catalog nothing is baked at boot any more — even the idle pose
 * is drawn on demand — so this now includes 'idle' alongside the three
 * reacting faces. Baking is idempotent, so calling it repeatedly is cheap.
 */
export function ensureCatFaces(scene: Phaser.Scene, id: string, look: CatLook): void {
  makeCatTexture(scene, id, look, 'idle');
  makeCatTexture(scene, id, look, 'open');
  makeCatTexture(scene, id, look, 'happy');
  makeCatTexture(scene, id, look, 'noseUp');
}

/**
 * Bakes a solid-black silhouette of a cat, for undiscovered entries on the
 * pets screen. Drawn from the same geometry so the shape still reads.
 */
export function makeCatSilhouette(scene: Phaser.Scene, id: string, look: CatLook): string {
  const key = `cat-${id}-silhouette`;
  const flat: CatLook = {
    body: 0x3c3550,
    accent: 0x3c3550,
    pattern: 'none',
    ...(look.crown === true ? { crown: true } : {}),
    ...(look.wings === true ? { wings: true } : {}),
  };
  bake(scene, key, 200, 210, (g, rng) => drawCat(g, rng, flat, 'happy'));
  return key;
}

/* ------------------------------------------------------------------ *
 * Balloons
 * ------------------------------------------------------------------ */

/** Bakes a balloon (body + knot + string) in the given colour. */
export function makeBalloonTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `balloon-${name}`;
  bake(scene, key, 150, 230, (g, rng) => {
    const cx = 75;
    const cy = 82;
    // Body — slightly taller than wide, like a real party balloon.
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 56, 66, 2.5, 24), colour);
    // Knot.
    const knot: Point[] = [
      { x: cx - 9, y: cy + 64 },
      { x: cx + 9, y: cy + 64 },
      { x: cx, y: cy + 80 },
    ];
    doodleShape(g, knot, colour, { offset: 0, lineWidth: 3 });
    // Curly string.
    const string: Point[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14;
      string.push({ x: cx + Math.sin(t * Math.PI * 2.4) * 11, y: cy + 80 + t * 62 });
    }
    doodleLine(g, string, PALETTE.ink, 3);
    // Shine highlight, so it reads as glossy rubber.
    doodleShape(g, doodleEllipsePoints(rng, cx - 22, cy - 26, 12, 18, 1.5, 12), PALETTE.white, {
      offset: 0,
      lineWidth: 0,
    });
  });
  return key;
}

/** Bakes the burst shape shown for a split second when a balloon pops. */
export function makeBurstTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `burst-${name}`;
  bake(scene, key, 200, 200, (g, rng) => {
    const cx = 100;
    const cy = 100;
    const pts: Point[] = [];
    // Alternating long/short spikes make a classic comic-book burst.
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const r = i % 2 === 0 ? 82 : 40;
      pts.push({
        x: cx + Math.cos(angle) * r + (rng() - 0.5) * 8,
        y: cy + Math.sin(angle) * r + (rng() - 0.5) * 8,
      });
    }
    doodleShape(g, pts, colour, { offset: 0, lineWidth: 4 });
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Fish — the draggable pieces in Feed the Cat.
 * ------------------------------------------------------------------ */

/** Bakes a fish facing right. */
export function makeFishTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `fish-${name}`;
  bake(scene, key, 220, 130, (g, rng) => {
    const cx = 100;
    const cy = 65;
    // Tail.
    const tail: Point[] = [
      { x: cx - 52, y: cy },
      { x: cx - 92, y: cy - 32 },
      { x: cx - 82, y: cy },
      { x: cx - 92, y: cy + 32 },
    ];
    doodleShape(g, tail, colour);
    // Body.
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 58, 38, 2.5, 20), colour);
    // Top fin.
    const fin: Point[] = [
      { x: cx - 14, y: cy - 34 },
      { x: cx + 4, y: cy - 58 },
      { x: cx + 20, y: cy - 30 },
    ];
    doodleShape(g, fin, colour, { offset: 0, lineWidth: 3 });

    // Face, pushed to the front of the body so it never sits under the
    // number. The eye used to overlap the digit, which made the answer
    // genuinely hard to read.
    dot(g, cx + 40, cy - 12, 7, PALETTE.white);
    dot(g, cx + 42, cy - 12, 4);
    doodleArc(g, cx + 42, cy + 6, 7, 4, true, PALETTE.ink, 3);
    // Gill line, separating the face from the number panel.
    doodleArc(g, cx + 24, cy - 4, 9, 15, false);

    // A pale badge on the body. The number is drawn on top of this by the
    // scene, so a dark digit always sits on a light background whatever
    // colour the fish is. Wide enough for two digits.
    doodleShape(g, doodleEllipsePoints(rng, cx - 14, cy, 38, 27, 2, 18), PALETTE.paper, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/** Where a fish's number badge sits, relative to the sprite's centre. */
export const FISH_LABEL_OFFSET = { x: -14, y: 0 } as const;

/* ------------------------------------------------------------------ *
 * Pirate Ship scenery
 * ------------------------------------------------------------------ */

/** Bakes the pirate ship hull, mast and sail. Wide, sits at the bottom. */
export function makeShipTexture(scene: Phaser.Scene): string {
  const key = 'pirate-ship';
  bake(scene, key, 760, 460, (g, rng) => {
    // Mast.
    doodleShape(g, doodleRectPoints(rng, 366, 40, 22, 300, 2), PALETTE.darkBrown);
    // Sail — a big billowing curve.
    const sail: Point[] = [
      { x: 388, y: 70 },
      { x: 600, y: 96 },
      { x: 572, y: 150 },
      { x: 604, y: 210 },
      { x: 388, y: 234 },
    ];
    doodleShape(g, sail, PALETTE.white);
    const sail2: Point[] = [
      { x: 366, y: 70 },
      { x: 176, y: 96 },
      { x: 200, y: 150 },
      { x: 172, y: 210 },
      { x: 366, y: 234 },
    ];
    doodleShape(g, sail2, PALETTE.paper);

    // Hull — a wide boat shape.
    const hull: Point[] = [
      { x: 60, y: 300 },
      { x: 700, y: 300 },
      { x: 640, y: 430 },
      { x: 120, y: 430 },
    ];
    doodleShape(g, hull, PALETTE.brown, { lineWidth: 6 });
    // Deck rail.
    doodleStroke(g, rng, { x: 66, y: 316 }, { x: 694, y: 316 }, PALETTE.darkBrown, 8);
    // Plank lines across the hull.
    for (let i = 0; i < 3; i++) {
      const y = 344 + i * 28;
      doodleStroke(g, rng, { x: 108 + i * 10, y }, { x: 652 - i * 10, y }, PALETTE.darkBrown, 4, 2);
    }
    // Portholes.
    for (let i = 0; i < 4; i++) {
      const x = 190 + i * 130;
      doodleCircle(g, rng, x, 372, 22, PALETTE.sun, 2);
      doodleCircle(g, rng, x, 372, 13, PALETTE.sky, 1.5);
    }
  });
  return key;
}

/** Bakes the skull-and-crossbones flag. */
export function makeSkullFlagTexture(scene: Phaser.Scene): string {
  const key = 'skull-flag';
  bake(scene, key, 200, 150, (g, rng) => {
    // Flag cloth.
    const cloth: Point[] = [
      { x: 20, y: 16 },
      { x: 186, y: 26 },
      { x: 180, y: 124 },
      { x: 20, y: 112 },
    ];
    doodleShape(g, cloth, 0x2a2636);
    // Skull.
    doodleShape(g, doodleEllipsePoints(rng, 100, 60, 30, 27, 2, 16), PALETTE.white, {
      offset: 0,
      lineWidth: 3,
    });
    // Jaw.
    doodleShape(g, doodleRectPoints(rng, 86, 80, 28, 16, 2), PALETTE.white, {
      offset: 0,
      lineWidth: 3,
    });
    // Eye sockets and nose.
    dot(g, 89, 56, 8, 0x2a2636);
    dot(g, 111, 56, 8, 0x2a2636);
    dot(g, 100, 70, 4, 0x2a2636);
    // Crossbones behind the jaw.
    doodleStroke(g, rng, { x: 62, y: 104 }, { x: 138, y: 92 }, PALETTE.white, 7);
    doodleStroke(g, rng, { x: 62, y: 92 }, { x: 138, y: 104 }, PALETTE.white, 7);
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Stick-figure kids — the player and the world's wandering characters.
 * ------------------------------------------------------------------ */

/**
 * How one kid looks. Modelled directly on the reference drawing: a big
 * round head, a thick bob of hair, a two-tone tunic, thin line limbs and
 * solid blob shoes.
 */
export interface KidLook {
  /** Upper part of the tunic. */
  top: number;
  /** Lower part of the tunic — the reference uses two colours. */
  bottom: number;
  hair: number;
  shoes: number;
  /** Optional collar/scarf behind the shoulders, as on the reference girl. */
  collar?: number;
  /** Long hair falls past the shoulders; short is a chin-length bob. */
  hairLength?: 'short' | 'long';
  /**
   * What the lower half is.
   *
   * The reference drawing is a flared tunic, which reads as a dress on
   * every character no matter what colour it is. 'shorts' straightens the
   * tunic into a top and puts two legs of clothing under it instead — in
   * this drawing style that silhouette is what makes a kid read as a boy.
   */
  bottoms?: 'tunic' | 'shorts';
  /** Which arm is raised. The asymmetry is what makes it look hand-drawn. */
  armPose?: 'leftUp' | 'rightUp' | 'bothDown';
}

/**
 * Draws the big concentric eye from the reference: an almond outline, a
 * ring inside it, and a filled pupil. This single detail is what makes the
 * faces read as a child's drawing rather than as generic clip art.
 */
function drawKidEye(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  cx: number,
  cy: number,
): void {
  // Outer almond.
  doodleShape(g, doodleEllipsePoints(rng, cx, cy, 13, 15, 1.5, 16), PALETTE.white, {
    offset: 0,
    lineWidth: 4,
  });
  // Iris ring.
  doodleShape(g, doodleEllipsePoints(rng, cx, cy, 7.5, 8.5, 1, 14), PALETTE.white, {
    offset: 0,
    lineWidth: 3,
  });
  // Pupil, and a highlight so the eye looks alive.
  dot(g, cx, cy + 1, 4);
  dot(g, cx + 2.5, cy - 2, 1.6, PALETTE.white);
}

/**
 * Bakes a kid in the style of the reference drawing.
 * @param hat Gives the pirate captain a tricorn; the world kids go bare-headed.
 */
export function makeKidTexture(
  scene: Phaser.Scene,
  name: string,
  look: KidLook,
  hat: 'none' | 'pirate' = 'none',
): string {
  const key = `kid-${name}`;
  // Tall canvas: the long arms and legs need the room.
  bake(scene, key, 230, 350, (g, rng) => {
    const cx = 115;
    const headY = 74;
    const headR = 42;
    const long = look.hairLength === 'long';

    /* --- Hair (behind the head) ---------------------------------- */
    // A thick cap hugging the skull, drawn first so the face sits on top.
    const hairOuter = doodleEllipsePoints(rng, cx, headY - 2, headR + 9, headR + 9, 2.5, 20);
    doodleShape(g, hairOuter, look.hair, { offset: 0, lineWidth: 3 });

    // Side lengths falling past the ears, with the finger-like strand ends
    // that the reference drawing has.
    const sideBottom = headY + (long ? 74 : 40);
    for (const dir of [-1, 1]) {
      const side: Point[] = [
        { x: cx + dir * (headR + 8), y: headY - 12 },
        { x: cx + dir * (headR + 10), y: sideBottom },
        { x: cx + dir * (headR - 8), y: sideBottom },
        { x: cx + dir * (headR - 6), y: headY - 12 },
      ];
      doodleShape(g, side, look.hair, { offset: 0, lineWidth: 3 });
      // Three little strands at the bottom of each side.
      for (let i = 0; i < 3; i++) {
        const sx = cx + dir * (headR - 4 + i * 5);
        doodleStroke(
          g,
          rng,
          { x: sx, y: sideBottom - 4 },
          { x: sx + dir * 2, y: sideBottom + 12 },
          look.hair,
          5,
          1.5,
        );
      }
    }

    /* --- Face ------------------------------------------------------ */
    // The face itself is left pale, as on the reference.
    doodleShape(g, doodleEllipsePoints(rng, cx, headY, headR, headR, 2.5, 20), PALETTE.paper, {
      offset: 0,
      lineWidth: 4,
    });

    // A fringe across the top of the forehead.
    const fringe: Point[] = [
      { x: cx - headR, y: headY - 14 },
      { x: cx - headR + 4, y: headY - headR - 4 },
      { x: cx + headR - 4, y: headY - headR - 4 },
      { x: cx + headR, y: headY - 14 },
      { x: cx + headR - 12, y: headY - 22 },
      { x: cx, y: headY - 14 },
      { x: cx - headR + 12, y: headY - 22 },
    ];
    doodleShape(g, fringe, look.hair, { offset: 0, lineWidth: 3 });

    drawKidEye(g, rng, cx - 16, headY + 2);
    drawKidEye(g, rng, cx + 16, headY + 2);
    // A single curved smile — no outline, exactly as drawn.
    doodleArc(g, cx, headY + 24, 15, 11, true, PALETTE.ink, 4);

    /* --- Body ------------------------------------------------------ */
    const shoulderY = headY + headR + 4;
    const hipY = shoulderY + 96;
    const halfTop = 22;
    // Barely flared for shorts, so the same trapezoid reads as a t-shirt
    // rather than a skirt.
    const shorts = look.bottoms === 'shorts';
    const halfBottom = shorts ? 28 : 42;

    // Collar/scarf spreading out behind the shoulders, as on the reference
    // girl. Drawn wider than the tunic so it reads as a shape of its own
    // rather than as stray marks at the neck.
    if (look.collar !== undefined) {
      const collar: Point[] = [
        { x: cx - halfTop - 4, y: shoulderY - 4 },
        { x: cx + halfTop + 4, y: shoulderY - 4 },
        { x: cx + halfTop + 30, y: shoulderY + 54 },
        { x: cx, y: shoulderY + 40 },
        { x: cx - halfTop - 30, y: shoulderY + 54 },
      ];
      doodleShape(g, collar, look.collar, { offset: 0, lineWidth: 3 });
    }

    // The tunic is a trapezoid, split into two colours like the reference.
    const splitY = shoulderY + (hipY - shoulderY) * 0.58;
    const widthAt = (y: number): number =>
      halfTop + ((y - shoulderY) / (hipY - shoulderY)) * (halfBottom - halfTop);

    doodleShape(
      g,
      [
        { x: cx - halfTop, y: shoulderY },
        { x: cx + halfTop, y: shoulderY },
        { x: cx + widthAt(splitY), y: splitY },
        { x: cx - widthAt(splitY), y: splitY },
      ],
      look.top,
      { offset: 0, lineWidth: 4 },
    );
    doodleShape(
      g,
      [
        { x: cx - widthAt(splitY), y: splitY },
        { x: cx + widthAt(splitY), y: splitY },
        { x: cx + halfBottom, y: hipY },
        { x: cx - halfBottom, y: hipY },
      ],
      look.bottom,
      { offset: 0, lineWidth: 4 },
    );

    /* --- Limbs ----------------------------------------------------- */
    // Thin single strokes, deliberately asymmetric — in the reference one
    // arm swings up over the head.
    // Long thin arms reaching well clear of the body, as in the reference —
    // stubby arms were the main thing making these read as generic.
    const pose = look.armPose ?? 'rightUp';
    const armY = shoulderY + 14;
    const leftArmEnd =
      pose === 'leftUp' ? { x: cx - 76, y: armY - 84 } : { x: cx - 80, y: armY + 62 };
    const rightArmEnd =
      pose === 'rightUp' ? { x: cx + 76, y: armY - 82 } : { x: cx + 78, y: armY + 64 };
    doodleStroke(g, rng, { x: cx - halfTop + 4, y: armY }, leftArmEnd, PALETTE.ink, 5, 2.5);
    doodleStroke(g, rng, { x: cx + halfTop - 4, y: armY }, rightArmEnd, PALETTE.ink, 5, 2.5);

    // Long legs.
    const footY = hipY + 86;
    doodleStroke(g, rng, { x: cx - 17, y: hipY }, { x: cx - 26, y: footY }, PALETTE.ink, 6, 2);
    doodleStroke(g, rng, { x: cx + 17, y: hipY }, { x: cx + 28, y: footY }, PALETTE.ink, 6, 2);

    // Shorts go on over the top of the legs — drawn after the strokes so
    // the leg lines don't run through them.
    if (shorts) {
      const hemY = hipY + 38;
      for (const dir of [-1, 1] as const) {
        doodleShape(
          g,
          [
            { x: cx + dir * 3, y: hipY - 6 },
            { x: cx + dir * (halfBottom + 2), y: hipY - 6 },
            { x: cx + dir * (halfBottom + 5), y: hemY },
            { x: cx + dir * 8, y: hemY - 4 },
          ],
          look.bottom,
          { offset: 0, lineWidth: 4 },
        );
      }
    }

    // Solid blob shoes, angled outward and big enough to read as shoes.
    for (const [fx, dir] of [
      [cx - 26, -1],
      [cx + 28, 1],
    ] as const) {
      doodleShape(
        g,
        [
          { x: fx - 6, y: footY - 8 },
          { x: fx + dir * 30, y: footY + 2 },
          { x: fx + dir * 25, y: footY + 21 },
          { x: fx - 8, y: footY + 16 },
        ],
        look.shoes,
        { offset: 0, lineWidth: 3 },
      );
    }

    if (hat === 'pirate') {
      const brim: Point[] = [
        { x: cx - 52, y: headY - 30 },
        { x: cx + 52, y: headY - 30 },
        { x: cx + 32, y: headY - 46 },
        { x: cx, y: headY - 70 },
        { x: cx - 32, y: headY - 46 },
      ];
      doodleShape(g, brim, 0x2a2636);
      dot(g, cx, headY - 44, 8, PALETTE.white);
    }
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Scenery odds and ends
 * ------------------------------------------------------------------ */

/** Bakes a fluffy cloud. */
export function makeCloudTexture(scene: Phaser.Scene): string {
  const key = 'cloud';
  bake(scene, key, 260, 130, (g, rng) => {
    for (const c of [
      { x: 76, y: 74, r: 40 },
      { x: 130, y: 58, r: 50 },
      { x: 186, y: 76, r: 36 },
    ]) {
      doodleShape(g, doodleEllipsePoints(rng, c.x, c.y, c.r, c.r * 0.82, 3, 18), PALETTE.white, {
        offset: 0,
        lineWidth: 4,
      });
    }
  });
  return key;
}

/** Bakes a smiling sun. */
export function makeSunTexture(scene: Phaser.Scene): string {
  const key = 'sun';
  bake(scene, key, 220, 220, (g, rng) => {
    const cx = 110;
    const cy = 110;
    // Rays first, so the face sits on top.
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      doodleStroke(
        g,
        rng,
        { x: cx + Math.cos(angle) * 62, y: cy + Math.sin(angle) * 62 },
        { x: cx + Math.cos(angle) * 96, y: cy + Math.sin(angle) * 96 },
        PALETTE.sun,
        8,
      );
    }
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 62, 62, 3, 22), PALETTE.sun);
    dot(g, cx - 20, cy - 10, 7);
    dot(g, cx + 20, cy - 10, 7);
    doodleArc(g, cx, cy + 14, 24, 15, true);
  });
  return key;
}

/** Bakes a small star used for celebration particles. */
export function makeStarTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `star-${name}`;
  bake(scene, key, 60, 60, (g) => {
    const cx = 30;
    const cy = 30;
    const pts: Point[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 26 : 11;
      pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    doodleShape(g, pts, colour, { offset: 0, lineWidth: 3 });
  });
  return key;
}

/** Bakes a blank wooden digit block for Build-a-Number. */
export function makeBlockTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `block-${name}`;
  bake(scene, key, 150, 150, (g, rng) => {
    doodleShape(g, doodleRectPoints(rng, 16, 16, 118, 118, 3), colour, {
      offset: 3,
      lineWidth: 6,
    });
    // A lighter inner panel, so a dark digit always sits on a pale field.
    doodleShape(g, doodleRectPoints(rng, 30, 30, 90, 90, 2), PALETTE.paper, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/** Bakes an empty slot the digit blocks get dropped into. */
export function makeSlotTexture(scene: Phaser.Scene): string {
  const key = 'block-slot';
  bake(scene, key, 150, 150, (g, rng) => {
    const pts = doodleRectPoints(rng, 16, 16, 118, 118, 3);
    // Dashed-looking outline: stroke only, no fill, so it reads as "empty".
    strokeShape(g, pts, PALETTE.ink, 5);
  });
  return key;
}

/** Bakes the rocket for Rocket Launch. */
export function makeRocketTexture(scene: Phaser.Scene): string {
  const key = 'rocket';
  bake(scene, key, 200, 300, (g, rng) => {
    const cx = 100;
    // Body.
    const body: Point[] = [
      { x: cx, y: 20 },
      { x: cx + 38, y: 110 },
      { x: cx + 38, y: 226 },
      { x: cx - 38, y: 226 },
      { x: cx - 38, y: 110 },
    ];
    doodleShape(g, body, PALETTE.white);
    // Nose cone.
    doodleShape(
      g,
      [
        { x: cx, y: 20 },
        { x: cx + 38, y: 112 },
        { x: cx - 38, y: 112 },
      ],
      PALETTE.red,
      { offset: 1, lineWidth: 5 },
    );
    // Fins.
    for (const dir of [-1, 1]) {
      doodleShape(
        g,
        [
          { x: cx + dir * 36, y: 178 },
          { x: cx + dir * 76, y: 246 },
          { x: cx + dir * 36, y: 240 },
        ],
        PALETTE.red,
        { offset: 0, lineWidth: 5 },
      );
    }
    // Window.
    doodleShape(g, doodleEllipsePoints(rng, cx, 150, 24, 24, 2, 16), PALETTE.sky, {
      offset: 0,
      lineWidth: 5,
    });
    doodleShape(g, doodleEllipsePoints(rng, cx, 150, 13, 13, 1.5, 14), PALETTE.white, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/** Bakes a flame plume for the rocket's exhaust. */
export function makeFlameTexture(scene: Phaser.Scene): string {
  const key = 'flame';
  bake(scene, key, 120, 180, (g, rng) => {
    const cx = 60;
    doodleShape(
      g,
      [
        { x: cx - 34, y: 20 },
        { x: cx + 34, y: 20 },
        { x: cx + 16, y: 96 },
        { x: cx, y: 160 },
        { x: cx - 16, y: 96 },
      ],
      PALETTE.orange,
      { offset: 0, lineWidth: 4 },
    );
    doodleShape(
      g,
      [
        { x: cx - 17, y: 24 },
        { x: cx + 17, y: 24 },
        { x: cx + 7, y: 78 },
        { x: cx, y: 116 },
        { x: cx - 7, y: 78 },
      ],
      PALETTE.sun,
      { offset: 0, lineWidth: 3 },
    );
    void rng;
  });
  return key;
}

/** Bakes a plate of food for the Cat Cafe. */
export function makeTreatTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `treat-${name}`;
  bake(scene, key, 160, 130, (g, rng) => {
    // Plate.
    doodleShape(g, doodleEllipsePoints(rng, 80, 92, 60, 22, 2, 20), PALETTE.white, {
      offset: 1,
      lineWidth: 4,
    });
    // A little heap of food on top.
    doodleShape(g, doodleEllipsePoints(rng, 80, 66, 40, 28, 3, 18), colour, {
      offset: 1,
      lineWidth: 4,
    });
    doodleShape(g, doodleEllipsePoints(rng, 66, 54, 15, 12, 2, 14), colour, {
      offset: 0,
      lineWidth: 3,
    });
    doodleShape(g, doodleEllipsePoints(rng, 96, 58, 13, 10, 2, 14), colour, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/** Bakes a coin for the score display. */
export function makeCoinTexture(scene: Phaser.Scene): string {
  const key = 'coin';
  bake(scene, key, 80, 80, (g, rng) => {
    doodleShape(g, doodleEllipsePoints(rng, 40, 40, 30, 30, 2, 18), PALETTE.sun);
    doodleShape(g, doodleEllipsePoints(rng, 40, 40, 19, 19, 1.5, 16), PALETTE.yellow, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Hearts — the lives display in every mini-game.
 * ------------------------------------------------------------------ */

/** The classic parametric heart, scaled to fit and flipped for screen-y. */
function heartPoints(cx: number, cy: number, size: number): Point[] {
  const pts: Point[] = [];
  const steps = 26;
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x: cx + (x * size) / 16, y: cy - (y * size) / 16 });
  }
  return pts;
}

/** Bakes the full and empty hearts used by the lives HUD. */
export function makeHeartTextures(scene: Phaser.Scene): void {
  bake(scene, 'heart-full', 64, 64, (g) => {
    doodleShape(g, heartPoints(32, 27, 22), PALETTE.red, { offset: 1, lineWidth: 4 });
    // A little shine so a full heart reads as glossy and alive.
    dot(g, 24, 20, 4, 0xffb0b0);
  });
  bake(scene, 'heart-empty', 64, 64, (g) => {
    fillShape(g, heartPoints(32, 27, 22), 0xd6cde4, 0.45);
    strokeShape(g, heartPoints(32, 27, 22), 0x8a7fa3, 4);
  });
}

/* ------------------------------------------------------------------ *
 * Frog Pond
 * ------------------------------------------------------------------ */

/** Bakes a lily pad with a pale centre for the answer number. */
export function makeLilyPadTexture(scene: Phaser.Scene): string {
  const key = 'lily-pad';
  bake(scene, key, 190, 120, (g, rng) => {
    doodleShape(g, doodleEllipsePoints(rng, 95, 60, 82, 46, 3, 22), 0x4a9c4f);
    // Vein lines radiating from the stem end.
    for (const angle of [-0.6, -0.2, 0.2, 0.6]) {
      doodleStroke(
        g,
        rng,
        { x: 95, y: 60 },
        { x: 95 + Math.cos(angle) * 66, y: 60 + Math.sin(angle) * 34 },
        0x3a7a3d,
        3,
        1.5,
      );
    }
    // Pale panel so a dark number always sits on a light field.
    doodleShape(g, doodleEllipsePoints(rng, 95, 60, 52, 30, 2, 18), PALETTE.paper, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/** Bakes the hopping frog. */
export function makeFrogTexture(scene: Phaser.Scene): string {
  const key = 'frog';
  bake(scene, key, 160, 150, (g, rng) => {
    const cx = 80;
    // Back legs bulging out at the sides.
    doodleShape(g, doodleEllipsePoints(rng, cx - 48, 112, 22, 16, 2, 14), 0x4fa83f);
    doodleShape(g, doodleEllipsePoints(rng, cx + 48, 112, 22, 16, 2, 14), 0x4fa83f);
    // Body.
    doodleShape(g, doodleEllipsePoints(rng, cx, 92, 48, 42, 3, 20), 0x5fb84a);
    // Belly.
    doodleShape(g, doodleEllipsePoints(rng, cx, 106, 30, 22, 2, 16), 0xd9edb8, {
      offset: 0,
      lineWidth: 3,
    });
    // Eyes on top, googly.
    for (const dir of [-1, 1]) {
      doodleShape(g, doodleEllipsePoints(rng, cx + dir * 24, 44, 17, 17, 1.5, 14), 0x5fb84a);
      dot(g, cx + dir * 24, 44, 10, PALETTE.white);
      dot(g, cx + dir * 22, 45, 5);
    }
    // Wide contented mouth.
    doodleArc(g, cx, 76, 24, 12, true, PALETTE.ink, 4);
    // Front feet.
    doodleShape(g, doodleEllipsePoints(rng, cx - 20, 130, 13, 8, 1.5, 12), 0x4fa83f, {
      offset: 0,
      lineWidth: 3,
    });
    doodleShape(g, doodleEllipsePoints(rng, cx + 20, 130, 13, 8, 1.5, 12), 0x4fa83f, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Honey Hive
 * ------------------------------------------------------------------ */

/** Bakes a bumblebee. The scene hangs a numbered sign under it. */
export function makeBeeTexture(scene: Phaser.Scene): string {
  const key = 'bee';
  bake(scene, key, 170, 150, (g, rng) => {
    const cx = 85;
    const cy = 88;
    // Wings first, behind the body.
    for (const dir of [-1, 1]) {
      doodleShape(g, doodleEllipsePoints(rng, cx + dir * 26, cy - 44, 24, 16, 2, 14), PALETTE.white, {
        offset: 0,
        lineWidth: 3,
      });
    }
    // Striped body.
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 46, 34, 3, 20), PALETTE.sun);
    doodleStroke(g, rng, { x: cx - 12, y: cy - 32 }, { x: cx - 16, y: cy + 32 }, 0x2f2b3a, 9, 1.5);
    doodleStroke(g, rng, { x: cx + 14, y: cy - 30 }, { x: cx + 10, y: cy + 32 }, 0x2f2b3a, 9, 1.5);
    // Stinger.
    doodleShape(
      g,
      [
        { x: cx + 44, y: cy - 6 },
        { x: cx + 62, y: cy },
        { x: cx + 44, y: cy + 6 },
      ],
      0x2f2b3a,
      { offset: 0, lineWidth: 2 },
    );
    // Face on the left end.
    dot(g, cx - 30, cy - 8, 6);
    dot(g, cx - 28, cy - 10, 2, PALETTE.white);
    doodleArc(g, cx - 30, cy + 6, 8, 5, true, PALETTE.ink, 3);
    // Antennae.
    doodleStroke(g, rng, { x: cx - 34, y: cy - 26 }, { x: cx - 46, y: cy - 44 }, PALETTE.ink, 3, 1.5);
    dot(g, cx - 46, cy - 44, 4);
  });
  return key;
}

/** Bakes the beehive the bees fly home to. */
export function makeHiveTexture(scene: Phaser.Scene): string {
  const key = 'hive';
  bake(scene, key, 220, 240, (g, rng) => {
    const cx = 110;
    // Stacked golden rings, wider in the middle.
    const rings = [
      { y: 60, rx: 52 },
      { y: 100, rx: 74 },
      { y: 144, rx: 84 },
      { y: 188, rx: 66 },
    ];
    for (const ring of rings) {
      doodleShape(g, doodleEllipsePoints(rng, cx, ring.y, ring.rx, 30, 3, 20), 0xd9a03a);
    }
    // Entrance hole.
    doodleShape(g, doodleEllipsePoints(rng, cx, 196, 20, 16, 1.5, 14), 0x5a3d1a, {
      offset: 0,
      lineWidth: 3,
    });
    // Hanging loop on top.
    doodleArc(g, cx, 34, 18, 16, false, PALETTE.ink, 5);
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Treasure Dive
 * ------------------------------------------------------------------ */

/** Bakes a translucent bubble big enough to hold an answer. */
export function makeBubbleTexture(scene: Phaser.Scene): string {
  const key = 'bubble';
  bake(scene, key, 170, 170, (g, rng) => {
    const c = 85;
    // A soft, watery fill — deliberately translucent so the sea shows through.
    g.fillStyle(0xdff4ff, 0.55);
    g.fillCircle(c, c, 74);
    strokeShape(g, doodleEllipsePoints(rng, c, c, 74, 74, 2.5, 24), 0x8fd0e8, 5);
    // Shine.
    doodleArc(g, c - 32, c - 28, 18, 14, false, 0xffffff, 6);
    dot(g, c + 34, c + 30, 5, 0xffffff);
  });
  return key;
}

/** Bakes the treasure chest sitting on the sea floor. */
export function makeChestTexture(scene: Phaser.Scene): string {
  const key = 'treasure-chest';
  bake(scene, key, 240, 180, (g, rng) => {
    // Lid — a squashed dome.
    doodleShape(g, doodleEllipsePoints(rng, 120, 84, 88, 40, 3, 20), PALETTE.brown);
    // Body.
    doodleShape(g, doodleRectPoints(rng, 32, 84, 176, 74, 3), 0x9c5f30);
    // Bands.
    doodleStroke(g, rng, { x: 70, y: 52 }, { x: 70, y: 156 }, PALETTE.darkBrown, 7);
    doodleStroke(g, rng, { x: 170, y: 52 }, { x: 170, y: 156 }, PALETTE.darkBrown, 7);
    // Lock.
    doodleShape(g, doodleRectPoints(rng, 106, 92, 28, 30, 2), PALETTE.sun, {
      offset: 1,
      lineWidth: 4,
    });
    // A few escaped coins.
    doodleCircle(g, rng, 40, 164, 10, PALETTE.sun, 1.5);
    doodleCircle(g, rng, 206, 168, 9, PALETTE.sun, 1.5);
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Magic Potion
 * ------------------------------------------------------------------ */

/** Bakes a potion bottle with a pale label for the answer. */
export function makeBottleTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `bottle-${name}`;
  bake(scene, key, 150, 210, (g, rng) => {
    const cx = 75;
    // Cork.
    doodleShape(g, doodleRectPoints(rng, cx - 17, 10, 34, 24, 2), PALETTE.brown, {
      offset: 1,
      lineWidth: 4,
    });
    // Neck.
    doodleShape(g, doodleRectPoints(rng, cx - 14, 32, 28, 40, 2), colour, {
      offset: 1,
      lineWidth: 4,
    });
    // Round body full of potion.
    doodleShape(g, doodleEllipsePoints(rng, cx, 134, 54, 62, 3, 22), colour);
    // Shine.
    doodleShape(g, doodleEllipsePoints(rng, cx - 24, 108, 10, 18, 1.5, 12), PALETTE.white, {
      offset: 0,
      lineWidth: 0,
    });
    // Pale label so the number is always readable on any colour.
    doodleShape(g, doodleEllipsePoints(rng, cx, 138, 38, 26, 2, 16), PALETTE.paper, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}

/** Bakes the wizard's cauldron. */
export function makeCauldronTexture(scene: Phaser.Scene): string {
  const key = 'cauldron';
  bake(scene, key, 260, 210, (g, rng) => {
    const cx = 130;
    // Legs.
    for (const dir of [-1, 0, 1]) {
      doodleStroke(g, rng, { x: cx + dir * 56, y: 160 }, { x: cx + dir * 68, y: 196 }, 0x2a2636, 9);
    }
    // Pot.
    doodleShape(g, doodleEllipsePoints(rng, cx, 110, 96, 66, 3, 24), 0x3d3a4a);
    // Rim.
    doodleShape(g, doodleEllipsePoints(rng, cx, 54, 84, 20, 2.5, 20), 0x2a2636);
    // Glowing green brew.
    doodleShape(g, doodleEllipsePoints(rng, cx, 52, 70, 13, 2, 18), 0x8fd45f, {
      offset: 0,
      lineWidth: 3,
    });
    // Rising bubbles.
    doodleCircle(g, rng, cx - 30, 26, 7, 0x8fd45f, 1.5);
    doodleCircle(g, rng, cx + 22, 18, 5, 0x8fd45f, 1.5);
    doodleCircle(g, rng, cx + 44, 32, 4, 0x8fd45f, 1);
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Number Train
 * ------------------------------------------------------------------ */

/** Bakes the engine, facing left, pulling wagons that arrive from the right. */
export function makeEngineTexture(scene: Phaser.Scene): string {
  const key = 'train-engine';
  bake(scene, key, 270, 200, (g, rng) => {
    // Boiler.
    doodleShape(g, doodleRectPoints(rng, 24, 84, 140, 66, 3), PALETTE.red);
    // Nose.
    doodleShape(g, doodleEllipsePoints(rng, 28, 117, 16, 33, 2, 14), 0xc43a3a);
    // Cab.
    doodleShape(g, doodleRectPoints(rng, 164, 44, 84, 106, 3), PALETTE.blue);
    // Cab window.
    doodleShape(g, doodleRectPoints(rng, 180, 60, 52, 42, 2), PALETTE.sky, {
      offset: 1,
      lineWidth: 4,
    });
    // Roof.
    doodleShape(g, doodleRectPoints(rng, 154, 32, 104, 16, 2), 0x2f4858);
    // Chimney with a puff ring.
    doodleShape(g, doodleRectPoints(rng, 52, 44, 28, 42, 2), 0x2f4858);
    doodleShape(g, doodleEllipsePoints(rng, 66, 36, 22, 10, 2, 14), 0x2f4858, {
      offset: 0,
      lineWidth: 3,
    });
    // Wheels.
    for (const x of [64, 120, 204]) {
      doodleCircle(g, rng, x, 162, 24, 0x2a2636, 2);
      doodleCircle(g, rng, x, 162, 10, 0x8a8a94, 1.5);
    }
  });
  return key;
}

/** Bakes a wagon with a pale panel for the answer. */
export function makeWagonTexture(scene: Phaser.Scene, name: string, colour: number): string {
  const key = `wagon-${name}`;
  bake(scene, key, 210, 160, (g, rng) => {
    // Box.
    doodleShape(g, doodleRectPoints(rng, 18, 26, 174, 88, 3), colour);
    // Pale panel for the number.
    doodleShape(g, doodleRectPoints(rng, 42, 42, 126, 56, 2), PALETTE.paper, {
      offset: 1,
      lineWidth: 3,
    });
    // Wheels.
    for (const x of [62, 148]) {
      doodleCircle(g, rng, x, 128, 21, 0x2a2636, 2);
      doodleCircle(g, rng, x, 128, 8, 0x8a8a94, 1.5);
    }
    // Coupling hook.
    doodleStroke(g, rng, { x: 4, y: 112 }, { x: 20, y: 112 }, 0x2a2636, 6);
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * UFO Catch
 * ------------------------------------------------------------------ */

/** Bakes the friendly flying saucer. */
export function makeUfoTexture(scene: Phaser.Scene): string {
  const key = 'ufo';
  bake(scene, key, 250, 150, (g, rng) => {
    const cx = 125;
    // Glass dome with a little pilot cat silhouette.
    doodleShape(g, doodleEllipsePoints(rng, cx, 56, 46, 38, 2.5, 18), 0xbfe8ff);
    dot(g, cx, 62, 14, 0x3c3550);
    // Ear triangles poking up, so the pilot reads as a cat.
    fillShape(
      g,
      [
        { x: cx - 14, y: 56 },
        { x: cx - 4, y: 56 },
        { x: cx - 11, y: 42 },
      ],
      0x3c3550,
    );
    fillShape(
      g,
      [
        { x: cx + 4, y: 56 },
        { x: cx + 14, y: 56 },
        { x: cx + 11, y: 42 },
      ],
      0x3c3550,
    );
    // Saucer body.
    doodleShape(g, doodleEllipsePoints(rng, cx, 92, 104, 32, 3, 24), 0x9ca8b8);
    // Underside.
    doodleShape(g, doodleEllipsePoints(rng, cx, 114, 46, 14, 2, 16), 0x6b7a8a, {
      offset: 0,
      lineWidth: 3,
    });
    // Rim lights.
    const lightColours = [PALETTE.red, PALETTE.sun, PALETTE.teal, PALETTE.pink];
    for (let i = 0; i < 4; i++) {
      dot(g, cx - 66 + i * 44, 92, 7, lightColours[i]!);
    }
  });
  return key;
}

/* ------------------------------------------------------------------ *
 * Hidden gems, and the memory game's cards.
 * ------------------------------------------------------------------ */

/** Bakes the hidden gem: a faceted teal diamond with a glint. */
export function makeGemTexture(scene: Phaser.Scene): string {
  const key = 'gem';
  bake(scene, key, 100, 100, (g, rng) => {
    const cx = 50;
    const outline: Point[] = [
      { x: cx - 34, y: 36 },
      { x: cx - 16, y: 16 },
      { x: cx + 16, y: 16 },
      { x: cx + 34, y: 36 },
      { x: cx, y: 84 },
    ];
    doodleShape(g, outline, PALETTE.teal, { offset: 1, lineWidth: 4 });
    // Facet lines.
    doodleStroke(g, rng, { x: cx - 34, y: 36 }, { x: cx + 34, y: 36 }, 0x2f8a84, 3, 1);
    doodleStroke(g, rng, { x: cx - 16, y: 16 }, { x: cx - 10, y: 36 }, 0x2f8a84, 3, 1);
    doodleStroke(g, rng, { x: cx + 16, y: 16 }, { x: cx + 10, y: 36 }, 0x2f8a84, 3, 1);
    doodleStroke(g, rng, { x: cx - 10, y: 36 }, { x: cx, y: 84 }, 0x2f8a84, 3, 1);
    doodleStroke(g, rng, { x: cx + 10, y: 36 }, { x: cx, y: 84 }, 0x2f8a84, 3, 1);
    // Glint.
    dot(g, cx - 12, 26, 4, PALETTE.white);
    drawSparkle(g, cx + 26, 20, 8, PALETTE.white);
  });
  return key;
}

/** Bakes the face and back of the memory game's cards. */
export function makeMemoryCardTextures(scene: Phaser.Scene): void {
  bake(scene, 'memory-card-face', 160, 200, (g, rng) => {
    doodleShape(g, doodleRectPoints(rng, 10, 10, 140, 180, 3), PALETTE.paper, {
      offset: 2,
      lineWidth: 6,
    });
    doodleShape(g, doodleRectPoints(rng, 24, 24, 112, 152, 2), PALETTE.white, {
      offset: 0,
      lineWidth: 3,
    });
  });
  bake(scene, 'memory-card-back', 160, 200, (g, rng) => {
    doodleShape(g, doodleRectPoints(rng, 10, 10, 140, 180, 3), PALETTE.purple, {
      offset: 2,
      lineWidth: 6,
    });
    doodleShape(g, doodleRectPoints(rng, 26, 26, 108, 148, 2), 0x8a5fc4, {
      offset: 0,
      lineWidth: 3,
    });
    drawSparkle(g, 80, 100, 26, PALETTE.sun);
    drawSparkle(g, 46, 52, 10, PALETTE.white);
    drawSparkle(g, 116, 150, 10, PALETTE.white);
  });
}

/** Bakes a lumpy asteroid with a pale crater for the answer. */
export function makeAsteroidTexture(scene: Phaser.Scene): string {
  const key = 'asteroid';
  bake(scene, key, 180, 180, (g, rng) => {
    const c = 90;
    // Deliberately lumpy: few segments, big wobble.
    doodleShape(g, doodleEllipsePoints(rng, c, c, 72, 66, 9, 11), 0x8a8a94);
    // Craters.
    doodleShape(g, doodleEllipsePoints(rng, c - 34, c - 30, 13, 10, 2, 12), 0x6b6b78, {
      offset: 0,
      lineWidth: 3,
    });
    doodleShape(g, doodleEllipsePoints(rng, c + 38, c + 28, 10, 8, 2, 12), 0x6b6b78, {
      offset: 0,
      lineWidth: 3,
    });
    // Pale centre so the number reads clearly.
    doodleShape(g, doodleEllipsePoints(rng, c, c, 44, 34, 2.5, 18), PALETTE.paper, {
      offset: 0,
      lineWidth: 3,
    });
  });
  return key;
}
