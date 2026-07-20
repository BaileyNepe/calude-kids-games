/**
 * The player's avatar in the world hub.
 *
 * Walks to wherever the child taps, and also responds to the arrow keys
 * and WASD. Tap-to-move is the primary control because it works on a
 * tablet, where most of this will be played.
 */

import Phaser from 'phaser';
import { DESIGN_WIDTH } from '../shared/config';
import type { EmoteName } from '../shared/art/faces';
import { PALETTE, makeRng, doodleShape, doodleEllipsePoints } from '../shared/art/doodle';
import { HAT_OFFSET_Y, HAT_ORIGIN_Y } from '../shared/art/wardrobe';

/**
 * The strip of ground the player may walk on.
 *
 * maxY is set so the avatar's feet stay clear of the emote bar's strip
 * along the bottom — the figure is drawn from its centre and stands about
 * 110px tall below that point.
 */
export const WALK_BOUNDS = { minX: 90, maxX: DESIGN_WIDTH - 90, minY: 500, maxY: 578 };

export class Player {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  /** Shadow, so the avatar reads as standing on the ground. */
  private readonly shadow: Phaser.GameObjects.Graphics;

  /** Where the player is walking to, or null when standing still. */
  private target: { x: number; y: number } | null = null;
  private readonly speed = 260;

  private readonly keys: {
    left: Phaser.Input.Keyboard.Key[];
    right: Phaser.Input.Keyboard.Key[];
    up: Phaser.Input.Keyboard.Key[];
    down: Phaser.Input.Keyboard.Key[];
  } | null = null;

  /** Bobbing phase, so the walk has a bounce. */
  private stride = 0;

  /** The hat being worn, drawn over the sprite. */
  private readonly hat: Phaser.GameObjects.Image | null = null;

  constructor(
    scene: Phaser.Scene,
    texture: string,
    x: number,
    y: number,
    hatItem: string | null = null,
  ) {
    this.scene = scene;

    this.shadow = scene.add.graphics().setDepth(14);
    this.sprite = scene.add.image(x, y, texture).setScale(0.62).setDepth(25);

    // Hats are laid over the character rather than baked into every
    // character-plus-hat combination.
    if (hatItem !== null && scene.textures.exists(`item-${hatItem}`)) {
      this.hat = scene.add
        .image(x, y, `item-${hatItem}`)
        // Anchored near its own base so it rests on the head instead of
        // being centred over the face.
        .setOrigin(0.5, HAT_ORIGIN_Y)
        .setScale(0.62)
        .setDepth(26);
    }

    const keyboard = scene.input.keyboard;
    if (keyboard !== null) {
      const codes = Phaser.Input.Keyboard.KeyCodes;
      this.keys = {
        left: [keyboard.addKey(codes.LEFT), keyboard.addKey(codes.A)],
        right: [keyboard.addKey(codes.RIGHT), keyboard.addKey(codes.D)],
        up: [keyboard.addKey(codes.UP), keyboard.addKey(codes.W)],
        down: [keyboard.addKey(codes.DOWN), keyboard.addKey(codes.S)],
      };
    }

    this.drawShadow();
    this.followWithHat();
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }

  /** Sends the player walking towards a point, clamped to the walkable strip. */
  walkTo(x: number, y: number): void {
    this.target = {
      x: Phaser.Math.Clamp(x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
      y: Phaser.Math.Clamp(y, WALK_BOUNDS.minY, WALK_BOUNDS.maxY),
    };
  }

  /** A soft ellipse under the feet. */
  private drawShadow(): void {
    this.shadow.clear();
    this.shadow.fillStyle(0x000000, 0.13);
    this.shadow.fillEllipse(this.sprite.x, this.sprite.y + 104, 78, 20);
  }

  /** Keeps the hat sitting on the head through every move and bounce. */
  private followWithHat(): void {
    if (this.hat === null) return;
    this.hat.setPosition(
      this.sprite.x,
      this.sprite.y + this.sprite.displayHeight * HAT_OFFSET_Y,
    );
    this.hat.setScale(this.sprite.scale);
    this.hat.setRotation(this.sprite.rotation);
    this.hat.setFlipX(this.sprite.flipX);
    this.hat.setDepth(this.sprite.depth + 1);
  }

  update(_time: number, delta: number): void {
    const step = delta / 1000;
    let dx = 0;
    let dy = 0;

    // Keyboard takes precedence: pressing a key cancels a tap destination,
    // otherwise the two controls fight each other.
    if (this.keys !== null) {
      const down = (list: Phaser.Input.Keyboard.Key[]): boolean => list.some((k) => k.isDown);
      if (down(this.keys.left)) dx -= 1;
      if (down(this.keys.right)) dx += 1;
      if (down(this.keys.up)) dy -= 1;
      if (down(this.keys.down)) dy += 1;
      if (dx !== 0 || dy !== 0) this.target = null;
    }

    if (dx === 0 && dy === 0 && this.target !== null) {
      const toX = this.target.x - this.sprite.x;
      const toY = this.target.y - this.sprite.y;
      if (Math.hypot(toX, toY) < 6) {
        this.target = null;
      } else {
        const length = Math.hypot(toX, toY);
        dx = toX / length;
        dy = toY / length;
      }
    }

    if (dx !== 0 || dy !== 0) {
      const length = Math.hypot(dx, dy) || 1;
      this.sprite.x = Phaser.Math.Clamp(
        this.sprite.x + (dx / length) * this.speed * step,
        WALK_BOUNDS.minX,
        WALK_BOUNDS.maxX,
      );
      this.sprite.y = Phaser.Math.Clamp(
        this.sprite.y + (dy / length) * this.speed * step,
        WALK_BOUNDS.minY,
        WALK_BOUNDS.maxY,
      );

      // Face the way they're walking, and bounce a little.
      if (dx !== 0) this.sprite.setFlipX(dx < 0);
      this.stride += step * 11;
      this.sprite.setRotation(Math.sin(this.stride) * 0.05);
      // Walking towards the viewer draws the avatar slightly larger.
      this.sprite.setScale(0.62 + (this.sprite.y - WALK_BOUNDS.minY) / 2600);
      this.sprite.setDepth(20 + Math.floor(this.sprite.y / 10));
    } else {
      // Settle upright when standing.
      this.stride = 0;
      this.sprite.setRotation(this.sprite.rotation * 0.8);
    }

    this.drawShadow();
    this.followWithHat();
  }

  /** Pops a drawn emote face above the player's head. */
  showEmote(name: EmoteName): void {
    const x = this.sprite.x;
    const y = this.sprite.y - 110;

    const bubble = this.scene.add.graphics().setDepth(70);
    const rng = makeRng(1234);
    doodleShape(bubble, doodleEllipsePoints(rng, x, y, 44, 40, 2.5, 18), PALETTE.white, {
      offset: 2,
      lineWidth: 4,
    });
    doodleShape(
      bubble,
      [
        { x: x - 16, y: y + 28 },
        { x: x + 2, y: y + 30 },
        { x: x - 10, y: y + 52 },
      ],
      PALETTE.white,
      { offset: 0, lineWidth: 4 },
    );

    const face = this.scene.add.image(x, y, `face-${name}`).setScale(0).setDepth(71);

    this.scene.tweens.add({
      targets: face,
      scale: 0.62,
      duration: 240,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: [bubble, face],
      alpha: 0,
      delay: 1300,
      duration: 400,
      onComplete: () => {
        bubble.destroy();
        face.destroy();
      },
    });

    // A little hop, so the whole avatar reacts rather than just the face.
    this.scene.tweens.add({
      targets: this.sprite,
      y: this.sprite.y - 26,
      duration: 180,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }
}
