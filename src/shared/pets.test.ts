/**
 * Tests for the collectible cats, levels, and the reward roll.
 *
 * The distribution test is the important one: a mistyped weight in
 * DROP_RATES would otherwise silently make legendary cats common (or
 * unobtainable) and nobody would notice until the collection felt wrong.
 */

import { describe, it, expect } from 'vitest';
import {
  CAT_CATALOG,
  DROP_RATES,
  DUPLICATE_COIN_REWARD,
  LEVELS,
  MAX_LEVEL,
  catsForLevel,
  catsOfRarity,
  collectionProgress,
  getCat,
  getLevel,
  isLevelComplete,
  levelProgress,
  rollRarity,
  rollReward,
  type Rarity,
} from './pets';

const RARITIES: Rarity[] = ['common', 'rare', 'legendary'];

describe('CAT_CATALOG', () => {
  it('has unique ids', () => {
    const ids = CAT_CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has 52 cats', () => {
    expect(CAT_CATALOG).toHaveLength(52);
  });

  it('gives every cat a name, description and a real level', () => {
    for (const cat of CAT_CATALOG) {
      expect(cat.name.length).toBeGreaterThan(0);
      expect(cat.description.length).toBeGreaterThan(0);
      expect(cat.level).toBeGreaterThanOrEqual(1);
      expect(cat.level).toBeLessThanOrEqual(MAX_LEVEL);
    }
  });

  it('gives every level cats in every rarity, so drops never dead-end', () => {
    for (const level of LEVELS) {
      for (const rarity of RARITIES) {
        expect(catsOfRarity(rarity, level.number).length).toBeGreaterThan(0);
      }
    }
  });

  it('accounts for every cat across the levels', () => {
    const counted = LEVELS.reduce((sum, l) => sum + catsForLevel(l.number).length, 0);
    expect(counted).toBe(CAT_CATALOG.length);
  });
});

describe('levels', () => {
  it('gets harder as they go, and never skips a tier band', () => {
    for (let i = 1; i < LEVELS.length; i++) {
      const previous = LEVELS[i - 1]!;
      const current = LEVELS[i]!;
      expect(current.minTier).toBeGreaterThanOrEqual(previous.minTier);
      expect(current.maxTier).toBeGreaterThanOrEqual(previous.maxTier);
      expect(current.minTier).toBeLessThanOrEqual(current.maxTier);
    }
  });

  it('clamps out-of-range level lookups', () => {
    expect(getLevel(0).number).toBe(1);
    expect(getLevel(-5).number).toBe(1);
    expect(getLevel(999).number).toBe(MAX_LEVEL);
  });

  it('reports completion only when every cat in the level is owned', () => {
    const level1 = catsForLevel(1).map((c) => c.id);
    expect(isLevelComplete([], 1)).toBe(false);
    expect(isLevelComplete(level1.slice(0, -1), 1)).toBe(false);
    expect(isLevelComplete(level1, 1)).toBe(true);
  });

  it('counts progress within a level only', () => {
    const level1 = catsForLevel(1).map((c) => c.id);
    const progress = levelProgress(level1, 2);
    expect(progress.have).toBe(0);
    expect(progress.total).toBe(catsForLevel(2).length);
  });
});

describe('rollRarity', () => {
  it('produces a distribution matching the configured weights', () => {
    const rolls = 60_000;
    const counts: Record<Rarity, number> = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < rolls; i++) counts[rollRarity()] += 1;

    const total = DROP_RATES.common + DROP_RATES.rare + DROP_RATES.legendary;
    for (const rarity of RARITIES) {
      const expected = DROP_RATES[rarity] / total;
      expect(Math.abs(counts[rarity] / rolls - expected)).toBeLessThan(0.02);
    }
  });

  it('makes common the most likely and legendary the least', () => {
    const counts: Record<Rarity, number> = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 20_000; i++) counts[rollRarity()] += 1;
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.legendary);
  });
});

describe('rollReward', () => {
  it('only ever drops cats from the level being played', () => {
    for (const level of LEVELS) {
      for (let i = 0; i < 200; i++) {
        expect(rollReward([], level.number).cat.level).toBe(level.number);
      }
    }
  });

  it('always awards a new cat when the player owns nothing', () => {
    for (let i = 0; i < 400; i++) {
      const result = rollReward([], 1);
      expect(result.isNew).toBe(true);
      expect(result.coins).toBe(0);
      expect(getCat(result.cat.id)).toBeDefined();
    }
  });

  it('never awards a duplicate while any cat in the level is missing', () => {
    const target = catsOfRarity('legendary', 1)[0]!;
    const owned = catsForLevel(1)
      .filter((c) => c.id !== target.id)
      .map((c) => c.id);

    for (let i = 0; i < 300; i++) {
      const result = rollReward(owned, 1);
      expect(result.isNew).toBe(true);
      expect(result.cat.id).toBe(target.id);
    }
  });

  it('prefers the nearest rarity band when the rolled one is exhausted', () => {
    // Own every common in level 1. Rolls landing on common should fall back
    // to rare far more often than to legendary.
    const owned = catsOfRarity('common', 1).map((c) => c.id);
    const counts: Record<Rarity, number> = { common: 0, rare: 0, legendary: 0 };
    for (let i = 0; i < 5000; i++) counts[rollReward(owned, 1).cat.rarity] += 1;

    expect(counts.common).toBe(0);
    expect(counts.rare).toBeGreaterThan(counts.legendary);
  });

  it('awards coins once every cat in the level is collected', () => {
    const owned = catsForLevel(1).map((c) => c.id);
    for (let i = 0; i < 200; i++) {
      const result = rollReward(owned, 1);
      expect(result.isNew).toBe(false);
      expect(result.coins).toBe(DUPLICATE_COIN_REWARD);
      expect(result.cat.level).toBe(1);
    }
  });
});

describe('collectionProgress', () => {
  it('counts owned cats out of the whole catalog', () => {
    expect(collectionProgress([])).toEqual({ have: 0, total: CAT_CATALOG.length });
    const two = CAT_CATALOG.slice(0, 2).map((c) => c.id);
    expect(collectionProgress(two).have).toBe(2);
  });

  it('ignores unknown ids left over from an older save', () => {
    expect(collectionProgress(['not-a-real-cat']).have).toBe(0);
  });
});
