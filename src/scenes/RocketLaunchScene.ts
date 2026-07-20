/**
 * Rocket Launch.
 *
 * Every correct answer is a burst of fuel; a streak of them builds thrust
 * and pushes the rocket higher. The altitude counter and the scenery
 * changing from sky to space give a strong, visible sense of progress that
 * a plain score can't.
 *
 * Wrong answers cost no altitude — the rocket simply stops climbing for a
 * moment, so the pressure is to keep going rather than to avoid mistakes.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { sfx } from '../shared/audio';

/** One answer button on the console. */
interface FuelButton {
  container: Phaser.GameObjects.Container;
  value: number;
}

export class RocketLaunchScene extends MiniGameScene {
  private buttons: FuelButton[] = [];
  private rocket!: Phaser.GameObjects.Image;
  private flame!: Phaser.GameObjects.Image;
  private altitudeText!: Phaser.GameObjects.Text;
  private sky!: Phaser.GameObjects.Graphics;
  private stars!: Phaser.GameObjects.Graphics;

  /** Kilometres climbed this round. */
  private altitude = 0;
  /** Correct answers in a row, which multiplies the thrust. */
  private streak = 0;
  /** Seconds of thrust left to burn. */
  private thrust = 0;

  constructor() {
    super(SCENES.rocketLaunch, 'rocketLaunch');
    this.optionCount = 4;
  }

  protected buildBackground(): void {
    this.sky = this.add.graphics().setDepth(-20);
    this.stars = this.add.graphics().setDepth(-19);
    this.paintSky();

    this.flame = this.add
      .image(CENTRE_X, 452, 'flame')
      .setScale(0.7)
      .setDepth(4)
      .setAlpha(0);
    this.rocket = this.add.image(CENTRE_X, 350, 'rocket').setScale(0.72).setDepth(5);

    // A gentle hover, so the rocket is never completely static.
    this.tweens.add({
      targets: this.rocket,
      y: 338,
      duration: 1700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.altitudeText = this.add
      .text(DESIGN_WIDTH - 150, 150, '0 km', textStyle(30, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setDepth(30);

    this.add
      .text(CENTRE_X, DESIGN_HEIGHT - 22, 'Answer right to fuel the rocket!', textStyle(25, '#2f2b3a'))
      .setOrigin(0.5)
      .setDepth(30);
  }

  /**
   * Repaints the backdrop for the current altitude.
   * Blue sky near the ground, fading to black space as the rocket climbs.
   */
  private paintSky(): void {
    // 0 at the ground, 1 in deep space.
    const height = Math.min(1, this.altitude / 4000);

    // Plain channel-wise interpolation between two packed RGB values.
    const mix = (from: number, to: number, t: number): number => {
      const fr = (from >> 16) & 0xff;
      const fg = (from >> 8) & 0xff;
      const fb = from & 0xff;
      const tr = (to >> 16) & 0xff;
      const tg = (to >> 8) & 0xff;
      const tb = to & 0xff;
      const r = Math.round(fr + (tr - fr) * t);
      const g = Math.round(fg + (tg - fg) * t);
      const b = Math.round(fb + (tb - fb) * t);
      return (r << 16) | (g << 8) | b;
    };

    // The sky darkens overall as the rocket climbs...
    const top = mix(PALETTE.sky, 0x0b0a1e, height);
    const bottom = mix(0xbfe8ff, 0x241f45, height);

    this.sky.clear();
    // ...and each frame is a vertical gradient drawn as horizontal bands.
    const bands = 24;
    for (let i = 0; i < bands; i++) {
      this.sky.fillStyle(mix(top, bottom, i / (bands - 1)), 1);
      this.sky.fillRect(0, (DESIGN_HEIGHT / bands) * i, DESIGN_WIDTH, DESIGN_HEIGHT / bands + 2);
    }

    // Stars fade in as the sky darkens.
    this.stars.clear();
    if (height > 0.15) {
      for (let i = 0; i < 60; i++) {
        const x = (i * 211) % DESIGN_WIDTH;
        const y = (i * 137) % DESIGN_HEIGHT;
        this.stars.fillStyle(0xffffff, (height - 0.15) * (0.3 + ((i % 5) * 0.14)));
        this.stars.fillCircle(x, y, 1.6 + (i % 3) * 0.7);
      }
    }
  }

  protected presentQuestion(question: Question): void {
    const width = 176;
    const gap = 28;
    const total = question.options.length * width + (question.options.length - 1) * gap;
    const startX = CENTRE_X - total / 2 + width / 2;

    question.options.forEach((value, index) => {
      const x = startX + index * (width + gap);
      const y = 660;

      const bg = this.add.graphics();
      const rng = makeRng(seedFrom(`fuel-${index}`));
      doodleShape(bg, doodleRectPoints(rng, -width / 2, -48, width, 96, 3), PALETTE.white, {
        offset: 3,
        lineWidth: 5,
      });

      const text = this.labelFor(question, index);
      const label = this.add
        .text(0, 0, text, textStyle(text.length > 2 ? 38 : 48, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);

      const container = this.add.container(x, y, [bg, label]).setDepth(100);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2 - 8, -56, width + 16, 112),
        Phaser.Geom.Rectangle.Contains,
      );

      const button: FuelButton = { container, value };
      container.on('pointerdown', () => this.onButtonTapped(button));
      container.on('pointerover', () =>
        this.tweens.add({ targets: container, scale: 1.07, duration: 120 }),
      );
      container.on('pointerout', () =>
        this.tweens.add({ targets: container, scale: 1, duration: 120 }),
      );

      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: index * 60,
        ease: 'Back.easeOut',
      });

      this.buttons.push(button);
    });
  }

  protected clearQuestion(): void {
    for (const button of this.buttons) {
      this.tweens.killTweensOf(button.container);
      button.container.destroy();
    }
    this.buttons = [];
  }

  private onButtonTapped(button: FuelButton): void {
    if (!this.acceptingInput) return;
    const wasCorrect = this.submitAnswer(button.value, button.container);

    if (wasCorrect) {
      this.streak += 1;
      // A streak multiplies the burn, so a run of right answers is
      // visibly, dramatically better than the same number spread out.
      this.thrust += 1.1 + Math.min(this.streak, 6) * 0.24;
      sfx.whoosh();
      this.shakeRocket();
    } else {
      this.streak = 0;
    }
  }

  /** A rumble while the engine burns. */
  private shakeRocket(): void {
    this.tweens.add({
      targets: this.rocket,
      x: { from: CENTRE_X - 5, to: CENTRE_X + 5 },
      duration: 60,
      yoyo: true,
      repeat: 5,
      onComplete: () => this.rocket.setX(CENTRE_X),
    });
  }

  override update(_time: number, delta: number): void {
    const step = delta / 1000;

    if (this.thrust > 0) {
      this.thrust = Math.max(0, this.thrust - step);
      // Climb rate scales with the streak.
      this.altitude += (140 + this.streak * 55) * step;

      this.flame.setAlpha(1);
      this.flame.setScale(0.62 + Math.random() * 0.16, 0.66 + Math.random() * 0.3);
      this.flame.setY(this.rocket.y + 96);

      this.altitudeText.setText(`${Math.round(this.altitude)} km`);
      this.paintSky();
    } else {
      // Ease the flame out rather than snapping it off.
      this.flame.setAlpha(Math.max(0, this.flame.alpha - step * 3));
    }

    this.flame.setX(this.rocket.x);
  }
}
