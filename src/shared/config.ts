import type Phaser from 'phaser';

/**
 * Game-wide constants.
 *
 * The design resolution is fixed and Phaser scales it to fit whatever
 * screen the game lands on, so every scene can lay out against known
 * coordinates without worrying about the real device size.
 */

/** Design resolution. 16:10 suits both a laptop window and a tablet. */
export const DESIGN_WIDTH = 1280;
export const DESIGN_HEIGHT = 800;

/** Handy centre points. */
export const CENTRE_X = DESIGN_WIDTH / 2;
export const CENTRE_Y = DESIGN_HEIGHT / 2;

/**
 * The chunky, child-friendly font stack.
 * Comic Sans is genuinely the right tool here — it is the most widely
 * installed informal font and reads well for young children.
 */
export const FONT = '"Comic Sans MS", "Chalkboard SE", "Comic Neue", system-ui, sans-serif';

/** Minimum tap target. Generous, because small fingers on a tablet. */
export const MIN_TAP_SIZE = 88;

/** Coins awarded for one correct answer. */
export const COINS_PER_CORRECT = 5;

/** Hearts the player starts each round with. */
export const LIVES_PER_ROUND = 3;

/**
 * From this level, some questions must be *typed* on the number pad
 * rather than picked from choices — recall without recognition, which is
 * a real step up in difficulty.
 */
export const TYPED_ANSWER_MIN_LEVEL = 6;

/** Chance that an eligible question becomes a typed one. */
export const TYPED_ANSWER_CHANCE = 0.3;

/**
 * How much faster/livelier the mini-games get per level, as a multiplier.
 * Level 1 is 1.0; the cap keeps the top levels brisk rather than frantic —
 * this is still a game for children.
 */
export function challengeFor(level: number): number {
  return Math.min(1.6, 1 + (level - 1) * 0.045);
}

/**
 * Canvas text is rasterised at 1x by default, which looks soft once the
 * FIT scaler stretches an 1280x800 design onto a retina screen. Rendering
 * text at the device pixel ratio keeps the big numbers sharp, which matters
 * because legibility is a core requirement here.
 */
export const TEXT_RESOLUTION = Math.min(window.devicePixelRatio || 1, 2);

/** Builds a text style with the game font and crisp resolution applied. */
export function textStyle(
  size: number,
  colour = '#2f2b3a',
  extra: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color: colour,
    resolution: TEXT_RESOLUTION,
    ...extra,
  };
}

/** Scene keys, kept in one place to avoid typos in scene transitions. */
export const SCENES = {
  boot: 'BootScene',
  world: 'WorldScene',
  balloonPop: 'BalloonPopScene',
  pirateShip: 'PirateShipScene',
  feedTheCat: 'FeedTheCatScene',
  numberNinja: 'NumberNinjaScene',
  buildNumber: 'BuildNumberScene',
  catCafe: 'CatCafeScene',
  rocketLaunch: 'RocketLaunchScene',
  frogPond: 'FrogPondScene',
  honeyHive: 'HoneyHiveScene',
  treasureDive: 'TreasureDiveScene',
  magicPotion: 'MagicPotionScene',
  numberTrain: 'NumberTrainScene',
  ufoCatch: 'UfoCatchScene',
  memoryMatch: 'MemoryMatchScene',
  patternPath: 'PatternPathScene',
  balanceScales: 'BalanceScalesScene',
  castleKnock: 'CastleKnockScene',
  pets: 'PetsScene',
  settings: 'SettingsScene',
  shop: 'ShopScene',
  characterSelect: 'CharacterSelectScene',
} as const;
