/**
 * Unit tests for the maths engine.
 *
 * These matter more than they look: a wrong distractor, a negative option,
 * or a division with a remainder is a child being told they're wrong when
 * they're right. Most tests run many iterations with real randomness to
 * catch rare bad rolls.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_OPERATIONS,
  DIFFICULTY_TIERS,
  DifficultyTracker,
  MAX_TIMES_TABLE,
  clampTier,
  generateDistractors,
  generateQuestion,
  shuffle,
  tierForMode,
  type DifficultyMode,
  type Operation,
} from './mathEngine';
import { makeRng } from './art/doodle';

const ITERATIONS = 300;
const TIERS = DIFFICULTY_TIERS.length;

/** Every (tier, operation) pair, for exhaustive sweeps. */
function eachTierAndOperation(fn: (tier: number, op: Operation) => void): void {
  for (let tier = 0; tier < TIERS; tier++) {
    for (const op of ALL_OPERATIONS) fn(tier, op);
  }
}

describe('generateQuestion — invariants across every operation', () => {
  it('always includes the correct answer exactly once', () => {
    eachTierAndOperation((tier, op) => {
      for (let i = 0; i < 40; i++) {
        const q = generateQuestion(tier, 4, Math.random, [op]);
        const matches = q.options.filter((o) => Math.abs(o - q.answer) < 1e-9);
        expect(matches).toHaveLength(1);
      }
    });
  });

  it('returns the requested number of distinct options', () => {
    eachTierAndOperation((tier, op) => {
      for (const count of [3, 4, 5]) {
        const q = generateQuestion(tier, count, Math.random, [op]);
        expect(q.options).toHaveLength(count);
        expect(new Set(q.options).size).toBe(count);
      }
    });
  });

  it('never offers a negative option', () => {
    eachTierAndOperation((tier, op) => {
      for (let i = 0; i < 40; i++) {
        const q = generateQuestion(tier, 4, Math.random, [op]);
        for (const option of q.options) expect(option).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it('gives every option a label', () => {
    eachTierAndOperation((tier, op) => {
      const q = generateQuestion(tier, 4, Math.random, [op]);
      expect(q.optionLabels).toHaveLength(q.options.length);
      for (const label of q.optionLabels) expect(label.length).toBeGreaterThan(0);
    });
  });

  it('reports the operation it used', () => {
    for (const op of ALL_OPERATIONS) {
      expect(generateQuestion(2, 4, Math.random, [op]).operation).toBe(op);
    }
  });

  it('only draws from the operations it was given', () => {
    const allowed: Operation[] = ['multiply', 'divide'];
    for (let i = 0; i < ITERATIONS; i++) {
      expect(allowed).toContain(generateQuestion(3, 4, Math.random, allowed).operation);
    }
  });

  it('falls back to addition when given no operations', () => {
    expect(generateQuestion(0, 4, Math.random, []).operation).toBe('add');
  });

  it('is deterministic for a given seed', () => {
    for (const op of ALL_OPERATIONS) {
      const a = generateQuestion(2, 4, makeRng(4242), [op]);
      const b = generateQuestion(2, 4, makeRng(4242), [op]);
      expect(a).toEqual(b);
    }
  });

  it('clamps out-of-range tiers instead of throwing', () => {
    expect(generateQuestion(-5, 4).tier).toBe(0);
    expect(generateQuestion(999, 4).tier).toBe(TIERS - 1);
  });
});

describe('arithmetic correctness', () => {
  it('addition prompts evaluate to the answer and respect the tier ceiling', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      const max = DIFFICULTY_TIERS[tier]!.maxResult;
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['add']);
        const [a, b] = q.prompt.split(' + ').map(Number);
        expect(a! + b!).toBe(q.answer);
        expect(q.answer).toBeLessThanOrEqual(max);
      }
    }
  });

  it('subtraction never goes negative and evaluates correctly', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['subtract']);
        const [a, b] = q.prompt.split(' − ').map(Number);
        expect(a! - b!).toBe(q.answer);
        expect(q.answer).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('multiplication evaluates correctly and respects the tier ceiling', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      const max = DIFFICULTY_TIERS[tier]!.maxResult;
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['multiply']);
        const [a, b] = q.prompt.split(' × ').map(Number);
        expect(a! * b!).toBe(q.answer);
        expect(q.answer).toBeLessThanOrEqual(max);
      }
    }
  });

  it('division is always exact — never a remainder', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['divide']);
        const [a, b] = q.prompt.split(' ÷ ').map(Number);
        expect(b).toBeGreaterThan(0);
        expect(a! % b!).toBe(0);
        expect(a! / b!).toBe(q.answer);
        expect(Number.isInteger(q.answer)).toBe(true);
      }
    }
  });

  it('never asks beyond the 12 times table, however big the tier', () => {
    for (const tier of DIFFICULTY_TIERS) expect(tier.maxFactor).toBeLessThanOrEqual(MAX_TIMES_TABLE);

    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const times = generateQuestion(tier, 4, Math.random, ['multiply']);
        for (const factor of times.prompt.split(' × ').map(Number)) {
          expect(factor).toBeLessThanOrEqual(MAX_TIMES_TABLE);
        }

        // Division is the same table read backwards, so both the divisor and
        // the answer have to stay inside it.
        const shared = generateQuestion(tier, 4, Math.random, ['divide']);
        const divisor = Number(shared.prompt.split(' ÷ ')[1]);
        expect(divisor).toBeLessThanOrEqual(MAX_TIMES_TABLE);
        expect(shared.answer).toBeLessThanOrEqual(MAX_TIMES_TABLE);
      }
    }
  });

  it('carries and borrows once the numbers are big enough to need it', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      if (!DIFFICULTY_TIERS[tier]!.requiresRegrouping) continue;
      // Not every single draw can be guaranteed — the generator gives up
      // after a bounded number of retries rather than hang — but a run of
      // trivial "no regrouping needed" questions is the thing to catch.
      let regrouped = 0;
      for (let i = 0; i < 100; i++) {
        const sum = generateQuestion(tier, 4, Math.random, ['add']);
        const [a, b] = sum.prompt.split(' + ').map(Number);
        // A carry shows up as the columns not simply concatenating.
        if (`${a! % 10}`.length + `${b! % 10}`.length > 0 && (a! % 10) + (b! % 10) >= 10) regrouped++;
      }
      expect(regrouped).toBeGreaterThan(20);
    }
  });
});

describe('the digit sizes each mode asks for', () => {
  /** The widest answer a mode can produce for adding. */
  function widestAnswer(mode: DifficultyMode): number {
    let widest = 0;
    const tracker = new DifficultyTracker(99, { operations: ['add'], mode });
    for (let i = 0; i < ITERATIONS; i++) {
      widest = Math.max(widest, `${tracker.nextQuestion().answer}`.length);
    }
    return widest;
  }

  it('gives Medium three and four digit sums, and Hard up to six', () => {
    expect(widestAnswer('easy')).toBeLessThanOrEqual(2);
    expect(widestAnswer('medium')).toBeGreaterThanOrEqual(3);
    expect(widestAnswer('hard')).toBeGreaterThanOrEqual(6);
  });

  it('makes Hard strictly harder than Medium, which is harder than Easy', () => {
    const smallest = (mode: DifficultyMode): number =>
      Math.min(
        ...Array.from({ length: 60 }, () => {
          const tracker = new DifficultyTracker(0, { operations: ['add'], mode });
          return tracker.nextQuestion().answer;
        }),
      );
    expect(smallest('medium')).toBeGreaterThan(smallest('easy'));
    expect(smallest('hard')).toBeGreaterThan(smallest('medium'));
  });
});

describe('the operations added for older children', () => {
  it('keeps decimal answers free of floating point dust', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['decimal']);
        // At most two decimal places, and every option printed the same way.
        for (const label of q.optionLabels) expect(label).toMatch(/^\d+\.\d{1,2}$/);
        const places = q.optionLabels[0]!.split('.')[1]!.length;
        expect(q.answer).toBeCloseTo(Number(q.answer.toFixed(places)), 10);
        // The prompt must actually evaluate to the answer.
        const [left, op, right] = q.prompt.split(' ');
        const value = op === '+' ? Number(left) + Number(right) : Number(left) - Number(right);
        expect(value).toBeCloseTo(q.answer, 8);
      }
    }
  });

  it('only asks percentages that come out whole', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['percent']);
        const [percent, amount] = q.prompt.match(/(\d+)% of (\d+)/)!.slice(1).map(Number);
        expect(Number.isInteger(q.answer)).toBe(true);
        expect(q.answer).toBe((amount! * percent!) / 100);
      }
    }
  });

  it('squares and cubes correctly, and offers the classic wrong answer', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['exponent']);
        const base = Number(q.prompt.slice(0, -1));
        const power = q.prompt.endsWith('³') ? 3 : 2;
        expect(q.answer).toBe(base ** power);
        expect(base).toBeLessThanOrEqual(MAX_TIMES_TABLE);
      }
    }
    // "7² is 14" is the mistake being tested for, so it must be on offer.
    const seen = new Set<string>();
    for (let i = 0; i < ITERATIONS; i++) {
      const q = generateQuestion(4, 4, Math.random, ['exponent']);
      const base = Number(q.prompt.slice(0, -1));
      const power = q.prompt.endsWith('³') ? 3 : 2;
      if (q.options.includes(base * power)) seen.add(q.prompt);
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('never asks what a digit is worth when that digit repeats', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['placeValue']);
        const digit = q.instruction.match(/the (\d) worth/)![1]!;
        // Ambiguity here means a right answer marked wrong.
        expect(q.prompt.split('').filter((c) => c === digit)).toHaveLength(1);

        const index = q.prompt.indexOf(digit);
        expect(q.answer).toBe(Number(digit) * 10 ** (q.prompt.length - 1 - index));
        // The number never starts with a zero.
        expect(q.prompt.startsWith('0')).toBe(false);
      }
    }
  });
});

describe('fractions', () => {
  it('supplies a picture to draw, with a proper fraction', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      for (let i = 0; i < ITERATIONS; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['fraction']);
        expect(q.visual).toBeDefined();
        const v = q.visual!;
        expect(v.numerator).toBeGreaterThan(0);
        expect(v.numerator).toBeLessThan(v.denominator);
        expect(['circle', 'bar']).toContain(v.shape);
        // The answer must match the picture.
        expect(q.answer).toBeCloseTo(v.numerator / v.denominator, 10);
      }
    }
  });

  it('only uses denominators the tier allows', () => {
    for (let tier = 0; tier < TIERS; tier++) {
      const allowed = DIFFICULTY_TIERS[tier]!.denominators;
      for (let i = 0; i < 100; i++) {
        const q = generateQuestion(tier, 4, Math.random, ['fraction']);
        expect(allowed).toContain(q.visual!.denominator);
      }
    }
  });

  it('labels every option as a fraction, with no duplicate values', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const q = generateQuestion(2, 4, Math.random, ['fraction']);
      for (const label of q.optionLabels) expect(label).toMatch(/^\d+\/\d+$/);
      // Distinct as values, so two options can never both be "correct".
      const rounded = q.options.map((o) => o.toFixed(6));
      expect(new Set(rounded).size).toBe(rounded.length);
    }
  });
});

describe('generateDistractors', () => {
  it('returns the requested count, distinct and non-negative', () => {
    for (let answer = 0; answer <= 60; answer++) {
      for (const count of [1, 2, 3, 5]) {
        const d = generateDistractors(answer, [answer, 0], count, Math.random);
        expect(d).toHaveLength(count);
        expect(new Set(d).size).toBe(count);
        for (const value of d) expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('never includes the correct answer', () => {
    for (let answer = 0; answer <= 60; answer++) {
      expect(generateDistractors(answer, [3, 4], 3, Math.random)).not.toContain(answer);
    }
  });

  it('favours near-misses over distant numbers', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      const d = generateDistractors(20, [12, 8], 3, Math.random);
      for (const value of d) expect(Math.abs(value - 20)).toBeLessThanOrEqual(10);
    }
  });

  it('copes with an answer of zero without going negative', () => {
    const d = generateDistractors(0, [0, 0], 3, Math.random);
    expect(d).toHaveLength(3);
    for (const value of d) expect(value).toBeGreaterThan(0);
  });
});

describe('shuffle', () => {
  it('keeps every element exactly once and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(input, Math.random);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('difficulty modes', () => {
  it('pins each mode inside its own band', () => {
    const bands: Record<DifficultyMode, [number, number]> = {
      easy: [0, 1],
      medium: [2, 3],
      hard: [4, 6],
      adaptive: [0, TIERS - 1],
    };
    for (const [mode, [min, max]] of Object.entries(bands) as [DifficultyMode, [number, number]][]) {
      for (let t = -3; t < TIERS + 3; t++) {
        const result = tierForMode(t, mode);
        expect(result).toBeGreaterThanOrEqual(min);
        expect(result).toBeLessThanOrEqual(max);
      }
    }
  });

  it('clampTier handles junk input', () => {
    expect(clampTier(-3)).toBe(0);
    expect(clampTier(1.9)).toBe(1);
    expect(clampTier(500)).toBe(TIERS - 1);
    expect(clampTier(NaN)).toBe(0);
  });
});

describe('DifficultyTracker', () => {
  it('advances after enough correct answers', () => {
    const tracker = new DifficultyTracker(0, { operations: ['add'], mode: 'adaptive' });
    const needed = DIFFICULTY_TIERS[0]!.correctToAdvance;
    for (let i = 0; i < needed - 1; i++) expect(tracker.recordCorrect()).toBe(false);
    expect(tracker.recordCorrect()).toBe(true);
    expect(tracker.tier).toBe(1);
  });

  it('never advances past the final tier', () => {
    const tracker = new DifficultyTracker(TIERS - 1, { operations: ['add'], mode: 'adaptive' });
    for (let i = 0; i < 100; i++) tracker.recordCorrect();
    expect(tracker.tier).toBe(TIERS - 1);
  });

  it('never advances beyond its mode’s ceiling', () => {
    const tracker = new DifficultyTracker(0, { operations: ['add'], mode: 'easy' });
    for (let i = 0; i < 100; i++) tracker.recordCorrect();
    expect(tracker.tier).toBeLessThanOrEqual(1);
  });

  it('does not demote on a wrong answer — wrong should never punish', () => {
    const tracker = new DifficultyTracker(2, { operations: ['add'], mode: 'adaptive' });
    for (let i = 0; i < 20; i++) tracker.recordWrong();
    expect(tracker.tier).toBe(2);
  });

  it('honours an explicit Hard even on the gentlest level', () => {
    // Level 1 allows tiers 0-1. Picking Hard used to be clamped into that
    // band, so a child on the Meadow who asked for Hard got tier 1 — the
    // same questions Medium was already giving, and the setting did nothing.
    const meadow = { min: 0, max: 1 };
    const hard = new DifficultyTracker(0, { operations: ['add'], mode: 'hard' }, meadow);
    expect(hard.tier).toBeGreaterThanOrEqual(4);

    const medium = new DifficultyTracker(0, { operations: ['add'], mode: 'medium' }, meadow);
    expect(medium.tier).toBeGreaterThanOrEqual(2);
    expect(hard.tier).toBeGreaterThan(medium.tier);
  });

  it('still lets the level pace things in Just Right mode', () => {
    // Adaptive is the one mode that defers to the level, because pacing the
    // climb is the entire point of it.
    const tracker = new DifficultyTracker(6, { operations: ['add'], mode: 'adaptive' }, { min: 0, max: 1 });
    expect(tracker.tier).toBe(1);
    for (let i = 0; i < 100; i++) tracker.recordCorrect();
    expect(tracker.tier).toBe(1);
  });

  it('serves questions at its current tier using the chosen operations', () => {
    const tracker = new DifficultyTracker(3, { operations: ['multiply'], mode: 'adaptive' });
    const q = tracker.nextQuestion();
    expect(q.tier).toBe(3);
    expect(q.operation).toBe('multiply');
  });
});
