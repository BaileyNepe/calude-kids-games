/**
 * The maths settings screen.
 *
 * Lets the player choose what to practise — adding, taking away, times,
 * sharing, fractions, decimals, percentages, powers and place value — and
 * how hard it should be. Written for a child to operate alone: big toggles,
 * plain words, and a visible tick rather than a checkbox.
 */

import Phaser from 'phaser';
import { CENTRE_X, DESIGN_HEIGHT, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints, doodleStroke } from '../shared/art/doodle';
import { ALL_OPERATIONS, OPERATION_INFO, type DifficultyMode, type Operation } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { DoodleButton, createBackButton } from '../shared/ui';
import { sfx } from '../shared/audio';

/**
 * The difficulty choices, in the order they're shown.
 *
 * The blurbs quote real numbers rather than vague comparatives: a parent
 * setting this up should be able to tell what their child is about to be
 * asked without playing a round to find out.
 */
const MODES: readonly { mode: DifficultyMode; label: string; blurb: string; colour: number }[] = [
  { mode: 'easy', label: 'Easy', blurb: 'Up to 20', colour: PALETTE.green },
  { mode: 'medium', label: 'Medium', blurb: '3 and 4 digits', colour: PALETTE.sun },
  { mode: 'hard', label: 'Hard', blurb: 'Up to 6 digits', colour: PALETTE.orange },
  { mode: 'adaptive', label: 'Just right', blurb: 'Gets harder as you go', colour: PALETTE.purple },
];

/**
 * Operation tile geometry.
 *
 * Nine operations no longer fit across one row at a tappable size, so they
 * wrap onto two. Everything below is driven off these constants — the tile
 * background, the hit area and the tick all have to agree, and they used to
 * be three separate sets of magic numbers.
 */
const OP_TILE = { width: 170, height: 132, gap: 14, perRow: 5, firstRowY: 206, rowGap: 142 };

export class SettingsScene extends Phaser.Scene {
  /** Redrawn whenever a toggle changes. */
  private operationTiles: Map<Operation, Phaser.GameObjects.Container> = new Map();
  private modeTiles: Map<DifficultyMode, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super(SCENES.settings);
  }

  create(): void {
    this.cameras.main.fadeIn(260);
    this.cameras.main.setBackgroundColor(0xe8f6ff);
    this.operationTiles = new Map();
    this.modeTiles = new Map();

    createBackButton(this, () => this.returnToWorld());

    this.add
      .text(CENTRE_X, 54, 'Maths Choices', textStyle(50, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);

    this.add
      .text(CENTRE_X, 118, 'What shall we practise?', textStyle(30, '#2f2b3a'))
      .setOrigin(0.5);
    this.buildOperationTiles();

    this.add.text(CENTRE_X, 452, 'How hard?', textStyle(30, '#2f2b3a')).setOrigin(0.5);
    this.buildModeTiles();

    // Both sets of tiles are painted by refresh(), so it has to run after
    // both exist. Calling it from inside buildOperationTiles() meant the
    // difficulty tiles were drawn with no background at all until the first
    // tap — the player could not see which difficulty was already chosen.
    this.refresh();

    new DoodleButton(this, CENTRE_X, DESIGN_HEIGHT - 74, 'Done', () => this.returnToWorld(), {
      colour: PALETTE.green,
      fontSize: 34,
      width: 260,
    });
  }

  /** Two rows of toggles, one per operation. */
  private buildOperationTiles(): void {
    const { width, height, gap, perRow, firstRowY, rowGap } = OP_TILE;

    ALL_OPERATIONS.forEach((operation, index) => {
      const row = Math.floor(index / perRow);
      const column = index % perRow;
      // The last row is usually short, so it is centred on its own count
      // rather than left-aligned under a full row above it.
      const inRow = Math.min(perRow, ALL_OPERATIONS.length - row * perRow);
      const rowWidth = inRow * width + (inRow - 1) * gap;
      const x = CENTRE_X - rowWidth / 2 + width / 2 + column * (width + gap);
      const tile = this.add.container(x, firstRowY + row * rowGap);

      const bg = this.add.graphics();
      tile.add(bg);

      // "100s" needs to be smaller than "+" to sit in the same box.
      const glyph = OPERATION_INFO[operation].symbol;
      const symbol = this.add
        .text(0, -26, glyph, textStyle(glyph.length > 2 ? 30 : 42, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      const label = this.add
        .text(0, 34, OPERATION_INFO[operation].label, textStyle(19, '#2f2b3a'))
        .setOrigin(0.5);
      // The tick appears when this operation is switched on.
      const tick = this.add.graphics();
      tile.add([symbol, label, tick]);

      tile.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
        Phaser.Geom.Rectangle.Contains,
      );
      tile.on('pointerdown', () => {
        sfx.tap();
        gameState.toggleOperation(operation);
        this.refresh();
        this.tweens.add({ targets: tile, scale: 0.94, duration: 90, yoyo: true });
      });

      this.operationTiles.set(operation, tile);
    });
  }

  /** A row of difficulty choices. */
  private buildModeTiles(): void {
    const width = 250;
    const gap = 20;
    const total = MODES.length * width + (MODES.length - 1) * gap;
    const startX = CENTRE_X - total / 2 + width / 2;

    MODES.forEach((entry, index) => {
      const x = startX + index * (width + gap);
      const tile = this.add.container(x, 560);

      const bg = this.add.graphics();
      tile.add(bg);
      tile.add(
        this.add
          .text(0, -30, entry.label, textStyle(34, '#2f2b3a', { fontStyle: 'bold' }))
          .setOrigin(0.5),
      );
      tile.add(this.add.text(0, 20, entry.blurb, textStyle(20, '#3d3752')).setOrigin(0.5));

      tile.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -76, width, 152),
        Phaser.Geom.Rectangle.Contains,
      );
      tile.on('pointerdown', () => {
        sfx.tap();
        gameState.setDifficultyMode(entry.mode);
        this.refresh();
        this.tweens.add({ targets: tile, scale: 0.94, duration: 90, yoyo: true });
      });

      this.modeTiles.set(entry.mode, tile);
    });
  }

  /**
   * Repaints every tile to match the saved settings.
   *
   * Selected tiles are filled and carry a tick; unselected ones are pale.
   * The difference is deliberately obvious — a child should be able to see
   * at a glance what's switched on.
   */
  private refresh(): void {
    const settings = gameState.math;

    for (const [operation, tile] of this.operationTiles) {
      const on = settings.operations.includes(operation);
      const bg = tile.getAt(0) as Phaser.GameObjects.Graphics;
      const tick = tile.getAt(3) as Phaser.GameObjects.Graphics | undefined;
      const rng = makeRng(seedFrom(`op-tile-${operation}`));
      const { width, height } = OP_TILE;

      bg.clear();
      doodleShape(
        bg,
        doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3),
        on ? PALETTE.sun : 0xdfe6ee,
        { offset: 3, lineWidth: on ? 6 : 4 },
      );

      if (tick !== undefined) {
        tick.clear();
        if (on) {
          // A hand-drawn tick in the top-right corner. Not the bottom: that
          // is where the operation's name sits, and the tick was landing on
          // top of it ("Taking aw✓").
          const tickRng = makeRng(seedFrom(`tick-${operation}`));
          const x = width / 2 - 40;
          const y = -height / 2 + 30;
          doodleStroke(tick, tickRng, { x, y }, { x: x + 10, y: y + 10 }, PALETTE.green, 7);
          doodleStroke(tick, tickRng, { x: x + 10, y: y + 10 }, { x: x + 28, y: y - 16 }, PALETTE.green, 7);
        }
      }
    }

    for (const [mode, tile] of this.modeTiles) {
      const on = settings.mode === mode;
      const entry = MODES.find((m) => m.mode === mode)!;
      const bg = tile.getAt(0) as Phaser.GameObjects.Graphics;
      const rng = makeRng(seedFrom(`mode-tile-${mode}`));
      bg.clear();
      doodleShape(bg, doodleRectPoints(rng, -125, -76, 250, 152, 3), on ? entry.colour : 0xdfe6ee, {
        offset: 3,
        lineWidth: on ? 6 : 4,
      });
    }
  }

  private returnToWorld(): void {
    sfx.whoosh();
    this.cameras.main.fadeOut(240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.world);
    });
  }
}
