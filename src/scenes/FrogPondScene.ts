/**
 * Frog Pond.
 *
 * Lily pads float on a pond, each carrying a number. The child taps the
 * pad with the right answer and the frog leaps across to it — a proper
 * arcing hop, which is the whole charm of the game. A wrong tap just
 * wobbles the pad; the frog waits patiently on its rock.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleEllipsePoints } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { placeHiddenGem } from '../shared/hiddenGem';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** One tappable lily pad. */
interface Pad {
  container: Phaser.GameObjects.Container;
  value: number;
}

export class FrogPondScene extends MiniGameScene {
  private pads: Pad[] = [];
  private frog!: Phaser.GameObjects.Image;
  /** Where the frog sits between hops. */
  private static readonly HOME = { x: 165, y: 520 };
  /** True while the frog is mid-leap, so taps can't double-book it. */
  private hopping = false;

  /**
   * Where the pads float. Hand-placed so they read as scattered across
   * the pond while never overlapping each other or the frog's rock —
   * and kept low enough that a fraction question's picture card (which
   * sits centre-screen down to y≈400) never hides a number.
   */
  private static readonly SLOTS: readonly { x: number; y: number }[] = [
    { x: 420, y: 445 },
    { x: 700, y: 425 },
    { x: 980, y: 445 },
    { x: 540, y: 625 },
    { x: 860, y: 625 },
  ];

  constructor() {
    super(SCENES.frogPond, 'frogPond');
    this.optionCount = 5;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0xa8dcc9);

    // The pond fills most of the screen below the banner.
    const pond = this.add.graphics().setDepth(-10);
    pond.fillStyle(0x4fa8c9, 1);
    pond.fillEllipse(DESIGN_WIDTH / 2 + 40, 540, 1180, 560);
    pond.fillStyle(0x63b8d4, 1);
    pond.fillEllipse(DESIGN_WIDTH / 2 + 40, 540, 1050, 470);

    // A few ripple arcs so the water isn't flat.
    const rng = makeRng(seedFrom('pond-ripples'));
    const ripples = this.add.graphics().setDepth(-9);
    ripples.lineStyle(4, 0x8fd0e8, 0.8);
    for (let i = 0; i < 6; i++) {
      const x = 300 + rng() * 700;
      const y = 380 + rng() * 320;
      ripples.strokeEllipse(x, y, 60 + rng() * 60, 16 + rng() * 8);
    }

    // Reeds along the near bank.
    const reeds = this.add.graphics().setDepth(-8);
    for (let i = 0; i < 8; i++) {
      const x = 60 + i * 160 + (rng() - 0.5) * 60;
      reeds.lineStyle(6, 0x3f8c3f, 1);
      reeds.beginPath();
      reeds.moveTo(x, DESIGN_HEIGHT);
      reeds.lineTo(x + (rng() - 0.5) * 24, DESIGN_HEIGHT - 60 - rng() * 50);
      reeds.strokePath();
    }

    this.add.image(1120, 150, 'sun').setScale(0.5).setDepth(-9);

    // The frog's rock, then the frog.
    const rock = this.add.graphics().setDepth(4);
    doodleShape(
      rock,
      doodleEllipsePoints(makeRng(seedFrom('frog-rock')), FrogPondScene.HOME.x, FrogPondScene.HOME.y + 52, 90, 42, 3, 18),
      0x8a8a94,
    );
    this.frog = this.add
      .image(FrogPondScene.HOME.x, FrogPondScene.HOME.y, 'frog')
      .setScale(0.9)
      .setDepth(20);

    // An idle breathing squash, so the frog looks alive while it waits.
    this.tweens.add({
      targets: this.frog,
      scaleY: 0.86,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 26, 'Tap the lily pad with the right answer!', textStyle(26, '#1f4f5f'))
      .setOrigin(0.5)
      .setDepth(30);

    // A secret gem in among the reeds.
    placeHiddenGem(this, 'gem-pond-reeds', 96, 726, { scale: 0.42, depth: -7 });
  }

  protected presentQuestion(question: Question): void {
    this.hopping = false;
    question.options.forEach((value, index) => {
      const slot = FrogPondScene.SLOTS[index % FrogPondScene.SLOTS.length]!;

      const image = this.add.image(0, 0, 'lily-pad').setScale(1);
      const label = this.add
        .text(0, 0, this.labelFor(question, index), textStyle(46, '#2f4f1f', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // Inside the pad's pale centre panel.
      fitText(label, 96, 46);

      const container = this.add.container(slot.x, slot.y, [image, label]).setDepth(10);
      // No setSize(): it would offset the hit area on a Container (see
      // BalloonPopScene for the full explanation).
      container.setInteractive(
        new Phaser.Geom.Rectangle(-100, -66, 200, 132),
        Phaser.Geom.Rectangle.Contains,
      );

      const pad: Pad = { container, value };
      container.on('pointerdown', () => this.onPadTapped(pad));

      // Pads bob gently on the water, each to its own rhythm.
      this.tweens.add({
        targets: container,
        y: slot.y + 8,
        duration: 1500 + index * 170,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Drift in with a little splash of scale.
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 320,
        delay: index * 70,
        ease: 'Back.easeOut',
      });

      this.pads.push(pad);
    });
  }

  protected clearQuestion(): void {
    for (const pad of this.pads) {
      this.tweens.killTweensOf(pad.container);
      pad.container.destroy();
    }
    this.pads = [];
  }

  private onPadTapped(pad: Pad): void {
    if (!this.acceptingInput || this.hopping) return;

    const wasCorrect = this.submitAnswer(pad.value, pad.container);
    if (!wasCorrect) return;

    // The hop: up in an arc, land on the pad, ripple, then home again.
    this.hopping = true;
    sfx.whoosh();
    const from = { x: this.frog.x, y: this.frog.y };
    const to = { x: pad.container.x, y: pad.container.y - 26 };

    this.hopArc(from, to, 420, () => {
      this.splash(to.x, to.y + 40);
      // Sit on the pad for a beat, then hop home ready for the next one.
      this.time.delayedCall(450, () => {
        this.hopArc(to, { x: FrogPondScene.HOME.x, y: FrogPondScene.HOME.y }, 420, () => {
          this.hopping = false;
        });
      });
    });
  }

  /** Moves the frog along a jumping arc: linear in x, up-and-over in y. */
  private hopArc(
    from: { x: number; y: number },
    to: { x: number; y: number },
    duration: number,
    onDone: () => void,
  ): void {
    const peak = Math.min(from.y, to.y) - 160;
    const progress = { t: 0 };
    this.tweens.add({
      targets: progress,
      t: 1,
      duration,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const t = progress.t;
        this.frog.x = from.x + (to.x - from.x) * t;
        // A quadratic Bezier through the peak gives the hop its arc.
        const inv = 1 - t;
        this.frog.y = inv * inv * from.y + 2 * inv * t * peak + t * t * to.y;
        this.frog.setAngle(Math.sin(t * Math.PI) * (to.x > from.x ? 14 : -14));
      },
      onComplete: () => {
        this.frog.setAngle(0);
        onDone();
      },
    });
  }

  /** Expanding ripple rings where the frog lands. */
  private splash(x: number, y: number): void {
    const rings = this.add.graphics().setDepth(9);
    const state = { r: 12, alpha: 0.9 };
    this.tweens.add({
      targets: state,
      r: 80,
      alpha: 0,
      duration: 520,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        rings.clear();
        rings.lineStyle(5, PALETTE.white, state.alpha);
        rings.strokeEllipse(x, y, state.r * 2, state.r * 0.8);
      },
      onComplete: () => rings.destroy(),
    });
  }
}
