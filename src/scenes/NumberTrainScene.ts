/**
 * Number Train.
 *
 * A little engine waits at the platform and numbered wagons stand on the
 * track behind it. Tap the wagon with the right answer and it rolls up
 * and couples on with a satisfying clunk; when the round's sums are done
 * the train is fully loaded. Wrong wagons just rattle on the spot.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { PIECE_COLOURS } from './BootScene';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** One wagon standing on the track. */
interface Wagon {
  container: Phaser.GameObjects.Container;
  value: number;
  /** Rolling to the engine — no longer tappable. */
  coupled: boolean;
}

/** Where the rails sit. */
const TRACK_Y = 640;

export class NumberTrainScene extends MiniGameScene {
  private wagons: Wagon[] = [];
  private engine!: Phaser.GameObjects.Image;
  private smokeTimer = 0;

  constructor() {
    super(SCENES.numberTrain, 'numberTrain');
    this.optionCount = 4;
    // Unlocks mid-game, so it pays a little over the early games.
    this.coinsPerCorrect = 6;
    this.catChanceBonus = 0.05;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    this.add.image(1080, 140, 'sun').setScale(0.5).setDepth(-9);
    this.add.image(300, 150, 'cloud').setScale(0.7).setDepth(-9).setAlpha(0.9);

    // Rolling hills behind the track.
    const hills = this.add.graphics().setDepth(-10);
    hills.fillStyle(0x9cd47a, 1);
    hills.fillEllipse(260, 620, 900, 420);
    hills.fillStyle(0x8ac96b, 1);
    hills.fillEllipse(1000, 660, 1000, 460);

    // Ground and track bed.
    const ground = this.add.graphics().setDepth(-8);
    ground.fillStyle(PALETTE.grass, 1);
    ground.fillRect(0, TRACK_Y - 30, DESIGN_WIDTH, DESIGN_HEIGHT - TRACK_Y + 30);
    ground.fillStyle(0xb59a6b, 1);
    ground.fillRect(0, TRACK_Y + 42, DESIGN_WIDTH, 34);

    // Sleepers and rails.
    const track = this.add.graphics().setDepth(-7);
    track.fillStyle(0x8a6a45, 1);
    for (let x = 10; x < DESIGN_WIDTH; x += 56) {
      track.fillRect(x, TRACK_Y + 44, 30, 28);
    }
    track.fillStyle(0x5f5f6b, 1);
    track.fillRect(0, TRACK_Y + 46, DESIGN_WIDTH, 7);
    track.fillRect(0, TRACK_Y + 62, DESIGN_WIDTH, 7);

    // The engine, idling at the left with a gentle chuff.
    this.engine = this.add.image(190, TRACK_Y - 24, 'train-engine').setScale(0.95).setDepth(10);
    this.tweens.add({
      targets: this.engine,
      y: this.engine.y - 4,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22, 'Tap the wagon with the right answer!', textStyle(25, '#2f4f1f'))
      .setOrigin(0.5)
      .setDepth(30);
  }

  protected presentQuestion(question: Question): void {
    // Wagons queue along the track to the right of the engine.
    const startX = 480;
    const gap = 218;

    question.options.forEach((value, index) => {
      const colour = PIECE_COLOURS[(index + 1) % PIECE_COLOURS.length]!;
      const x = startX + index * gap;

      const image = this.add.image(0, 0, `wagon-${colour.name}`).setScale(0.95);
      const label = this.add
        .text(0, -8, this.labelFor(question, index), textStyle(44, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // Inside the wagon's pale panel.
      fitText(label, 112, 44);

      const container = this.add.container(x, TRACK_Y - 8, [image, label]).setDepth(8);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-100, -70, 200, 150),
        Phaser.Geom.Rectangle.Contains,
      );

      const wagon: Wagon = { container, value, coupled: false };
      container.on('pointerdown', () => this.onWagonTapped(wagon));
      container.on('pointerover', () =>
        this.tweens.add({ targets: container, scale: 1.06, duration: 120 }),
      );
      container.on('pointerout', () => {
        if (!wagon.coupled) this.tweens.add({ targets: container, scale: 1, duration: 120 });
      });

      // Roll in from the right, one after another.
      container.x = DESIGN_WIDTH + 140 + index * 90;
      this.tweens.add({
        targets: container,
        x,
        duration: 480,
        delay: index * 90,
        ease: 'Cubic.easeOut',
      });

      this.wagons.push(wagon);
    });
  }

  protected clearQuestion(): void {
    for (const wagon of this.wagons) {
      this.tweens.killTweensOf(wagon.container);
      wagon.container.destroy();
    }
    this.wagons = [];
  }

  private onWagonTapped(wagon: Wagon): void {
    if (!this.acceptingInput || wagon.coupled) return;

    const wasCorrect = this.submitAnswer(wagon.value, wagon.container);
    if (!wasCorrect) return;

    // Roll up and couple to the engine with a clunk.
    wagon.coupled = true;
    wagon.container.disableInteractive();
    sfx.whoosh();
    this.tweens.add({
      targets: wagon.container,
      x: this.engine.x + 210,
      scale: 1,
      duration: 560,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        // The whole train jolts as it couples.
        this.tweens.add({
          targets: [this.engine, wagon.container],
          x: '-=10',
          duration: 90,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
        this.puffSmoke(3);
      },
    });
  }

  /** A few puffs from the chimney. */
  private puffSmoke(count: number): void {
    for (let i = 0; i < count; i++) {
      const puff = this.add
        .image(this.engine.x - 62, this.engine.y - 92, 'cloud')
        .setScale(0.14)
        .setAlpha(0.9)
        .setDepth(12);
      this.tweens.add({
        targets: puff,
        y: puff.y - 90 - i * 24,
        x: puff.x + 30 + i * 16,
        scale: 0.3,
        alpha: 0,
        duration: 900,
        delay: i * 160,
        ease: 'Sine.easeOut',
        onComplete: () => puff.destroy(),
      });
    }
  }

  /** The engine chuffs quietly all round long. */
  override update(_time: number, delta: number): void {
    this.smokeTimer -= delta / 1000;
    if (this.smokeTimer <= 0) {
      this.puffSmoke(1);
      this.smokeTimer = 2.4;
    }
  }
}
