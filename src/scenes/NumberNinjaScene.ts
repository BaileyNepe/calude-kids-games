/**
 * Number Ninja.
 *
 * Numbers are lobbed across the screen and the child swipes through the
 * correct one to slash it. Missing costs nothing — the number simply falls
 * away and is thrown again — but slashing the right one in mid-air feels
 * genuinely skilful, which is the point.
 *
 * The swipe is tracked as a trail of recent pointer positions; any number
 * whose circle intersects a segment of that trail is hit.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { PIECE_COLOURS } from './BootScene';
import { sfx } from '../shared/audio';
import { celebrate, fitText } from '../shared/ui';

/** One number flying through the air. */
interface FlyingNumber {
  container: Phaser.GameObjects.Container;
  value: number;
  velocityX: number;
  velocityY: number;
  spin: number;
  /** Already slashed — ignored by further swipes. */
  done: boolean;
}

/** Gravity, in pixels per second squared. Gentle, so arcs are readable. */
const GRAVITY = 620;

export class NumberNinjaScene extends MiniGameScene {
  private flying: FlyingNumber[] = [];
  private trail: { x: number; y: number }[] = [];
  private blade!: Phaser.GameObjects.Graphics;
  private swiping = false;
  /** Seconds until the next number is thrown. */
  private throwTimer = 0;
  /** Which options still need throwing this round. */
  private queue: number[] = [];

  constructor() {
    super(SCENES.numberNinja, 'numberNinja');
    this.optionCount = 4;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0x2b2440);

    // A dojo backdrop: moon, hills, and a few stars.
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0x3a3157, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    g.fillStyle(0xf7f2d8, 1);
    g.fillCircle(1080, 150, 66);
    g.fillStyle(0x3a3157, 1);
    g.fillCircle(1054, 132, 58);

    g.fillStyle(0x241e38, 1);
    g.fillEllipse(280, DESIGN_HEIGHT - 20, 900, 260);
    g.fillEllipse(1050, DESIGN_HEIGHT + 10, 800, 220);

    for (let i = 0; i < 40; i++) {
      const x = (i * 137) % DESIGN_WIDTH;
      const y = (i * 89) % 380;
      g.fillStyle(0xffffff, 0.25 + ((i % 4) * 0.15));
      g.fillCircle(x, y, 1.8);
    }

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 28, 'Swipe through the right answer!', textStyle(26, '#d9d2f0'))
      .setOrigin(0.5)
      .setDepth(10);

    this.blade = this.add.graphics().setDepth(600);
    this.setupSwipe();
  }

  /** Tracks the pointer as a short trail and slashes anything it crosses. */
  private setupSwipe(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.swiping = true;
      this.trail = [{ x: pointer.worldX, y: pointer.worldY }];
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!this.swiping) return;
      this.trail.push({ x: pointer.worldX, y: pointer.worldY });
      // Only the last few points matter; a long tail would let a slow drag
      // sweep up the whole screen.
      if (this.trail.length > 12) this.trail.shift();
      this.checkSlashes();
    });

    const end = (): void => {
      this.swiping = false;
      this.trail = [];
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, end);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, end);
  }

  /** Tests the newest trail segment against every airborne number. */
  private checkSlashes(): void {
    if (this.trail.length < 2 || !this.acceptingInput) return;
    const a = this.trail[this.trail.length - 2]!;
    const b = this.trail[this.trail.length - 1]!;

    for (const item of this.flying) {
      if (item.done) continue;
      const distance = this.pointToSegment(item.container.x, item.container.y, a, b);
      if (distance < 62) this.slash(item);
    }
  }

  /** Shortest distance from a point to a line segment. */
  private pointToSegment(
    px: number,
    py: number,
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) return Math.hypot(px - a.x, py - a.y);
    let t = ((px - a.x) * dx + (py - a.y) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
  }

  /** Resolves a slash on one number. */
  private slash(item: FlyingNumber): void {
    item.done = true;
    const wasCorrect = this.submitAnswer(item.value, item.container);

    if (wasCorrect) {
      sfx.pop();
      celebrate(this, item.container.x, item.container.y, 18);
      // Split the number in two halves that fly apart.
      this.tweens.add({
        targets: item.container,
        scale: 1.6,
        alpha: 0,
        angle: item.container.angle + 180,
        duration: 320,
        ease: 'Cubic.easeOut',
      });
      item.container.setVisible(true);
    } else {
      // A wrong slash just knocks it away — no penalty, and it comes back.
      item.velocityY = -260;
      item.velocityX *= -0.6;
      this.time.delayedCall(400, () => {
        item.done = false;
      });
    }
  }

  protected presentQuestion(question: Question): void {
    // Everything gets thrown, a few at a time, and re-thrown when it falls
    // off the bottom — so a missed answer is never lost for good.
    this.queue = [...question.options];
    this.throwTimer = 0;
  }

  protected clearQuestion(): void {
    for (const item of this.flying) {
      this.tweens.killTweensOf(item.container);
      item.container.destroy();
    }
    this.flying = [];
    this.queue = [];
  }

  /** Lobs one number in from the left or right. */
  private throwNumber(value: number): void {
    const index = this.question.options.indexOf(value);
    const colour = PIECE_COLOURS[(index + 3) % PIECE_COLOURS.length]!;
    const fromLeft = Math.random() < 0.5;

    const disc = this.add.graphics();
    disc.fillStyle(colour.colour, 1);
    disc.fillCircle(0, 0, 52);
    disc.lineStyle(6, PALETTE.ink, 1);
    disc.strokeCircle(0, 0, 52);

    const text = this.labelFor(this.question, index === -1 ? 0 : index);
    const label = this.add
      .text(0, 0, text, textStyle(46, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    // Inside the 52px-radius disc, with room for the stroke.
    fitText(label, 92, 46);

    const x = fromLeft ? -70 : DESIGN_WIDTH + 70;
    const container = this.add.container(x, DESIGN_HEIGHT - 40, [disc, label]).setDepth(100);

    this.flying.push({
      container,
      value,
      // Aimed to arc across the middle of the screen.
      velocityX: (fromLeft ? 1 : -1) * Phaser.Math.Between(190, 300),
      velocityY: Phaser.Math.Between(-960, -820),
      spin: Phaser.Math.Between(-90, 90),
      done: false,
    });
  }

  override update(_time: number, delta: number): void {
    const step = delta / 1000;

    // Feed new numbers into the air on a steady drip.
    this.throwTimer -= step;
    if (this.throwTimer <= 0 && this.queue.length > 0 && this.acceptingInput) {
      this.throwNumber(this.queue.shift()!);
      this.throwTimer = 0.55;
    }

    for (let i = this.flying.length - 1; i >= 0; i--) {
      const item = this.flying[i]!;
      item.velocityY += GRAVITY * step;
      item.container.x += item.velocityX * step;
      item.container.y += item.velocityY * step;
      item.container.angle += item.spin * step;

      // Once it drops off the bottom, queue it to be thrown again.
      if (item.container.y > DESIGN_HEIGHT + 130) {
        const value = item.value;
        const wasDone = item.done;
        item.container.destroy();
        this.flying.splice(i, 1);
        if (!wasDone && this.acceptingInput) this.queue.push(value);
      }
    }

    this.drawBlade();
  }

  /** Draws the glowing swipe trail. */
  private drawBlade(): void {
    this.blade.clear();
    if (this.trail.length < 2) return;
    for (let i = 1; i < this.trail.length; i++) {
      const from = this.trail[i - 1]!;
      const to = this.trail[i]!;
      const strength = i / this.trail.length;
      this.blade.lineStyle(2 + strength * 12, 0xffffff, strength * 0.85);
      this.blade.beginPath();
      this.blade.moveTo(from.x, from.y);
      this.blade.lineTo(to.x, to.y);
      this.blade.strokePath();
    }
  }
}
