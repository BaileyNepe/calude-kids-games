/**
 * Shared UI building blocks.
 *
 * Everything a scene needs to put chunky, tappable, child-friendly widgets
 * on screen: buttons, the coin HUD, the question banner, and the little
 * celebration effects that make a correct answer feel good.
 */

import Phaser from 'phaser';
import { FONT, MIN_TAP_SIZE, TEXT_RESOLUTION } from './config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from './art/doodle';
import { drawFraction } from './art/fractions';
import type { Question } from './mathEngine';
import { sfx } from './audio';

/** Options for a doodle button. */
export interface ButtonOptions {
  /** Fill colour of the button body. */
  colour?: number;
  /** Text colour. */
  textColour?: string;
  /** Font size in px. */
  fontSize?: number;
  /** Button width. Defaults to fitting the label. */
  width?: number;
  /** Button height. */
  height?: number;
  /**
   * Optional doodle icon texture key shown before the label (see
   * `art/faces.ts`). Deliberately a drawn icon rather than a system emoji,
   * which would render in the OS style and clash with the crayon art.
   */
  iconTexture?: string;
}

/**
 * A chunky hand-drawn button.
 *
 * Built as a Container so callers can position, tween and destroy it as one
 * unit. Includes press feedback (squash), hover lift on desktop, and a tap
 * sound — all the things that make a button feel responsive to a child.
 */
export class DoodleButton extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private isEnabled = true;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    text: string,
    onClick: () => void,
    options: ButtonOptions = {},
  ) {
    super(scene, x, y);

    const fontSize = options.fontSize ?? 34;
    const hasIcon = options.iconTexture !== undefined;
    const iconSize = fontSize * 1.25;
    // Estimate a width that comfortably fits the label if none was given.
    const width =
      options.width ??
      Math.max(MIN_TAP_SIZE * 2, text.length * fontSize * 0.62 + 56 + (hasIcon ? iconSize + 12 : 0));
    const height = options.height ?? Math.max(MIN_TAP_SIZE, fontSize * 2.1);
    const colour = options.colour ?? PALETTE.sun;

    this.background = scene.add.graphics();
    const rng = makeRng(seedFrom(`button-${text}-${width}`));
    doodleShape(
      this.background,
      doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3),
      colour,
      { offset: 3, lineWidth: 6 },
    );

    // With an icon, the label shifts right to make room and the pair is
    // centred as a unit.
    const labelWidth = text.length * fontSize * 0.58;
    const groupWidth = hasIcon ? iconSize + 12 + labelWidth : labelWidth;
    const labelX = hasIcon ? -groupWidth / 2 + iconSize + 12 + labelWidth / 2 : 0;

    this.label = scene.add
      .text(labelX, 0, text, {
        fontFamily: FONT,
        fontSize: `${fontSize}px`,
        color: options.textColour ?? '#2f2b3a',
        fontStyle: 'bold',
        align: 'center',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5);

    this.add([this.background, this.label]);

    if (options.iconTexture !== undefined) {
      const icon = scene.add
        .image(-groupWidth / 2 + iconSize / 2, 0, options.iconTexture)
        .setDisplaySize(iconSize, iconSize);
      this.add(icon);
    }
    // A slightly oversized hit area — easier for small fingers than the
    // exact visual bounds.
    //
    // Deliberately no setSize(): calling it on a Container shifts the origin
    // Phaser uses for hit-area coordinates by half the size, leaving most of
    // the visible button dead to the touch.
    this.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16),
      Phaser.Geom.Rectangle.Contains,
    );

    this.on('pointerover', () => {
      if (this.isEnabled) this.scene.tweens.add({ targets: this, scale: 1.06, duration: 120 });
    });
    this.on('pointerout', () => {
      if (this.isEnabled) this.scene.tweens.add({ targets: this, scale: 1, duration: 120 });
    });
    this.on('pointerdown', () => {
      if (!this.isEnabled) return;
      sfx.tap();
      // Squash on press, spring back on release — reads as physical.
      this.scene.tweens.add({
        targets: this,
        scale: 0.93,
        duration: 80,
        yoyo: true,
        onComplete: () => onClick(),
      });
    });

    scene.add.existing(this);
  }

  /** Greys the button out and stops it responding. */
  setEnabled(enabled: boolean): this {
    this.isEnabled = enabled;
    this.setAlpha(enabled ? 1 : 0.5);
    return this;
  }

  /** Changes the label text. */
  setLabel(text: string): this {
    this.label.setText(text);
    return this;
  }
}

/**
 * The round "back to the world" button, top-left on every mini-game.
 * Always in the same place so it becomes muscle memory.
 */
export function createBackButton(scene: Phaser.Scene, onClick: () => void): DoodleButton {
  return new DoodleButton(scene, 100, 62, 'Back', onClick, {
    colour: PALETTE.white,
    fontSize: 28,
    width: 172,
    height: MIN_TAP_SIZE,
    iconTexture: 'icon-back',
  });
}

/**
 * A coin counter that keeps itself in sync with the game state.
 *
 * Returns a container plus an `update` function; scenes call `update` after
 * awarding coins, and the number tweens rather than jumping, which makes
 * earning feel like something happened.
 */
export class CoinDisplay extends Phaser.GameObjects.Container {
  private readonly label: Phaser.GameObjects.Text;
  private displayed = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, initial: number) {
    super(scene, x, y);
    this.displayed = initial;

    const icon = scene.add.image(0, 0, 'coin').setScale(0.85);
    this.label = scene.add
      .text(34, 0, `${initial}`, {
        fontFamily: FONT,
        fontSize: '38px',
        color: '#2f2b3a',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0.5);

    this.add([icon, this.label]);
    scene.add.existing(this);
  }

  /** Counts the display up (or down) to the new total. */
  setValue(value: number): void {
    const from = this.displayed;
    this.displayed = value;
    if (from === value) return;

    // Tween a plain object and write the rounded value into the label, so
    // the number visibly ticks upward.
    const counter = { n: from };
    this.scene.tweens.add({
      targets: counter,
      n: value,
      duration: 420,
      ease: 'Cubic.easeOut',
      onUpdate: () => this.label.setText(`${Math.round(counter.n)}`),
      onComplete: () => this.label.setText(`${value}`),
    });
    // A quick pulse draws the eye to the change.
    this.scene.tweens.add({ targets: this, scale: 1.18, duration: 160, yoyo: true });
  }
}

/**
 * The big question banner used by all three mini-games.
 * Large, high-contrast, and centred at the top where kids look first.
 */
export class QuestionBanner extends Phaser.GameObjects.Container {
  private readonly text: Phaser.GameObjects.Text;
  /** The card behind a fraction picture, when the question is a fraction. */
  private visual: Phaser.GameObjects.Graphics | null = null;
  /** The fraction picture itself. */
  private visualPicture: Phaser.GameObjects.Graphics | null = null;

  /** Kept so the text can be shrunk to fit the card it sits on. */
  private readonly bannerWidth: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width = 620) {
    super(scene, x, y);
    this.bannerWidth = width;

    const height = 128;
    const bg = scene.add.graphics();
    const rng = makeRng(seedFrom('question-banner'));
    doodleShape(bg, doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3), PALETTE.white, {
      offset: 4,
      lineWidth: 6,
    });

    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: FONT,
        fontSize: '68px',
        color: '#2f2b3a',
        fontStyle: 'bold',
        resolution: TEXT_RESOLUTION,
      })
      .setOrigin(0.5);

    this.add([bg, this.text]);
    scene.add.existing(this);
  }

  /**
   * Shows a new question with a small pop, so the child notices it changed.
   *
   * Written questions get "= ?" appended here, keeping the maths engine
   * presentation-free — except the ones that aren't equations, like place
   * value, where the prompt is the number being asked *about*. Fraction
   * questions instead show a shaded picture below the banner and ask how
   * much is shaded.
   */
  setQuestion(question: Question): void {
    this.clearVisual();

    if (question.visual !== undefined) {
      this.text.setText(question.instruction);
      this.text.setFontSize(44);

      // The picture sits on its own white card, drawn above the game pieces.
      // Without the card the shape gets lost behind drifting balloons.
      const isCircle = question.visual.shape === 'circle';
      const cardW = isCircle ? 260 : 330;
      const cardH = isCircle ? 250 : 190;
      const cardY = this.y + 190;

      const card = this.scene.add.graphics().setDepth(500);
      const cardRng = makeRng(seedFrom('fraction-card'));
      doodleShape(
        card,
        doodleRectPoints(cardRng, this.x - cardW / 2, cardY - cardH / 2, cardW, cardH, 3),
        PALETTE.white,
        { offset: 3, lineWidth: 5 },
      );

      const picture = drawFraction(this.scene, this.x, cardY, question.visual, isCircle ? 170 : 120);
      picture.setDepth(501);

      // Kept together so both are cleared with the question.
      this.visual = card;
      this.visualPicture = picture;
    } else {
      this.text.setFontSize(68);
      this.text.setText(question.isEquation ? `${question.prompt} = ?` : question.prompt);

      // "835215 + 156345 = ?" is wider than the card at full size, and ran
      // off the end of it. Text width scales with the font size, so one
      // pass lands it inside. Floored so it never becomes unreadable.
      const maxWidth = this.bannerWidth - 48;
      if (this.text.width > maxWidth) {
        this.text.setFontSize(Math.max(34, Math.floor((68 * maxWidth) / this.text.width)));
      }
    }

    this.scene.tweens.add({
      targets: this,
      scale: { from: 0.86, to: 1 },
      duration: 280,
      ease: 'Back.easeOut',
    });
  }

  /** True when the current question is shown as a picture. */
  get hasVisual(): boolean {
    return this.visual !== null;
  }

  /** Removes any fraction picture. Called before each new question. */
  clearVisual(): void {
    this.visual?.destroy();
    this.visualPicture?.destroy();
    this.visual = null;
    this.visualPicture = null;
  }

  override destroy(fromScene?: boolean): void {
    this.clearVisual();
    super.destroy(fromScene);
  }
}

/**
 * Bursts a spray of stars at a point. The standard "you got it!" flourish.
 */
export function celebrate(scene: Phaser.Scene, x: number, y: number, count = 14): void {
  const colours = ['gold', 'pink', 'teal'];
  for (let i = 0; i < count; i++) {
    const key = `star-${colours[i % colours.length]!}`;
    const star = scene.add.image(x, y, key).setScale(Phaser.Math.FloatBetween(0.4, 0.9)).setDepth(900);

    const angle = (i / count) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
    const distance = Phaser.Math.FloatBetween(110, 240);

    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      scale: 0,
      angle: Phaser.Math.Between(-260, 260),
      duration: Phaser.Math.Between(560, 900),
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

/**
 * The one and only wrong-answer animation in the game.
 *
 * A soft head-shake wobble — no red flash, no shake-of-shame, no buzzer.
 * Centralised deliberately: three mini-games written at different times
 * would otherwise each invent their own "wrong" feedback and the
 * low-pressure promise would quietly erode.
 */
export function gentleWobble(
  scene: Phaser.Scene,
  target: Phaser.GameObjects.Components.Transform,
  onDone?: () => void,
): void {
  const startAngle = (target as unknown as { angle: number }).angle ?? 0;
  scene.tweens.add({
    targets: target,
    angle: { from: startAngle - 7, to: startAngle + 7 },
    duration: 90,
    yoyo: true,
    repeat: 2,
    ease: 'Sine.easeInOut',
    onComplete: () => {
      (target as unknown as { angle: number }).angle = startAngle;
      onDone?.();
    },
  });
}

/**
 * Floats a short encouraging message upward from a point, then fades.
 * Used for both praise and the soft "try again" nudge.
 */
export function floatingText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  message: string,
  colour = '#2f2b3a',
): void {
  const text = scene.add
    .text(x, y, message, {
      fontFamily: FONT,
      fontSize: '46px',
      color: colour,
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 8,
    })
    .setOrigin(0.5)
    .setDepth(950);

  scene.tweens.add({
    targets: text,
    y: y - 110,
    alpha: 0,
    scale: { from: 0.7, to: 1.25 },
    duration: 1000,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** Cheerful things to say on a correct answer. Picked at random. */
export const PRAISE = [
  'Great!',
  'Nice one!',
  'Yes!',
  'Brilliant!',
  'Well done!',
  'Superstar!',
  'You got it!',
  'Clever!',
] as const;

/** Soft nudges for a wrong answer — never negative, always inviting. */
export const ENCOURAGEMENT = [
  'Try again!',
  'Nearly!',
  'Have another go!',
  'So close!',
  'Keep going!',
] as const;

/** Picks a random entry from a readonly list. */
export function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}
