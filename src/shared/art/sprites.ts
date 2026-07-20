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
 * Bakes the three reacting expressions for one cat, if they don't already
 * exist.
 *
 * Called by whichever scene is about to star a particular cat. Baking all
 * of these up front for a 52-cat catalog would cost hundreds of textures
 * and a visible pause at boot, when only one cat's faces are ever needed
 * at a time.
 */
export function ensureCatFaces(scene: Phaser.Scene, id: string, look: CatLook): void {
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
