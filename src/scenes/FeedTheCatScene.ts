/**
 * Feed the Cat.
 *
 * A cat thinks of a sum. Numbered fish are laid out below; the child drags
 * the one showing the answer into the cat's mouth. The right fish gets
 * eaten with a purr; the wrong one makes the cat turn its nose up and the
 * fish swims gently back to where it came from.
 *
 * This is the game that shows off the collection: the cat doing the eating
 * is whichever cat the player has most recently collected.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE } from '../shared/art/doodle';
import type { Question } from '../shared/mathEngine';
import { gameState } from '../shared/gameState';
import { CAT_CATALOG, getCat } from '../shared/pets';
import { PIECE_COLOURS } from './BootScene';
import { FISH_LABEL_OFFSET, ensureCatFaces } from '../shared/art/sprites';
import { sfx } from '../shared/audio';

/** One draggable fish. */
interface Fish {
  container: Phaser.GameObjects.Container;
  value: number;
  /** Where it lives when not being dragged. */
  homeX: number;
  homeY: number;
}

export class FeedTheCatScene extends MiniGameScene {
  private fishes: Fish[] = [];
  private cat!: Phaser.GameObjects.Image;
  /** Which cat is starring in this round. */
  private catId = 'ginger';
  /** The fish currently held, so a lost pointer can still be cleaned up. */
  private draggedFish: Fish | null = null;

  /** Where the cat's mouth is, and how close counts as a feed. */
  private static readonly MOUTH = { x: DESIGN_WIDTH / 2, y: 356 };
  private static readonly MOUTH_RADIUS = 150;

  /** Resting positions for the fish, laid out along the bottom. */
  private static readonly SLOTS: readonly { x: number; y: number }[] = [
    { x: 220, y: 640 },
    { x: 500, y: 690 },
    { x: 790, y: 690 },
    { x: 1065, y: 640 },
  ];

  constructor() {
    super(SCENES.feedTheCat, 'feedTheCat');
    this.optionCount = 4;
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0xffe9c9);

    // A cosy room: wall, then a floor band.
    const floor = this.add.graphics().setDepth(-10);
    floor.fillStyle(0xe8c9a0, 1);
    floor.fillRect(0, 520, DESIGN_WIDTH, DESIGN_HEIGHT - 520);
    // A darker skirting line where the wall meets the floor.
    floor.fillStyle(0xd9b088, 1);
    floor.fillRect(0, 520, DESIGN_WIDTH, 14);

    // A rug for the cat to sit on, tucked under it rather than behind the
    // caption — the two used to overlap into an unreadable blob.
    const rug = this.add.graphics().setDepth(-9);
    rug.fillStyle(PALETTE.teal, 0.5);
    rug.fillEllipse(DESIGN_WIDTH / 2, 474, 560, 104);

    // Star the player's most recently collected cat, falling back to the
    // first catalog entry for a brand-new player.
    const owned = gameState.pets;
    const latest = owned.length > 0 ? owned[owned.length - 1]! : CAT_CATALOG[0]!.id;
    this.catId = getCat(latest) !== undefined ? latest : CAT_CATALOG[0]!.id;

    // The reacting faces are baked on demand — only the starring cat needs
    // them, and baking all 52 cats' expressions at boot would be wasteful.
    const look = getCat(this.catId)?.look;
    if (look !== undefined) ensureCatFaces(this, this.catId, look);

    this.cat = this.add
      .image(FeedTheCatScene.MOUTH.x, FeedTheCatScene.MOUTH.y - 30, `cat-${this.catId}-idle`)
      .setScale(1.25)
      .setDepth(5);

    // A slow breathing motion so the cat looks alive while thinking.
    this.tweens.add({
      targets: this.cat,
      scaleY: 1.29,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const cat = getCat(this.catId);
    this.add
      .text(DESIGN_WIDTH / 2, 556, `${cat?.name ?? 'Kitty'} is hungry!`, textStyle(30, '#6b4a25'))
      .setOrigin(0.5)
      .setDepth(6);

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 26, 'Drag the fish with the right answer to the cat', textStyle(25, '#6b4a25'))
      .setOrigin(0.5)
      .setDepth(6);

    this.setupDragHandlers();
  }

  /**
   * Wires the scene-level drag events once.
   *
   * Phaser routes all dragging through the scene's input plugin, so the
   * handlers live here rather than on each fish.
   */
  private setupDragHandlers(): void {
    // Children's taps always drift a pixel or two. Without a threshold a
    // simple tap registers as a tiny drag and the fish twitches out from
    // under the finger.
    this.input.dragDistanceThreshold = 8;

    // Safety net: if a finger leaves the canvas mid-drag, Phaser may never
    // fire DRAG_END and the fish would stay glued to the pointer, making
    // the round unplayable. Catch the stray release and send it home.
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      const stuck = this.draggedFish;
      if (stuck === null) return;
      this.draggedFish = null;
      this.sendFishHome(stuck);
    });

    this.input.on(
      Phaser.Input.Events.DRAG_START,
      (_pointer: Phaser.Input.Pointer, target: Phaser.GameObjects.GameObject) => {
        const fish = this.fishes.find((f) => f.container === target);
        if (fish === undefined || !this.acceptingInput) return;
        this.draggedFish = fish;
        sfx.whoosh();
        // Lift it above everything else, including the cat.
        fish.container.setDepth(50);
        this.tweens.add({ targets: fish.container, scale: 1.16, duration: 140 });
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG,
      (
        _pointer: Phaser.Input.Pointer,
        target: Phaser.GameObjects.GameObject,
        dragX: number,
        dragY: number,
      ) => {
        const container = target as Phaser.GameObjects.Container;
        container.x = dragX;
        container.y = dragY;
      },
    );

    this.input.on(
      Phaser.Input.Events.DRAG_END,
      (_pointer: Phaser.Input.Pointer, target: Phaser.GameObjects.GameObject) => {
        const fish = this.fishes.find((f) => f.container === target);
        if (fish === undefined) return;
        this.draggedFish = null;
        this.resolveDrop(fish);
      },
    );
  }

  protected presentQuestion(question: Question): void {
    // The cat opens its mouth, waiting to be fed.
    this.cat.setTexture(`cat-${this.catId}-open`);

    question.options.forEach((value, index) => {
      const slot = FeedTheCatScene.SLOTS[index % FeedTheCatScene.SLOTS.length]!;
      const colour = PIECE_COLOURS[(index + 2) % PIECE_COLOURS.length]!;

      const image = this.add.image(0, 0, `fish-${colour.name}`).setScale(0.85);
      // Sits on the fish's pale badge, clear of the eye and mouth, so a
      // dark digit is always on a light background.
      const text = this.labelFor(question, index);
      const label = this.add
        .text(
          FISH_LABEL_OFFSET.x * 0.85,
          FISH_LABEL_OFFSET.y * 0.85,
          text,
          // Longer labels ("12", "3/4") step down so they stay on the badge.
          textStyle(text.length > 2 ? 30 : text.length > 1 ? 38 : 46, '#2f2b3a', {
            fontStyle: 'bold',
          }),
        )
        .setOrigin(0.5);

      const container = this.add.container(slot.x, slot.y, [image, label]).setDepth(10);
      // A forgiving hit area — dragging is harder than tapping. No
      // setSize(): it would offset the hit area on a Container (see
      // BalloonPopScene for the full explanation).
      container.setInteractive(
        new Phaser.Geom.Rectangle(-105, -70, 210, 140),
        Phaser.Geom.Rectangle.Contains,
      );
      this.input.setDraggable(container);

      const fish: Fish = { container, value, homeX: slot.x, homeY: slot.y };

      // Swim in from the side.
      container.setAlpha(0);
      container.x = slot.x - 120;
      this.tweens.add({
        targets: container,
        x: slot.x,
        alpha: 1,
        duration: 420,
        delay: index * 90,
        ease: 'Cubic.easeOut',
      });

      // A gentle idle bob, so the fish look alive on the floor.
      this.tweens.add({
        targets: image,
        angle: { from: -4, to: 4 },
        duration: 1400 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.fishes.push(fish);
    });
  }

  protected clearQuestion(): void {
    for (const fish of this.fishes) {
      this.tweens.killTweensOf(fish.container);
      fish.container.destroy();
    }
    this.fishes = [];
    this.draggedFish = null;
  }

  /** Decides what happens when a fish is let go. */
  private resolveDrop(fish: Fish): void {
    const distance = Phaser.Math.Distance.Between(
      fish.container.x,
      fish.container.y,
      FeedTheCatScene.MOUTH.x,
      FeedTheCatScene.MOUTH.y,
    );

    // Distance to the mouth rather than a strict drop zone: far more
    // forgiving of imprecise aim, which is the point at this age.
    if (distance > FeedTheCatScene.MOUTH_RADIUS) {
      this.sendFishHome(fish);
      return;
    }

    if (!this.acceptingInput) {
      this.sendFishHome(fish);
      return;
    }

    const wasCorrect = this.submitAnswer(fish.value, fish.container);
    if (wasCorrect) {
      this.eatFish(fish);
    } else {
      this.refuseFish(fish);
    }
  }

  /** Slides a fish back to its resting spot. */
  private sendFishHome(fish: Fish): void {
    fish.container.setDepth(10);
    this.tweens.add({
      targets: fish.container,
      x: fish.homeX,
      y: fish.homeY,
      scale: 1,
      duration: 380,
      ease: 'Back.easeOut',
    });
  }

  /** The cat happily eats the correct fish. */
  private eatFish(fish: Fish): void {
    fish.container.disableInteractive();
    this.cat.setTexture(`cat-${this.catId}-happy`);
    sfx.purr();

    // The fish shrinks into the cat's mouth.
    this.tweens.add({
      targets: fish.container,
      x: FeedTheCatScene.MOUTH.x,
      y: FeedTheCatScene.MOUTH.y,
      scale: 0,
      angle: 180,
      duration: 340,
      ease: 'Cubic.easeIn',
    });

    // A contented wiggle.
    this.tweens.add({
      targets: this.cat,
      scaleX: 1.34,
      scaleY: 1.18,
      duration: 190,
      yoyo: true,
      repeat: 1,
      delay: 300,
      ease: 'Quad.easeOut',
    });
  }

  /**
   * The cat turns its nose up at the wrong fish.
   * The fish swims back and can be tried again — no penalty, no scolding.
   */
  private refuseFish(fish: Fish): void {
    this.cat.setTexture(`cat-${this.catId}-noseUp`);

    // A little turn-away, then back to waiting.
    this.tweens.add({
      targets: this.cat,
      angle: -8,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.cat.setAngle(0);
        if (this.acceptingInput) this.cat.setTexture(`cat-${this.catId}-open`);
      },
    });

    this.sendFishHome(fish);
  }
}
