/**
 * Build a Number.
 *
 * Rather than picking a finished answer, the child physically constructs
 * it: drag digit blocks into the slots to spell out the result. Working
 * digit by digit is exactly how place value is taught, so a two-digit
 * answer becomes "four tens and seven ones" rather than a shape to
 * recognise.
 *
 * Blocks can be pulled back out of a slot, so nothing is ever a dead end.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import { NON_INTEGER_OPERATIONS, type MathSettings, type Question } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { sfx } from '../shared/audio';
import { floatingText } from '../shared/ui';

/** One draggable digit block. */
interface Block {
  container: Phaser.GameObjects.Container;
  digit: number;
  homeX: number;
  homeY: number;
  /** Index of the slot it currently occupies, or null when in the tray. */
  slot: number | null;
}

/** A place the child can drop a digit. */
interface Slot {
  x: number;
  y: number;
  block: Block | null;
}

export class BuildNumberScene extends MiniGameScene {
  private blocks: Block[] = [];
  private slots: Slot[] = [];
  private slotGraphics: Phaser.GameObjects.Image[] = [];
  private dragged: Block | null = null;
  private checkButton: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(SCENES.buildNumber, 'buildNumber');
    // The tray offers more digits than are needed, so there's a real choice.
    this.optionCount = 4;
  }

  /**
   * Whole-number questions only.
   *
   * The answer is spelled out one digit per slot, so a fraction or a decimal
   * has no representation here — "0.5" would become three blocks, one of
   * them a full stop, and `Number('.')` is NaN. If the player has only
   * picked non-integer operations, adding stands in for this game alone.
   */
  protected override mathSettings(): MathSettings {
    const settings = gameState.math;
    const operations = settings.operations.filter((op) => !NON_INTEGER_OPERATIONS.includes(op));
    return { ...settings, operations: operations.length > 0 ? operations : ['add'] };
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0xfdf3e0);

    // A workbench along the bottom for the tray of digits.
    const bench = this.add.graphics().setDepth(-10);
    bench.fillStyle(0xe0c9a6, 1);
    bench.fillRect(0, 560, DESIGN_WIDTH, DESIGN_HEIGHT - 560);
    bench.fillStyle(0xc9ac82, 1);
    bench.fillRect(0, 560, DESIGN_WIDTH, 14);

    this.add
      .text(CENTRE_X, DESIGN_HEIGHT - 26, 'Drag the digits to build the answer', textStyle(25, '#6b4a25'))
      .setOrigin(0.5)
      .setDepth(10);

    this.setupDrag();
  }

  private setupDrag(): void {
    this.input.dragDistanceThreshold = 8;

    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (_p: Phaser.Input.Pointer, target: Phaser.GameObjects.GameObject) => {
        const block = this.blocks.find((b) => b.container === target);
        if (block === undefined || !this.acceptingInput) return;
        this.dragged = block;
        sfx.whoosh();
        block.container.setDepth(200);
        this.tweens.add({ targets: block.container, scale: 1.12, duration: 120 });
        // Pulling a block out frees its slot again.
        if (block.slot !== null) {
          this.slots[block.slot]!.block = null;
          block.slot = null;
        }
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG,
      (
        _p: Phaser.Input.Pointer,
        target: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number,
      ) => {
        const c = target as Phaser.GameObjects.Container;
        c.x = dragX;
        c.y = dragY;
      },
    );

    const drop = (_p: Phaser.Input.Pointer, target: Phaser.GameObjects.GameObject): void => {
      const block = this.blocks.find((b) => b.container === target);
      if (block === undefined) return;
      this.dragged = null;
      this.resolveDrop(block);
    };
    this.input.on(Phaser.Input.Events.DRAG_END, drop);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      const stuck = this.dragged;
      if (stuck === null) return;
      this.dragged = null;
      this.sendHome(stuck);
    });
  }

  /** Snaps a dropped block into the nearest free slot, or sends it home. */
  private resolveDrop(block: Block): void {
    let best: { index: number; distance: number } | null = null;
    this.slots.forEach((slot, index) => {
      if (slot.block !== null) return;
      const distance = Phaser.Math.Distance.Between(
        block.container.x,
        block.container.y,
        slot.x,
        slot.y,
      );
      if (best === null || distance < best.distance) best = { index, distance };
    });

    // Distance rather than a strict drop zone: far more forgiving of
    // imprecise aim, which matters a lot at this age.
    if (best !== null && (best as { index: number; distance: number }).distance < 110) {
      const chosen = best as { index: number; distance: number };
      const slot = this.slots[chosen.index]!;
      slot.block = block;
      block.slot = chosen.index;
      sfx.tap();
      this.tweens.add({
        targets: block.container,
        x: slot.x,
        y: slot.y,
        scale: 1,
        duration: 220,
        ease: 'Back.easeOut',
      });
    } else {
      this.sendHome(block);
    }
    this.refreshCheckButton();
  }

  private sendHome(block: Block): void {
    block.container.setDepth(100);
    this.tweens.add({
      targets: block.container,
      x: block.homeX,
      y: block.homeY,
      scale: 1,
      duration: 320,
      ease: 'Back.easeOut',
    });
    this.refreshCheckButton();
  }

  protected presentQuestion(question: Question): void {
    // Fractions have no digit form, so this game always asks for the
    // numeric answer's digits.
    const answerText = `${question.answer}`;
    const digits = answerText.split('').map(Number);

    // One slot per digit of the answer, centred on screen.
    const slotSize = 130;
    const slotGap = 22;
    const totalWidth = digits.length * slotSize + (digits.length - 1) * slotGap;
    const startX = CENTRE_X - totalWidth / 2 + slotSize / 2;

    this.slots = digits.map((_, index) => ({
      x: startX + index * (slotSize + slotGap),
      y: 380,
      block: null,
    }));

    this.slotGraphics = this.slots.map((slot) =>
      this.add.image(slot.x, slot.y, 'block-slot').setScale(0.9).setDepth(5),
    );

    // The tray holds every digit of the answer plus a few decoys, shuffled.
    // The cap keeps the tray on screen; at 8 blocks it is 1084px wide of the
    // 1280 available, which still leaves a six-digit answer two decoys.
    const tray = [...digits];
    while (tray.length < Math.min(8, digits.length + 3)) {
      const decoy = Phaser.Math.Between(0, 9);
      // Allow duplicates only if the answer genuinely contains them.
      const needed = digits.filter((d) => d === decoy).length;
      const present = tray.filter((d) => d === decoy).length;
      if (present >= needed + 1) continue;
      tray.push(decoy);
    }
    Phaser.Utils.Array.Shuffle(tray);

    const trayGap = 20;
    const trayWidth = tray.length * 118 + (tray.length - 1) * trayGap;
    const trayStart = CENTRE_X - trayWidth / 2 + 59;

    tray.forEach((digit, index) => {
      const x = trayStart + index * (118 + trayGap);
      const y = 660;

      const image = this.add.image(0, 0, 'block-blank').setScale(0.86);
      const label = this.add
        .text(0, 0, `${digit}`, textStyle(58, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      const container = this.add.container(x, y, [image, label]).setDepth(100);

      // No setSize(): it would offset the hit area on a Container.
      container.setInteractive(
        new Phaser.Geom.Rectangle(-66, -66, 132, 132),
        Phaser.Geom.Rectangle.Contains,
      );
      this.input.setDraggable(container);

      this.blocks.push({ container, digit, homeX: x, homeY: y, slot: null });
    });

    this.refreshCheckButton();
  }

  protected clearQuestion(): void {
    for (const block of this.blocks) {
      this.tweens.killTweensOf(block.container);
      block.container.destroy();
    }
    for (const image of this.slotGraphics) image.destroy();
    this.checkButton?.destroy();
    this.checkButton = null;
    this.blocks = [];
    this.slots = [];
    this.slotGraphics = [];
    this.dragged = null;
  }

  /**
   * Shows a "Check it!" button once every slot is filled.
   *
   * Deliberately not auto-checking: the child should get to look at what
   * they built and commit to it, rather than being judged mid-drag.
   */
  private refreshCheckButton(): void {
    const complete = this.slots.length > 0 && this.slots.every((s) => s.block !== null);

    if (!complete) {
      this.checkButton?.destroy();
      this.checkButton = null;
      return;
    }
    if (this.checkButton !== null) return;

    const container = this.add.container(CENTRE_X, 500).setDepth(150);
    const bg = this.add.graphics();
    const rng = makeRng(seedFrom('check-button'));
    doodleShape(bg, doodleRectPoints(rng, -130, -44, 260, 88, 3), PALETTE.green, {
      offset: 3,
      lineWidth: 6,
    });
    const label = this.add
      .text(0, 0, 'Check it!', textStyle(34, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    container.add([bg, label]);

    container.setInteractive(
      new Phaser.Geom.Rectangle(-130, -44, 260, 88),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => {
      sfx.tap();
      this.checkAnswer();
    });

    container.setScale(0);
    this.tweens.add({ targets: container, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.checkButton = container;
  }

  /** Reads the digits out of the slots and submits the number they spell. */
  private checkAnswer(): void {
    if (!this.acceptingInput) return;
    const built = Number(this.slots.map((s) => s.block?.digit ?? 0).join(''));

    // The base class handles celebration, coins and the gentle wobble.
    const target = this.slots[0]?.block?.container ?? this.checkButton!;
    const wasCorrect = this.submitAnswer(built, target as Phaser.GameObjects.Container);

    if (wasCorrect) {
      this.checkButton?.destroy();
      this.checkButton = null;
      for (const slot of this.slots) {
        if (slot.block === null) continue;
        this.tweens.add({
          targets: slot.block.container,
          y: slot.block.container.y - 40,
          scale: 1.15,
          alpha: 0,
          duration: 420,
          ease: 'Cubic.easeOut',
        });
      }
    } else {
      // Show what they built, so the mistake is legible rather than mysterious.
      floatingText(this, CENTRE_X, 300, `You built ${built}`, '#5b5470');
      // Pop the blocks back to the tray so they can try again immediately.
      for (const slot of this.slots) {
        const block = slot.block;
        if (block === null) continue;
        slot.block = null;
        block.slot = null;
        this.sendHome(block);
      }
    }
  }
}
