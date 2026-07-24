/**
 * The wardrobe.
 *
 * Coins earned from maths buy hats and outfits for the player's character,
 * and collars for their cats. This is what gives coins a point beyond a
 * number ticking up in the corner.
 *
 * Pure data and logic — the drawing lives in `art/wardrobe.ts`.
 */

import { PALETTE } from './art/doodle';

/**
 * Where an item is worn.
 *
 * 'emote' items unlock extra reaction faces on the world's emote bar, and
 * 'effect' items restyle the celebration burst played on correct answers —
 * neither is "worn" on the body, but they buy, save and sell identically.
 */
export type ItemSlot = 'hat' | 'outfit' | 'collar' | 'emote' | 'effect';

/** One thing that can be bought and worn. */
export interface WardrobeItem {
  /** Stable id — this is what gets written to the save file. */
  id: string;
  name: string;
  slot: ItemSlot;
  /** Cost in coins. */
  price: number;
  /** Primary colour, used both for drawing and for the shop tile. */
  colour: number;
  /** Secondary colour, where the item has one. */
  accent?: number;
  /** A short line shown in the shop. */
  blurb: string;
}

/**
 * Everything on sale.
 *
 * Prices climb roughly with how special an item looks. A correct answer is
 * 5 coins, so the cheapest hat is about eight answers' work and the crown
 * is a genuine saving-up goal.
 */
export const WARDROBE: readonly WardrobeItem[] = [
  /* --- Hats ------------------------------------------------------ */
  {
    id: 'hat-bow',
    name: 'Big Bow',
    slot: 'hat',
    price: 40,
    colour: PALETTE.pink,
    blurb: 'A very large bow.',
  },
  {
    id: 'hat-cap',
    name: 'Cap',
    slot: 'hat',
    price: 50,
    colour: PALETTE.blue,
    accent: PALETTE.white,
    blurb: 'Worn slightly askew.',
  },
  {
    id: 'hat-party',
    name: 'Party Hat',
    slot: 'hat',
    price: 70,
    colour: PALETTE.orange,
    accent: PALETTE.yellow,
    blurb: 'For no particular reason.',
  },
  {
    id: 'hat-wizard',
    name: 'Wizard Hat',
    slot: 'hat',
    price: 140,
    colour: PALETTE.purple,
    accent: PALETTE.sun,
    blurb: 'Makes sums feel like spells.',
  },
  {
    id: 'hat-pirate',
    name: 'Pirate Hat',
    slot: 'hat',
    price: 160,
    colour: 0x2a2636,
    accent: PALETTE.white,
    blurb: 'Captain of the maths ship.',
  },
  {
    id: 'hat-crown',
    name: 'Gold Crown',
    slot: 'hat',
    price: 300,
    colour: PALETTE.sun,
    accent: PALETTE.red,
    blurb: 'For a proper maths monarch.',
  },
  {
    id: 'hat-flower',
    name: 'Flower Crown',
    slot: 'hat',
    price: 350,
    colour: PALETTE.pink,
    accent: PALETTE.green,
    blurb: 'Fresh from the meadow.',
  },
  {
    id: 'hat-top',
    name: 'Fancy Top Hat',
    slot: 'hat',
    price: 500,
    colour: 0x2f2b3a,
    accent: PALETTE.red,
    blurb: 'Terribly distinguished.',
  },
  {
    id: 'hat-halo',
    name: 'Golden Halo',
    slot: 'hat',
    price: 800,
    colour: PALETTE.sun,
    accent: PALETTE.yellow,
    blurb: 'For absolutely perfect scores.',
  },
  {
    id: 'hat-astro',
    name: 'Space Helmet',
    slot: 'hat',
    price: 1200,
    colour: 0xbfe8ff,
    accent: 0x9ca8b8,
    blurb: 'Comes with its own whoosh.',
  },
  {
    id: 'hat-royal',
    name: 'Royal Crown',
    slot: 'hat',
    price: 2500,
    colour: PALETTE.sun,
    accent: PALETTE.purple,
    blurb: 'The grandest hat in the game.',
  },

  /* --- Outfits ---------------------------------------------------- */
  {
    id: 'outfit-red',
    name: 'Red Outfit',
    slot: 'outfit',
    price: 60,
    colour: PALETTE.red,
    accent: 0xc43a3a,
    blurb: 'Bright and bold.',
  },
  {
    id: 'outfit-green',
    name: 'Green Outfit',
    slot: 'outfit',
    price: 60,
    colour: PALETTE.green,
    accent: 0x3f9c56,
    blurb: 'Good for hiding in bushes.',
  },
  {
    id: 'outfit-rainbow',
    name: 'Rainbow Outfit',
    slot: 'outfit',
    price: 180,
    colour: PALETTE.pink,
    accent: PALETTE.teal,
    blurb: 'Every colour at once.',
  },
  {
    id: 'outfit-space',
    name: 'Space Suit',
    slot: 'outfit',
    price: 260,
    colour: 0xc9d4e8,
    accent: PALETTE.blue,
    blurb: 'Ready for Level 5.',
  },
  {
    id: 'outfit-ninja',
    name: 'Ninja Suit',
    slot: 'outfit',
    price: 400,
    colour: 0x3a3548,
    accent: 0x2a2636,
    blurb: 'Silent. Swift. Good at times tables.',
  },
  {
    id: 'outfit-gold',
    name: 'Golden Outfit',
    slot: 'outfit',
    price: 1000,
    colour: PALETTE.sun,
    accent: PALETTE.orange,
    blurb: 'Shines from across the meadow.',
  },
  {
    id: 'outfit-royal',
    name: 'Royal Robes',
    slot: 'outfit',
    price: 1500,
    colour: PALETTE.purple,
    accent: PALETTE.sun,
    blurb: 'Fit for the Rainbow Realm.',
  },
  {
    id: 'outfit-star',
    name: 'Starlight Suit',
    slot: 'outfit',
    price: 2500,
    colour: 0x2f2b54,
    accent: PALETTE.sun,
    blurb: 'Woven from actual night sky.',
  },

  /* --- Cat collars ------------------------------------------------ */
  {
    id: 'collar-red',
    name: 'Red Collar',
    slot: 'collar',
    price: 45,
    colour: PALETTE.red,
    blurb: 'Smart on any cat.',
  },
  {
    id: 'collar-blue',
    name: 'Blue Collar',
    slot: 'collar',
    price: 45,
    colour: PALETTE.blue,
    blurb: 'With a little bell.',
  },
  {
    id: 'collar-bow',
    name: 'Bow Tie',
    slot: 'collar',
    price: 90,
    colour: PALETTE.purple,
    blurb: 'Extremely dapper.',
  },
  {
    id: 'collar-gold',
    name: 'Gold Collar',
    slot: 'collar',
    price: 220,
    colour: PALETTE.sun,
    accent: PALETTE.orange,
    blurb: 'For a cat of taste.',
  },
  {
    id: 'collar-rainbow',
    name: 'Rainbow Collar',
    slot: 'collar',
    price: 600,
    colour: PALETTE.pink,
    accent: PALETTE.teal,
    blurb: 'Every cat deserves a rainbow.',
  },
  {
    id: 'collar-star',
    name: 'Star Collar',
    slot: 'collar',
    price: 900,
    colour: 0x2f2b54,
    accent: PALETTE.sun,
    blurb: 'Twinkles when they trot.',
  },
  {
    id: 'collar-diamond',
    name: 'Diamond Collar',
    slot: 'collar',
    price: 1200,
    colour: 0xe8f0f7,
    accent: PALETTE.teal,
    blurb: 'Outrageously sparkly.',
  },
  {
    id: 'collar-royal',
    name: 'Royal Collar',
    slot: 'collar',
    price: 3000,
    colour: PALETTE.purple,
    accent: PALETTE.sun,
    blurb: 'The finest collar ever made.',
  },

  /* --- Emotes ------------------------------------------------------ *
   * The first four faces on the emote bar are free; these unlock the
   * rest. Ids follow `emote-<face name>` so the bar can look them up.
   */
  {
    id: 'emote-love',
    name: 'Love',
    slot: 'emote',
    price: 150,
    colour: 0xffb0c9,
    blurb: 'Heart eyes for special moments.',
  },
  {
    id: 'emote-cool',
    name: 'Cool',
    slot: 'emote',
    price: 250,
    colour: PALETTE.teal,
    blurb: 'Sunglasses. Indoors. Always.',
  },
  {
    id: 'emote-sleepy',
    name: 'Sleepy',
    slot: 'emote',
    price: 400,
    colour: 0xc9bfe8,
    blurb: 'For after a lot of maths.',
  },
  {
    id: 'emote-starstruck',
    name: 'Stars',
    slot: 'emote',
    price: 600,
    colour: PALETTE.sun,
    blurb: 'When a legendary cat appears.',
  },

  /* --- Effects ------------------------------------------------------ *
   * Restyle the burst played on every correct answer, game-wide.
   */
  {
    id: 'effect-hearts',
    name: 'Heart Burst',
    slot: 'effect',
    price: 350,
    colour: PALETTE.red,
    blurb: 'Right answers shower hearts.',
  },
  {
    id: 'effect-confetti',
    name: 'Confetti',
    slot: 'effect',
    price: 500,
    colour: PALETTE.pink,
    blurb: 'A party in every answer.',
  },
  {
    id: 'effect-fireworks',
    name: 'Fireworks',
    slot: 'effect',
    price: 900,
    colour: PALETTE.orange,
    blurb: 'The grandest sparkle money can buy.',
  },
];

/** Looks up an item by id. */
export function getItem(id: string): WardrobeItem | undefined {
  return WARDROBE.find((item) => item.id === id);
}

/** Everything for one slot, cheapest first. */
export function itemsForSlot(slot: ItemSlot): WardrobeItem[] {
  return WARDROBE.filter((item) => item.slot === slot).sort((a, b) => a.price - b.price);
}

/** The slots shown as tabs in the shop, in order. */
export const SHOP_TABS: readonly { slot: ItemSlot; label: string }[] = [
  { slot: 'hat', label: 'Hats' },
  { slot: 'outfit', label: 'Outfits' },
  { slot: 'collar', label: 'Collars' },
  { slot: 'emote', label: 'Emotes' },
  { slot: 'effect', label: 'Effects' },
];
