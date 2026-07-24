/**
 * Treasure Dive.
 *
 * Underwater: numbered bubbles rise from a treasure chest on the sea
 * floor, and the child pops the one with the right answer. Bubbles that
 * reach the surface drift back down as fresh ones — like Balloon Pop's
 * wrap, nothing is ever lost — while little fish cruise past for company.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, challengeFor, textStyle } from '../shared/config';
import type { Question } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { placeHiddenGem } from '../shared/hiddenGem';
import { sfx } from '../shared/audio';
import { celebrate, fitText } from '../shared/ui';

/** One rising bubble. */
interface Bubble {
  container: Phaser.GameObjects.Container;
  value: number;
  /** Upward speed in pixels per second. */
  speed: number;
  /** Sway phase so the column of bubbles doesn't march in step. */
  phase: number;
  baseX: number;
  popped: boolean;
}

export class TreasureDiveScene extends MiniGameScene {
  private bubbles: Bubble[] = [];
  private decorFish: Phaser.GameObjects.Image[] = [];

  /** The band bubbles rise through, clear of banner and chest. */
  private static readonly TOP_LIMIT = 150;
  private static readonly BOTTOM_START = DESIGN_HEIGHT - 120;

  constructor() {
    super(SCENES.treasureDive, 'treasureDive');
    this.optionCount = 5;
    // Unlocks mid-game, so it pays a little over the early games.
    this.coinsPerCorrect = 6;
    this.catChanceBonus = 0.05;
  }

  protected buildBackground(): void {
    // Deep-water gradient, drawn as horizontal bands like the rocket sky.
    const sea = this.add.graphics().setDepth(-20);
    const mix = (from: number, to: number, t: number): number => {
      const fr = (from >> 16) & 0xff, fg = (from >> 8) & 0xff, fb = from & 0xff;
      const tr = (to >> 16) & 0xff, tg = (to >> 8) & 0xff, tb = to & 0xff;
      return (
        (Math.round(fr + (tr - fr) * t) << 16) |
        (Math.round(fg + (tg - fg) * t) << 8) |
        Math.round(fb + (tb - fb) * t)
      );
    };
    const bands = 20;
    for (let i = 0; i < bands; i++) {
      sea.fillStyle(mix(0x4fb0d9, 0x1d4f7a, i / (bands - 1)), 1);
      sea.fillRect(0, (DESIGN_HEIGHT / bands) * i, DESIGN_WIDTH, DESIGN_HEIGHT / bands + 2);
    }

    // Seaweed swaying up from the floor.
    for (let i = 0; i < 6; i++) {
      const x = 90 + i * 220;
      const weed = this.add.graphics().setDepth(-9);
      weed.lineStyle(9, 0x2f8a5f, 0.9);
      weed.beginPath();
      weed.moveTo(x, DESIGN_HEIGHT);
      for (let s = 1; s <= 4; s++) {
        weed.lineTo(x + (s % 2 === 0 ? -14 : 14), DESIGN_HEIGHT - s * 36);
      }
      weed.strokePath();
      this.tweens.add({
        targets: weed,
        angle: { from: -2, to: 2 },
        duration: 2200 + i * 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Sand, and the chest the bubbles rise from.
    const sand = this.add.graphics().setDepth(-8);
    sand.fillStyle(0xd9c488, 1);
    sand.fillEllipse(DESIGN_WIDTH / 2, DESIGN_HEIGHT + 30, DESIGN_WIDTH * 1.3, 180);
    const chest = this.add
      .image(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 70, 'treasure-chest')
      .setScale(0.9)
      .setDepth(-7);
    this.tweens.add({
      targets: chest,
      y: chest.y - 6,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // A couple of decorative fish cruising across.
    for (const [index, spec] of [
      { y: 260, scale: 0.34, colour: 'orange', duration: 17000 },
      { y: 520, scale: 0.28, colour: 'pink', duration: 22000 },
    ].entries()) {
      const fish = this.add
        .image(-140, spec.y, `fish-${spec.colour}`)
        .setScale(spec.scale)
        .setDepth(-6)
        .setAlpha(0.85);
      this.tweens.add({
        targets: fish,
        x: DESIGN_WIDTH + 140,
        duration: spec.duration,
        delay: index * 4000,
        repeat: -1,
      });
      this.decorFish.push(fish);
    }

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22, 'Pop the bubble with the right answer!', textStyle(25, '#dff4ff'))
      .setOrigin(0.5)
      .setDepth(30);

    // A secret gem spilled from the chest, half-buried in the sand.
    placeHiddenGem(this, 'gem-dive-sand', 812, 752, { scale: 0.45, depth: -6 });
  }

  protected presentQuestion(question: Question): void {
    const columnWidth = DESIGN_WIDTH / question.options.length;
    const pace = challengeFor(gameState.level);
    const band = TreasureDiveScene.BOTTOM_START - TreasureDiveScene.TOP_LIMIT;

    question.options.forEach((value, index) => {
      const x = columnWidth * index + columnWidth / 2;
      const y = TreasureDiveScene.BOTTOM_START - (index * band) / question.options.length;

      const image = this.add.image(0, 0, 'bubble').setScale(0.95);
      const label = this.add
        .text(0, 0, this.labelFor(question, index), textStyle(48, '#1d4f7a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 118, 48);

      const container = this.add.container(x, y, [image, label]).setDepth(10);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-84, -84, 168, 168),
        Phaser.Geom.Rectangle.Contains,
      );

      const bubble: Bubble = {
        container,
        value,
        speed: Phaser.Math.Between(22, 34) * pace,
        phase: Math.random() * Math.PI * 2,
        baseX: x,
        popped: false,
      };
      container.on('pointerdown', () => this.onBubbleTapped(bubble));

      this.bubbles.push(bubble);
    });
  }

  protected clearQuestion(): void {
    for (const bubble of this.bubbles) {
      this.tweens.killTweensOf(bubble.container);
      bubble.container.destroy();
    }
    this.bubbles = [];
  }

  private onBubbleTapped(bubble: Bubble): void {
    if (!this.acceptingInput || bubble.popped) return;

    const wasCorrect = this.submitAnswer(bubble.value, bubble.container);
    if (!wasCorrect) return;

    // Pop: the bubble bursts into a spray of droplets.
    bubble.popped = true;
    bubble.container.disableInteractive();
    sfx.pop();
    celebrate(this, bubble.container.x, bubble.container.y, 10);
    this.tweens.add({
      targets: bubble.container,
      scale: 1.5,
      alpha: 0,
      duration: 240,
      ease: 'Quad.easeOut',
    });
  }

  /** Bubbles rise and sway; at the surface they restart from the floor. */
  override update(time: number, delta: number): void {
    const step = delta / 1000;
    for (const bubble of this.bubbles) {
      bubble.container.y -= bubble.speed * step;
      bubble.container.x = bubble.baseX + Math.sin(time / 900 + bubble.phase) * 24;
      if (bubble.container.y < TreasureDiveScene.TOP_LIMIT) {
        bubble.container.y = TreasureDiveScene.BOTTOM_START;
      }
    }
  }
}
