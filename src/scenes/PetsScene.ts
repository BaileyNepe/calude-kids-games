/**
 * The pet collection.
 *
 * A grid of every collectible cat. Ones the player owns are shown in full
 * colour with their name; ones they haven't found yet appear as
 * silhouettes with a question mark, so the child can see what's still out
 * there to win.
 */

import Phaser from 'phaser';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import { gameState } from '../shared/gameState';
import {
  LEVELS,
  RARITY_STYLE,
  catsForLevel,
  collectionProgress,
  type Cat,
} from '../shared/pets';
import { CoinDisplay, createBackButton, fitText } from '../shared/ui';
import { ensureCatFaces, makeCatSilhouette, makeCatTexture } from '../shared/art/sprites';
import { sfx } from '../shared/audio';

export class PetsScene extends Phaser.Scene {
  /** Which level's cats are on screen. Persists across the tab restart. */
  private viewLevel = 1;

  constructor() {
    super(SCENES.pets);
  }

  create(): void {
    this.cameras.main.fadeIn(260);
    // Open on the level being played, unless a tab was picked.
    if (this.viewLevel > gameState.level) this.viewLevel = gameState.level;
    this.cameras.main.setBackgroundColor(0xf3e8ff);

    createBackButton(this, () => this.returnToWorld());
    new CoinDisplay(this, DESIGN_WIDTH - 150, 62, gameState.coins);

    const { have, total } = collectionProgress(gameState.pets);
    this.add
      .text(CENTRE_X, 46, 'My Cats', textStyle(46, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.add
      .text(CENTRE_X, 92, `${have} of ${total} found`, textStyle(24, '#5b5470'))
      .setOrigin(0.5);

    this.buildLevelTabs();
    this.buildGrid();
  }

  /**
   * One tab per level, up to the highest unlocked.
   *
   * With 152 cats a single grid would be unreadable, and hiding future
   * levels entirely would remove the sense of what's still to come — so
   * unlocked levels are browsable and locked ones show as a padlock.
   * Fifteen tabs no longer fit in one line, so they wrap into two rows.
   */
  private buildLevelTabs(): void {
    const width = 142;
    const gap = 10;
    const perRow = 8;

    LEVELS.forEach((level, index) => {
      const row = Math.floor(index / perRow);
      const column = index % perRow;
      const inThisRow = row === 0 ? Math.min(perRow, LEVELS.length) : LEVELS.length - perRow;
      const rowWidth = inThisRow * width + (inThisRow - 1) * gap;
      const startX = CENTRE_X - rowWidth / 2 + width / 2;
      const x = startX + column * (width + gap);
      const y = 138 + row * 58;

      const unlocked = level.number <= gameState.level;
      const active = level.number === this.viewLevel;

      const container = this.add.container(x, y);
      const bg = this.add.graphics();
      doodleShape(
        bg,
        doodleRectPoints(makeRng(seedFrom(`pets-tab-${level.number}`)), -width / 2, -25, width, 50, 3),
        active ? level.colour : unlocked ? PALETTE.white : 0xd6cde4,
        { offset: 2, lineWidth: active ? 5 : 3 },
      );
      container.add(bg);
      const label = this.add
        .text(0, 0, unlocked ? level.name : 'Locked', textStyle(18, unlocked ? '#2f2b3a' : '#8a7fa3', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      // "Crystal Caves" and friends must fit a narrower tab than before.
      fitText(label, width - 16, 18, 12);
      container.add(label);

      // Locked levels are visible but not browsable.
      if (!unlocked) return;

      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -25, width, 50),
        Phaser.Geom.Rectangle.Contains,
      );
      container.on('pointerdown', () => {
        if (this.viewLevel === level.number) return;
        sfx.tap();
        this.viewLevel = level.number;
        this.scene.restart();
      });
    });
  }

  /** Lays the current level's cats out in a grid. */
  private buildGrid(): void {
    const cats = catsForLevel(this.viewLevel);
    const columns = 6;
    const cellWidth = 196;
    const cellHeight = 250;
    const startX = CENTRE_X - ((columns - 1) * cellWidth) / 2;
    const startY = 372;

    cats.forEach((cat, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      this.buildCard(cat, startX + column * cellWidth, startY + row * cellHeight, index);
    });
  }

  /** One cat's card, locked or unlocked. */
  private buildCard(cat: Cat, x: number, y: number, index: number): void {
    const owned = gameState.hasPet(cat.id);
    const style = RARITY_STYLE[cat.rarity];
    const width = 176;
    const height = 232;

    const container = this.add.container(x, y);

    // Card background — rarity-coloured when owned, muted when not.
    const bg = this.add.graphics();
    const rng = makeRng(seedFrom(`pet-card-${cat.id}`));
    doodleShape(
      bg,
      doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3),
      owned ? style.colour : 0xd6cde4,
      { offset: 3, lineWidth: 5 },
    );
    container.add(bg);

    // The cat, or its silhouette — baked on first sight, since nothing
    // bakes the 152-cat catalog up front any more.
    const texture = owned
      ? makeCatTexture(this, cat.id, cat.look, 'idle')
      : makeCatSilhouette(this, cat.id, cat.look);
    const image = this.add.image(0, -34, texture).setScale(0.66);
    if (!owned) image.setAlpha(0.45);
    container.add(image);

    if (owned) {
      // Kept clear of the card's bottom edge — these used to spill over it.
      container.add(
        this.add.text(0, 66, cat.name, textStyle(25, '#2f2b3a', { fontStyle: 'bold' })).setOrigin(0.5),
      );
      container.add(
        this.add.text(0, 94, style.label, textStyle(17, style.textColour)).setOrigin(0.5),
      );
      // Owned cats are tappable, showing their little description.
      // No setSize(): it would offset the hit area on a Container (see
      // BalloonPopScene for the full explanation).
      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
        Phaser.Geom.Rectangle.Contains,
      );
      container.on('pointerdown', () => {
        sfx.purr();
        this.showDetail(cat);
      });
      container.on('pointerover', () =>
        this.tweens.add({ targets: container, scale: 1.05, duration: 130 }),
      );
      container.on('pointerout', () =>
        this.tweens.add({ targets: container, scale: 1, duration: 130 }),
      );
    } else {
      container.add(this.add.text(0, 66, '???', textStyle(28, '#8a7fa3', { fontStyle: 'bold' })).setOrigin(0.5));
      container.add(
        this.add.text(0, 96, 'Keep playing!', textStyle(16, '#8a7fa3')).setOrigin(0.5),
      );
    }

    // Stagger the cards in, so the collection feels like it's being dealt.
    container.setScale(0);
    this.tweens.add({
      targets: container,
      scale: 1,
      duration: 300,
      delay: index * 45,
      ease: 'Back.easeOut',
    });
  }

  /** A tap-to-dismiss close-up of one collected cat. */
  private showDetail(cat: Cat): void {
    const style = RARITY_STYLE[cat.rarity];
    const layer = this.add.container(0, 0).setDepth(1200);

    const backdrop = this.add
      .rectangle(CENTRE_X, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 0x2f2b3a, 0.6)
      .setInteractive();
    backdrop.on('pointerdown', () => layer.destroy());
    layer.add(backdrop);

    const panel = this.add.graphics();
    const rng = makeRng(seedFrom('pet-detail'));
    doodleShape(
      panel,
      doodleRectPoints(rng, CENTRE_X - 280, DESIGN_HEIGHT / 2 - 250, 560, 500, 4),
      PALETTE.paper,
      { offset: 4, lineWidth: 6 },
    );
    layer.add(panel);

    const cy = DESIGN_HEIGHT / 2;
    // The happy face is baked on demand rather than at boot.
    ensureCatFaces(this, cat.id, cat.look);
    layer.add(this.add.image(CENTRE_X, cy - 70, `cat-${cat.id}-happy`).setScale(1.1));
    layer.add(
      this.add.text(CENTRE_X, cy + 90, cat.name, textStyle(46, '#2f2b3a', { fontStyle: 'bold' })).setOrigin(0.5),
    );
    layer.add(
      this.add.text(CENTRE_X, cy + 136, style.label, textStyle(24, style.textColour)).setOrigin(0.5),
    );
    layer.add(
      this.add
        .text(CENTRE_X, cy + 190, cat.description, textStyle(24, '#5b5470', {
          align: 'center',
          wordWrap: { width: 460 },
        }))
        .setOrigin(0.5),
    );
    layer.add(
      this.add.text(CENTRE_X, cy + 232, 'tap to close', textStyle(18, '#8a7fa3')).setOrigin(0.5),
    );
  }

  private returnToWorld(): void {
    sfx.whoosh();
    this.cameras.main.fadeOut(240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.world);
    });
  }
}
