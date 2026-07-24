/**
 * Hand-drawn faces and icons.
 *
 * The game previously used system emoji (😀, ⬅️, 🐱). Those render in
 * whatever style the operating system ships, which sits badly next to the
 * wobbly crayon art — the emoji look glossy and corporate while everything
 * around them looks drawn by a child.
 *
 * These are drawn with the same doodle primitives as the rest of the game,
 * so they match exactly.
 */

import Phaser from 'phaser';
import {
  PALETTE,
  makeRng,
  seedFrom,
  doodleShape,
  doodleEllipsePoints,
  doodleStroke,
  doodleArc,
  dot,
  type Point,
} from './doodle';

/** Bakes a drawing into a texture, skipping if it already exists. */
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

/** The reactions available on the emote bar. */
export type EmoteName =
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'silly'
  | 'love'
  | 'cool'
  | 'sleepy'
  | 'starstruck';

export const EMOTES: readonly { name: EmoteName; label: string; colour: number }[] = [
  { name: 'happy', label: 'Happy', colour: PALETTE.yellow },
  { name: 'sad', label: 'Sad', colour: PALETTE.blue },
  { name: 'surprised', label: 'Wow', colour: PALETTE.orange },
  { name: 'silly', label: 'Silly', colour: PALETTE.pink },
  { name: 'love', label: 'Love', colour: 0xffb0c9 },
  { name: 'cool', label: 'Cool', colour: PALETTE.teal },
  { name: 'sleepy', label: 'Sleepy', colour: 0xc9bfe8 },
  { name: 'starstruck', label: 'Stars', colour: PALETTE.sun },
];

/**
 * Draws one doodle face, centred in a 120x120 box.
 * @param withFace false draws just the head, used for speech-bubble icons.
 */
function drawFace(
  g: Phaser.GameObjects.Graphics,
  rng: () => number,
  emote: EmoteName,
  colour: number,
): void {
  const cx = 60;
  const cy = 60;

  doodleShape(g, doodleEllipsePoints(rng, cx, cy, 44, 44, 2.5, 20), colour, {
    offset: 2,
    lineWidth: 5,
  });

  const eyeY = cy - 12;

  switch (emote) {
    case 'happy':
      // Curved, smiling eyes and a big grin.
      doodleArc(g, cx - 16, eyeY + 2, 8, 7, false, PALETTE.ink, 4);
      doodleArc(g, cx + 16, eyeY + 2, 8, 7, false, PALETTE.ink, 4);
      doodleArc(g, cx, cy + 12, 20, 14, true, PALETTE.ink, 5);
      break;

    case 'sad':
      // Downturned mouth, drooping brows, and a tear.
      dot(g, cx - 16, eyeY, 6);
      dot(g, cx + 16, eyeY, 6);
      doodleStroke(g, rng, { x: cx - 26, y: eyeY - 14 }, { x: cx - 8, y: eyeY - 9 }, PALETTE.ink, 4);
      doodleStroke(g, rng, { x: cx + 8, y: eyeY - 9 }, { x: cx + 26, y: eyeY - 14 }, PALETTE.ink, 4);
      doodleArc(g, cx, cy + 22, 17, 11, false, PALETTE.ink, 5);
      doodleShape(
        g,
        [
          { x: cx - 20, y: eyeY + 10 },
          { x: cx - 14, y: eyeY + 10 },
          { x: cx - 17, y: eyeY + 26 },
        ],
        PALETTE.sky,
        { offset: 0, lineWidth: 2 },
      );
      break;

    case 'surprised':
      // Wide eyes and a round open mouth.
      doodleShape(g, doodleEllipsePoints(rng, cx - 16, eyeY, 9, 10, 1.5, 14), PALETTE.white, {
        offset: 0,
        lineWidth: 3,
      });
      doodleShape(g, doodleEllipsePoints(rng, cx + 16, eyeY, 9, 10, 1.5, 14), PALETTE.white, {
        offset: 0,
        lineWidth: 3,
      });
      dot(g, cx - 16, eyeY, 4);
      dot(g, cx + 16, eyeY, 4);
      doodleShape(g, doodleEllipsePoints(rng, cx, cy + 18, 11, 14, 2, 14), PALETTE.ink, {
        offset: 0,
        lineWidth: 3,
      });
      break;

    case 'silly':
      // A wink, a squiggle mouth, and a tongue sticking out.
      doodleArc(g, cx - 16, eyeY + 2, 9, 7, false, PALETTE.ink, 4);
      dot(g, cx + 16, eyeY, 7);
      doodleStroke(g, rng, { x: cx - 16, y: cy + 14 }, { x: cx + 16, y: cy + 14 }, PALETTE.ink, 5, 3);
      doodleShape(g, doodleEllipsePoints(rng, cx + 6, cy + 26, 11, 9, 2, 12), PALETTE.pink, {
        offset: 0,
        lineWidth: 3,
      });
      break;

    case 'love': {
      // Two heart eyes and a small contented smile.
      for (const dir of [-1, 1]) {
        const hx = cx + dir * 16;
        dot(g, hx - 5, eyeY - 3, 6, PALETTE.red);
        dot(g, hx + 5, eyeY - 3, 6, PALETTE.red);
        doodleShape(
          g,
          [
            { x: hx - 10, y: eyeY - 1 },
            { x: hx + 10, y: eyeY - 1 },
            { x: hx, y: eyeY + 12 },
          ],
          PALETTE.red,
          { offset: 0, lineWidth: 2 },
        );
      }
      doodleArc(g, cx, cy + 14, 14, 10, true, PALETTE.ink, 5);
      break;
    }

    case 'cool': {
      // Sunglasses joined across the bridge, and a lopsided grin.
      for (const dir of [-1, 1]) {
        doodleShape(g, doodleEllipsePoints(rng, cx + dir * 17, eyeY, 13, 11, 1.5, 14), PALETTE.ink, {
          offset: 0,
          lineWidth: 3,
        });
      }
      doodleStroke(g, rng, { x: cx - 6, y: eyeY - 2 }, { x: cx + 6, y: eyeY - 2 }, PALETTE.ink, 4);
      doodleStroke(g, rng, { x: cx - 30, y: eyeY - 6 }, { x: cx - 40, y: eyeY - 10 }, PALETTE.ink, 4);
      doodleStroke(g, rng, { x: cx + 30, y: eyeY - 6 }, { x: cx + 40, y: eyeY - 10 }, PALETTE.ink, 4);
      doodleArc(g, cx + 4, cy + 16, 14, 8, true, PALETTE.ink, 5);
      break;
    }

    case 'sleepy': {
      // Closed lids, a tiny yawn, and a drifting Z.
      doodleArc(g, cx - 16, eyeY + 3, 9, 4, true, PALETTE.ink, 4);
      doodleArc(g, cx + 16, eyeY + 3, 9, 4, true, PALETTE.ink, 4);
      doodleShape(g, doodleEllipsePoints(rng, cx, cy + 18, 8, 10, 1.5, 12), PALETTE.ink, {
        offset: 0,
        lineWidth: 3,
      });
      // The Z, up near the temple.
      doodleStroke(g, rng, { x: cx + 22, y: cy - 34 }, { x: cx + 34, y: cy - 34 }, PALETTE.ink, 4);
      doodleStroke(g, rng, { x: cx + 34, y: cy - 34 }, { x: cx + 22, y: cy - 24 }, PALETTE.ink, 4);
      doodleStroke(g, rng, { x: cx + 22, y: cy - 24 }, { x: cx + 34, y: cy - 24 }, PALETTE.ink, 4);
      break;
    }

    case 'starstruck': {
      // Star eyes and a huge open grin.
      for (const dir of [-1, 1]) {
        const sx = cx + dir * 16;
        const pts: { x: number; y: number }[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const r = i % 2 === 0 ? 11 : 4.5;
          pts.push({ x: sx + Math.cos(angle) * r, y: eyeY + Math.sin(angle) * r });
        }
        doodleShape(g, pts, PALETTE.sun, { offset: 0, lineWidth: 2.5 });
      }
      doodleArc(g, cx, cy + 12, 18, 14, true, PALETTE.ink, 5);
      break;
    }
  }
}

/** Bakes all the emote faces. Keys are `face-<name>`. */
export function makeFaceTextures(scene: Phaser.Scene): void {
  for (const emote of EMOTES) {
    bake(scene, `face-${emote.name}`, 120, 120, (g, rng) =>
      drawFace(g, rng, emote.name, emote.colour),
    );
  }
}

/* ------------------------------------------------------------------ *
 * Button icons — small doodle glyphs replacing the emoji in buttons.
 * ------------------------------------------------------------------ */

/** Bakes a left-pointing arrow. */
function makeBackIcon(scene: Phaser.Scene): void {
  bake(scene, 'icon-back', 70, 70, (g, rng) => {
    const cy = 35;
    doodleStroke(g, rng, { x: 58, y: cy }, { x: 16, y: cy }, PALETTE.ink, 7);
    doodleStroke(g, rng, { x: 16, y: cy }, { x: 34, y: cy - 16 }, PALETTE.ink, 7);
    doodleStroke(g, rng, { x: 16, y: cy }, { x: 34, y: cy + 16 }, PALETTE.ink, 7);
  });
}

/** Bakes a small cat head, for the Pets button. */
function makeCatIcon(scene: Phaser.Scene): void {
  bake(scene, 'icon-cat', 70, 70, (g, rng) => {
    const cx = 35;
    const cy = 38;
    for (const dir of [-1, 1]) {
      doodleShape(
        g,
        [
          { x: cx + dir * 8, y: cy - 16 },
          { x: cx + dir * 24, y: cy - 14 },
          { x: cx + dir * 17, y: cy - 32 },
        ],
        PALETTE.orange,
        { offset: 0, lineWidth: 3 },
      );
    }
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 22, 19, 2, 16), PALETTE.orange, {
      offset: 1,
      lineWidth: 4,
    });
    dot(g, cx - 8, cy - 3, 4);
    dot(g, cx + 8, cy - 3, 4);
    doodleShape(
      g,
      [
        { x: cx - 3, y: cy + 5 },
        { x: cx + 3, y: cy + 5 },
        { x: cx, y: cy + 9 },
      ],
      PALETTE.pink,
      { offset: 0, lineWidth: 2 },
    );
  });
}

/** Bakes a little house, for the "back to world" button. */
function makeHomeIcon(scene: Phaser.Scene): void {
  bake(scene, 'icon-home', 70, 70, (g, rng) => {
    const roof: Point[] = [
      { x: 10, y: 34 },
      { x: 35, y: 12 },
      { x: 60, y: 34 },
    ];
    doodleShape(g, roof, PALETTE.red, { offset: 1, lineWidth: 4 });
    doodleShape(
      g,
      [
        { x: 17, y: 34 },
        { x: 53, y: 34 },
        { x: 53, y: 58 },
        { x: 17, y: 58 },
      ],
      PALETTE.paper,
      { offset: 1, lineWidth: 4 },
    );
    doodleShape(
      g,
      [
        { x: 29, y: 42 },
        { x: 41, y: 42 },
        { x: 41, y: 58 },
        { x: 29, y: 58 },
      ],
      PALETTE.brown,
      { offset: 0, lineWidth: 3 },
    );
    // rng is unused for the house, but kept for signature consistency.
    void rng;
  });
}

/** Bakes a cog, for the settings button. */
function makeSettingsIcon(scene: Phaser.Scene): void {
  bake(scene, 'icon-settings', 70, 70, (g, rng) => {
    const cx = 35;
    const cy = 35;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      doodleStroke(
        g,
        rng,
        { x: cx + Math.cos(angle) * 14, y: cy + Math.sin(angle) * 14 },
        { x: cx + Math.cos(angle) * 27, y: cy + Math.sin(angle) * 27 },
        PALETTE.ink,
        7,
      );
    }
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 18, 18, 2, 16), PALETTE.teal, {
      offset: 1,
      lineWidth: 4,
    });
    doodleShape(g, doodleEllipsePoints(rng, cx, cy, 7, 7, 1, 12), PALETTE.paper, {
      offset: 0,
      lineWidth: 3,
    });
  });
}

/** Bakes every icon used in buttons. */
export function makeIconTextures(scene: Phaser.Scene): void {
  makeBackIcon(scene);
  makeCatIcon(scene);
  makeHomeIcon(scene);
  makeSettingsIcon(scene);
}
