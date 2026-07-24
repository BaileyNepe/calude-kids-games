/**
 * The typed-answer number pad.
 *
 * From level 6, some questions stop offering choices: the child has to
 * *produce* the answer on this pad, which is recall rather than
 * recognition — a genuine step up. One shared pad serves every mini-game,
 * so the experience is identical everywhere.
 *
 * Tablet-first: the pad is big drawn buttons, no OS keyboard involved.
 * A physical keyboard works too (digits, backspace, enter) for laptops.
 */

import Phaser from 'phaser';
import { CENTRE_X, textStyle } from './config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from './art/doodle';
import { DoodleButton, fitText } from './ui';

/** Answers never exceed six digits (tier "Legend" caps at 999999). */
const MAX_DIGITS = 7;

export class TypeAnswerPad extends Phaser.GameObjects.Container {
  private digits = '';
  private readonly valueText: Phaser.GameObjects.Text;
  /** The blinking underscore inviting input. */
  private readonly cursor: Phaser.GameObjects.Text;
  private readonly onSubmit: (value: number) => void;
  private readonly keyHandler: (event: KeyboardEvent) => void;

  constructor(scene: Phaser.Scene, onSubmit: (value: number) => void) {
    // Anchored on the answer display, so the shared wrong-answer wobble
    // and the celebration burst both land somewhere sensible.
    super(scene, CENTRE_X, 262);
    this.onSubmit = onSubmit;

    // The answer display card.
    const card = scene.add.graphics();
    const rng = makeRng(seedFrom('type-pad-card'));
    doodleShape(card, doodleRectPoints(rng, -190, -48, 380, 96, 3), PALETTE.white, {
      offset: 3,
      lineWidth: 6,
    });
    this.add(card);

    this.valueText = scene.add
      .text(0, 0, '', textStyle(54, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.add(this.valueText);

    this.cursor = scene.add.text(0, 2, '_', textStyle(54, '#8a7fa3')).setOrigin(0.5);
    this.add(this.cursor);
    scene.tweens.add({
      targets: this.cursor,
      alpha: 0,
      duration: 450,
      yoyo: true,
      repeat: -1,
    });

    // The keys: a phone-style grid with backspace and a big green go.
    const layout: readonly (readonly string[])[] = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['←', '0', '✓'],
    ];
    layout.forEach((row, rowIndex) => {
      row.forEach((key, columnIndex) => {
        const x = (columnIndex - 1) * 152;
        const y = 118 + rowIndex * 104;
        const colour = key === '✓' ? PALETTE.green : key === '←' ? PALETTE.orange : PALETTE.paper;
        this.add(
          new DoodleButton(scene, x, y, key, () => this.onKey(key), {
            colour,
            fontSize: 40,
            width: 138,
            height: 92,
          }),
        );
      });
    });

    // Physical keyboard support, removed again in destroy().
    this.keyHandler = (event: KeyboardEvent) => {
      if (event.key >= '0' && event.key <= '9') this.onKey(event.key);
      else if (event.key === 'Backspace') this.onKey('←');
      else if (event.key === 'Enter') this.onKey('✓');
    };
    scene.input.keyboard?.on('keydown', this.keyHandler);

    this.refresh();
    scene.add.existing(this);

    // Rise in like every other question presentation.
    this.setScale(0.8).setAlpha(0);
    scene.tweens.add({
      targets: this,
      scale: 1,
      alpha: 1,
      duration: 260,
      ease: 'Back.easeOut',
    });
  }

  /** Wipes the entry — called after a wrong submit, so retries start clean. */
  clearEntry(): void {
    this.digits = '';
    this.refresh();
  }

  private onKey(key: string): void {
    if (key === '←') {
      this.digits = this.digits.slice(0, -1);
      this.refresh();
      return;
    }
    if (key === '✓') {
      if (this.digits.length === 0) return;
      this.onSubmit(Number(this.digits));
      return;
    }
    if (this.digits.length >= MAX_DIGITS) return;
    // A lone leading zero is replaced rather than extended, so "0" then
    // "7" reads 7 — but a genuine answer of 0 can still be submitted.
    this.digits = this.digits === '0' ? key : this.digits + key;
    this.refresh();
  }

  private refresh(): void {
    this.valueText.setText(this.digits);
    fitText(this.valueText, 330, 54);
    // The cursor trails the number, and rests centred while it's empty.
    this.cursor.setX(this.digits.length === 0 ? 0 : this.valueText.width / 2 + 18);
    this.cursor.setVisible(this.digits.length < MAX_DIGITS);
  }

  override destroy(fromScene?: boolean): void {
    this.scene?.input.keyboard?.off('keydown', this.keyHandler);
    super.destroy(fromScene);
  }
}
