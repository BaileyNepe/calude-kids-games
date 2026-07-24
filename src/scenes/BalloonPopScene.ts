/**
 * Balloon Pop.
 *
 * Numbered balloons drift up the screen. The child pops the one showing
 * the answer. Balloons that reach the top wrap around to the bottom, so
 * nothing is ever lost and there's no time pressure.
 *
 * Two things keep the sky lively: gusts of wind that sweep the whole
 * flock sideways every few seconds, and the occasional golden star
 * balloon — not an answer, just a little bag of bonus coins for the
 * quick-fingered. Balloons also drift faster at higher levels.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, challengeFor, textStyle } from '../shared/config';
import { PALETTE } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { PIECE_COLOURS } from './BootScene';
import { gameState } from '../shared/gameState';
import { placeHiddenGem } from '../shared/hiddenGem';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** Coins for popping the golden star balloon. */
const BONUS_COINS = 10;

/** One floating balloon and the number written on it. */
interface Balloon {
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  value: number;
  /** Upward speed in pixels per second. */
  speed: number;
  /** Colour name, used to pick the matching burst texture. */
  colour: string;
  /** True for the golden star balloon — bonus coins, not an answer. */
  bonus: boolean;
  /** Already popped — ignore further taps and stop drawing attention. */
  popped: boolean;
  /**
   * The balloon's anchor column. Sway oscillates around this and gusts
   * shove it sideways. Done in update() rather than with an x tween — a
   * tween writes absolute positions every frame, which would silently
   * cancel the wind.
   */
  baseX: number;
  /** Phase offset so the flock doesn't sway in lockstep. */
  swayPhase: number;
  /** How far this balloon sways, in pixels. */
  swayAmp: number;
}

export class BalloonPopScene extends MiniGameScene {
  private balloons: Balloon[] = [];

  /** Sideways push from the current gust, in pixels per second. */
  private gustSpeed = 0;
  /** Seconds until the next gust of wind. */
  private gustTimer = 4;

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

    // A secret gem, tucked at the edge of the far cloud.
    placeHiddenGem(this, 'gem-balloon-cloud', 1108, 348, { scale: 0.35, depth: -8 });
  }

  protected presentQuestion(question: Question): void {
    // Spread the balloons across columns so they never overlap.
    const columnWidth = DESIGN_WIDTH / question.options.length;
    // Higher levels drift a little faster — part of the difficulty curve.
    const pace = challengeFor(gameState.level);

    question.options.forEach((value, index) => {
      const colour = PIECE_COLOURS[index % PIECE_COLOURS.length]!;
      const x = columnWidth * index + columnWidth / 2;
      // Spread the starting heights evenly through the drift band so every
      // balloon is on screen and tappable the moment the question appears.
      const band = BalloonPopScene.BOTTOM_START - BalloonPopScene.TOP_LIMIT;
      const y = BalloonPopScene.BOTTOM_START - (index * band) / question.options.length - 40;

      // Slightly smaller balloons so six fit across without crowding, with
      // a touch of size variety so the sky doesn't look stamped out.
      const scale = Phaser.Math.FloatBetween(0.8, 0.92);
      const image = this.add.image(0, 0, `balloon-${colour.name}`).setScale(scale);
      const text = this.labelFor(question, index);
      const label = this.add
        .text(0, -26, text, textStyle(56, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // The balloon is 150px wide before scaling; keep the label inside the
      // bulb rather than letting a six-digit answer hang off both sides.
      fitText(label, 150 * scale - 26, 56);

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
        // child needs time to read the numbers and think.
        speed: Phaser.Math.Between(20, 32) * pace,
        colour: colour.name,
        bonus: false,
        popped: false,
        baseX: x,
        swayPhase: Math.random() * Math.PI * 2,
        swayAmp: Phaser.Math.Between(18, 32),
      };

      container.on('pointerdown', () => this.onBalloonTapped(balloon));

      this.balloons.push(balloon);
    });

    // Now and then a golden star balloon floats through. It's never an
    // answer — just bonus coins — so it rewards attention without ever
    // costing a heart or muddling the maths.
    if (Math.random() < 0.35) this.spawnBonusBalloon(pace);
  }

  /** The golden star balloon: pure treat, faster than the rest. */
  private spawnBonusBalloon(pace: number): void {
    const x = Phaser.Math.Between(120, DESIGN_WIDTH - 120);
    const image = this.add.image(0, 0, 'balloon-yellow').setScale(0.74);
    const star = this.add.image(0, -26, 'star-gold').setScale(1.05);
    const container = this.add.container(x, DESIGN_HEIGHT + 80, [image, star]);
    container.setInteractive(
      new Phaser.Geom.Rectangle(-70, -95, 140, 150),
      Phaser.Geom.Rectangle.Contains,
    );

    const balloon: Balloon = {
      container,
      image,
      value: Number.NaN,
      // Noticeably quicker than the answers, so catching it feels earned.
      speed: Phaser.Math.Between(55, 70) * pace,
      colour: 'yellow',
      bonus: true,
      popped: false,
      baseX: x,
      swayPhase: Math.random() * Math.PI * 2,
      swayAmp: 26,
    };
    container.on('pointerdown', () => this.onBalloonTapped(balloon));

    // The star twinkles so it reads as special from across the room.
    this.tweens.add({
      targets: star,
      scale: 1.3,
      angle: 18,
      duration: 460,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.balloons.push(balloon);
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
    if (!this.acceptingInput || balloon.popped) return;

    // The golden balloon sits outside the answer flow entirely: coins,
    // a pop, and the question carries on unbothered.
    if (balloon.bonus) {
      this.awardBonusCoins(BONUS_COINS, balloon.container.x, balloon.container.y - 60);
      this.popBalloon(balloon);
      return;
    }

    const wasCorrect = this.submitAnswer(balloon.value, balloon.container);

    if (wasCorrect) {
      this.popBalloon(balloon);
    }
    // On a wrong answer the base class already wobbled it and said
    // something encouraging; the balloon stays up so they can try again.
  }

  /** The satisfying pop: burst shape, a puff, and the balloon is gone. */
  private popBalloon(balloon: Balloon): void {
    balloon.popped = true;
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
   * leave the top. Answer balloons are never lost; only the golden bonus
   * balloon flies away for good if it isn't caught.
   */
  override update(time: number, delta: number): void {
    const step = delta / 1000;

    // Wind: every few seconds a gust sweeps through, then dies away. The
    // whole flock leans together, which reads as weather rather than as
    // balloons misbehaving individually.
    this.gustTimer -= step;
    if (this.gustTimer <= 0) {
      this.gustSpeed = Phaser.Math.Between(40, 85) * (Math.random() < 0.5 ? -1 : 1);
      this.gustTimer = Phaser.Math.FloatBetween(4, 8);
    }
    this.gustSpeed *= Math.max(0, 1 - step * 0.7);

    for (let i = this.balloons.length - 1; i >= 0; i--) {
      const balloon = this.balloons[i]!;
      balloon.container.y -= balloon.speed * step;

      // The anchor column takes the wind; the sway rides on top of it.
      balloon.baseX = Phaser.Math.Clamp(
        balloon.baseX + this.gustSpeed * step,
        70,
        DESIGN_WIDTH - 70,
      );
      balloon.container.x =
        balloon.baseX + Math.sin(time / 1400 + balloon.swayPhase) * balloon.swayAmp;

      if (balloon.container.y < BalloonPopScene.TOP_LIMIT) {
        if (balloon.bonus) {
          // The treat escapes — off the top and gone until next time.
          this.tweens.killTweensOf(balloon.container);
          balloon.container.destroy();
          this.balloons.splice(i, 1);
          continue;
        }
        balloon.container.y = BalloonPopScene.BOTTOM_START;
      }
      // A slow rotation wobble, tied to height so each balloon differs.
      balloon.image.setRotation(Math.sin(balloon.container.y / 90) * 0.08);
    }
  }
}
