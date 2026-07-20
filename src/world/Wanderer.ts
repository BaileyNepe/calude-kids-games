/**
 * A decorative stick-figure kid who mills about the world.
 *
 * Purely local flavour — no networking. Each wanderer picks a spot, walks
 * to it, pauses, and occasionally shows an emoji speech bubble, which is
 * enough to make the hub feel populated.
 *
 * Kept as its own class so that swapping these for real networked players
 * later means changing where the positions come from, not rewriting
 * WorldScene.
 */

import Phaser from 'phaser';
import { DESIGN_WIDTH } from '../shared/config';
import { PALETTE, makeRng, doodleShape, doodleEllipsePoints } from '../shared/art/doodle';

/**
 * What the wanderers show in their speech bubbles.
 *
 * Drawn textures rather than system emoji, so the bubbles match the crayon
 * art instead of rendering in whatever style the operating system ships.
 */
const CHATTER = [
  'face-happy',
  'face-surprised',
  'face-silly',
  'icon-cat',
  'star-gold',
  'star-pink',
  'balloon-red',
  'coin',
] as const;

export interface WandererOptions {
  texture: string;
  x: number;
  y: number;
  /** Stable seed so each wanderer behaves consistently run to run. */
  seed: number;
}

export class Wanderer {
  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly rng: () => number;

  /** Where they're heading. */
  private targetX: number;
  /** Seconds until they pick a new destination. */
  private restTimer: number;
  /** Seconds until the next speech bubble. */
  private chatterTimer: number;

  private readonly baseY: number;
  private readonly speed: number;

  constructor(scene: Phaser.Scene, options: WandererOptions) {
    this.scene = scene;
    this.rng = makeRng(options.seed * 7919 + 13);

    this.baseY = options.y;
    this.speed = 26 + this.rng() * 22;

    this.sprite = scene.add
      .image(options.x, options.y, options.texture)
      // Distant kids are drawn smaller, which fakes a bit of depth.
      .setScale(0.5 + (options.y - 560) / 700)
      .setDepth(Math.floor(options.y / 10));

    this.targetX = this.pickTarget();
    this.restTimer = this.rng() * 3;
    this.chatterTimer = 3 + this.rng() * 8;
  }

  /** Picks a new spot to walk to, keeping clear of the screen edges. */
  private pickTarget(): number {
    return 120 + this.rng() * (DESIGN_WIDTH - 240);
  }

  update(_time: number, delta: number): void {
    const step = delta / 1000;

    this.chatterTimer -= step;
    if (this.chatterTimer <= 0) {
      this.speak();
      this.chatterTimer = 6 + this.rng() * 12;
    }

    if (this.restTimer > 0) {
      this.restTimer -= step;
      return;
    }

    const distance = this.targetX - this.sprite.x;
    if (Math.abs(distance) < 6) {
      // Arrived — stand about for a moment, then head somewhere new.
      this.targetX = this.pickTarget();
      this.restTimer = 1 + this.rng() * 4;
      return;
    }

    const direction = Math.sign(distance);
    this.sprite.x += direction * this.speed * step;
    // Face the way they're walking.
    this.sprite.setFlipX(direction < 0);
    // A small vertical bounce sells the walk without needing frames.
    this.sprite.y = this.baseY + Math.sin(this.sprite.x / 14) * 3;
  }

  /** Shows a doodle speech bubble with a random emoji. */
  private speak(): void {
    const x = this.sprite.x + 46;
    const y = this.sprite.y - 92;

    const bubble = this.scene.add.graphics().setDepth(70);
    const rng = makeRng(Math.floor(this.rng() * 100000));
    doodleShape(bubble, doodleEllipsePoints(rng, x, y, 42, 32, 2.5, 18), PALETTE.white, {
      offset: 2,
      lineWidth: 4,
    });
    // The little tail pointing back at the speaker.
    doodleShape(
      bubble,
      [
        { x: x - 20, y: y + 22 },
        { x: x - 4, y: y + 24 },
        { x: x - 22, y: y + 46 },
      ],
      PALETTE.white,
      { offset: 0, lineWidth: 4 },
    );

    const texture = CHATTER[Math.floor(this.rng() * CHATTER.length)]!;
    const icon = this.scene.add
      .image(x, y, texture)
      .setOrigin(0.5)
      .setDepth(71);
    // Normalise wildly different source sizes to one readable bubble size.
    icon.setDisplaySize(46, 46 * (icon.height / icon.width));

    const group = [bubble, icon];
    for (const item of group) item.setAlpha(0);

    this.scene.tweens.add({ targets: group, alpha: 1, duration: 200 });
    this.scene.tweens.add({
      targets: group,
      alpha: 0,
      delay: 2200,
      duration: 300,
      onComplete: () => {
        bubble.destroy();
        icon.destroy();
      },
    });
  }
}
