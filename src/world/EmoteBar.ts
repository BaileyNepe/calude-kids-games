/**
 * The emote bar along the bottom of the world.
 *
 * Big reaction faces. Tapping one plays that emote above the player's
 * avatar. Purely expressive — no game effect — but it gives a child
 * something playful to do in the hub between games.
 *
 * The first four faces are free. The rest are shop purchases: they sit on
 * the bar dimmed behind a little padlock until bought, which is both a
 * hint that they exist and a reason to save coins.
 *
 * The faces are drawn (see `art/faces.ts`) rather than system emoji, so
 * they match the crayon look of everything else.
 */

import Phaser from 'phaser';
import { DESIGN_WIDTH } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleEllipsePoints } from '../shared/art/doodle';
import { EMOTES, type EmoteName } from '../shared/art/faces';
import { gameState } from '../shared/gameState';
import { getItem } from '../shared/wardrobe';
import { floatingText } from '../shared/ui';
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

      // An emote with a matching shop item is premium; it unlocks when
      // bought. The original four have no shop entry and are always free.
      const shopId = `emote-${emote.name}`;
      const locked = getItem(shopId) !== undefined && !gameState.ownsItem(shopId);

      // A doodle disc behind each face, for a chunky tappable look.
      const bg = scene.add.graphics().setDepth(40);
      const rng = makeRng(seedFrom(`emote-disc-${emote.name}`));
      doodleShape(bg, doodleEllipsePoints(rng, x, y, 48, 48, 2.5, 18), locked ? 0xd6cde4 : PALETTE.white, {
        offset: 2,
        lineWidth: 5,
      });

      const face = scene.add
        .image(x, y, `face-${emote.name}`)
        .setScale(0.72)
        .setDepth(41)
        .setAlpha(locked ? 0.3 : 1);

      if (locked) {
        const lock = scene.add.graphics().setDepth(42);
        lock.lineStyle(5, 0x5b5470, 1);
        lock.beginPath();
        lock.arc(x, y - 4, 10, Math.PI, Math.PI * 2);
        lock.strokePath();
        lock.fillStyle(0x5b5470, 1);
        lock.fillRoundedRect(x - 14, y - 4, 28, 22, 5);
      }

      // The whole disc is the tap target, comfortably larger than the face.
      const hit = scene.add
        .zone(x, y, 116, 116)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setDepth(43);

      hit.on('pointerdown', () => {
        if (locked) {
          // Point at the answer rather than silently refusing.
          sfx.wrong();
          floatingText(scene, x, y - 70, 'Buy it in the Shop!', '#5b5470');
          return;
        }
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
