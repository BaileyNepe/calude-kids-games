/**
 * Memory Cards.
 *
 * A different kind of thinking: the answer cards are shown face-up for a
 * few seconds, then flipped over — and only *then* does the child tap the
 * card hiding the right answer. The maths is the same, but now it has to
 * be held in the head alongside a memory of where everything went.
 *
 * The peek gets shorter as the player's level climbs.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import type { Question } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** One card on the table. */
interface Card {
  container: Phaser.GameObjects.Container;
  face: Phaser.GameObjects.Image;
  back: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  value: number;
  /** Face-up right now. */
  revealed: boolean;
  /** Mid-flip — ignore taps until it settles. */
  flipping: boolean;
}

export class MemoryMatchScene extends MiniGameScene {
  private cards: Card[] = [];
  /** True while the cards are being memorised — taps do nothing yet. */
  private peeking = false;
  private peekLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SCENES.memoryMatch, 'memoryMatch');
    this.optionCount = 6;
    // A memory game asks more of the player, so it pays more.
    this.coinsPerCorrect = 8;
    this.catChanceBonus = 0.1;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0xe8dcc9);

    // A big round table filling the play area.
    const table = this.add.graphics().setDepth(-10);
    table.fillStyle(0x8a5f3a, 1);
    table.fillEllipse(CENTRE_X, 560, 1240, 620);
    table.fillStyle(0x9c6b45, 1);
    table.fillEllipse(CENTRE_X, 550, 1160, 560);

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22, 'Remember where the numbers are!', textStyle(25, '#5a3d1a'))
      .setOrigin(0.5)
      .setDepth(30);
  }

  protected presentQuestion(question: Question): void {
    const columns = 3;
    const cellW = 240;
    const cellH = 210;
    const startX = CENTRE_X - cellW;
    const startY = 415;

    question.options.forEach((value, index) => {
      const x = startX + (index % columns) * cellW;
      const y = startY + Math.floor(index / columns) * cellH;

      const face = this.add.image(0, 0, 'memory-card-face');
      const back = this.add.image(0, 0, 'memory-card-back').setVisible(false);
      const label = this.add
        .text(0, 0, this.labelFor(question, index), textStyle(44, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 104, 44);

      const container = this.add.container(x, y, [back, face, label]).setDepth(10);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-80, -100, 160, 200),
        Phaser.Geom.Rectangle.Contains,
      );

      const card: Card = { container, face, back, label, value, revealed: true, flipping: false };
      container.on('pointerdown', () => this.onCardTapped(card));

      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 280,
        delay: index * 60,
        ease: 'Back.easeOut',
      });

      this.cards.push(card);
    });

    // The memorising phase: a few seconds face-up, then everything flips.
    // Higher levels get less time — that's this game's difficulty curve.
    this.peeking = true;
    const peekMs = Math.max(1400, 2800 - gameState.level * 90);

    this.peekLabel = this.add
      .text(CENTRE_X, 250, 'Memorise!', textStyle(36, '#8a4f1f', { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({
      targets: this.peekLabel,
      scale: { from: 0.8, to: 1.05 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.time.delayedCall(peekMs, () => {
      if (this.cards.length === 0) return;
      this.peekLabel?.destroy();
      this.peekLabel = null;
      sfx.whoosh();
      for (const card of this.cards) this.flip(card, false);
      this.peeking = false;
    });
  }

  protected clearQuestion(): void {
    for (const card of this.cards) {
      this.tweens.killTweensOf(card.container);
      card.container.destroy();
    }
    this.cards = [];
    this.peekLabel?.destroy();
    this.peekLabel = null;
    this.peeking = false;
  }

  /** Flips one card, swapping face/back at the halfway squash. */
  private flip(card: Card, showFace: boolean, onDone?: () => void): void {
    card.flipping = true;
    this.tweens.add({
      targets: card.container,
      scaleX: 0,
      duration: 150,
      ease: 'Sine.easeIn',
      onComplete: () => {
        card.face.setVisible(showFace);
        card.label.setVisible(showFace);
        card.back.setVisible(!showFace);
        card.revealed = showFace;
        this.tweens.add({
          targets: card.container,
          scaleX: 1,
          duration: 150,
          ease: 'Sine.easeOut',
          onComplete: () => {
            card.flipping = false;
            onDone?.();
          },
        });
      },
    });
  }

  private onCardTapped(card: Card): void {
    if (!this.acceptingInput || this.peeking || card.flipping || card.revealed) return;

    // Reveal what they picked, then judge it.
    this.flip(card, true, () => {
      const wasCorrect = this.submitAnswer(card.value, card.container);
      if (wasCorrect) {
        // Show the whole table so the child sees what was where.
        for (const other of this.cards) {
          if (other !== card && !other.revealed) this.flip(other, true);
        }
      } else {
        // Back down it goes after a beat — the memory challenge stands.
        this.time.delayedCall(800, () => {
          if (this.cards.includes(card) && card.revealed) this.flip(card, false);
        });
      }
    });
  }
}
