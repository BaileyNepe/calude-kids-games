/**
 * The "you won a cat!" overlay.
 *
 * Shown after every completed round. This is the payoff moment the whole
 * reward loop builds towards, so it gets a dim backdrop, a bouncing cat,
 * sparkles and a fanfare.
 */

import Phaser from 'phaser';
import { CENTRE_X, CENTRE_Y, DESIGN_WIDTH, DESIGN_HEIGHT, FONT } from './config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints } from './art/doodle';
import { RARITY_STYLE, getLevel, type RewardResult } from './pets';
import { ensureCatFaces } from './art/sprites';
import { DoodleButton, celebrate } from './ui';
import { sfx } from './audio';

/**
 * Displays the reward overlay on top of the current scene.
 *
 * @param onPlayAgain Called when the player wants another round.
 * @param onExit      Called when the player wants to return to the world.
 */
/**
 * @param newLevel Set when this reward completed a level, so the overlay
 *                 can celebrate the unlock as well as the cat.
 */
export function showRewardOverlay(
  scene: Phaser.Scene,
  result: RewardResult,
  newLevel: number | null,
  onPlayAgain: () => void,
  onExit: () => void,
): void {
  const layer = scene.add.container(0, 0).setDepth(1000);
  const style = RARITY_STYLE[result.cat.rarity];

  // Dim everything behind, and swallow taps so the game underneath can't
  // be played through the overlay.
  const backdrop = scene.add
    .rectangle(CENTRE_X, CENTRE_Y, DESIGN_WIDTH, DESIGN_HEIGHT, 0x2f2b3a, 0.62)
    .setInteractive();
  layer.add(backdrop);

  // Card.
  const cardWidth = 620;
  const cardHeight = 620;
  const card = scene.add.graphics();
  const rng = makeRng(seedFrom('reward-card'));
  doodleShape(
    card,
    doodleRectPoints(rng, CENTRE_X - cardWidth / 2, CENTRE_Y - cardHeight / 2, cardWidth, cardHeight, 4),
    PALETTE.paper,
    { offset: 5, lineWidth: 7 },
  );
  layer.add(card);

  const headline = result.isNew ? 'New cat!' : 'You found a friend!';
  const title = scene.add
    .text(CENTRE_X, CENTRE_Y - 250, headline, {
      fontFamily: FONT,
      fontSize: '54px',
      color: '#2f2b3a',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  layer.add(title);

  // Rarity ribbon.
  const ribbon = scene.add.graphics();
  doodleShape(ribbon, doodleRectPoints(rng, CENTRE_X - 110, CENTRE_Y - 208, 220, 52, 3), style.colour, {
    offset: 2,
    lineWidth: 4,
  });
  layer.add(ribbon);
  layer.add(
    scene.add
      .text(CENTRE_X, CENTRE_Y - 182, style.label.toUpperCase(), {
        fontFamily: FONT,
        fontSize: '28px',
        color: style.textColour,
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );

  // The cat itself. Its happy face is baked on demand — with 52 cats it
  // would be wasteful to bake every expression up front — so make sure it
  // exists before asking for the texture.
  ensureCatFaces(scene, result.cat.id, result.cat.look);
  const cat = scene.add.image(CENTRE_X, CENTRE_Y - 20, `cat-${result.cat.id}-happy`).setScale(0);
  layer.add(cat);

  const name = scene.add
    .text(CENTRE_X, CENTRE_Y + 128, result.cat.name, {
      fontFamily: FONT,
      fontSize: '52px',
      color: '#2f2b3a',
      fontStyle: 'bold',
    })
    .setOrigin(0.5)
    .setAlpha(0);
  layer.add(name);

  const blurb = scene.add
    .text(
      CENTRE_X,
      CENTRE_Y + 178,
      result.isNew ? result.cat.description : `Already yours — have ${result.coins} coins instead!`,
      {
        fontFamily: FONT,
        fontSize: '26px',
        color: '#5b5470',
        align: 'center',
        wordWrap: { width: 520 },
      },
    )
    .setOrigin(0.5)
    .setAlpha(0);
  layer.add(blurb);

  // Buttons start hidden and appear once the cat has landed, so a child
  // doesn't tap straight through the best bit.
  const playAgain = new DoodleButton(
    scene,
    CENTRE_X - 150,
    CENTRE_Y + 258,
    'Play again',
    () => {
      layer.destroy();
      onPlayAgain();
    },
    { colour: PALETTE.green, fontSize: 30, width: 270 },
  ).setAlpha(0);

  const exit = new DoodleButton(
    scene,
    CENTRE_X + 150,
    CENTRE_Y + 258,
    'World',
    () => {
      layer.destroy();
      onExit();
    },
    { colour: PALETTE.sun, fontSize: 30, width: 270, iconTexture: 'icon-home' },
  ).setAlpha(0);

  layer.add([playAgain, exit]);

  // Animate the reveal.
  sfx.reward();
  scene.tweens.add({
    targets: cat,
    scale: 1.15,
    angle: { from: -12, to: 0 },
    duration: 620,
    ease: 'Back.easeOut',
    onComplete: () => {
      celebrate(scene, CENTRE_X, CENTRE_Y - 20, 20);
      // A gentle idle bob so the cat feels alive while the child reads.
      scene.tweens.add({
        targets: cat,
        y: CENTRE_Y - 36,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({ targets: [name, blurb, playAgain, exit], alpha: 1, duration: 320 });

      // A completed level is a bigger deal than a single cat, so it gets
      // its own banner on top of the reward.
      if (newLevel !== null) {
        scene.time.delayedCall(700, () => announceLevelUp(scene, layer, newLevel));
      }
    },
  });
}

/**
 * The "the cat got away" overlay.
 *
 * Shown when a round is won but the level's catChance roll fails (levels 6
 * and up). The round still pays out coins, and the tone stays warm — the
 * player did nothing wrong; the cat was just shy.
 */
export function showEscapedOverlay(
  scene: Phaser.Scene,
  coins: number,
  onPlayAgain: () => void,
  onExit: () => void,
): void {
  const layer = scene.add.container(0, 0).setDepth(1000);

  const backdrop = scene.add
    .rectangle(CENTRE_X, CENTRE_Y, DESIGN_WIDTH, DESIGN_HEIGHT, 0x2f2b3a, 0.62)
    .setInteractive();
  layer.add(backdrop);

  const cardWidth = 620;
  const cardHeight = 480;
  const card = scene.add.graphics();
  const rng = makeRng(seedFrom('escaped-card'));
  doodleShape(
    card,
    doodleRectPoints(rng, CENTRE_X - cardWidth / 2, CENTRE_Y - cardHeight / 2, cardWidth, cardHeight, 4),
    PALETTE.paper,
    { offset: 5, lineWidth: 7 },
  );
  layer.add(card);

  layer.add(
    scene.add
      .text(CENTRE_X, CENTRE_Y - 160, 'So close!', {
        fontFamily: FONT,
        fontSize: '54px',
        color: '#2f2b3a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );
  layer.add(
    scene.add
      .text(CENTRE_X, CENTRE_Y - 92, 'A cat peeked out… and scampered away!', {
        fontFamily: FONT,
        fontSize: '28px',
        color: '#5b5470',
        align: 'center',
        wordWrap: { width: 520 },
      })
      .setOrigin(0.5),
  );

  // The consolation coins, made a moment of rather than a footnote.
  const coin = scene.add.image(CENTRE_X - 70, CENTRE_Y + 4, 'coin').setScale(1.1);
  const amount = scene.add
    .text(CENTRE_X - 20, CENTRE_Y + 4, `+${coins}`, {
      fontFamily: FONT,
      fontSize: '52px',
      color: '#8a6100',
      fontStyle: 'bold',
    })
    .setOrigin(0, 0.5);
  layer.add([coin, amount]);
  scene.tweens.add({
    targets: coin,
    angle: { from: -10, to: 10 },
    duration: 500,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  layer.add(
    scene.add
      .text(CENTRE_X, CENTRE_Y + 74, 'Win another round and it might come back!', {
        fontFamily: FONT,
        fontSize: '24px',
        color: '#5b5470',
      })
      .setOrigin(0.5),
  );

  layer.add(
    new DoodleButton(
      scene,
      CENTRE_X - 150,
      CENTRE_Y + 168,
      'Play again',
      () => {
        layer.destroy();
        onPlayAgain();
      },
      { colour: PALETTE.green, fontSize: 30, width: 270 },
    ),
  );
  layer.add(
    new DoodleButton(
      scene,
      CENTRE_X + 150,
      CENTRE_Y + 168,
      'World',
      () => {
        layer.destroy();
        onExit();
      },
      { colour: PALETTE.sun, fontSize: 30, width: 270, iconTexture: 'icon-home' },
    ),
  );

  sfx.reward();
  celebrate(scene, CENTRE_X, CENTRE_Y - 40, 10);
}

/**
 * The "out of hearts" overlay.
 *
 * Shown when the last life is lost mid-round. This is the one place the
 * game says "not this time": the round ends and no cat is rolled. Even so
 * the framing stays kind — no buzzer, no red, and an immediate way back in.
 */
export function showOutOfLivesOverlay(
  scene: Phaser.Scene,
  onTryAgain: () => void,
  onExit: () => void,
): void {
  const layer = scene.add.container(0, 0).setDepth(1000);

  const backdrop = scene.add
    .rectangle(CENTRE_X, CENTRE_Y, DESIGN_WIDTH, DESIGN_HEIGHT, 0x2f2b3a, 0.62)
    .setInteractive();
  layer.add(backdrop);

  const cardWidth = 620;
  const cardHeight = 460;
  const card = scene.add.graphics();
  const rng = makeRng(seedFrom('lives-card'));
  doodleShape(
    card,
    doodleRectPoints(rng, CENTRE_X - cardWidth / 2, CENTRE_Y - cardHeight / 2, cardWidth, cardHeight, 4),
    PALETTE.paper,
    { offset: 5, lineWidth: 7 },
  );
  layer.add(card);

  layer.add(
    scene.add
      .text(CENTRE_X, CENTRE_Y - 150, 'Out of hearts!', {
        fontFamily: FONT,
        fontSize: '54px',
        color: '#2f2b3a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5),
  );

  // Three empty hearts, so the reason the round ended is visible at a
  // glance without a single word of blame.
  for (let i = 0; i < 3; i++) {
    const heart = scene.add
      .image(CENTRE_X - 60 + i * 60, CENTRE_Y - 70, 'heart-empty')
      .setScale(1.1);
    layer.add(heart);
  }

  layer.add(
    scene.add
      .text(
        CENTRE_X,
        CENTRE_Y + 10,
        'The cat slipped away this time.\nHave another go — you were so close!',
        {
          fontFamily: FONT,
          fontSize: '27px',
          color: '#5b5470',
          align: 'center',
          wordWrap: { width: 520 },
        },
      )
      .setOrigin(0.5),
  );

  layer.add(
    new DoodleButton(
      scene,
      CENTRE_X - 150,
      CENTRE_Y + 148,
      'Try again',
      () => {
        layer.destroy();
        onTryAgain();
      },
      { colour: PALETTE.green, fontSize: 30, width: 270 },
    ),
  );
  layer.add(
    new DoodleButton(
      scene,
      CENTRE_X + 150,
      CENTRE_Y + 148,
      'World',
      () => {
        layer.destroy();
        onExit();
      },
      { colour: PALETTE.sun, fontSize: 30, width: 270, iconTexture: 'icon-home' },
    ),
  );
}

/** The "new level unlocked" banner, shown after the cat reveal. */
function announceLevelUp(
  scene: Phaser.Scene,
  layer: Phaser.GameObjects.Container,
  levelNumber: number,
): void {
  const level = getLevel(levelNumber);

  const banner = scene.add.graphics();
  const rng = makeRng(seedFrom('level-banner'));
  doodleShape(
    banner,
    doodleRectPoints(rng, CENTRE_X - 330, CENTRE_Y - 400, 660, 120, 4),
    level.colour,
    { offset: 4, lineWidth: 6 },
  );
  layer.add(banner);

  const title = scene.add
    .text(CENTRE_X, CENTRE_Y - 366, `Level ${levelNumber} unlocked!`, {
      fontFamily: FONT,
      fontSize: '40px',
      color: '#2f2b3a',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const subtitle = scene.add
    .text(CENTRE_X, CENTRE_Y - 322, `${level.name} — ${level.blurb}`, {
      fontFamily: FONT,
      fontSize: '24px',
      color: '#3d3752',
    })
    .setOrigin(0.5);
  layer.add([title, subtitle]);

  for (const item of [banner, title, subtitle]) item.setAlpha(0);
  sfx.levelUp();
  celebrate(scene, CENTRE_X, CENTRE_Y - 340, 22);
  scene.tweens.add({ targets: [banner, title, subtitle], alpha: 1, duration: 400 });
}
