/**
 * The shop.
 *
 * Coins earned from maths buy hats and outfits for the player and collars
 * for their cats. Items you already own show a "Wear" button instead of a
 * price, and whatever is currently worn is marked.
 *
 * A live preview of the character stands beside the shelves so the child
 * can see what they're buying before they spend.
 */

import Phaser from 'phaser';
import { CENTRE_X, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import { gameState } from '../shared/gameState';
import { SHOP_TABS, itemsForSlot, type ItemSlot, type WardrobeItem } from '../shared/wardrobe';
import { CoinDisplay, createBackButton, floatingText } from '../shared/ui';
import { sfx } from '../shared/audio';
import { CAT_CATALOG, getCat } from '../shared/pets';
import { HAT_OFFSET_Y, COLLAR_OFFSET_Y } from '../shared/art/wardrobe';

export class ShopScene extends Phaser.Scene {
  private tab: ItemSlot = 'hat';
  private coinDisplay!: CoinDisplay;
  /** Everything belonging to the current tab, cleared when tabs change. */
  private shelfObjects: Phaser.GameObjects.GameObject[] = [];
  private tabButtons: Map<ItemSlot, Phaser.GameObjects.Container> = new Map();

  /** The live preview on the left. */
  private previewKid!: Phaser.GameObjects.Image;
  private previewHat: Phaser.GameObjects.Image | null = null;
  private previewCat!: Phaser.GameObjects.Image;
  private previewCollar: Phaser.GameObjects.Image | null = null;

  constructor() {
    super(SCENES.shop);
  }

  create(): void {
    this.cameras.main.fadeIn(260);
    this.cameras.main.setBackgroundColor(0xfff2e0);
    this.shelfObjects = [];
    this.tabButtons = new Map();
    this.tab = 'hat';

    createBackButton(this, () => this.returnToWorld());
    this.coinDisplay = new CoinDisplay(this, DESIGN_WIDTH - 150, 62, gameState.coins);

    this.add
      .text(CENTRE_X, 54, 'Shop', textStyle(50, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);

    this.buildPreview();
    this.buildTabs();
    this.buildShelf();
  }

  /** The character and cat standing at the left, wearing current choices. */
  private buildPreview(): void {
    const panel = this.add.graphics();
    const rng = makeRng(seedFrom('shop-preview'));
    doodleShape(panel, doodleRectPoints(rng, 40, 150, 330, 560, 4), PALETTE.white, {
      offset: 4,
      lineWidth: 6,
    });

    this.add.text(205, 186, 'You', textStyle(30, '#2f2b3a', { fontStyle: 'bold' })).setOrigin(0.5);

    const character = gameState.character ?? 'girl';
    this.previewKid = this.add.image(205, 400, `kid-${character}`).setScale(0.62);

    // A cat below, so collars can be previewed too.
    const firstCat = gameState.pets[0] ?? CAT_CATALOG[0]!.id;
    const catId = getCat(firstCat) !== undefined ? firstCat : CAT_CATALOG[0]!.id;
    this.previewCat = this.add.image(205, 620, `cat-${catId}-idle`).setScale(0.5);

    this.refreshPreview();
  }

  /** Redraws the worn hat and collar on the preview. */
  private refreshPreview(): void {
    this.previewHat?.destroy();
    this.previewHat = null;
    this.previewCollar?.destroy();
    this.previewCollar = null;

    const hat = gameState.wearing.hat;
    if (hat !== null) {
      this.previewHat = this.add
        .image(
          this.previewKid.x,
          this.previewKid.y + this.previewKid.displayHeight * HAT_OFFSET_Y,
          `item-${hat}`,
        )
        .setScale(0.62);
    }

    const collar = gameState.catWearing.collar;
    if (collar !== null) {
      this.previewCollar = this.add
        .image(
          this.previewCat.x,
          this.previewCat.y + this.previewCat.displayHeight * COLLAR_OFFSET_Y,
          `item-${collar}`,
        )
        .setScale(0.5);
    }
  }

  /** The row of category tabs. */
  private buildTabs(): void {
    const width = 220;
    const gap = 16;
    const startX = 470 + width / 2;

    SHOP_TABS.forEach((tab, index) => {
      const x = startX + index * (width + gap);
      // Sits above the shelf; the cards used to be drawn over the tabs.
      const container = this.add.container(x, 136);
      const bg = this.add.graphics();
      container.add(bg);
      container.add(
        this.add
          .text(0, 0, tab.label, textStyle(26, '#2f2b3a', { fontStyle: 'bold' }))
          .setOrigin(0.5),
      );

      container.setInteractive(
        new Phaser.Geom.Rectangle(-width / 2, -34, width, 68),
        Phaser.Geom.Rectangle.Contains,
      );
      container.on('pointerdown', () => {
        if (this.tab === tab.slot) return;
        sfx.tap();
        this.tab = tab.slot;
        this.buildShelf();
        this.refreshTabs();
      });

      this.tabButtons.set(tab.slot, container);
    });

    this.refreshTabs();
  }

  private refreshTabs(): void {
    for (const [slot, container] of this.tabButtons) {
      const active = slot === this.tab;
      const bg = container.getAt(0) as Phaser.GameObjects.Graphics;
      const rng = makeRng(seedFrom(`shop-tab-${slot}`));
      bg.clear();
      doodleShape(bg, doodleRectPoints(rng, -110, -34, 220, 68, 3), active ? PALETTE.sun : 0xe4dccb, {
        offset: 2,
        lineWidth: active ? 5 : 3,
      });
    }
  }

  /** Lays out the items for the current tab. */
  private buildShelf(): void {
    for (const object of this.shelfObjects) object.destroy();
    this.shelfObjects = [];

    const items = itemsForSlot(this.tab);
    const columns = 3;
    const cardWidth = 250;
    const cardHeight = 240;
    const gapX = 20;
    const gapY = 18;
    const startX = 470 + cardWidth / 2;
    const startY = 306;

    items.forEach((item, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      this.buildCard(
        item,
        startX + column * (cardWidth + gapX),
        startY + row * (cardHeight + gapY),
        cardWidth,
        cardHeight,
      );
    });
  }

  /** One item card: picture, name, and a price or wear button. */
  private buildCard(
    item: WardrobeItem,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    const owned = gameState.ownsItem(item.id);
    const worn =
      item.slot === 'collar'
        ? gameState.catWearing.collar === item.id
        : gameState.wearing[item.slot] === item.id;

    const container = this.add.container(x, y);
    const bg = this.add.graphics();
    const rng = makeRng(seedFrom(`shop-card-${item.id}`));
    doodleShape(
      bg,
      doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3),
      worn ? PALETTE.green : owned ? PALETTE.white : 0xf7ead6,
      { offset: 3, lineWidth: worn ? 6 : 4 },
    );
    container.add(bg);

    // Outfits have no standalone texture, so they show as a colour swatch.
    if (item.slot === 'outfit') {
      const swatch = this.add.graphics();
      doodleShape(swatch, doodleRectPoints(rng, -44, -86, 88, 76, 3), item.colour, {
        offset: 2,
        lineWidth: 4,
      });
      doodleShape(swatch, doodleRectPoints(rng, -44, -14, 88, 34, 3), item.accent ?? item.colour, {
        offset: 2,
        lineWidth: 4,
      });
      container.add(swatch);
    } else {
      container.add(this.add.image(0, -46, `item-${item.id}`).setScale(0.62));
    }

    container.add(
      this.add.text(0, 40, item.name, textStyle(24, '#2f2b3a', { fontStyle: 'bold' })).setOrigin(0.5),
    );
    container.add(
      this.add.text(0, 68, item.blurb, textStyle(16, '#5b5470', { align: 'center', wordWrap: { width: width - 32 } })).setOrigin(0.5),
    );

    // Bottom row: price, "Wear", or "Worn".
    const label = worn ? 'Worn' : owned ? 'Wear' : `${item.price} coins`;
    const canAfford = owned || gameState.coins >= item.price;
    const action = this.add
      .text(0, 100, label, textStyle(24, canAfford ? '#2f2b3a' : '#a09aae', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    container.add(action);

    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    container.on('pointerdown', () => this.onCardTapped(item));
    container.on('pointerover', () =>
      this.tweens.add({ targets: container, scale: 1.04, duration: 120 }),
    );
    container.on('pointerout', () =>
      this.tweens.add({ targets: container, scale: 1, duration: 120 }),
    );

    this.shelfObjects.push(container);
  }

  /** Buys the item if it isn't owned, otherwise wears (or removes) it. */
  private onCardTapped(item: WardrobeItem): void {
    if (!gameState.ownsItem(item.id)) {
      const bought = gameState.buyItem(item.id, item.price);
      if (!bought) {
        // Can't afford it. Say so plainly rather than doing nothing.
        sfx.wrong();
        floatingText(this, CENTRE_X + 200, 200, 'Not enough coins yet!', '#b5522f');
        return;
      }
      sfx.reward();
      this.coinDisplay.setValue(gameState.coins);
      floatingText(this, CENTRE_X + 200, 200, 'Bought!', '#2e7d32');
    } else {
      sfx.tap();
    }

    // Wearing something already worn takes it off again.
    if (item.slot === 'collar') {
      const already = gameState.catWearing.collar === item.id;
      gameState.wearCatItem(already ? null : item.id);
    } else {
      const already = gameState.wearing[item.slot] === item.id;
      gameState.wear(item.slot, already ? null : item.id);
    }

    this.buildShelf();
    this.refreshPreview();
  }

  private returnToWorld(): void {
    sfx.whoosh();
    this.cameras.main.fadeOut(240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(SCENES.world);
    });
  }
}
