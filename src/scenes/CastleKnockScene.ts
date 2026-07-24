/**
 * Castle Knockdown.
 *
 * The slingshot game: four little block towers stand on the green, each
 * flying a numbered banner. Pull the ball back, let go, and knock down
 * the tower with the right answer — blocks tumble everywhere, which is
 * the most satisfying "correct!" in the whole game. Hitting the wrong
 * tower rattles it (and costs a heart); missing entirely costs nothing
 * but pride, and the ball trots back to the sling.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { placeHiddenGem } from '../shared/hiddenGem';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** One block tower and its banner. */
interface Tower {
  container: Phaser.GameObjects.Container;
  /** The individual blocks, for the tumble. */
  blocks: Phaser.GameObjects.Image[];
  value: number;
  x: number;
  /** Already knocked down or spent. */
  done: boolean;
}

/** Where the towers stand. */
const GROUND_Y = 726;
/** The ball's resting spot in the sling. */
const REST = { x: 168, y: 596 };
/**
 * Pixels of pull-back allowed, and launch speed per pixel of pull.
 *
 * Sized so the far tower is comfortably in range: it sits ~950px out, and
 * a 45° shot needs v ≈ √(950·g) ≈ 1130px/s to get there — about two thirds
 * of the full-stretch launch speed (150 × 11 = 1650). The first tuning had
 * a max of 1170, which made the back tower need a pixel-perfect maximum
 * pull; a child could never land it.
 */
const MAX_PULL = 150;
const POWER = 11;
const GRAVITY = 1350;

export class CastleKnockScene extends MiniGameScene {
  private towers: Tower[] = [];
  private ball!: Phaser.GameObjects.Container;
  private elastic!: Phaser.GameObjects.Graphics;
  private aimDots!: Phaser.GameObjects.Graphics;

  private aiming = false;
  private flying = false;
  private velocity = { x: 0, y: 0 };

  constructor() {
    super(SCENES.castleKnock, 'castleKnock');
    this.optionCount = 4;
    // Aiming is a skill on top of the maths, so it pays a little more.
    this.coinsPerCorrect = 7;
    this.catChanceBonus = 0.1;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    this.add.image(1100, 130, 'sun').setScale(0.5).setDepth(-9);
    this.add.image(320, 150, 'cloud').setScale(0.65).setDepth(-9).setAlpha(0.9);
    this.add.image(880, 200, 'cloud').setScale(0.5).setDepth(-9).setAlpha(0.8);

    // The green the castles stand on.
    const ground = this.add.graphics().setDepth(-8);
    ground.fillStyle(PALETTE.grass, 1);
    ground.fillRect(0, GROUND_Y + 22, DESIGN_WIDTH, DESIGN_HEIGHT - GROUND_Y - 22);
    ground.fillStyle(0x74c25a, 1);
    ground.fillRect(0, GROUND_Y + 22, DESIGN_WIDTH, 16);

    // The slingshot: a wooden Y planted at the left.
    const rng = makeRng(seedFrom('sling-frame'));
    const sling = this.add.graphics().setDepth(4);
    sling.lineStyle(14, PALETTE.darkBrown, 1);
    sling.beginPath();
    sling.moveTo(REST.x, GROUND_Y + 30);
    sling.lineTo(REST.x, REST.y + 40);
    sling.moveTo(REST.x, REST.y + 40);
    sling.lineTo(REST.x - 34, REST.y - 30);
    sling.moveTo(REST.x, REST.y + 40);
    sling.lineTo(REST.x + 34, REST.y - 30);
    sling.strokePath();
    void rng;

    // The elastic band and the aiming dots, redrawn while dragging.
    this.elastic = this.add.graphics().setDepth(5);
    this.aimDots = this.add.graphics().setDepth(5);

    // The ball itself.
    const ballArt = this.add.graphics();
    ballArt.fillStyle(PALETTE.red, 1);
    ballArt.fillCircle(0, 0, 26);
    ballArt.lineStyle(5, PALETTE.ink, 1);
    ballArt.strokeCircle(0, 0, 26);
    ballArt.fillStyle(0xffffff, 0.7);
    ballArt.fillCircle(-9, -9, 7);
    this.ball = this.add.container(REST.x, REST.y, [ballArt]).setDepth(6);
    this.ball.setInteractive(
      new Phaser.Geom.Rectangle(-60, -60, 120, 120),
      Phaser.Geom.Rectangle.Contains,
    );

    this.setupAiming();

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 20, 'Pull back and knock down the right castle!', textStyle(25, '#2f4f1f'))
      .setOrigin(0.5)
      .setDepth(30);

    // A secret gem in the grass by the slingshot's foot.
    placeHiddenGem(this, 'gem-castle-grass', 58, 764, { scale: 0.4, depth: -7 });
  }

  /** Drag-back aiming, with a dotted preview of the flight. */
  private setupAiming(): void {
    this.ball.on('pointerdown', () => {
      if (this.flying || !this.acceptingInput) return;
      this.aiming = true;
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!this.aiming) return;
      // The ball follows the finger, tethered to the sling.
      const dx = pointer.worldX - REST.x;
      const dy = pointer.worldY - REST.y;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, MAX_PULL);
      const nx = len === 0 ? 0 : dx / len;
      const ny = len === 0 ? 0 : dy / len;
      this.ball.setPosition(REST.x + nx * clamped, REST.y + ny * clamped);
      this.drawAim();
    });

    const release = (): void => {
      if (!this.aiming) return;
      this.aiming = false;
      this.elastic.clear();
      this.aimDots.clear();

      const pullX = REST.x - this.ball.x;
      const pullY = REST.y - this.ball.y;
      const pull = Math.hypot(pullX, pullY);
      if (pull < 18) {
        // Too gentle to mean it — settle back into the sling.
        this.tweens.add({ targets: this.ball, x: REST.x, y: REST.y, duration: 180, ease: 'Back.easeOut' });
        return;
      }

      sfx.whoosh();
      this.velocity.x = pullX * POWER;
      this.velocity.y = pullY * POWER;
      this.flying = true;
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
  }

  /** The stretched band, plus dots tracing where the shot would go. */
  private drawAim(): void {
    this.elastic.clear();
    this.elastic.lineStyle(7, 0x6b4423, 1);
    this.elastic.beginPath();
    this.elastic.moveTo(REST.x - 34, REST.y - 30);
    this.elastic.lineTo(this.ball.x, this.ball.y);
    this.elastic.lineTo(REST.x + 34, REST.y - 30);
    this.elastic.strokePath();

    // Simulate a short stretch of the flight for the preview.
    this.aimDots.clear();
    this.aimDots.fillStyle(0xffffff, 0.75);
    let px = this.ball.x;
    let py = this.ball.y;
    let vx = (REST.x - this.ball.x) * POWER;
    let vy = (REST.y - this.ball.y) * POWER;
    const step = 1 / 30;
    for (let i = 0; i < 18; i++) {
      vy += GRAVITY * step;
      px += vx * step;
      py += vy * step;
      if (i % 2 === 0) this.aimDots.fillCircle(px, py, 5 - i * 0.15);
    }
  }

  protected presentQuestion(question: Question): void {
    const spacing = 210;
    const startX = 486;

    question.options.forEach((value, index) => {
      const x = startX + index * spacing;
      const container = this.add.container(x, GROUND_Y).setDepth(8);

      // Three crates, stacked.
      const blocks: Phaser.GameObjects.Image[] = [];
      for (let level = 0; level < 3; level++) {
        const block = this.add.image(0, -34 - level * 66, 'block-blank').setScale(0.46);
        blocks.push(block);
        container.add(block);
      }

      // The banner across the middle crate, carrying the answer.
      const banner = this.add.graphics();
      const rng = makeRng(seedFrom(`castle-banner-${index}`));
      doodleShape(banner, doodleRectPoints(rng, -62, -128, 124, 56, 2.5), PALETTE.paper, {
        offset: 2,
        lineWidth: 5,
      });
      container.add(banner);

      const label = this.add
        .text(0, -100, this.labelFor(question, index), textStyle(40, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 110, 40);
      container.add(label);

      // A little flag on top, so they read as castles.
      const flag = this.add.graphics();
      flag.lineStyle(4, PALETTE.ink, 1);
      flag.beginPath();
      flag.moveTo(0, -232);
      flag.lineTo(0, -196);
      flag.strokePath();
      flag.fillStyle([PALETTE.red, PALETTE.teal, PALETTE.purple, PALETTE.orange][index % 4]!, 1);
      flag.fillTriangle(0, -232, 44, -222, 0, -212);
      container.add(flag);

      // Rise out of the ground with a stagger.
      container.setScale(1, 0);
      this.tweens.add({
        targets: container,
        scaleY: 1,
        duration: 340,
        delay: index * 80,
        ease: 'Back.easeOut',
      });

      this.towers.push({ container, blocks, value, x, done: false });
    });
  }

  protected clearQuestion(): void {
    for (const tower of this.towers) {
      this.tweens.killTweensOf(tower.container);
      tower.container.destroy();
    }
    this.towers = [];
    this.flying = false;
    this.aiming = false;
    this.elastic?.clear();
    this.aimDots?.clear();
    if (this.ball !== undefined) this.ball.setPosition(REST.x, REST.y);
  }

  /** Sends the ball home after a hit, a miss, or a flight off screen. */
  private resetBall(): void {
    this.flying = false;
    this.tweens.add({
      targets: this.ball,
      x: REST.x,
      y: REST.y,
      duration: 420,
      ease: 'Sine.easeInOut',
    });
  }

  /** The blocks fly apart — the payoff for a well-aimed right answer. */
  private tumble(tower: Tower): void {
    tower.done = true;
    sfx.pop();
    for (const block of tower.blocks) {
      // Scatter each crate in world space so the container can die later.
      this.tweens.add({
        targets: block,
        x: block.x + Phaser.Math.Between(-140, 140),
        y: block.y + Phaser.Math.Between(120, 260),
        angle: Phaser.Math.Between(-260, 260),
        alpha: 0,
        duration: Phaser.Math.Between(600, 900),
        ease: 'Quad.easeIn',
      });
    }
    // Banner, label and flag drop straight down with the wreckage.
    this.tweens.add({
      targets: tower.container.list.filter((obj) => !tower.blocks.includes(obj as Phaser.GameObjects.Image)),
      y: '+=200',
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeIn',
    });
  }

  override update(_time: number, delta: number): void {
    if (!this.flying) return;
    const step = delta / 1000;

    this.velocity.y += GRAVITY * step;
    this.ball.x += this.velocity.x * step;
    this.ball.y += this.velocity.y * step;
    this.ball.setAngle(this.ball.angle + this.velocity.x * step * 0.4);

    // Tower collisions: a simple box check around each standing tower.
    for (const tower of this.towers) {
      if (tower.done) continue;
      const withinX = Math.abs(this.ball.x - tower.x) < 78;
      const withinY = this.ball.y > GROUND_Y - 240 && this.ball.y < GROUND_Y + 10;
      if (!withinX || !withinY) continue;

      this.flying = false;
      const wasCorrect = this.submitAnswer(tower.value, tower.container);
      if (wasCorrect) {
        this.tumble(tower);
      } else {
        // The wrong castle shrugs it off; the base class has already
        // wobbled it and taken the heart.
        tower.done = false;
      }
      this.resetBall();
      return;
    }

    // Ground or out of bounds: no harm done, back to the sling.
    if (this.ball.y > GROUND_Y + 14 || this.ball.x > DESIGN_WIDTH + 60 || this.ball.x < -60) {
      this.resetBall();
    }
  }
}
