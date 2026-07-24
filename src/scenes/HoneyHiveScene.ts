/**
 * Honey Hive.
 *
 * Bees hover over a flower meadow, each carrying a numbered signpost. Tap
 * the bee with the right answer and it zooms home to the hive. The bees
 * never stop moving — a gentle figure-of-eight hover that gets a touch
 * livelier at higher levels.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, challengeFor, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { placeHiddenGem } from '../shared/hiddenGem';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** One hovering bee and its sign. */
interface Bee {
  container: Phaser.GameObjects.Container;
  value: number;
  /** Centre of its hover orbit. */
  anchorX: number;
  anchorY: number;
  /** Phase offset so the swarm doesn't move in unison. */
  phase: number;
  /** Flying home — no longer hovering or tappable. */
  gone: boolean;
}

export class HoneyHiveScene extends MiniGameScene {
  private bees: Bee[] = [];
  private hive!: Phaser.GameObjects.Image;
  /** How fast the bees hover; scales with the player's level. */
  private hoverPace = 1;

  /**
   * Hover anchors, spread so signs never overlap — and low enough that a
   * fraction question's picture card (centre-screen, down to y≈400)
   * never sits over a sign.
   */
  private static readonly SLOTS: readonly { x: number; y: number }[] = [
    { x: 240, y: 430 },
    { x: 545, y: 445 },
    { x: 855, y: 430 },
    { x: 395, y: 620 },
    { x: 715, y: 630 },
  ];

  constructor() {
    super(SCENES.honeyHive, 'honeyHive');
    this.optionCount = 5;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);
    this.hoverPace = challengeFor(gameState.level);

    this.add.image(180, 160, 'sun').setScale(0.55).setDepth(-9);
    this.add.image(500, 130, 'cloud').setScale(0.6).setDepth(-9).setAlpha(0.9);

    // Meadow.
    const ground = this.add.graphics().setDepth(-10);
    ground.fillStyle(PALETTE.grass, 1);
    ground.fillRect(0, 620, DESIGN_WIDTH, DESIGN_HEIGHT - 620);

    // Scattered flowers.
    const rng = makeRng(seedFrom('hive-flowers'));
    const flowers = this.add.graphics().setDepth(-8);
    const petals = [PALETTE.pink, PALETTE.red, PALETTE.white, PALETTE.purple];
    for (let i = 0; i < 16; i++) {
      const x = 40 + rng() * (DESIGN_WIDTH - 80);
      const y = 650 + rng() * 120;
      const colour = petals[i % petals.length]!;
      for (let p = 0; p < 5; p++) {
        const angle = (p / 5) * Math.PI * 2;
        flowers.fillStyle(colour, 1);
        flowers.fillCircle(x + Math.cos(angle) * 9, y + Math.sin(angle) * 9, 6);
      }
      flowers.fillStyle(PALETTE.sun, 1);
      flowers.fillCircle(x, y, 6);
    }

    // The hive hangs from a branch, top right.
    const branch = this.add.graphics().setDepth(-7);
    branch.lineStyle(14, PALETTE.darkBrown, 1);
    branch.beginPath();
    branch.moveTo(DESIGN_WIDTH, 120);
    branch.lineTo(DESIGN_WIDTH - 260, 150);
    branch.strokePath();
    this.hive = this.add.image(DESIGN_WIDTH - 170, 260, 'hive').setScale(0.9).setDepth(-6);
    this.tweens.add({
      targets: this.hive,
      angle: { from: -2, to: 2 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 26, 'Tap the bee with the right answer!', textStyle(26, '#2f4f1f'))
      .setOrigin(0.5)
      .setDepth(30);

    // A secret gem wedged up on the branch, past the hive.
    placeHiddenGem(this, 'gem-hive-branch', 1236, 128, { scale: 0.38, depth: -6 });
  }

  protected presentQuestion(question: Question): void {
    question.options.forEach((value, index) => {
      const slot = HoneyHiveScene.SLOTS[index % HoneyHiveScene.SLOTS.length]!;

      const image = this.add.image(0, -46, 'bee').setScale(0.82);
      // The numbered sign hangs below the bee on two little strings.
      const sign = this.add.graphics();
      const rng = makeRng(seedFrom(`bee-sign-${index}`));
      sign.lineStyle(3, PALETTE.ink, 1);
      sign.beginPath();
      sign.moveTo(-24, -30);
      sign.lineTo(-30, 6);
      sign.moveTo(24, -30);
      sign.lineTo(30, 6);
      sign.strokePath();
      doodleShape(sign, doodleRectPoints(rng, -62, 6, 124, 62, 2.5), PALETTE.paper, {
        offset: 2,
        lineWidth: 5,
      });

      const label = this.add
        .text(0, 37, this.labelFor(question, index), textStyle(42, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 108, 42);

      const container = this.add.container(slot.x, slot.y, [sign, image, label]).setDepth(10);
      // Covers the bee and the sign together. No setSize() — it would
      // offset the hit area on a Container.
      container.setInteractive(
        new Phaser.Geom.Rectangle(-80, -104, 160, 180),
        Phaser.Geom.Rectangle.Contains,
      );

      const bee: Bee = {
        container,
        value,
        anchorX: slot.x,
        anchorY: slot.y,
        phase: Math.random() * Math.PI * 2,
        gone: false,
      };
      container.on('pointerdown', () => this.onBeeTapped(bee));

      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: index * 70,
        ease: 'Back.easeOut',
      });

      this.bees.push(bee);
    });
  }

  protected clearQuestion(): void {
    for (const bee of this.bees) {
      this.tweens.killTweensOf(bee.container);
      bee.container.destroy();
    }
    this.bees = [];
  }

  private onBeeTapped(bee: Bee): void {
    if (!this.acceptingInput || bee.gone) return;

    const wasCorrect = this.submitAnswer(bee.value, bee.container);
    if (!wasCorrect) return;

    // Home to the hive: a happy buzz-line with a little wiggle.
    bee.gone = true;
    bee.container.disableInteractive();
    sfx.whoosh();
    this.tweens.add({
      targets: bee.container,
      x: this.hive.x,
      y: this.hive.y + 60,
      scale: 0.25,
      angle: 20,
      duration: 720,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // The hive gives a satisfied wobble as the bee pops inside.
        this.tweens.add({
          targets: this.hive,
          scale: { from: 0.98, to: 0.9 },
          duration: 240,
          ease: 'Back.easeOut',
        });
        bee.container.setVisible(false);
      },
    });
  }

  /** The figure-of-eight hover. */
  override update(time: number, _delta: number): void {
    const t = (time / 1000) * this.hoverPace;
    for (const bee of this.bees) {
      if (bee.gone) continue;
      bee.container.x = bee.anchorX + Math.sin(t * 1.3 + bee.phase) * 34;
      bee.container.y = bee.anchorY + Math.sin(t * 2.6 + bee.phase) * 16;
    }
  }
}
