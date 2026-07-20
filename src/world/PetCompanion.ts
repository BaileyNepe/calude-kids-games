/**
 * A collected cat, out in the world.
 *
 * Every cat the player has won appears in the hub and trails after them,
 * stopping to sit whenever the player stands still. Seeing the collection
 * actually follow you around is a much stronger reward than a cat locked
 * away on a menu screen.
 */

import Phaser from 'phaser';
import { WALK_BOUNDS } from './Player';
import { makeRng } from '../shared/art/doodle';
import { COLLAR_OFFSET_Y } from '../shared/art/wardrobe';

export class PetCompanion {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly shadow: Phaser.GameObjects.Graphics;
  private readonly rng: () => number;

  /** How far behind the player this cat likes to sit. */
  private readonly followDistance: number;
  private readonly speed: number;
  private bob = 0;

  /** The collar being worn, drawn over the cat. */
  private readonly collar: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    catId: string,
    index: number,
    x: number,
    y: number,
    collarItem: string | null = null,
  ) {
    this.rng = makeRng(index * 7717 + 3);
    // Spreading the follow distances stops the cats stacking into one blob.
    this.followDistance = 78 + index * 46 + this.rng() * 24;
    this.speed = 200 + this.rng() * 60;

    this.shadow = scene.add.graphics().setDepth(13);
    this.sprite = scene.add
      .image(x, y, `cat-${catId}-idle`)
      .setScale(0.34)
      .setDepth(22);

    if (collarItem !== null && scene.textures.exists(`item-${collarItem}`)) {
      this.collar = scene.add.image(x, y, `item-${collarItem}`).setScale(0.34).setDepth(23);
    }
  }

  update(delta: number, playerX: number, playerY: number, playerMoving: boolean): void {
    const step = delta / 1000;

    // Trail to one side of the player so several cats fan out rather than
    // queueing in a single line.
    const side = this.followDistance % 2 < 1 ? -1 : 1;
    const targetX = playerX - side * this.followDistance * 0.5;
    // Sit near the player's feet rather than their middle.
    const targetY = playerY + 76 + (this.followDistance % 26);

    const dx = targetX - this.sprite.x;
    const dy = targetY - this.sprite.y;
    const distance = Math.hypot(dx, dy);

    if (distance > 12) {
      const move = Math.min(this.speed * step, distance);
      this.sprite.x += (dx / distance) * move;
      this.sprite.y += (dy / distance) * move;
      if (Math.abs(dx) > 2) this.sprite.setFlipX(dx < 0);
      // A quick trot bounce while catching up.
      this.bob += step * 13;
      this.sprite.y -= Math.abs(Math.sin(this.bob)) * 4;
    } else if (!playerMoving) {
      // Sitting: a slow breathing motion.
      this.bob += step * 2;
      this.sprite.setScale(0.34, 0.34 + Math.sin(this.bob) * 0.012);
    }

    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, WALK_BOUNDS.minY + 40, WALK_BOUNDS.maxY + 96);
    this.sprite.setDepth(20 + Math.floor(this.sprite.y / 10));

    this.shadow.clear();
    this.shadow.fillStyle(0x000000, 0.11);
    this.shadow.fillEllipse(this.sprite.x, this.sprite.y + 34, 46, 13);

    // Keep the collar on the cat's neck through every trot and bounce.
    if (this.collar !== null) {
      this.collar.setPosition(
        this.sprite.x,
        this.sprite.y + this.sprite.displayHeight * COLLAR_OFFSET_Y,
      );
      this.collar.setScale(this.sprite.scaleX);
      this.collar.setFlipX(this.sprite.flipX);
      this.collar.setDepth(this.sprite.depth + 1);
    }
  }
}
