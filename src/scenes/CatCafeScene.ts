/**
 * Cat Cafe.
 *
 * The player's cats come in and order treats, and the maths is the bill:
 * "3 plates of fish at 4 coins each". Getting it right serves the cat and
 * earns the coins.
 *
 * This is the game that gives coins a purpose and ties the collection to
 * the maths — the cats being served are the ones the child has actually won.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { CAT_CATALOG, getCat } from '../shared/pets';
import { ensureCatFaces } from '../shared/art/sprites';
import { TREATS } from './BootScene';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** One coin button the child can hand over. */
interface PriceTag {
  container: Phaser.GameObjects.Container;
  value: number;
}

export class CatCafeScene extends MiniGameScene {
  private tags: PriceTag[] = [];
  private customer!: Phaser.GameObjects.Image;
  private orderText!: Phaser.GameObjects.Text;
  private treatIcons: Phaser.GameObjects.Image[] = [];
  /** Which cats are queuing, so a different one is served each time. */
  private customerIds: string[] = [];
  private customerIndex = 0;

  constructor() {
    super(SCENES.catCafe, 'catCafe');
    this.optionCount = 4;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0xffeedd);

    // Cafe wall, counter, and a stack of shelves.
    const g = this.add.graphics().setDepth(-10);
    g.fillStyle(0xf6d9b8, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, DESIGN_HEIGHT);
    g.fillStyle(0xffeedd, 1);
    g.fillRect(0, 0, DESIGN_WIDTH, 430);

    // Counter.
    g.fillStyle(0xa9713f, 1);
    g.fillRect(0, 430, DESIGN_WIDTH, 34);
    g.fillStyle(0xc98d55, 1);
    g.fillRect(0, 464, DESIGN_WIDTH, 120);

    // Bunting across the top, for a cheerful cafe feel.
    const bunting = this.add.graphics().setDepth(-9);
    const colours = [PALETTE.red, PALETTE.sun, PALETTE.teal, PALETTE.pink, PALETTE.green];
    for (let i = 0; i < 14; i++) {
      const x = 40 + i * 92;
      bunting.fillStyle(colours[i % colours.length]!, 1);
      bunting.fillTriangle(x, 196, x + 46, 196, x + 23, 250);
    }
    bunting.lineStyle(4, PALETTE.ink, 1);
    bunting.beginPath();
    bunting.moveTo(0, 196);
    bunting.lineTo(DESIGN_WIDTH, 196);
    bunting.strokePath();

    // The queue of customers is drawn from the player's own collection,
    // falling back to the catalog for a brand-new player.
    const owned = gameState.pets.filter((id) => getCat(id) !== undefined);
    this.customerIds = owned.length > 0 ? owned : [CAT_CATALOG[0]!.id];

    // Bake the happy face for every cat that might come in. Only the
    // player's own cats queue here, so this stays a small set.
    for (const id of this.customerIds) {
      const look = getCat(id)?.look;
      if (look !== undefined) ensureCatFaces(this, id, look);
    }

    this.customer = this.add
      .image(CENTRE_X, 360, `cat-${this.customerIds[0]!}-idle`)
      .setScale(0.9)
      .setDepth(5);

    this.orderText = this.add
      .text(CENTRE_X, 500, '', textStyle(32, '#5a3410', { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setDepth(10);

    this.add
      .text(CENTRE_X, DESIGN_HEIGHT - 24, 'Tap the right number of coins', textStyle(25, '#6b4a25'))
      .setOrigin(0.5)
      .setDepth(10);
  }

  protected presentQuestion(question: Question): void {
    // Serve the next cat in the queue.
    const id = this.customerIds[this.customerIndex % this.customerIds.length]!;
    this.customerIndex += 1;
    this.customer.setTexture(`cat-${id}-idle`);
    this.customer.setScale(0);
    this.tweens.add({
      targets: this.customer,
      scale: 0.9,
      duration: 380,
      ease: 'Back.easeOut',
    });

    // Dress the sum up as an order. Multiplication reads most naturally as
    // "3 plates of fish"; everything else is phrased as a bill total.
    const treat = TREATS[Math.floor(Math.random() * TREATS.length)]!;
    const cat = getCat(id);
    this.orderText.setText(`${cat?.name ?? 'Kitty'} wants ${treat.label}:  ${question.prompt} coins`);

    // A few plates on the counter, as a visual anchor for the order.
    const count = Math.min(4, Math.max(1, question.options.length - 1));
    for (let i = 0; i < count; i++) {
      const x = CENTRE_X - ((count - 1) * 120) / 2 + i * 120;
      const icon = this.add.image(x, 448, `treat-${treat.name}`).setScale(0.62).setDepth(8);
      icon.setAlpha(0);
      this.tweens.add({ targets: icon, alpha: 1, duration: 260, delay: i * 80 });
      this.treatIcons.push(icon);
    }

    // The answer choices, as coin buttons along the bottom.
    const width = 168;
    const gap = 26;
    const total = question.options.length * width + (question.options.length - 1) * gap;
    const startX = CENTRE_X - total / 2 + width / 2;

    question.options.forEach((value, index) => {
      const x = startX + index * (width + gap);
      const y = 660;

      const bg = this.add.graphics();
      const rng = makeRng(seedFrom(`cafe-tag-${index}`));
      doodleShape(bg, doodleRectPoints(rng, -width / 2, -46, width, 92, 3), PALETTE.sun, {
        offset: 3,
        lineWidth: 5,
      });

      const coin = this.add.image(-width / 2 + 34, 0, 'coin').setScale(0.62);
      const label = this.add
        .text(12, 0, this.labelFor(question, index), textStyle(40, '#5a3d00', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // The coin takes the left third of the 168-wide card.
      fitText(label, 108, 40);

      const container = this.add.container(x, y, [bg, coin, label]).setDepth(100);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2 - 8, -54, width + 16, 108),
        Phaser.Geom.Rectangle.Contains,
      );

      const tag: PriceTag = { container, value };
      container.on('pointerdown', () => this.onTagTapped(tag));
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
        delay: index * 70,
        ease: 'Back.easeOut',
      });

      this.tags.push(tag);
    });
  }

  protected clearQuestion(): void {
    for (const tag of this.tags) {
      this.tweens.killTweensOf(tag.container);
      tag.container.destroy();
    }
    for (const icon of this.treatIcons) icon.destroy();
    this.tags = [];
    this.treatIcons = [];
  }

  private onTagTapped(tag: PriceTag): void {
    if (!this.acceptingInput) return;
    const wasCorrect = this.submitAnswer(tag.value, tag.container);
    if (!wasCorrect) return;

    // The cat is delighted and tucks in.
    const id = this.customerIds[(this.customerIndex - 1) % this.customerIds.length]!;
    this.customer.setTexture(`cat-${id}-happy`);
    sfx.purr();
    this.tweens.add({
      targets: this.customer,
      scaleX: 0.98,
      scaleY: 0.84,
      duration: 190,
      yoyo: true,
      repeat: 1,
    });
    for (const icon of this.treatIcons) {
      this.tweens.add({
        targets: icon,
        x: this.customer.x,
        y: this.customer.y + 40,
        scale: 0,
        duration: 420,
        ease: 'Cubic.easeIn',
      });
    }
  }
}
