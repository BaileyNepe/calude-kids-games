/**
 * The World hub.
 *
 * Home base: a row of portal cards into the mini-games, a button through to
 * the pet collection, a settings button, wandering kids for company, and an
 * emote bar. The player walks their avatar around the grass, with every cat
 * they've collected trailing behind them.
 *
 * Everything here is single-player. The wanderers are decorative and run on
 * a local timer — there is no networking in v1.
 */

import Phaser from 'phaser';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, FONT, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from '../shared/art/doodle';
import { gameState } from '../shared/gameState';
import { getCat, getLevel, levelProgress } from '../shared/pets';
import { CoinDisplay, DoodleButton } from '../shared/ui';
import { sfx } from '../shared/audio';
import { KID_LOOKS, getKidLook } from './BootScene';
import { kidTextureWithOutfit } from '../shared/art/wardrobe';
import { Wanderer } from '../world/Wanderer';
import { EmoteBar } from '../world/EmoteBar';
import { Player, WALK_BOUNDS } from '../world/Player';
import { PetCompanion } from '../world/PetCompanion';

/** Fallback character, used only if the save somehow has none. */
const DEFAULT_KID = 'girl';

/**
 * How many cats follow the player at once. A complete collection is 52
 * cats; all of them on screen would be an unreadable stampede, so the most
 * recently collected few come along.
 */
const MAX_COMPANIONS = 6;

/** One portal card into a mini-game. */
interface PortalSpec {
  key: string;
  title: string;
  colour: number;
  /** Draws the little preview picture inside the card. */
  illustrate: (scene: Phaser.Scene, x: number, y: number) => Phaser.GameObjects.GameObject[];
}

export class WorldScene extends Phaser.Scene {
  private wanderers: Wanderer[] = [];
  private companions: PetCompanion[] = [];
  private player!: Player;
  /** Where the player was last frame, for telling the cats if they're moving. */
  private lastPlayerPos = { x: 0, y: 0 };

  constructor() {
    super(SCENES.world);
  }

  create(): void {
    this.cameras.main.fadeIn(260);
    this.wanderers = [];
    this.companions = [];

    this.buildBackground();
    this.buildPortals();
    this.buildPlayer();
    this.buildWanderers();
    this.buildHud();
    this.buildEmoteBar();
  }

  /** Sky, sun, clouds, grass and bushes. */
  private buildBackground(): void {
    this.cameras.main.setBackgroundColor(PALETTE.sky);

    this.add.image(400, 62, 'sun').setScale(0.34).setDepth(-10);
    for (const cloud of [
      { x: 620, y: 58, scale: 0.42 },
      { x: 850, y: 70, scale: 0.36 },
    ]) {
      const image = this.add.image(cloud.x, cloud.y, 'cloud').setScale(cloud.scale).setDepth(-9);
      this.tweens.add({
        targets: image,
        x: image.x + 60,
        duration: 11000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Ground.
    const ground = this.add.graphics().setDepth(-8);
    ground.fillStyle(PALETTE.grass, 1);
    ground.fillRect(0, 452, DESIGN_WIDTH, DESIGN_HEIGHT - 452);
    ground.fillStyle(0x74c25a, 1);
    ground.fillRect(0, 452, DESIGN_WIDTH, 24);

    // Bushes along the horizon.
    const rng = makeRng(seedFrom('world-bushes'));
    const bushes = this.add.graphics().setDepth(-7);
    for (let i = 0; i < 10; i++) {
      const x = 50 + i * 132 + (rng() - 0.5) * 50;
      const y = 480 + (rng() - 0.5) * 18;
      const r = 24 + rng() * 14;
      bushes.fillStyle(0x6bb551, 1);
      bushes.fillCircle(x, y, r);
      bushes.fillCircle(x + r * 0.7, y + 5, r * 0.8);
      bushes.fillCircle(x - r * 0.7, y + 5, r * 0.75);
    }
  }

  /** The mini-game cards across the top. */
  private buildPortals(): void {
    const portals: PortalSpec[] = [
      {
        key: SCENES.balloonPop,
        title: 'Balloon Pop',
        colour: PALETTE.pink,
        illustrate: (s, x, y) => [
          s.add.image(x - 26, y + 4, 'balloon-red').setScale(0.28),
          s.add.image(x + 6, y - 8, 'balloon-blue').setScale(0.32),
          s.add.image(x + 34, y + 6, 'balloon-yellow').setScale(0.26),
        ],
      },
      {
        key: SCENES.pirateShip,
        title: 'Pirate Ship',
        colour: PALETTE.teal,
        illustrate: (s, x, y) => [
          s.add.image(x, y + 6, 'pirate-ship').setScale(0.15),
          s.add.image(x + 34, y - 26, 'skull-flag').setScale(0.26),
        ],
      },
      {
        key: SCENES.feedTheCat,
        title: 'Feed the Cat',
        colour: PALETTE.orange,
        illustrate: (s, x, y) => [
          s.add.image(x - 14, y, 'cat-ginger-idle').setScale(0.3),
          s.add.image(x + 38, y + 14, 'fish-teal').setScale(0.22),
        ],
      },
      {
        key: SCENES.numberNinja,
        title: 'Number Ninja',
        colour: PALETTE.purple,
        illustrate: (s, x, y) => [
          s.add.image(x - 20, y - 6, 'star-gold').setScale(0.7),
          s.add.image(x + 18, y + 10, 'star-pink').setScale(0.55),
          s.add.image(x + 30, y - 20, 'star-teal').setScale(0.45),
        ],
      },
      {
        key: SCENES.buildNumber,
        title: 'Build a Number',
        colour: PALETTE.blue,
        illustrate: (s, x, y) => [
          s.add.image(x - 22, y + 2, 'block-blank').setScale(0.42),
          s.add.image(x + 20, y + 2, 'block-blank').setScale(0.42),
        ],
      },
      {
        key: SCENES.catCafe,
        title: 'Cat Cafe',
        colour: PALETTE.green,
        // Uses the idle pose: the reacting faces are baked on demand, so
        // they aren't guaranteed to exist when the hub is drawn.
        illustrate: (s, x, y) => [
          s.add.image(x - 12, y, 'cat-calico-idle').setScale(0.3),
          s.add.image(x + 34, y + 10, 'coin').setScale(0.6),
        ],
      },
      {
        key: SCENES.rocketLaunch,
        title: 'Rocket',
        colour: PALETTE.red,
        illustrate: (s, x, y) => [s.add.image(x, y, 'rocket').setScale(0.42)],
      },
    ];

    // Seven cards across, sized to fit the screen with even gutters.
    const gap = 12;
    const cardWidth = (DESIGN_WIDTH - 40 - gap * (portals.length - 1)) / portals.length;
    const startX = 20 + cardWidth / 2;

    portals.forEach((portal, index) => {
      this.createPortalCard(portal, startX + index * (cardWidth + gap), 268, cardWidth);
    });
  }

  /** Builds one tappable portal card. */
  private createPortalCard(portal: PortalSpec, x: number, y: number, width: number): void {
    const height = 196;
    const container = this.add.container(x, y).setDepth(5);

    const bg = this.add.graphics();
    const rng = makeRng(seedFrom(`portal-${portal.title}`));
    doodleShape(bg, doodleRectPoints(rng, -width / 2, -height / 2, width, height, 3), portal.colour, {
      offset: 4,
      lineWidth: 5,
    });
    container.add(bg);

    const inset = this.add.graphics();
    doodleShape(
      inset,
      doodleRectPoints(rng, -width / 2 + 12, -height / 2 + 44, width - 24, 96, 2.5),
      PALETTE.paper,
      { offset: 2, lineWidth: 3 },
    );
    container.add(inset);

    container.add(
      this.add
        .text(0, -height / 2 + 22, portal.title, textStyle(19, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5),
    );
    container.add(portal.illustrate(this, 0, 4));
    container.add(
      this.add.text(0, height / 2 - 22, 'Play', textStyle(20, '#3d3752')).setOrigin(0.5),
    );

    // No setSize(): on a Container it offsets the hit area by half the size.
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains,
    );

    container.on('pointerover', () =>
      this.tweens.add({ targets: container, scale: 1.05, duration: 140 }),
    );
    container.on('pointerout', () =>
      this.tweens.add({ targets: container, scale: 1, duration: 140 }),
    );
    container.on('pointerdown', () => {
      sfx.tap();
      this.tweens.add({
        targets: container,
        scale: 0.95,
        duration: 90,
        yoyo: true,
        onComplete: () => this.goTo(portal.key),
      });
    });
  }

  /** The player's avatar, plus tap-to-walk on the ground. */
  private buildPlayer(): void {
    const character = gameState.character ?? DEFAULT_KID;
    const texture = kidTextureWithOutfit(
      this,
      character,
      getKidLook(character),
      gameState.wearing.outfit,
    );
    this.player = new Player(this, texture, CENTRE_X, 548, gameState.wearing.hat);
    this.lastPlayerPos = { x: this.player.x, y: this.player.y };

    // Tapping open ground walks there. Registered on the scene rather than
    // a zone so it never swallows taps meant for the portals or emotes.
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (this.input.hitTestPointer(pointer).length > 0) return;
      if (pointer.worldY < WALK_BOUNDS.minY - 70) return;
      this.player.walkTo(pointer.worldX, pointer.worldY);
    });

    // Every cat the player has collected comes along for the walk.
    // Every cat the player has collected comes along, wearing whatever
    // collar has been bought for them. Capped so a full 52-cat collection
    // doesn't turn the hub into a stampede.
    const collar = gameState.catWearing.collar;
    gameState.pets
      .filter((id) => getCat(id) !== undefined)
      .slice(-MAX_COMPANIONS)
      .forEach((id, index) => {
        this.companions.push(
          new PetCompanion(this, id, index, CENTRE_X - 70 - index * 40, 640, collar),
        );
      });
  }

  /** The decorative crowd. */
  private buildWanderers(): void {
    const others = KID_LOOKS.filter((k) => k.name !== (gameState.character ?? DEFAULT_KID));
    for (let i = 0; i < 3; i++) {
      const kid = others[i % others.length]!;
      this.wanderers.push(
        new Wanderer(this, {
          texture: `kid-${kid.name}`,
          x: 220 + i * 380,
          y: 512 + (i % 2) * 26,
          seed: i,
        }),
      );
    }
  }

  /** Coins, the pets button, settings, and the reset control. */
  private buildHud(): void {
    new CoinDisplay(this, DESIGN_WIDTH - 150, 62, gameState.coins);

    const { have, total } = levelProgress(gameState.pets, gameState.level);
    new DoodleButton(this, 150, 62, `Pets ${have}/${total}`, () => this.goTo(SCENES.pets), {
      colour: PALETTE.purple,
      fontSize: 26,
      width: 248,
      height: 84,
      iconTexture: 'icon-cat',
    });

    new DoodleButton(this, 370, 62, 'Shop', () => this.goTo(SCENES.shop), {
      colour: PALETTE.orange,
      fontSize: 26,
      width: 172,
      height: 84,
    });

    new DoodleButton(this, 552, 62, 'Maths', () => this.goTo(SCENES.settings), {
      colour: PALETTE.teal,
      fontSize: 26,
      width: 180,
      height: 84,
      iconTexture: 'icon-settings',
    });

    this.buildLevelBadge();
    this.buildResetControl();
  }

  /** Shows which level the player is on, and how far through its cats. */
  private buildLevelBadge(): void {
    const level = getLevel(gameState.level);
    const { have, total } = levelProgress(gameState.pets, gameState.level);

    const badge = this.add.graphics().setDepth(50);
    const rng = makeRng(seedFrom('level-badge'));
    doodleShape(badge, doodleRectPoints(rng, 700, 26, 300, 72, 3), level.colour, {
      offset: 3,
      lineWidth: 5,
    });

    this.add
      .text(850, 48, `Level ${level.number} — ${level.name}`, textStyle(22, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5)
      .setDepth(51);
    this.add
      .text(850, 76, `${have} of ${total} cats found`, textStyle(18, '#3d3752'))
      .setOrigin(0.5)
      .setDepth(51);
  }

  /**
   * The reset control.
   *
   * Deliberately small, tucked in a corner, and behind a confirmation: an
   * eight-year-old will absolutely tap a big friendly "Reset" button, and
   * wiping the cat collection is the worst thing this game can do.
   */
  private buildResetControl(): void {
    const label = this.add
      .text(DESIGN_WIDTH - 18, DESIGN_HEIGHT - 14, 'reset', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#4d6b3a',
      })
      .setOrigin(1, 1)
      .setDepth(60)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.6);

    label.on('pointerdown', () => this.confirmReset());
  }

  /** Two-step confirmation before wiping the save. */
  private confirmReset(): void {
    const layer = this.add.container(0, 0).setDepth(1500);
    layer.add(
      this.add
        .rectangle(CENTRE_X, DESIGN_HEIGHT / 2, DESIGN_WIDTH, DESIGN_HEIGHT, 0x2f2b3a, 0.65)
        .setInteractive(),
    );

    const panel = this.add.graphics();
    const rng = makeRng(seedFrom('reset-panel'));
    doodleShape(panel, doodleRectPoints(rng, CENTRE_X - 300, 250, 600, 300, 4), PALETTE.paper, {
      offset: 4,
      lineWidth: 6,
    });
    layer.add(panel);

    layer.add(
      this.add
        .text(CENTRE_X, 320, 'Start over?', textStyle(46, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5),
    );
    layer.add(
      this.add
        .text(CENTRE_X, 386, 'This deletes all your cats and coins.', textStyle(26, '#5b5470'))
        .setOrigin(0.5),
    );

    layer.add(
      new DoodleButton(this, CENTRE_X - 140, 482, 'Keep them', () => layer.destroy(), {
        colour: PALETTE.green,
        fontSize: 26,
        width: 250,
      }),
    );
    layer.add(
      new DoodleButton(
        this,
        CENTRE_X + 140,
        482,
        'Yes, delete',
        () => {
          gameState.reset();
          layer.destroy();
          this.scene.restart();
        },
        { colour: PALETTE.red, fontSize: 26, width: 250 },
      ),
    );
  }

  /** The row of reaction faces along the bottom. */
  private buildEmoteBar(): void {
    new EmoteBar(this, DESIGN_HEIGHT - 70, (emote) => this.player.showEmote(emote));
  }

  /** Fades out and switches scene. */
  private goTo(key: string): void {
    this.input.enabled = false;
    sfx.whoosh();
    this.cameras.main.fadeOut(240);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start(key);
    });
  }

  override update(time: number, delta: number): void {
    this.player.update(time, delta);

    const moving =
      Math.abs(this.player.x - this.lastPlayerPos.x) > 0.4 ||
      Math.abs(this.player.y - this.lastPlayerPos.y) > 0.4;

    for (const companion of this.companions) {
      companion.update(delta, this.player.x, this.player.y, moving);
    }
    for (const wanderer of this.wanderers) wanderer.update(time, delta);

    this.lastPlayerPos = { x: this.player.x, y: this.player.y };
  }
}
