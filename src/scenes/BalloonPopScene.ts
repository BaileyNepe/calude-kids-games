/**
 * Balloon Pop.
 *
 * Four numbered balloons drift up the screen. The child pops the one
 * showing the answer. Balloons that reach the top wrap around to the
 * bottom, so nothing is ever lost and there's no time pressure.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { PIECE_COLOURS } from './BootScene';
import { sfx } from '../shared/audio';

/** One floating balloon and the number written on it. */
interface Balloon {
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  value: number;
  /** Upward speed in pixels per second. */
  speed: number;
  /** Colour name, used to pick the matching burst texture. */
  colour: string;
}

export class BalloonPopScene extends MiniGameScene {
  private balloons: Balloon[] = [];

  /**
   * The vertical band the balloons drift through.
   *
   * Deliberately kept inside the screen: balloons wrap just above the
   * question banner and reappear just below the grass, so at least three
   * of the four are always visible. An earlier version spawned them well
   * below the viewport, which left a child staring at an empty sky for
   * several seconds at the start of every question.
   */
  private static readonly TOP_LIMIT = 130;
  private static readonly BOTTOM_START = DESIGN_HEIGHT - 40;

  constructor() {
    super(SCENES.balloonPop, 'balloonPop');
    // Six choices rather than four: more to read, more to think about, and
    // the sky looks properly full of balloons.
    this.optionCount = 6;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    // Sun low on the left, clear of the coin counter and progress readout
    // in the top-right corner.
    this.add.image(150, 300, 'sun').setScale(0.6).setDepth(-10).setAlpha(0.95);
    for (const cloud of [
      { x: 220, y: 200, scale: 0.9 },
      { x: 760, y: 140, scale: 0.7 },
      { x: 1060, y: 320, scale: 0.8 },
      { x: 420, y: 430, scale: 0.6 },
    ]) {
      const image = this.add
        .image(cloud.x, cloud.y, 'cloud')
        .setScale(cloud.scale)
        .setDepth(-9)
        .setAlpha(0.85);
      // A slow horizontal drift, so the sky isn't static.
      this.tweens.add({
        targets: image,
        x: image.x + 60,
        duration: 9000 + cloud.x * 4,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Grass strip along the bottom.
    const grass = this.add.graphics().setDepth(-8);
    grass.fillStyle(PALETTE.grass, 1);
    grass.fillRect(0, DESIGN_HEIGHT - 70, DESIGN_WIDTH, 70);

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 38, 'Pop the balloon with the right answer!', textStyle(26, '#2f4f1f'))
      .setOrigin(0.5)
      .setDepth(-7);
  }

  protected presentQuestion(question: Question): void {
    // Spread the balloons across four columns so they never overlap.
    const columnWidth = DESIGN_WIDTH / question.options.length;

    question.options.forEach((value, index) => {
      const colour = PIECE_COLOURS[index % PIECE_COLOURS.length]!;
      const x = columnWidth * index + columnWidth / 2;
      // Spread the starting heights evenly through the drift band so every
      // balloon is on screen and tappable the moment the question appears.
      const band = BalloonPopScene.BOTTOM_START - BalloonPopScene.TOP_LIMIT;
      const y = BalloonPopScene.BOTTOM_START - (index * band) / question.options.length - 40;

      // Slightly smaller balloons so six fit across without crowding.
      const image = this.add.image(0, 0, `balloon-${colour.name}`).setScale(0.86);
      const text = this.labelFor(question, index);
      // Fractions ("3/4") need a smaller size than a bare number to fit.
      const fontSize = text.length > 2 ? 40 : 56;
      const label = this.add
        .text(0, -26, text, textStyle(fontSize, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);

      const container = this.add.container(x, y, [image, label]);
      // A generous rectangular hit area — deliberately larger than the
      // balloon, because small fingers on a moving target need the help.
      //
      // Note: do NOT call container.setSize() here. Doing so shifts the
      // origin Phaser uses for hit-area coordinates by half the size, which
      // moves the tappable region off the balloon entirely. The explicit
      // hit area below makes setSize unnecessary anyway.
      container.setInteractive(
        new Phaser.Geom.Rectangle(-82, -110, 164, 170),
        Phaser.Geom.Rectangle.Contains,
      );

      const balloon: Balloon = {
        container,
        image,
        value,
        // Slow: the balloons should feel like they're drifting, and a
        // child needs time to read four numbers and think.
        speed: Phaser.Math.Between(20, 32),
        colour: colour.name,
      };

      container.on('pointerdown', () => this.onBalloonTapped(balloon));

      // A gentle side-to-side sway makes them feel buoyant.
      this.tweens.add({
        targets: container,
        x: x + Phaser.Math.Between(-30, 30),
        duration: Phaser.Math.Between(2200, 3200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.balloons.push(balloon);
    });
  }

  protected clearQuestion(): void {
    for (const balloon of this.balloons) {
      this.tweens.killTweensOf(balloon.container);
      balloon.container.destroy();
    }
    this.balloons = [];
  }

  /** Handles a tap on one balloon. */
  private onBalloonTapped(balloon: Balloon): void {
    if (!this.acceptingInput) return;

    const wasCorrect = this.submitAnswer(balloon.value, balloon.container);

    if (wasCorrect) {
      this.popBalloon(balloon);
    }
    // On a wrong answer the base class already wobbled it and said
    // something encouraging; the balloon stays up so they can try again.
  }

  /** The satisfying pop: burst shape, a puff, and the balloon is gone. */
  private popBalloon(balloon: Balloon): void {
    sfx.pop();
    const { x, y } = balloon.container;

    // Flash the comic-book burst shape behind where the balloon was.
    const burst = this.add
      .image(x, y - 20, `burst-${balloon.colour}`)
      .setScale(0.3)
      .setDepth(800);
    this.tweens.add({
      targets: burst,
      scale: 1.5,
      alpha: 0,
      duration: 340,
      ease: 'Cubic.easeOut',
      onComplete: () => burst.destroy(),
    });

    // The balloon itself snaps bigger then vanishes.
    this.tweens.killTweensOf(balloon.container);
    this.tweens.add({
      targets: balloon.container,
      scale: 1.4,
      alpha: 0,
      duration: 200,
      ease: 'Quad.easeOut',
    });

    balloon.container.disableInteractive();
  }

  /**
   * Drifts the balloons upward, wrapping them to the bottom when they
   * leave the top. Nothing is ever missed or lost — there's no fail state.
   */
  override update(_time: number, delta: number): void {
    const step = delta / 1000;
    for (const balloon of this.balloons) {
      balloon.container.y -= balloon.speed * step;
      if (balloon.container.y < BalloonPopScene.TOP_LIMIT) {
        balloon.container.y = BalloonPopScene.BOTTOM_START;
      }
      // A slow rotation wobble, tied to height so each balloon differs.
      balloon.image.setRotation(Math.sin(balloon.container.y / 90) * 0.08);
    }
  }
}
