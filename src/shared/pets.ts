/**
 * The collectible cats, and the levels they live in.
 *
 * Winning a round of any mini-game rolls for a cat from the player's
 * current level. Collecting every cat in a level unlocks the next one,
 * which brings a fresh set of cats and harder sums.
 *
 * Pure logic, no Phaser: the catalog describes *what* each cat looks like
 * and the sprite factory turns that description into a texture.
 */

import type { CatLook } from './art/sprites';
import { PALETTE } from './art/doodle';

/** The three rarity bands. */
export type Rarity = 'common' | 'rare' | 'legendary';

/**
 * ---------------------------------------------------------------
 * DROP RATES — the one place to tune how generous the game is.
 * ---------------------------------------------------------------
 * Weights are relative, so they need not add to 100. Raising
 * `legendary` makes the rarest cats appear more often.
 */
export const DROP_RATES: Record<Rarity, number> = {
  common: 70,
  rare: 25,
  legendary: 5,
};

/** Coins given instead when the rolled cat is already owned. */
export const DUPLICATE_COIN_REWARD = 25;

/** How each rarity is presented. */
export const RARITY_STYLE: Record<Rarity, { label: string; colour: number; textColour: string }> = {
  common: { label: 'Common', colour: PALETTE.teal, textColour: '#1c6b64' },
  rare: { label: 'Rare', colour: PALETTE.purple, textColour: '#5b2fa8' },
  legendary: { label: 'Legendary', colour: PALETTE.sun, textColour: '#8a6100' },
};

/** One collectible cat. */
export interface Cat {
  /** Stable id — this is what gets written to the save file. */
  id: string;
  /** Name shown to the player. */
  name: string;
  rarity: Rarity;
  /** Which level this cat belongs to (1-based). */
  level: number;
  /** How to draw it. */
  look: CatLook;
  /** A short friendly line shown on the pets screen. */
  description: string;
}

/** One level: a themed set of cats and a difficulty band. */
export interface LevelDef {
  /** 1-based level number. */
  number: number;
  name: string;
  /** Shown on the level banner. */
  blurb: string;
  /** Lowest difficulty tier used in this level. */
  minTier: number;
  /** Highest difficulty tier reachable in this level. */
  maxTier: number;
  /** Background tint for the level badge. */
  colour: number;
}

/**
 * The levels, easiest first.
 *
 * Each one raises the difficulty floor, so a child who has worked through
 * the Meadow is never dropped back to single-digit sums. The Maths screen
 * still decides *which* operations to practise.
 */
export const LEVELS: readonly LevelDef[] = [
  {
    number: 1,
    name: 'Meadow',
    blurb: 'Where every cat adventure starts.',
    minTier: 0,
    maxTier: 1,
    colour: PALETTE.green,
  },
  {
    number: 2,
    name: 'Seaside',
    blurb: 'Salty air and sandy paws.',
    minTier: 1,
    maxTier: 2,
    colour: PALETTE.teal,
  },
  {
    number: 3,
    name: 'Forest',
    blurb: 'Deep green and full of secrets.',
    minTier: 2,
    maxTier: 3,
    colour: 0x4a8c3f,
  },
  {
    number: 4,
    name: 'Mountain',
    blurb: 'Cold peaks and brave cats.',
    minTier: 3,
    maxTier: 5,
    colour: 0x8a93b8,
  },
  {
    number: 5,
    name: 'Space',
    blurb: 'The rarest cats of all live here.',
    minTier: 4,
    maxTier: 6,
    colour: PALETTE.purple,
  },
];

/* ------------------------------------------------------------------ *
 * Fur colours, named so the catalog below stays readable.
 * ------------------------------------------------------------------ */
const FUR = {
  ginger: 0xe8863a,
  gingerDark: 0xc4661f,
  grey: 0xa9b2bd,
  greyDark: 0x7e8894,
  white: 0xfffdf7,
  cream: 0xf3e3c3,
  black: 0x4a4458,
  blackDark: 0x332f41,
  tabby: 0xc19a6b,
  tabbyDark: 0x8f6f47,
  brown: 0x9c6b45,
  brownDark: 0x6f4a2e,
  charcoal: 0x6b6b7a,
  sand: 0xe8d3a8,
} as const;

/** Compact helper so 52 catalog entries stay readable. */
function cat(
  id: string,
  name: string,
  rarity: Rarity,
  level: number,
  description: string,
  look: CatLook,
): Cat {
  return { id, name, rarity, level, description, look };
}

/**
 * The full catalog — 52 cats across five levels.
 * Order here is the order shown on the pets screen.
 */
export const CAT_CATALOG: readonly Cat[] = [
  /* --- Level 1: Meadow (12) ------------------------------------- */
  cat('ginger', 'Biscuit', 'common', 1, 'Loves naps in sunny spots.', {
    body: FUR.ginger,
    accent: FUR.gingerDark,
    pattern: 'stripes',
  }),
  cat('grey', 'Smokey', 'common', 1, 'Quiet, but always watching.', {
    body: FUR.grey,
    accent: FUR.greyDark,
    pattern: 'stripes',
  }),
  cat('white', 'Snowdrop', 'common', 1, 'Fluffy as a cloud.', {
    body: FUR.white,
    accent: 0xe4dccb,
    pattern: 'patches',
  }),
  cat('black', 'Midnight', 'common', 1, 'Only the eyes give her away.', {
    body: FUR.black,
    accent: FUR.blackDark,
    pattern: 'none',
  }),
  cat('tabby', 'Pickle', 'common', 1, 'Will trade a purr for a fish.', {
    body: FUR.tabby,
    accent: FUR.tabbyDark,
    pattern: 'stripes',
  }),
  cat('calico', 'Patches', 'common', 1, 'Three colours, one cat.', {
    body: PALETTE.paper,
    accent: FUR.ginger,
    pattern: 'patches',
  }),
  cat('daisy', 'Daisy', 'common', 1, 'Always smells of flowers.', {
    body: FUR.cream,
    accent: PALETTE.yellow,
    pattern: 'patches',
  }),
  cat('clover', 'Clover', 'common', 1, 'Lucky, and knows it.', {
    body: 0xb8d99a,
    accent: 0x86ab68,
    pattern: 'stripes',
  }),
  cat('pumpkin', 'Pumpkin', 'common', 1, 'Round and very orange.', {
    body: PALETTE.orange,
    accent: 0xc4661f,
    pattern: 'patches',
  }),
  cat('marmalade', 'Marmalade', 'rare', 1, 'Sticky paws, sweet nature.', {
    body: 0xf0a04b,
    accent: 0xd97706,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('domino', 'Domino', 'rare', 1, 'Black and white, never grey.', {
    body: FUR.white,
    accent: FUR.black,
    pattern: 'patches',
    sparkles: true,
  }),
  cat('meadowking', 'Buttercup', 'legendary', 1, 'The first cat you ever meet.', {
    body: PALETTE.sun,
    accent: 0xd99a00,
    pattern: 'stripes',
    sparkles: true,
    crown: true,
  }),

  /* --- Level 2: Seaside (10) ------------------------------------ */
  cat('pebble', 'Pebble', 'common', 2, 'Collects little stones.', {
    body: FUR.greyDark,
    accent: FUR.grey,
    pattern: 'patches',
  }),
  cat('shelly', 'Shelly', 'common', 2, 'Naps inside upturned buckets.', {
    body: FUR.sand,
    accent: 0xc9a878,
    pattern: 'stripes',
  }),
  cat('coral', 'Coral', 'common', 2, 'Pink as a sunset over the sea.', {
    body: 0xf5a3a3,
    accent: 0xd97070,
    pattern: 'patches',
  }),
  cat('sandy', 'Sandy', 'common', 2, 'Somehow always gritty.', {
    body: 0xe8d9a8,
    accent: 0xbfa870,
    pattern: 'stripes',
  }),
  cat('splash', 'Splash', 'common', 2, 'The only cat who likes water.', {
    body: 0x7fc4e8,
    accent: 0x4a94bd,
    pattern: 'patches',
  }),
  cat('bubbles', 'Bubbles', 'common', 2, 'Chases sea foam for hours.', {
    body: 0xa8dcea,
    accent: 0x6fb3c9,
    pattern: 'stripes',
  }),
  cat('anchor', 'Anchor', 'rare', 2, 'Refuses to be moved.', {
    body: 0x4a6b8a,
    accent: 0x2f4a63,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('pearl', 'Pearl', 'rare', 2, 'Shines a little in the dark.', {
    body: 0xf7f0e8,
    accent: 0xd9cfc0,
    pattern: 'patches',
    sparkles: true,
  }),
  cat('wave', 'Wave', 'rare', 2, 'Never sits still.', {
    body: 0x5fb3d9,
    accent: 0x2f7fa8,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('tidequeen', 'Marina', 'legendary', 2, 'Rules the rock pools.', {
    body: 0x3fa8c4,
    accent: PALETTE.white,
    pattern: 'patches',
    sparkles: true,
    crown: true,
  }),

  /* --- Level 3: Forest (10) ------------------------------------- */
  cat('acorn', 'Acorn', 'common', 3, 'Small, round, and stubborn.', {
    body: FUR.brown,
    accent: FUR.brownDark,
    pattern: 'patches',
  }),
  cat('fern', 'Fern', 'common', 3, 'Hides in the undergrowth.', {
    body: 0x8fb872,
    accent: 0x5f8a48,
    pattern: 'stripes',
  }),
  cat('mossy', 'Mossy', 'common', 3, 'Softest fur in the forest.', {
    body: 0x9cb07a,
    accent: 0x6b7f4a,
    pattern: 'patches',
  }),
  cat('hazel', 'Hazel', 'common', 3, 'Eyes like autumn leaves.', {
    body: 0xc99a6b,
    accent: 0x9c6b45,
    pattern: 'stripes',
  }),
  cat('bramble', 'Bramble', 'common', 3, 'Always has a twig somewhere.', {
    body: 0x7a5f45,
    accent: 0x4f3d2c,
    pattern: 'stripes',
  }),
  cat('willow', 'Willow', 'common', 3, 'Sways when she walks.', {
    body: 0xb0c49a,
    accent: 0x7f9468,
    pattern: 'patches',
  }),
  cat('juniper', 'Juniper', 'rare', 3, 'Smells of pine needles.', {
    body: 0x5f8a6b,
    accent: 0x3a5f45,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('thistle', 'Thistle', 'rare', 3, 'Prickly until you know her.', {
    body: 0xa88fc4,
    accent: 0x7a5f9c,
    pattern: 'patches',
    sparkles: true,
  }),
  cat('cedar', 'Cedar', 'rare', 3, 'Climbs higher than anyone.', {
    body: 0x8a5f3a,
    accent: 0x5f3d24,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('forestspirit', 'Whisper', 'legendary', 3, 'You only see her if she wants.', {
    body: 0x6b9c7a,
    accent: PALETTE.sun,
    pattern: 'patches',
    sparkles: true,
    crown: true,
    wings: true,
  }),

  /* --- Level 4: Mountain (10) ----------------------------------- */
  cat('flint', 'Flint', 'common', 4, 'Sparks when he stretches.', {
    body: FUR.charcoal,
    accent: 0x4a4a56,
    pattern: 'stripes',
  }),
  cat('boulder', 'Boulder', 'common', 4, 'Heavier than he looks.', {
    body: 0x8a8a94,
    accent: 0x5f5f6b,
    pattern: 'patches',
  }),
  cat('frost', 'Frost', 'common', 4, 'Leaves tiny icy pawprints.', {
    body: 0xd9e8f0,
    accent: 0xa8c4d4,
    pattern: 'stripes',
  }),
  cat('summit', 'Summit', 'common', 4, 'Sits on the highest thing available.', {
    body: 0xb8a894,
    accent: 0x8a7a68,
    pattern: 'patches',
  }),
  cat('granite', 'Granite', 'common', 4, 'Speckled all over.', {
    body: 0x9c9c9c,
    accent: 0x6b6b6b,
    pattern: 'patches',
  }),
  cat('pine', 'Pine', 'common', 4, 'Lives above the treeline.', {
    body: 0x5f7a5f,
    accent: 0x3d543d,
    pattern: 'stripes',
  }),
  cat('echo', 'Echo', 'rare', 4, 'Meows twice, every time.', {
    body: 0xc4c9d9,
    accent: 0x8a94ab,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('blizzard', 'Blizzard', 'rare', 4, 'Arrives with the snow.', {
    body: PALETTE.white,
    accent: 0xa8c4e8,
    pattern: 'patches',
    sparkles: true,
  }),
  cat('ridge', 'Ridge', 'rare', 4, 'Knows every path down.', {
    body: 0x7a6b5f,
    accent: 0x4f4239,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('avalanche', 'Avalanche', 'legendary', 4, 'You hear him before you see him.', {
    body: 0xe8f0f7,
    accent: 0x5f8ab8,
    pattern: 'stripes',
    sparkles: true,
    crown: true,
    wings: true,
  }),

  /* --- Level 5: Space (10) -------------------------------------- */
  cat('luna', 'Luna', 'common', 5, 'Glows faintly at night.', {
    body: 0xd9d4f0,
    accent: 0xa8a0d4,
    pattern: 'patches',
  }),
  cat('orbit', 'Orbit', 'common', 5, 'Walks in circles, always.', {
    body: 0x8a7fc4,
    accent: 0x5f549c,
    pattern: 'stripes',
  }),
  cat('meteor', 'Meteor', 'common', 5, 'Fastest cat in the game.', {
    body: 0xe87a4a,
    accent: 0xb84a1f,
    pattern: 'stripes',
  }),
  cat('eclipse', 'Eclipse', 'common', 5, 'Half light, half dark.', {
    body: 0x3d3a54,
    accent: PALETTE.sun,
    pattern: 'patches',
  }),
  cat('stardust', 'Stardust', 'common', 5, 'Leaves a sparkle trail.', {
    body: 0xc4b8e8,
    accent: PALETTE.white,
    pattern: 'patches',
  }),
  cat('pulsar', 'Pulsar', 'rare', 5, 'Purrs in perfect rhythm.', {
    body: 0x4fb8d9,
    accent: PALETTE.white,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('nebula', 'Nebula', 'rare', 5, 'Every stripe a different colour.', {
    body: 0xd97ac4,
    accent: 0x7a4fc4,
    pattern: 'stripes',
    sparkles: true,
  }),
  cat('galaxy', 'Galaxy', 'rare', 5, 'Has a whole sky inside her.', {
    body: 0x4a3d7a,
    accent: 0xc4a0f0,
    pattern: 'patches',
    sparkles: true,
  }),
  cat('nova', 'Nova', 'legendary', 5, 'Burns brighter than the rest.', {
    body: PALETTE.sun,
    accent: PALETTE.red,
    pattern: 'stripes',
    sparkles: true,
    crown: true,
    wings: true,
  }),
  cat('starcat', 'Comet', 'legendary', 5, 'Landed here from somewhere far away.', {
    body: 0x6b5ce7,
    accent: PALETTE.sun,
    pattern: 'patches',
    sparkles: true,
    crown: true,
    wings: true,
  }),
];

/** Looks up a cat by id. */
export function getCat(id: string): Cat | undefined {
  return CAT_CATALOG.find((c) => c.id === id);
}

/** Every cat belonging to one level. */
export function catsForLevel(level: number): Cat[] {
  return CAT_CATALOG.filter((c) => c.level === level);
}

/** Every cat of one rarity within a level. */
export function catsOfRarity(rarity: Rarity, level: number): Cat[] {
  return CAT_CATALOG.filter((c) => c.rarity === rarity && c.level === level);
}

/** The definition for a level number, clamped into range. */
export function getLevel(number: number): LevelDef {
  const index = Math.max(0, Math.min(LEVELS.length - 1, Math.floor(number) - 1));
  return LEVELS[index]!;
}

/** The highest level number that exists. */
export const MAX_LEVEL = LEVELS.length;

/** How many of a level's cats the player has. */
export function levelProgress(
  owned: readonly string[],
  level: number,
): { have: number; total: number } {
  const cats = catsForLevel(level);
  return {
    have: cats.filter((c) => owned.includes(c.id)).length,
    total: cats.length,
  };
}

/** True when every cat in a level has been collected. */
export function isLevelComplete(owned: readonly string[], level: number): boolean {
  const { have, total } = levelProgress(owned, level);
  return total > 0 && have === total;
}

/** The whole collection, across all levels. */
export function collectionProgress(owned: readonly string[]): { have: number; total: number } {
  return {
    have: owned.filter((id) => getCat(id) !== undefined).length,
    total: CAT_CATALOG.length,
  };
}

/** The outcome of winning a round. */
export interface RewardResult {
  /** The cat that was rolled. */
  cat: Cat;
  /** False if the player already had it. */
  isNew: boolean;
  /** Coins awarded in place of a duplicate cat. Zero when `isNew`. */
  coins: number;
}

/** Picks a rarity according to DROP_RATES. */
export function rollRarity(rng: () => number = Math.random): Rarity {
  const entries = Object.entries(DROP_RATES) as [Rarity, number][];
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [rarity, weight] of entries) {
    roll -= weight;
    if (roll <= 0) return rarity;
  }
  // Only reachable through floating-point drift on the final entry.
  return 'common';
}

/**
 * Rolls a reward for winning a round.
 *
 * Only cats from the player's current level can drop, which is what makes
 * finishing a level feel like an achievement rather than an endless grind.
 * Within the level, cats the player doesn't own yet are strongly preferred.
 *
 * @param owned Ids the player already has.
 * @param level The level being played.
 * @param rng   Injectable randomness for tests.
 */
export function rollReward(
  owned: readonly string[],
  level: number,
  rng: () => number = Math.random,
): RewardResult {
  const rarity = rollRarity(rng);

  // Try the rolled rarity first. If the player already owns every cat in
  // that band, fall back to the *nearest* other band that still has
  // something new — nearest-first, so a player missing only legendaries
  // doesn't get one on every single win.
  const bands: Rarity[] = ['common', 'rare', 'legendary'];
  const rolledIndex = bands.indexOf(rarity);
  const searchOrder = [...bands].sort(
    (a, b) => Math.abs(bands.indexOf(a) - rolledIndex) - Math.abs(bands.indexOf(b) - rolledIndex),
  );

  for (const band of searchOrder) {
    const missing = catsOfRarity(band, level).filter((c) => !owned.includes(c.id));
    if (missing.length > 0) {
      const chosen = missing[Math.floor(rng() * missing.length)]!;
      return { cat: chosen, isNew: true, coins: 0 };
    }
  }

  // Every cat in this level is collected — award a duplicate for coins.
  const pool = catsForLevel(level);
  const chosen = pool[Math.floor(rng() * pool.length)]!;
  return { cat: chosen, isNew: false, coins: DUPLICATE_COIN_REWARD };
}
