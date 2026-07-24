/**
 * Pirate Ship.
 *
 * A kid pirate captain stands on deck under a skull flag. Answer numbers
 * are scattered across the deck on wooden planks; tapping the right one
 * wins. Wrong taps just wobble the plank — nothing is lost.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import {
  PALETTE,
  makeRng,
  seedFrom,
  doodleShape,
  doodleRectPoints,
} from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { placeHiddenGem } from '../shared/hiddenGem';
import { fitText } from '../shared/ui';

/** One tappable answer plank on the deck. */
interface AnswerPlank {
  container: Phaser.GameObjects.Container;
  value: number;
}

export class PirateShipScene extends MiniGameScene {
  private planks: AnswerPlank[] = [];
  private captain!: Phaser.GameObjects.Image;

  /**
   * Where answers can sit on the deck. Hand-placed rather than random so
   * they never overlap the ship's mast or the captain, and so the layout
   * is the same every round — predictability helps young players.
   */
  private static readonly SLOTS: readonly { x: number; y: number }[] = [
    { x: 250, y: 470 },
    { x: 470, y: 560 },
    { x: 700, y: 470 },
    { x: 900, y: 560 },
    { x: 1075, y: 470 },
  ];

  constructor() {
    super(SCENES.pirateShip, 'pirateShip');
    // Five answers spread across the deck — a slightly harder read than
    // Balloon Pop's four, which suits the older-feeling theme.
    this.optionCount = 5;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    // Sea filling the lower half.
    const sea = this.add.graphics().setDepth(-10);
    sea.fillStyle(PALETTE.sea, 1);
    sea.fillRect(0, 430, DESIGN_WIDTH, DESIGN_HEIGHT - 430);

    // A few wave lines for texture.
    const rng = makeRng(seedFrom('pirate-waves'));
    const waves = this.add.graphics().setDepth(-9);
    waves.lineStyle(5, PALETTE.deepSea, 0.75);
    for (let row = 0; row < 5; row++) {
      const y = 470 + row * 66;
      waves.beginPath();
      waves.moveTo(0, y);
      for (let x = 0; x <= DESIGN_WIDTH; x += 40) {
        waves.lineTo(x, y + Math.sin(x / 60 + row) * 7 + (rng() - 0.5) * 3);
      }
      waves.strokePath();
    }

    this.add.image(1150, 130, 'sun').setScale(0.55).setDepth(-9);
    this.add.image(300, 170, 'cloud').setScale(0.72).setDepth(-9).setAlpha(0.9);

    // The ship, sitting low so the deck fills the play area.
    const ship = this.add.image(DESIGN_WIDTH / 2, 560, 'pirate-ship').setScale(1.02).setDepth(-5);
    // A slow rocking motion — the single detail that makes it feel afloat.
    this.tweens.add({
      targets: ship,
      angle: { from: -1.4, to: 1.4 },
      duration: 3200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Skull flag at the masthead. Kept low, just above where the mast
    // meets the sail: it used to fly high in the sky at y=210, where the
    // dark cloth sat directly behind the instruction text ("Add them up!")
    // and made it unreadable whenever the instruction ran long.
    const flag = this.add.image(DESIGN_WIDTH / 2 + 60, 322, 'skull-flag').setScale(0.72).setDepth(-4);
    this.tweens.add({
      targets: flag,
      angle: { from: -3, to: 3 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // The kid captain on deck.
    this.captain = this.add.image(160, 470, 'kid-captain').setScale(0.72).setDepth(6);
    this.tweens.add({
      targets: this.captain,
      y: 462,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 30, 'Tap the treasure with the right answer!', textStyle(26, '#eaf6ff'))
      .setOrigin(0.5)
      .setDepth(10);

    // A secret gem bobbing in the waves by the bow.
    placeHiddenGem(this, 'gem-pirate-sea', 120, 690, { scale: 0.4, depth: -8 });
  }

  protected presentQuestion(question: Question): void {
    question.options.forEach((value, index) => {
      const slot = PirateShipScene.SLOTS[index % PirateShipScene.SLOTS.length]!;
      const width = 132;
      const height = 96;

      const plank = this.add.graphics();
      const rng = makeRng(seedFrom(`plank-${index}`));
      doodleShape(plank, doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3), PALETTE.sun, {
        offset: 3,
        lineWidth: 6,
      });

      const label = this.add
        .text(0, 0, this.labelFor(question, index), textStyle(56, '#5a3d00', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // The plank is 132 wide; a six-digit answer used to run off it.
      fitText(label, 116, 56);

      const container = this.add.container(slot.x, slot.y, [plank, label]).setDepth(8);
      // No setSize(): it would offset the hit area on a Container (see
      // BalloonPopScene for the full explanation).
      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2 - 12, -height / 2 - 12, width + 24, height + 24),
        Phaser.Geom.Rectangle.Contains,
      );

      const entry: AnswerPlank = { container, value };
      container.on('pointerdown', () => this.onPlankTapped(entry));
      container.on('pointerover', () =>
        this.tweens.add({ targets: container, scale: 1.08, duration: 120 }),
      );
      container.on('pointerout', () =>
        this.tweens.add({ targets: container, scale: 1, duration: 120 }),
      );

      // Drop each plank in with a slight stagger, so the deck fills up.
      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 320,
        delay: index * 70,
        ease: 'Back.easeOut',
      });

      this.planks.push(entry);
    });
  }

  protected clearQuestion(): void {
    for (const plank of this.planks) {
      this.tweens.killTweensOf(plank.container);
      plank.container.destroy();
    }
    this.planks = [];
  }

  private onPlankTapped(plank: AnswerPlank): void {
    if (!this.acceptingInput) return;

    const wasCorrect = this.submitAnswer(plank.value, plank.container);
    if (!wasCorrect) return;

    // The captain cheers, and the winning plank flies up off the deck.
    this.tweens.add({
      targets: this.captain,
      y: this.captain.y - 40,
      duration: 200,
      yoyo: true,
      repeat: 1,
      ease: 'Quad.easeOut',
    });

    plank.container.disableInteractive();
    this.tweens.add({
      targets: plank.container,
      y: plank.container.y - 130,
      scale: 1.35,
      alpha: 0,
      angle: 12,
      duration: 480,
      ease: 'Cubic.easeOut',
    });
  }
}
