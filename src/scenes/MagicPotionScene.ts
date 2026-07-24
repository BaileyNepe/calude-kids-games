/**
 * Magic Potion.
 *
 * A wizard's workshop: potion bottles stand on two shelves, each labelled
 * with a number, and a cauldron bubbles below. Tap the bottle with the
 * right answer and it floats down and pours itself in — a flash of green,
 * a burst of sparkles, and the brew is one ingredient closer to done.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { PIECE_COLOURS } from './BootScene';
import { placeHiddenGem } from '../shared/hiddenGem';
import { sfx } from '../shared/audio';
import { celebrate, fitText } from '../shared/ui';

/** One bottle on the shelf. */
interface Bottle {
  container: Phaser.GameObjects.Container;
  value: number;
  /** Mid-pour — not tappable and not wobble-able. */
  pouring: boolean;
}

export class MagicPotionScene extends MiniGameScene {
  private bottles: Bottle[] = [];
  private cauldron!: Phaser.GameObjects.Image;

  /**
   * Bottle positions: one long shelf of five. Kept below y≈400 so a
   * fraction question's picture card (centre-screen) never hides a label.
   */
  private static readonly SLOTS: readonly { x: number; y: number }[] = [
    { x: 240, y: 414 },
    { x: 440, y: 414 },
    { x: 640, y: 414 },
    { x: 840, y: 414 },
    { x: 1040, y: 414 },
  ];

  constructor() {
    super(SCENES.magicPotion, 'magicPotion');
    this.optionCount = 5;
    // A later unlock, so it pays better than the early games.
    this.coinsPerCorrect = 6;
    this.catChanceBonus = 0.05;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0x3d3157);

    // Stone wall texture: a few darker blocks.
    const rng = makeRng(seedFrom('potion-wall'));
    const wall = this.add.graphics().setDepth(-10);
    for (let i = 0; i < 14; i++) {
      wall.fillStyle(0x352a4d, 1);
      wall.fillRect(rng() * DESIGN_WIDTH, rng() * DESIGN_HEIGHT, 90 + rng() * 80, 44);
    }

    // Twinkling wall stars, because it's a *magic* workshop.
    for (let i = 0; i < 8; i++) {
      const star = this.add
        .image(80 + rng() * (DESIGN_WIDTH - 160), 180 + rng() * 320, 'star-gold')
        .setScale(0.3 + rng() * 0.3)
        .setDepth(-9)
        .setAlpha(0.5);
      this.tweens.add({
        targets: star,
        alpha: 0.15,
        duration: 900 + rng() * 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // The long shelf the bottles stand on, with a pair of brackets.
    const shelves = this.add.graphics().setDepth(-8);
    const shelfRng = makeRng(seedFrom('potion-shelves'));
    doodleShape(shelves, doodleRectPoints(shelfRng, 140, 502, 1000, 26, 3), PALETTE.brown, {
      offset: 2,
      lineWidth: 5,
    });
    for (const x of [300, 980]) {
      doodleShape(
        shelves,
        [
          { x, y: 528 },
          { x: x + 46, y: 528 },
          { x, y: 574 },
        ],
        PALETTE.darkBrown,
        { offset: 1, lineWidth: 4 },
      );
    }

    // The cauldron, bubbling away at the bottom.
    this.cauldron = this.add
      .image(CENTRE_X, DESIGN_HEIGHT - 108, 'cauldron')
      .setScale(0.95)
      .setDepth(5);
    this.tweens.add({
      targets: this.cauldron,
      scaleY: 0.99,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22, 'Tap the potion with the right answer!', textStyle(25, '#d9d2f0'))
      .setOrigin(0.5)
      .setDepth(30);

    // A secret gem glinting on the workshop wall.
    placeHiddenGem(this, 'gem-potion-wall', 132, 238, { scale: 0.38, depth: -7 });
  }

  protected presentQuestion(question: Question): void {
    question.options.forEach((value, index) => {
      const slot = MagicPotionScene.SLOTS[index % MagicPotionScene.SLOTS.length]!;
      const colour = PIECE_COLOURS[(index + 4) % PIECE_COLOURS.length]!;

      const image = this.add.image(0, 0, `bottle-${colour.name}`).setScale(0.9);
      const label = this.add
        .text(0, 20, this.labelFor(question, index), textStyle(40, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // On the bottle's pale label ellipse.
      fitText(label, 66, 40);

      const container = this.add.container(slot.x, slot.y, [image, label]).setDepth(10);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-70, -100, 140, 200),
        Phaser.Geom.Rectangle.Contains,
      );

      const bottle: Bottle = { container, value, pouring: false };
      container.on('pointerdown', () => this.onBottleTapped(bottle));
      container.on('pointerover', () =>
        this.tweens.add({ targets: container, scale: 1.07, duration: 120 }),
      );
      container.on('pointerout', () => {
        if (!bottle.pouring) this.tweens.add({ targets: container, scale: 1, duration: 120 });
      });

      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: index * 70,
        ease: 'Back.easeOut',
      });

      this.bottles.push(bottle);
    });
  }

  protected clearQuestion(): void {
    for (const bottle of this.bottles) {
      this.tweens.killTweensOf(bottle.container);
      bottle.container.destroy();
    }
    this.bottles = [];
  }

  private onBottleTapped(bottle: Bottle): void {
    if (!this.acceptingInput || bottle.pouring) return;

    const wasCorrect = this.submitAnswer(bottle.value, bottle.container);
    if (!wasCorrect) return;

    // The pour: float to the cauldron's lip, tip over, vanish in a flash.
    bottle.pouring = true;
    bottle.container.disableInteractive();
    sfx.whoosh();
    this.tweens.add({
      targets: bottle.container,
      x: this.cauldron.x - 30,
      y: this.cauldron.y - 150,
      angle: 118,
      scale: 0.8,
      duration: 520,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.brewFlash();
        this.tweens.add({
          targets: bottle.container,
          alpha: 0,
          y: bottle.container.y + 30,
          duration: 260,
          ease: 'Quad.easeIn',
        });
      },
    });
  }

  /** The cauldron erupts happily: green glow, sparkles, a jolly wobble. */
  private brewFlash(): void {
    sfx.pop();
    celebrate(this, this.cauldron.x, this.cauldron.y - 130, 14);

    const glow = this.add.graphics().setDepth(6);
    const state = { r: 30, alpha: 0.8 };
    this.tweens.add({
      targets: state,
      r: 150,
      alpha: 0,
      duration: 480,
      ease: 'Cubic.easeOut',
      onUpdate: () => {
        glow.clear();
        glow.fillStyle(0x8fd45f, state.alpha);
        glow.fillCircle(this.cauldron.x, this.cauldron.y - 90, state.r);
      },
      onComplete: () => glow.destroy(),
    });

    this.tweens.add({
      targets: this.cauldron,
      scaleX: 1.03,
      scaleY: 0.88,
      duration: 170,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });
  }
}
