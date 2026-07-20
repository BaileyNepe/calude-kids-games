/**
 * Character select.
 *
 * Shown once, the first time the game is opened, and reachable again from
 * the shop. Picking who you are before you start is a small thing that
 * makes the world feel like yours.
 */

import Phaser from 'phaser';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import { gameState } from '../shared/gameState';
import { DoodleButton } from '../shared/ui';
import { sfx } from '../shared/audio';
import { KID_LOOKS } from './BootScene';

/** Space between character tiles. */
const TILE_GAP = 20;

/** The widest the row of tiles may be, leaving a margin either side. */
const ROW_MAX_WIDTH = DESIGN_WIDTH - 80;

export class CharacterSelectScene extends Phaser.Scene {
  private selected: string = KID_LOOKS[0]!.name;
  private tiles: Map<string, Phaser.GameObjects.Container> = new Map();

  constructor() {
    super(SCENES.characterSelect);
  }

  create(): void {
    this.cameras.main.fadeIn(260);
    this.cameras.main.setBackgroundColor(PALETTE.sky);
    this.tiles = new Map();
    this.selected = gameState.character ?? KID_LOOKS[0]!.name;

    this.add
      .text(CENTRE_X, 64, 'Who are you?', textStyle(56, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    this.add
      .text(CENTRE_X, 130, 'Pick your character', textStyle(28, '#2f2b3a'))
      .setOrigin(0.5)
      .setAlpha(0.85);

    // Grass, so it reads as the same world they're about to walk into.
    const ground = this.add.graphics().setDepth(-8);
    ground.fillStyle(PALETTE.grass, 1);
    ground.fillRect(0, 560, this.scale.width, DESIGN_HEIGHT - 560);

    this.buildTiles();

    new DoodleButton(this, CENTRE_X, DESIGN_HEIGHT - 72, "That's me!", () => this.confirm(), {
      colour: PALETTE.green,
      fontSize: 36,
      width: 320,
    });

    this.refresh();
  }

  private buildTiles(): void {
    const { width, height } = this.tileSize();
    const gap = TILE_GAP;
    const total = KID_LOOKS.length * width + (KID_LOOKS.length - 1) * gap;
    const startX = CENTRE_X - total / 2 + width / 2;

    // The sprite is 230px wide before scaling; keep a little air either side
    // of it however narrow the tiles have had to become.
    const scale = Math.min(0.62, (width - 18) / 230);

    KID_LOOKS.forEach((kid, index) => {
      const x = startX + index * (width + gap);
      const tile = this.add.container(x, 400);

      const bg = this.add.graphics();
      tile.add(bg);
      tile.add(this.add.image(0, 10, `kid-${kid.name}`).setScale(scale));

      // No setSize(): on a Container it offsets the hit area by half the size.
      tile.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
        Phaser.Geom.Rectangle.Contains,
      );
      tile.on('pointerdown', () => {
        sfx.tap();
        this.selected = kid.name;
        this.refresh();
        this.tweens.add({ targets: tile, scale: 0.95, duration: 100, yoyo: true });
      });

      this.tiles.set(kid.name, tile);
    });
  }

  /**
   * How big each tile can be.
   *
   * Fixed at 216 wide until there are too many characters to fit across the
   * screen, then shared out evenly — adding a character should never push
   * one off the edge.
   */
  private tileSize(): { width: number; height: number } {
    const count = KID_LOOKS.length;
    const available = (ROW_MAX_WIDTH - TILE_GAP * (count - 1)) / count;
    return { width: Math.min(216, available), height: 380 };
  }

  /** Highlights the chosen character. */
  private refresh(): void {
    const { width, height } = this.tileSize();

    for (const [name, tile] of this.tiles) {
      const chosen = name === this.selected;
      const bg = tile.getAt(0) as Phaser.GameObjects.Graphics;
      const rng = makeRng(seedFrom(`character-tile-${name}`));
      bg.clear();
      doodleShape(
        bg,
        doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3),
        chosen ? PALETTE.sun : PALETTE.white,
        { offset: 3, lineWidth: chosen ? 7 : 4 },
      );
      tile.setScale(chosen ? 1.04 : 1);
    }
  }

  private confirm(): void {
    gameState.setCharacter(this.selected);
    sfx.whoosh();
    this.cameras.main.fadeOut(240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.world);
    });
  }
}
