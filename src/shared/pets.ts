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

/**
 * Coins given when a round is won but the cat gets away.
 *
 * From level 6 upward a won round only produces a cat `catChance` of the
 * time (see LevelDef). The consolation is deliberately bigger than the
 * duplicate reward: the player did everything right and deserves to feel
 * that, even when the cat was shy.
 */
export const ESCAPED_COIN_REWARD = 30;

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
  /**
   * Correct answers needed to finish a round at this level.
   *
   * The maths tiers stop climbing once they hit the top of the ladder, so
   * later levels get harder by asking for longer rounds instead — each
   * level a little more than the last.
   */
  questionsPerRound: number;
  /**
   * Probability that winning a round awards a cat, 0..1.
   *
   * Guaranteed through level 5. From level 6 the cats get shyer: a won
   * round might only pay out coins, which stretches the later collections
   * out without ever punishing the player for a *lost* round.
   */
  catChance: number;
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
    questionsPerRound: 8,
    catChance: 1,
  },
  {
    number: 2,
    name: 'Seaside',
    blurb: 'Salty air and sandy paws.',
    minTier: 1,
    maxTier: 2,
    colour: PALETTE.teal,
    questionsPerRound: 8,
    catChance: 1,
  },
  {
    number: 3,
    name: 'Forest',
    blurb: 'Deep green and full of secrets.',
    minTier: 2,
    maxTier: 3,
    colour: 0x4a8c3f,
    questionsPerRound: 8,
    catChance: 1,
  },
  {
    number: 4,
    name: 'Mountain',
    blurb: 'Cold peaks and brave cats.',
    minTier: 3,
    maxTier: 5,
    colour: 0x8a93b8,
    questionsPerRound: 8,
    catChance: 1,
  },
  {
    number: 5,
    name: 'Space',
    blurb: 'Where the stars purr back.',
    minTier: 4,
    maxTier: 6,
    colour: PALETTE.purple,
    questionsPerRound: 8,
    catChance: 1,
  },
  // From here on the tier ladder is nearly topped out, so the levels get
  // harder through longer rounds — and shyer cats (see catChance).
  {
    number: 6,
    name: 'Jungle',
    blurb: 'Vines, drums and hidden whiskers.',
    minTier: 4,
    maxTier: 6,
    colour: 0x3f9c4f,
    questionsPerRound: 9,
    catChance: 0.9,
  },
  {
    number: 7,
    name: 'Desert',
    blurb: 'Hot sand and cool cats.',
    minTier: 5,
    maxTier: 6,
    colour: 0xe0b34c,
    questionsPerRound: 9,
    catChance: 0.85,
  },
  {
    number: 8,
    name: 'Candy Land',
    blurb: 'Everything smells of sweets.',
    minTier: 5,
    maxTier: 6,
    colour: 0xff9ec4,
    questionsPerRound: 10,
    catChance: 0.8,
  },
  {
    number: 9,
    name: 'Volcano',
    blurb: 'Only the bravest paws come here.',
    minTier: 5,
    maxTier: 6,
    colour: 0xe0653a,
    questionsPerRound: 10,
    catChance: 0.75,
  },
  {
    number: 10,
    name: 'Crystal Caves',
    blurb: 'Glittering tunnels, glowing eyes.',
    minTier: 6,
    maxTier: 6,
    colour: 0x9c7ae8,
    questionsPerRound: 10,
    catChance: 0.7,
  },
  {
    number: 11,
    name: 'Cloud Kingdom',
    blurb: 'Castles built of cumulus.',
    minTier: 6,
    maxTier: 6,
    colour: 0x8fc9f0,
    questionsPerRound: 11,
    catChance: 0.65,
  },
  {
    number: 12,
    name: 'Deep Ocean',
    blurb: 'Down where the lanternfish glow.',
    minTier: 6,
    maxTier: 6,
    colour: 0x2f5fae,
    questionsPerRound: 11,
    catChance: 0.6,
  },
  {
    number: 13,
    name: 'Fairy Garden',
    blurb: 'Every toadstool is a doorway.',
    minTier: 6,
    maxTier: 6,
    colour: 0xd989e8,
    questionsPerRound: 11,
    catChance: 0.55,
  },
  {
    number: 14,
    name: 'Dreamland',
    blurb: 'The cats you meet with your eyes shut.',
    minTier: 6,
    maxTier: 6,
    colour: 0xb8a8f0,
    questionsPerRound: 12,
    catChance: 0.5,
  },
  {
    number: 15,
    name: 'Rainbow Realm',
    blurb: 'The very end of every rainbow.',
    minTier: 6,
    maxTier: 6,
    colour: 0xff8fa3,
    questionsPerRound: 12,
    catChance: 0.5,
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

/** Compact helper so 152 catalog entries stay readable. */
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
 * The full catalog — 152 cats across fifteen levels.
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

  /* --- Level 6: Jungle (10) ------------------------------------- */
  cat('mango', 'Mango', 'common', 6, 'Sweetest cat in the canopy.', {
    body: 0xf0a04b, accent: 0xd97a2a, pattern: 'patches',
  }),
  cat('jade', 'Jade', 'common', 6, 'Blends into the big leaves.', {
    body: 0x6bbf6b, accent: 0x3f8c3f, pattern: 'stripes',
  }),
  cat('bongo', 'Bongo', 'common', 6, 'Taps out rhythms on hollow logs.', {
    body: 0x9c6b45, accent: 0x6f4a2e, pattern: 'patches',
  }),
  cat('tiki', 'Tiki', 'common', 6, 'Wears flowers behind one ear.', {
    body: 0xe8c95a, accent: 0xc49a2a, pattern: 'stripes',
  }),
  cat('liana', 'Liana', 'common', 6, 'Swings from vine to vine.', {
    body: 0x8fb85f, accent: 0x5f8a3a, pattern: 'stripes',
  }),
  cat('cacao', 'Cacao', 'common', 6, 'Smells faintly of chocolate.', {
    body: 0x7a5238, accent: 0x523524, pattern: 'patches',
  }),
  cat('panthera', 'Shadowpaw', 'rare', 6, 'A patch of night that purrs.', {
    body: 0x3a3548, accent: 0x262233, pattern: 'stripes', sparkles: true,
  }),
  cat('orchid', 'Orchid', 'rare', 6, 'Blooms only for friends.', {
    body: 0xe88fd0, accent: 0xb85fa8, pattern: 'patches', sparkles: true,
  }),
  cat('toucan', 'Pip', 'rare', 6, 'Copies every bird call, badly.', {
    body: 0x4a4458, accent: PALETTE.orange, pattern: 'patches', sparkles: true,
  }),
  cat('jungleking', 'Rumble', 'legendary', 6, 'When he purrs, the whole jungle hums.', {
    body: 0xd9a03a, accent: 0x7a5238, pattern: 'stripes', sparkles: true, crown: true,
  }),

  /* --- Level 7: Desert (10) ------------------------------------- */
  cat('dune', 'Dune', 'common', 7, 'Naps on the warm side of every rock.', {
    body: 0xe8d3a8, accent: 0xc4a870, pattern: 'stripes',
  }),
  cat('prickle', 'Prickle', 'common', 7, 'Hugs cacti. Nobody knows how.', {
    body: 0x9cb872, accent: 0x6b8a48, pattern: 'patches',
  }),
  cat('oasis', 'Oasis', 'common', 7, 'Always knows where the water is.', {
    body: 0x7fc4d9, accent: 0x4a94ab, pattern: 'patches',
  }),
  cat('fennec', 'Fennec', 'common', 7, 'Ears bigger than her head.', {
    body: 0xf0d9a8, accent: 0xd9b070, pattern: 'stripes',
  }),
  cat('scarab', 'Scarab', 'common', 7, 'Collects shiny beetles, gently.', {
    body: 0x4a8a7a, accent: 0x2f5f54, pattern: 'stripes',
  }),
  cat('adobe', 'Adobe', 'common', 7, 'The colour of sunset walls.', {
    body: 0xd98a5f, accent: 0xa85f3a, pattern: 'patches',
  }),
  cat('mirage', 'Mirage', 'rare', 7, 'Might not actually be there.', {
    body: 0xd9e8f0, accent: 0xa8c4d4, pattern: 'patches', sparkles: true,
  }),
  cat('sphinx', 'Sphinx', 'rare', 7, 'Asks riddles. Accepts fish.', {
    body: 0xd9b070, accent: 0x8a6a3a, pattern: 'stripes', sparkles: true,
  }),
  cat('sirocco', 'Sirocco', 'rare', 7, 'Arrives on the hot wind.', {
    body: 0xe89a4a, accent: 0xb8702a, pattern: 'stripes', sparkles: true,
  }),
  cat('pharaoh', 'Pharaoh', 'legendary', 7, 'The pyramids were built as scratching posts.', {
    body: PALETTE.sun, accent: 0x2f5fae, pattern: 'stripes', sparkles: true, crown: true,
  }),

  /* --- Level 8: Candy Land (10) --------------------------------- */
  cat('bonbon', 'Bonbon', 'common', 8, 'Round, pink, and pleased about it.', {
    body: 0xf5a8c4, accent: 0xd97a9c, pattern: 'patches',
  }),
  cat('minty', 'Minty', 'common', 8, 'Cool breath, cooler attitude.', {
    body: 0xa8e8d0, accent: 0x6bc4a8, pattern: 'stripes',
  }),
  cat('toffee', 'Toffee', 'common', 8, 'Slightly sticky. Always.', {
    body: 0xc4884a, accent: 0x94602a, pattern: 'patches',
  }),
  cat('jellybean', 'Jellybean', 'common', 8, 'A different colour every angle.', {
    body: 0xb87ae8, accent: 0xe8c95a, pattern: 'patches',
  }),
  cat('waffles', 'Waffles', 'common', 8, 'Checked fur, syrupy purr.', {
    body: 0xe8c088, accent: 0xb8905a, pattern: 'stripes',
  }),
  cat('sherbet', 'Sherbet', 'common', 8, 'Fizzes when she sneezes.', {
    body: 0xf5e08f, accent: 0xf5a8c4, pattern: 'patches',
  }),
  cat('gumdrop', 'Gumdrop', 'rare', 8, 'Bounces instead of walking.', {
    body: 0x8fd45f, accent: 0x5fa83a, pattern: 'patches', sparkles: true,
  }),
  cat('candyfloss', 'Floss', 'rare', 8, 'Lighter than air, fluffier too.', {
    body: 0xf5c4e0, accent: 0xe89ac4, pattern: 'patches', sparkles: true,
  }),
  cat('liquorice', 'Liquorice', 'rare', 8, 'Sweet, despite appearances.', {
    body: 0x3a3548, accent: 0xf5a8c4, pattern: 'stripes', sparkles: true,
  }),
  cat('sugarqueen', 'Meringue', 'legendary', 8, 'Her crown is spun sugar.', {
    body: 0xfff5e8, accent: 0xf5a8c4, pattern: 'patches', sparkles: true, crown: true,
  }),

  /* --- Level 9: Volcano (10) ------------------------------------ */
  cat('ember', 'Ember', 'common', 9, 'Warm to sit next to.', {
    body: 0xe0653a, accent: 0xa8401f, pattern: 'stripes',
  }),
  cat('ash', 'Ash', 'common', 9, 'Leaves grey pawprints everywhere.', {
    body: 0x8a8a94, accent: 0x5f5f6b, pattern: 'patches',
  }),
  cat('basalt', 'Basalt', 'common', 9, 'Sits perfectly still for hours.', {
    body: 0x4a4652, accent: 0x33303d, pattern: 'patches',
  }),
  cat('sizzle', 'Sizzle', 'common', 9, 'Crackles when he stretches.', {
    body: 0xe8884a, accent: 0xc45f24, pattern: 'stripes',
  }),
  cat('crater', 'Crater', 'common', 9, 'Sleeps in a perfect circle.', {
    body: 0x94684a, accent: 0x6b4830, pattern: 'patches',
  }),
  cat('smoulder', 'Smoulder', 'common', 9, 'Eyes like banked coals.', {
    body: 0x6b4a52, accent: 0xe0653a, pattern: 'stripes',
  }),
  cat('lava', 'Lava', 'rare', 9, 'Flows downhill, slowly, onto laps.', {
    body: 0xe84a2a, accent: PALETTE.sun, pattern: 'stripes', sparkles: true,
  }),
  cat('obsidian', 'Obsidian', 'rare', 9, 'So glossy you can see yourself.', {
    body: 0x2f2b3d, accent: 0x8a7fe8, pattern: 'patches', sparkles: true,
  }),
  cat('geyser', 'Geyser', 'rare', 9, 'Leaps straight up without warning.', {
    body: 0x7fc4e8, accent: 0xe8e8f0, pattern: 'stripes', sparkles: true,
  }),
  cat('magmaking', 'Vulcan', 'legendary', 9, 'The volcano rumbles when he is hungry.', {
    body: 0xd93a1f, accent: PALETTE.sun, pattern: 'stripes', sparkles: true, crown: true, wings: true,
  }),

  /* --- Level 10: Crystal Caves (10) ------------------------------ */
  cat('quartz', 'Quartz', 'common', 10, 'Sparkles in torchlight.', {
    body: 0xe8e0f0, accent: 0xc4b8d9, pattern: 'patches',
  }),
  cat('amethyst', 'Amethyst', 'common', 10, 'Purrs in violet.', {
    body: 0xb88fe8, accent: 0x8a5fc4, pattern: 'stripes',
  }),
  cat('topaz', 'Topaz', 'common', 10, 'Warm gold in the dark.', {
    body: 0xe8c05a, accent: 0xc4942a, pattern: 'patches',
  }),
  cat('stalag', 'Stalag', 'common', 10, 'Sleeps standing up. Somehow.', {
    body: 0x9ca8b8, accent: 0x6b7a8a, pattern: 'stripes',
  }),
  cat('echoette', 'Echoette', 'common', 10, 'Her meow comes back twice.', {
    body: 0x7a8fb8, accent: 0x4a5f8a, pattern: 'patches',
  }),
  cat('glowworm', 'Glimmer', 'common', 10, 'Finds every speck of light.', {
    body: 0xc4e85f, accent: 0x8fb82a, pattern: 'stripes',
  }),
  cat('sapphire', 'Sapphire', 'rare', 10, 'Deep blue and deeper thoughts.', {
    body: 0x3a5fd9, accent: 0x8fc4f0, pattern: 'patches', sparkles: true,
  }),
  cat('rubycat', 'Ruby', 'rare', 10, 'Glows faintly red when happy.', {
    body: 0xd93a5f, accent: 0xf08fa8, pattern: 'stripes', sparkles: true,
  }),
  cat('geode', 'Geode', 'rare', 10, 'Plain outside, dazzling inside.', {
    body: 0x8a8a94, accent: 0xb88fe8, pattern: 'patches', sparkles: true,
  }),
  cat('crystalqueen', 'Prisma', 'legendary', 10, 'Every gem in the cave is hers.', {
    body: 0xd9c4f5, accent: 0x8a5fc4, pattern: 'patches', sparkles: true, crown: true,
  }),

  /* --- Level 11: Cloud Kingdom (10) ------------------------------ */
  cat('nimbus', 'Nimbus', 'common', 11, 'Slightly damp, very soft.', {
    body: 0xd9e0e8, accent: 0xa8b8c9, pattern: 'patches',
  }),
  cat('cumulus', 'Cumulus', 'common', 11, 'The fluffiest thing in the sky.', {
    body: 0xf5f5ff, accent: 0xd0d9e8, pattern: 'patches',
  }),
  cat('breeze', 'Breeze', 'common', 11, 'Arrives without a sound.', {
    body: 0xa8d4e8, accent: 0x74a8c9, pattern: 'stripes',
  }),
  cat('drizzle', 'Drizzle', 'common', 11, 'Brings tiny rainclouds indoors.', {
    body: 0x8fa8c4, accent: 0x5f7a9c, pattern: 'stripes',
  }),
  cat('sunbeam', 'Sunbeam', 'common', 11, 'Finds the gap in every cloud.', {
    body: 0xf5df8f, accent: 0xe8b83a, pattern: 'patches',
  }),
  cat('kite', 'Kite', 'common', 11, 'Happiest on a windy day.', {
    body: 0xe88f8f, accent: 0x74a8c9, pattern: 'patches',
  }),
  cat('thunder', 'Thunder', 'rare', 11, 'You hear his purr a valley away.', {
    body: 0x5f5f7a, accent: PALETTE.sun, pattern: 'stripes', sparkles: true,
  }),
  cat('zephyr', 'Zephyr', 'rare', 11, 'Rides the west wind side-saddle.', {
    body: 0xb8e0f0, accent: 0x74b8d9, pattern: 'stripes', sparkles: true,
  }),
  cat('aurora', 'Aurora', 'rare', 11, 'Trails ribbons of colour at dusk.', {
    body: 0x8fe0c4, accent: 0xb88fe8, pattern: 'patches', sparkles: true,
  }),
  cat('skyking', 'Stratus', 'legendary', 11, 'His castle has no floor and needs none.', {
    body: 0xe8f0ff, accent: 0x74a8c9, pattern: 'patches', sparkles: true, crown: true, wings: true,
  }),

  /* --- Level 12: Deep Ocean (10) --------------------------------- */
  cat('lantern', 'Lantern', 'common', 12, 'Her whiskers glow in the dark.', {
    body: 0x3a5f8a, accent: 0xc4e85f, pattern: 'patches',
  }),
  cat('kelp', 'Kelp', 'common', 12, 'Drifts wherever the current goes.', {
    body: 0x4a8a6b, accent: 0x2f5f48, pattern: 'stripes',
  }),
  cat('urchin', 'Urchin', 'common', 12, 'Spiky hair, soft heart.', {
    body: 0x5f4a7a, accent: 0x3d2f52, pattern: 'patches',
  }),
  cat('current', 'Current', 'common', 12, 'Never swims in a straight line.', {
    body: 0x4a7ab8, accent: 0x2f5285, pattern: 'stripes',
  }),
  cat('barnacle', 'Barnacle', 'common', 12, 'Once he sits, he stays.', {
    body: 0x8a7a6b, accent: 0x5f5248, pattern: 'patches',
  }),
  cat('inkwell', 'Inkwell', 'common', 12, 'Leaves mysterious dark clouds.', {
    body: 0x33304a, accent: 0x1f1d30, pattern: 'none',
  }),
  cat('angler', 'Angler', 'rare', 12, 'Carries his own reading light.', {
    body: 0x2f3d6b, accent: 0xf5df8f, pattern: 'patches', sparkles: true,
  }),
  cat('moray', 'Moray', 'rare', 12, 'Longer than she looks.', {
    body: 0x5f8a4a, accent: 0x8fd45f, pattern: 'stripes', sparkles: true,
  }),
  cat('abyss', 'Abyss', 'rare', 12, 'From further down than down goes.', {
    body: 0x1f1d38, accent: 0x4a94d9, pattern: 'patches', sparkles: true,
  }),
  cat('leviathan', 'Pearlbeard', 'legendary', 12, 'Old as the tides and twice as deep.', {
    body: 0x2f5fae, accent: 0xf7f0e8, pattern: 'stripes', sparkles: true, crown: true,
  }),

  /* --- Level 13: Fairy Garden (10) -------------------------------- */
  cat('petal', 'Petal', 'common', 13, 'Sleeps curled inside a rose.', {
    body: 0xf5b8d0, accent: 0xe08fb8, pattern: 'patches',
  }),
  cat('toadstool', 'Toadstool', 'common', 13, 'Red with white spots, like home.', {
    body: 0xe05f5f, accent: 0xfff5e8, pattern: 'patches',
  }),
  cat('dewdrop', 'Dewdrop', 'common', 13, 'Only appears before breakfast.', {
    body: 0xb8e0e8, accent: 0x8fc4d0, pattern: 'stripes',
  }),
  cat('bramblewisp', 'Wisp', 'common', 13, 'More giggle than cat.', {
    body: 0xd9e8b8, accent: 0xa8c47a, pattern: 'patches',
  }),
  cat('foxglove', 'Foxglove', 'common', 13, 'Wears the flowers as mittens.', {
    body: 0xc48fe0, accent: 0x945fb8, pattern: 'stripes',
  }),
  cat('acorncap', 'Thimble', 'common', 13, 'Small enough to ride a snail.', {
    body: 0xc9a06b, accent: 0x94703d, pattern: 'patches',
  }),
  cat('pixiedust', 'Pixie', 'rare', 13, 'Sheds actual glitter.', {
    body: 0xf0d98f, accent: 0xe88fd0, pattern: 'patches', sparkles: true,
  }),
  cat('mothwing', 'Mothwing', 'rare', 13, 'Flutters rather than walks.', {
    body: 0xd9cfc0, accent: 0x8a7a94, pattern: 'stripes', sparkles: true,
  }),
  cat('willowisp', 'Flicker', 'rare', 13, 'Leads you somewhere nice, usually.', {
    body: 0xa8e8d9, accent: 0x5fc4a8, pattern: 'patches', sparkles: true,
  }),
  cat('fairyqueen', 'Titania', 'legendary', 13, 'The garden grows where she walks.', {
    body: 0xe8c4f5, accent: 0x8fd45f, pattern: 'patches', sparkles: true, crown: true, wings: true,
  }),

  /* --- Level 14: Dreamland (10) ----------------------------------- */
  cat('snooze', 'Snooze', 'common', 14, 'Asleep in this picture. And all others.', {
    body: 0xc4b8e8, accent: 0x9488c4, pattern: 'patches',
  }),
  cat('pillow', 'Pillow', 'common', 14, 'Professionally soft.', {
    body: 0xf0e8f5, accent: 0xd0c4e0, pattern: 'patches',
  }),
  cat('lullaby', 'Lullaby', 'common', 14, 'Purrs in three-four time.', {
    body: 0x8fa8e0, accent: 0x5f7ab8, pattern: 'stripes',
  }),
  cat('twilight', 'Twilight', 'common', 14, 'Arrives just after the streetlights.', {
    body: 0x6b5f94, accent: 0xf5df8f, pattern: 'patches',
  }),
  cat('quilt', 'Quilt', 'common', 14, 'Every patch a different nap.', {
    body: 0xd9a8b8, accent: 0x8fa8e0, pattern: 'patches',
  }),
  cat('yawn', 'Yawn', 'common', 14, 'Contagious within seconds.', {
    body: 0xe0d0b8, accent: 0xb8a488, pattern: 'stripes',
  }),
  cat('reverie', 'Reverie', 'rare', 14, 'Half here, half somewhere lovely.', {
    body: 0xb8d0f5, accent: 0xe8c4f5, pattern: 'patches', sparkles: true,
  }),
  cat('nocturne', 'Nocturne', 'rare', 14, 'Plays piano while you sleep. Probably.', {
    body: 0x3d3a5f, accent: 0xc4b8e8, pattern: 'stripes', sparkles: true,
  }),
  cat('daydream', 'Daydream', 'rare', 14, 'Visits during maths lessons.', {
    body: 0xf5e0c4, accent: 0x8fc9f0, pattern: 'patches', sparkles: true,
  }),
  cat('sandmancat', 'Somnus', 'legendary', 14, 'One blink from him and it is morning.', {
    body: 0x8a7fe8, accent: 0xf5df8f, pattern: 'patches', sparkles: true, crown: true, wings: true,
  }),

  /* --- Level 15: Rainbow Realm (10) -------------------------------- */
  cat('scarlet', 'Scarlet', 'common', 15, 'The red stripe of the rainbow.', {
    body: 0xe85f5f, accent: 0xb83a3a, pattern: 'stripes',
  }),
  cat('tangerine', 'Tangerine', 'common', 15, 'The orange stripe, freshly squeezed.', {
    body: 0xf0954a, accent: 0xc46a24, pattern: 'stripes',
  }),
  cat('lemondrop', 'Lemondrop', 'common', 15, 'The yellow stripe, extra zesty.', {
    body: 0xf5df5f, accent: 0xd9b82a, pattern: 'stripes',
  }),
  cat('shamrock', 'Shamrock', 'common', 15, 'The green stripe, twice as lucky.', {
    body: 0x6bcf7f, accent: 0x3f9c4f, pattern: 'stripes',
  }),
  cat('cobalt', 'Cobalt', 'common', 15, 'The blue stripe, cool as rain.', {
    body: 0x5b9bf5, accent: 0x2f6bc4, pattern: 'stripes',
  }),
  cat('violet', 'Violet', 'common', 15, 'The purple stripe, quietly regal.', {
    body: 0xa77bf3, accent: 0x7a4fc4, pattern: 'stripes',
  }),
  cat('prism', 'Prism', 'rare', 15, 'Splits sunbeams for fun.', {
    body: 0xf0f0f5, accent: 0xe88fd0, pattern: 'patches', sparkles: true,
  }),
  cat('goldpot', 'Nugget', 'rare', 15, 'Found at the rainbow’s end, purring.', {
    body: 0xf0c43a, accent: 0xc4942a, pattern: 'patches', sparkles: true,
  }),
  cat('sundog', 'Halo', 'rare', 15, 'A second little sun, with paws.', {
    body: 0xf5e8b8, accent: 0xf0954a, pattern: 'patches', sparkles: true,
  }),
  cat('spectrum', 'Iris', 'legendary', 15, 'Every colour at once. The last cat of all.', {
    body: 0xf5f5ff, accent: 0xe85f8f, pattern: 'stripes', sparkles: true, crown: true, wings: true,
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
