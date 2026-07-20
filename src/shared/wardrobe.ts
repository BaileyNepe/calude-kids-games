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

/** Where an item is worn. */
export type ItemSlot = 'hat' | 'outfit' | 'collar';

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
  { slot: 'collar', label: 'Cat Collars' },
];
