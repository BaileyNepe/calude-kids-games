/**
 * The emote bar along the bottom of the world.
 *
 * Four big reaction faces. Tapping one plays that emote above the player's
 * avatar. Purely expressive — no game effect — but it gives a child
 * something playful to do in the hub between games.
 *
 * The faces are drawn (see `art/faces.ts`) rather than system emoji, so
 * they match the crayon look of everything else.
 */

import Phaser from 'phaser';
import { DESIGN_WIDTH } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleEllipsePoints } from '../shared/art/doodle';
import { EMOTES, type EmoteName } from '../shared/art/faces';
import { sfx } from '../shared/audio';

export class EmoteBar {
  constructor(scene: Phaser.Scene, y: number, onEmote: (emote: EmoteName) => void) {
    // A soft band behind the row, so the emotes read as a control strip
    // rather than as objects lying about in the world.
    const band = scene.add.graphics().setDepth(38);
    band.fillStyle(0xffffff, 0.3);
    band.fillRect(0, y - 62, DESIGN_WIDTH, 124);

    const spacing = 124;
    const totalWidth = (EMOTES.length - 1) * spacing;
    const startX = DESIGN_WIDTH / 2 - totalWidth / 2;

    EMOTES.forEach((emote, index) => {
      const x = startX + index * spacing;

      // A doodle disc behind each face, for a chunky tappable look.
      const bg = scene.add.graphics().setDepth(40);
      const rng = makeRng(seedFrom(`emote-disc-${emote.name}`));
      doodleShape(bg, doodleEllipsePoints(rng, x, y, 48, 48, 2.5, 18), PALETTE.white, {
        offset: 2,
        lineWidth: 5,
      });

      const face = scene.add.image(x, y, `face-${emote.name}`).setScale(0.72).setDepth(41);

      // The whole disc is the tap target, comfortably larger than the face.
      const hit = scene.add
        .zone(x, y, 116, 116)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(42);

      hit.on('pointerdown', () => {
        sfx.tap();
        scene.tweens.add({
          targets: face,
          scale: 0.98,
          duration: 130,
          yoyo: true,
          ease: 'Back.easeOut',
        });
        onEmote(emote.name);
      });
    });
  }
}
