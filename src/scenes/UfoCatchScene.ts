/**
 * UFO Catch.
 *
 * Night shift: numbered asteroids drift across a starry sky while a
 * friendly cat-piloted saucer hovers above. Tap the asteroid with the
 * right answer and the UFO swoops over and beams it up. Asteroids that
 * drift off one side come back on the other, so nothing is ever missed.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, challengeFor, textStyle } from '../shared/config';
import type { Question } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { sfx } from '../shared/audio';
import { celebrate, fitText } from '../shared/ui';

/** One drifting asteroid. */
interface Asteroid {
  container: Phaser.GameObjects.Container;
  value: number;
  /** Horizontal speed in pixels per second; sign is direction. */
  speed: number;
  /** Slow tumble, degrees per second. */
  spin: number;
  /** Being beamed up — frozen in place and no longer tappable. */
  caught: boolean;
}

export class UfoCatchScene extends MiniGameScene {
  private asteroids: Asteroid[] = [];
  private ufo!: Phaser.GameObjects.Image;
  private beam!: Phaser.GameObjects.Graphics;

  /** The heights the asteroids drift along. */
  private static readonly LANES: readonly number[] = [330, 450, 570, 390, 510];

  constructor() {
    super(SCENES.ufoCatch, 'ufoCatch');
    this.optionCount = 5;
    // A later unlock, so it pays better than the early games.
    this.coinsPerCorrect = 6;
    this.catChanceBonus = 0.05;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0x141228);

    // Starfield, deterministic so it doesn't shimmer between rounds.
    const stars = this.add.graphics().setDepth(-10);
    for (let i = 0; i < 70; i++) {
      const x = (i * 181) % DESIGN_WIDTH;
      const y = (i * 97) % (DESIGN_HEIGHT - 120);
      stars.fillStyle(0xffffff, 0.2 + ((i % 5) * 0.15));
      stars.fillCircle(x, y, 1.5 + (i % 3) * 0.8);
    }

    // A ringed planet in the corner.
    const planet = this.add.graphics().setDepth(-9);
    planet.fillStyle(0xc98d55, 1);
    planet.fillCircle(1120, 660, 60);
    planet.lineStyle(8, 0xe0b34c, 0.9);
    planet.strokeEllipse(1120, 660, 190, 44);

    // Crater-pocked ground along the bottom.
    const ground = this.add.graphics().setDepth(-8);
    ground.fillStyle(0x2a2545, 1);
    ground.fillEllipse(CENTRE_X, DESIGN_HEIGHT + 60, DESIGN_WIDTH * 1.4, 260);

    // The saucer patrols along the top, under the banner.
    this.beam = this.add.graphics().setDepth(4);
    this.ufo = this.add.image(CENTRE_X, 236, 'ufo').setScale(0.85).setDepth(5);
    this.tweens.add({
      targets: this.ufo,
      y: 228,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22, 'Tap the space rock with the right answer!', textStyle(25, '#d9d2f0'))
      .setOrigin(0.5)
      .setDepth(30);
  }

  protected presentQuestion(question: Question): void {
    const pace = challengeFor(gameState.level);

    question.options.forEach((value, index) => {
      const lane = UfoCatchScene.LANES[index % UfoCatchScene.LANES.length]!;
      const fromLeft = index % 2 === 0;

      const image = this.add.image(0, 0, 'asteroid').setScale(0.95);
      const label = this.add
        .text(0, 0, this.labelFor(question, index), textStyle(44, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // On the asteroid's pale centre.
      fitText(label, 82, 44);

      const x = 140 + ((index * 230) % (DESIGN_WIDTH - 280));
      const container = this.add.container(x, lane, [image, label]).setDepth(10);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-88, -88, 176, 176),
        Phaser.Geom.Rectangle.Contains,
      );

      const asteroid: Asteroid = {
        container,
        value,
        speed: (fromLeft ? 1 : -1) * Phaser.Math.Between(26, 44) * pace,
        spin: Phaser.Math.Between(-14, 14),
        caught: false,
      };
      container.on('pointerdown', () => this.onAsteroidTapped(asteroid));

      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: index * 70,
        ease: 'Back.easeOut',
      });

      this.asteroids.push(asteroid);
    });
  }

  protected clearQuestion(): void {
    for (const asteroid of this.asteroids) {
      this.tweens.killTweensOf(asteroid.container);
      asteroid.container.destroy();
    }
    this.asteroids = [];
    this.beam.clear();
  }

  private onAsteroidTapped(asteroid: Asteroid): void {
    if (!this.acceptingInput || asteroid.caught) return;

    const wasCorrect = this.submitAnswer(asteroid.value, asteroid.container);
    if (!wasCorrect) return;

    // The catch: saucer glides over, drops its beam, hoists the rock up.
    asteroid.caught = true;
    asteroid.container.disableInteractive();
    sfx.whoosh();
    this.tweens.add({
      targets: this.ufo,
      x: asteroid.container.x,
      duration: 380,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.showBeam(asteroid.container.x, asteroid.container.y);
        this.tweens.add({
          targets: asteroid.container,
          y: this.ufo.y + 60,
          scale: 0.2,
          angle: 180,
          duration: 620,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this.beam.clear();
            celebrate(this, this.ufo.x, this.ufo.y + 40, 12);
            asteroid.container.setVisible(false);
          },
        });
      },
    });
  }

  /** The glowing tractor beam, cleared once the rock is aboard. */
  private showBeam(x: number, y: number): void {
    this.beam.clear();
    this.beam.fillStyle(0xbfe8ff, 0.35);
    this.beam.fillTriangle(x - 26, this.ufo.y + 40, x + 26, this.ufo.y + 40, x, y + 40);
    this.beam.fillStyle(0xbfe8ff, 0.2);
    this.beam.fillTriangle(x - 52, this.ufo.y + 40, x + 52, this.ufo.y + 40, x, y + 60);
  }

  /** Asteroids drift and tumble, wrapping at the screen edges. */
  override update(_time: number, delta: number): void {
    const step = delta / 1000;
    for (const asteroid of this.asteroids) {
      if (asteroid.caught) continue;
      asteroid.container.x += asteroid.speed * step;
      asteroid.container.angle += asteroid.spin * step;
      if (asteroid.container.x < -100) asteroid.container.x = DESIGN_WIDTH + 100;
      if (asteroid.container.x > DESIGN_WIDTH + 100) asteroid.container.x = -100;
    }
  }
}
