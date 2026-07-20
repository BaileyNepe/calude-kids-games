/**
 * Shared maths engine.
 *
 * Every mini-game asks this module for questions, so difficulty and
 * question style behave consistently across the whole game.
 *
 * Five operations are supported. Each is a self-contained generator, so
 * adding another means adding one entry to OPERATIONS — nothing else in
 * the codebase changes.
 *
 * No Phaser imports here: this is pure logic and is unit tested directly.
 */

/** Arithmetic the engine can produce. */
export type Operation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'fraction'
  | 'decimal'
  | 'percent'
  | 'exponent'
  | 'placeValue';

/** All operations, in the order they're offered on the settings screen. */
export const ALL_OPERATIONS: readonly Operation[] = [
  'add',
  'subtract',
  'multiply',
  'divide',
  'fraction',
  'decimal',
  'percent',
  'exponent',
  'placeValue',
];

/**
 * Friendly names and symbols, for menus and prompts.
 *
 * The labels are what a child would say out loud, not what a syllabus calls
 * it — "Sharing" rather than "Division", "Powers" rather than "Indices".
 */
export const OPERATION_INFO: Record<Operation, { label: string; symbol: string }> = {
  add: { label: 'Adding', symbol: '+' },
  subtract: { label: 'Taking away', symbol: '−' },
  multiply: { label: 'Times', symbol: '×' },
  divide: { label: 'Sharing', symbol: '÷' },
  fraction: { label: 'Fractions', symbol: '½' },
  decimal: { label: 'Decimals', symbol: '·' },
  percent: { label: 'Percent', symbol: '%' },
  exponent: { label: 'Powers', symbol: 'x²' },
  placeValue: { label: 'Place value', symbol: '100s' },
};

/**
 * Operations whose answer is not a whole number.
 *
 * Games that spell the answer out digit by digit (Build a Number) can't
 * express these, so they filter them out rather than rendering "0.5" as
 * three digit blocks — one of which would be a full stop.
 */
export const NON_INTEGER_OPERATIONS: readonly Operation[] = ['fraction', 'decimal'];

/**
 * How a fraction question should be drawn.
 *
 * Fractions are taught visually at this age: the child sees a shape with
 * some parts shaded and picks the fraction that matches. No symbolic
 * fraction arithmetic.
 */
export interface FractionVisual {
  numerator: number;
  denominator: number;
  shape: 'circle' | 'bar';
}

/** A question handed to a mini-game. */
export interface Question {
  /** Human-readable prompt, e.g. "12 ÷ 3". Empty for visual fractions. */
  prompt: string;
  /**
   * The correct answer as a number. For fractions this is the decimal
   * value (0.5 for a half), which keeps every game's comparison logic
   * identical.
   */
  answer: number;
  /** Shuffled choices including the answer. */
  options: number[];
  /** What to print on each option, index-matched to `options`. */
  optionLabels: string[];
  /** Which tier this came from. */
  tier: number;
  /** Which operation produced it. */
  operation: Operation;
  /** Present only for fraction questions: the picture to draw. */
  visual?: FractionVisual;
  /** A short instruction shown above the answers. */
  instruction: string;
  /**
   * Whether the prompt is a sum waiting to be completed, so that "= ?"
   * belongs after it. Place value asks about a number rather than setting
   * one equal to something: "9159 = ?" is simply false when the answer
   * being asked for is 50.
   */
  isEquation: boolean;
}

/** How hard the player wants it. */
export type DifficultyMode = 'easy' | 'medium' | 'hard' | 'adaptive';

/** What the player chose on the settings screen. */
export interface MathSettings {
  /** Which operations to draw from. Never empty — falls back to addition. */
  operations: Operation[];
  mode: DifficultyMode;
}

/** The default for a new player: addition only, adapting as they improve. */
export const DEFAULT_MATH_SETTINGS: MathSettings = {
  operations: ['add'],
  mode: 'adaptive',
};

/**
 * The times table nothing may exceed.
 *
 * Multiplying and dividing are meant to be *recall*, not long multiplication,
 * so both stay inside the tables a child learns by heart however big the
 * addition gets. Every tier's `maxFactor` is checked against this.
 */
export const MAX_TIMES_TABLE = 12;

/** One rung on the difficulty ladder. */
export interface DifficultyTier {
  name: string;
  /** Smallest operand. */
  minOperand: number;
  /** Largest operand. */
  maxOperand: number;
  /** Ceiling on the result. */
  maxResult: number;
  /** Largest multiplication table used at this tier. Never above 12. */
  maxFactor: number;
  /** Denominators allowed for fraction questions. */
  denominators: number[];
  /** Correct answers needed within a session to move up. */
  correctToAdvance: number;
  /**
   * Whether adding and taking away must carry or borrow.
   *
   * Without this, big numbers are a fraud: 300000 + 400000 has six digits
   * and takes no thought at all. Requiring a regroup is what makes a
   * multi-digit sum genuinely harder rather than merely longer.
   */
  requiresRegrouping: boolean;
}

/**
 * The difficulty ladder, easiest first.
 *
 * The first two rungs stay gentle — this is where a child starts and where
 * "Easy" lives. From tier 2 the numbers grow by a digit at a time, so the
 * top of the ladder is six-digit arithmetic with carrying.
 *
 * Times tables deliberately do *not* grow with the rest: they stop at 12
 * (see MAX_TIMES_TABLE) because beyond that it stops being recall.
 */
export const DIFFICULTY_TIERS: readonly DifficultyTier[] = [
  {
    name: 'Warm up',
    minOperand: 1,
    maxOperand: 8,
    maxResult: 10,
    maxFactor: 3,
    denominators: [2, 4],
    correctToAdvance: 4,
    requiresRegrouping: false,
  },
  {
    name: 'Getting it',
    minOperand: 2,
    maxOperand: 15,
    maxResult: 20,
    maxFactor: 5,
    denominators: [2, 3, 4],
    correctToAdvance: 5,
    requiresRegrouping: false,
  },
  {
    // Three digits: the bottom of "Medium".
    name: 'Nice work',
    minOperand: 100,
    maxOperand: 899,
    maxResult: 999,
    maxFactor: 8,
    denominators: [2, 3, 4, 5],
    correctToAdvance: 5,
    requiresRegrouping: true,
  },
  {
    // Four digits.
    name: 'Tricky',
    minOperand: 1000,
    maxOperand: 8999,
    maxResult: 9999,
    maxFactor: 10,
    denominators: [2, 3, 4, 5, 6],
    correctToAdvance: 5,
    requiresRegrouping: true,
  },
  {
    // Four digits again, but now on full 12 times tables — the bottom of
    // "Hard", so it steps up in tables rather than in digits.
    name: 'Maths star',
    minOperand: 2000,
    maxOperand: 8999,
    maxResult: 9999,
    maxFactor: 12,
    denominators: [2, 3, 4, 5, 6, 8],
    correctToAdvance: 6,
    requiresRegrouping: true,
  },
  {
    // Five digits.
    name: 'Brainiac',
    minOperand: 10000,
    maxOperand: 89999,
    maxResult: 99999,
    maxFactor: 12,
    denominators: [2, 3, 4, 5, 6, 8, 10],
    correctToAdvance: 6,
    requiresRegrouping: true,
  },
  {
    // Six digits: the top of the ladder.
    name: 'Legend',
    minOperand: 100000,
    maxOperand: 899999,
    maxResult: 999999,
    maxFactor: 12,
    denominators: [2, 3, 4, 5, 6, 8, 10, 12],
    correctToAdvance: 8,
    requiresRegrouping: true,
  },
];

/**
 * Which tiers each difficulty mode may use.
 *
 * The bands don't overlap, so the three named modes are visibly different
 * things rather than three shades of the same one:
 *
 *   Easy    tiers 0-1 — up to 20
 *   Medium  tiers 2-3 — three and four digits
 *   Hard    tiers 4-6 — four to six digits
 */
const MODE_TIERS: Record<DifficultyMode, { min: number; max: number }> = {
  easy: { min: 0, max: 1 },
  medium: { min: 2, max: 3 },
  hard: { min: 4, max: 6 },
  // Adaptive roams the whole ladder, climbing as the player gets things right.
  adaptive: { min: 0, max: 6 },
};

/** Random integer in [min, max] inclusive. */
function randomInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/** Fisher-Yates shuffle, returning a new array. */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Clamps a tier index into the valid range. */
export function clampTier(tier: number): number {
  if (!Number.isFinite(tier)) return 0;
  return Math.max(0, Math.min(DIFFICULTY_TIERS.length - 1, Math.floor(tier)));
}

/** Clamps a tier into the band a difficulty mode allows. */
export function tierForMode(tier: number, mode: DifficultyMode): number {
  const band = MODE_TIERS[mode];
  return Math.max(band.min, Math.min(band.max, clampTier(tier)));
}

/** Greatest common divisor, for reducing fractions. */
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** The digits of a number, least significant first. */
function digitsOf(value: number): number[] {
  const out: number[] = [];
  let rest = Math.abs(Math.floor(value));
  do {
    out.push(rest % 10);
    rest = Math.floor(rest / 10);
  } while (rest > 0);
  return out;
}

/** True if `a + b` carries in at least one column. */
function carries(a: number, b: number): boolean {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let carry = 0;
  for (let i = 0; i < Math.max(da.length, db.length); i++) {
    const sum = (da[i] ?? 0) + (db[i] ?? 0) + carry;
    if (sum >= 10) return true;
    carry = 0;
  }
  return false;
}

/** True if `a − b` needs a borrow in at least one column. */
function borrows(a: number, b: number): boolean {
  const da = digitsOf(a);
  const db = digitsOf(b);
  let borrow = 0;
  for (let i = 0; i < db.length; i++) {
    const top = (da[i] ?? 0) - borrow;
    if (top < (db[i] ?? 0)) return true;
    borrow = 0;
  }
  return false;
}

/**
 * Picks a pair of operands whose sum fits under the tier's ceiling.
 *
 * The second operand is bounded by what's left of the ceiling rather than
 * generated and rejected. Rejection sampling was fine when the ceiling was
 * 100, but at six digits nearly every pair would be thrown away and the old
 * fallback (`b = maxResult - a`) produced the same sum every time.
 */
function addendsUnderCeiling(tier: DifficultyTier, rng: () => number): [number, number] {
  const headroom = Math.max(tier.minOperand, tier.maxResult - tier.minOperand);
  const a = randomInt(tier.minOperand, Math.min(tier.maxOperand, headroom), rng);
  const bMax = Math.max(tier.minOperand, Math.min(tier.maxOperand, tier.maxResult - a));
  return [a, randomInt(tier.minOperand, bMax, rng)];
}

/**
 * Builds plausible wrong answers for a whole-number question.
 *
 * The point is that distractors must be *tempting* — the near-misses a
 * child actually makes — not random numbers dismissible at a glance.
 * Candidates are tried in order of how believable they are:
 *
 *   0. the operation's own signature mistake, when it has one (`hints`)
 *   1. off by one, then off by two (miscounting)
 *   2. off by ten (place-value slips, once numbers are big enough)
 *   3. the operands themselves (answering the wrong question)
 *   4. wider near-misses
 *
 * `hints` come first because they beat any generic near-miss: for 7² the
 * tempting wrong answer is 14, which none of the rules below would ever
 * produce.
 *
 * Results are always distinct, non-negative, and never the right answer.
 */
export function generateDistractors(
  answer: number,
  operands: readonly number[],
  count: number,
  rng: () => number,
  hints: readonly number[] = [],
): number[] {
  const candidates: number[] = [];
  candidates.push(...hints);
  candidates.push(...shuffle([answer + 1, answer - 1], rng));
  candidates.push(...shuffle([answer + 2, answer - 2], rng));
  // A place-value slip in *any* column, not just the tens: with a six-digit
  // answer, being out by a thousand is the mistake actually made.
  for (let place = 10; place <= answer; place *= 10) {
    candidates.push(...shuffle([answer + place, answer - place], rng));
  }
  candidates.push(...shuffle(operands, rng));
  candidates.push(...shuffle([answer + 3, answer - 3, answer + 4, answer + 5, answer - 4], rng));

  const chosen: number[] = [];
  for (const candidate of candidates) {
    if (chosen.length === count) break;
    if (candidate === answer || candidate < 0 || chosen.includes(candidate)) continue;
    chosen.push(candidate);
  }

  // Safety net for very small answers, where the lists above can run dry.
  let offset = 6;
  while (chosen.length < count) {
    for (const candidate of [answer + offset, answer - offset]) {
      if (chosen.length === count) break;
      if (candidate === answer || candidate < 0 || chosen.includes(candidate)) continue;
      chosen.push(candidate);
    }
    offset += 1;
    if (offset > count * 4 + 20) break;
  }
  return chosen;
}

/** The result of one operation's generator, before options are assembled. */
interface Generated {
  prompt: string;
  answer: number;
  /** Numbers the child can see, used to build tempting distractors. */
  operands: number[];
  instruction: string;
  visual?: FractionVisual;
  /**
   * Ready-made options, for operations whose answers aren't plain whole
   * numbers (fractions, decimals) or whose best distractors are structural
   * rather than numeric (place value). The correct answer must be first;
   * `generateQuestion` shuffles them.
   */
  presetOptions?: { value: number; label: string }[];
  /** Extra distractors to try first — the classic mistake for this operation. */
  distractorHints?: number[];
  /** Set false when the prompt is not a sum to complete. Defaults to true. */
  isEquation?: boolean;
}

/** Formats a fraction for display. */
function fractionLabel(numerator: number, denominator: number): string {
  return `${numerator}/${denominator}`;
}

/**
 * Formats a decimal to a fixed number of places.
 *
 * Always the same number of places across every option on screen, so the
 * child compares like with like instead of spotting the odd one out by
 * its shape.
 */
function decimalLabel(value: number, places: number): string {
  return value.toFixed(places);
}

/** The per-operation generators. */
const OPERATIONS: Record<Operation, (tier: DifficultyTier, rng: () => number) => Generated> = {
  add: (tier, rng) => {
    let [a, b] = addendsUnderCeiling(tier, rng);
    // Re-roll for a carry, but never loop forever: at the gentle tiers a
    // carry may be impossible, and a question is better than a hang.
    if (tier.requiresRegrouping) {
      for (let i = 0; i < 24 && !carries(a, b); i++) [a, b] = addendsUnderCeiling(tier, rng);
    }
    return {
      prompt: `${a} + ${b}`,
      answer: a + b,
      operands: [a, b],
      instruction: 'Add them up!',
    };
  },

  subtract: (tier, rng) => {
    // Ordered largest-first so the answer is never negative.
    const draw = (): [number, number] => {
      const x = randomInt(tier.minOperand, tier.maxOperand, rng);
      const y = randomInt(tier.minOperand, tier.maxOperand, rng);
      return x >= y ? [x, y] : [y, x];
    };
    let [a, b] = draw();
    if (tier.requiresRegrouping) {
      for (let i = 0; i < 24 && !borrows(a, b); i++) [a, b] = draw();
    }
    return {
      prompt: `${a} − ${b}`,
      answer: a - b,
      operands: [a, b],
      instruction: 'Take it away!',
    };
  },

  multiply: (tier, rng) => {
    // Capped at the 12 times table however big the tier's other numbers get.
    const top = Math.min(tier.maxFactor, MAX_TIMES_TABLE);
    let a = 0;
    let b = 0;
    for (let i = 0; i < 40; i++) {
      a = randomInt(2, top, rng);
      b = randomInt(2, top, rng);
      if (a * b <= tier.maxResult) break;
    }
    if (a * b > tier.maxResult) b = 2;
    return {
      prompt: `${a} × ${b}`,
      answer: a * b,
      operands: [a, b],
      instruction: 'How many altogether?',
    };
  },

  divide: (tier, rng) => {
    // Built backwards from a known product, so division is always exact —
    // remainders are well beyond what this age group needs. Both sides stay
    // inside the 12 times table, which is the point of dividing at all.
    const top = Math.min(tier.maxFactor, MAX_TIMES_TABLE);
    const divisor = randomInt(2, Math.max(2, top), rng);
    // Dividing by something to get 1 back is not a question. Once the child
    // is past the warm-up tiers, the answer is always at least 2.
    const minQuotient = tier.requiresRegrouping ? 2 : 1;
    const quotient = randomInt(minQuotient, Math.max(minQuotient, top), rng);
    const dividend = divisor * quotient;
    return {
      prompt: `${dividend} ÷ ${divisor}`,
      answer: quotient,
      operands: [dividend, divisor],
      instruction: 'Share them out!',
    };
  },

  fraction: (tier, rng) => {
    const denominators = tier.denominators;
    const denominator = denominators[randomInt(0, denominators.length - 1, rng)]!;
    const numerator = randomInt(1, denominator - 1, rng);
    const value = numerator / denominator;

    // Distractors are other real fractions the child could plausibly read
    // off the picture: a neighbouring numerator, and the same numerator
    // over a neighbouring denominator.
    const pool: { value: number; label: string }[] = [];
    const add = (n: number, d: number): void => {
      if (n <= 0 || d <= 1 || n >= d) return;
      const v = n / d;
      if (Math.abs(v - value) < 1e-9) return;
      if (pool.some((p) => Math.abs(p.value - v) < 1e-9)) return;
      pool.push({ value: v, label: fractionLabel(n, d) });
    };
    add(numerator + 1, denominator);
    add(numerator - 1, denominator);
    add(numerator, denominator + 1);
    add(numerator, Math.max(2, denominator - 1));
    add(denominator - numerator, denominator);
    for (const d of denominators) add(1, d);

    // Show the answer in its simplest form, which is how a child would say it.
    const divisor = gcd(numerator, denominator);
    return {
      prompt: '',
      answer: value,
      operands: [numerator, denominator],
      instruction: 'How much is shaded?',
      visual: { numerator, denominator, shape: rng() < 0.5 ? 'circle' : 'bar' },
      presetOptions: [
        { value, label: fractionLabel(numerator / divisor, denominator / divisor) },
        ...shuffle(pool, rng),
      ],
    };
  },

  /**
   * Adding and taking away decimals.
   *
   * Everything is computed in whole tenths/hundredths and only divided at
   * the end. Doing the arithmetic in floating point would hand a child
   * 0.30000000000000004 as the right answer.
   */
  decimal: (tier, rng) => {
    const places = tier.requiresRegrouping ? 2 : 1;
    const scale = 10 ** places;
    // The whole part stays small — the difficulty here is the decimal point,
    // not the magnitude, and "1234.56 + 8765.43" is just noise.
    const wholeMax = tier.requiresRegrouping ? Math.min(tier.maxOperand, 99) : 9;
    const cap = wholeMax * scale + (scale - 1);

    let a = randomInt(1, cap, rng);
    let b = randomInt(1, cap, rng);
    const isSubtraction = rng() < 0.5;
    if (isSubtraction && b > a) [a, b] = [b, a];

    const result = isSubtraction ? a - b : a + b;
    const value = result / scale;

    // Near-misses are generated on the whole-number form and scaled back
    // down, which gives "out by a tenth" and "out by one" for free.
    const hints = generateDistractors(result, [a, b], 6, rng).map((n) => n / scale);

    return {
      prompt: `${decimalLabel(a / scale, places)} ${isSubtraction ? '−' : '+'} ${decimalLabel(b / scale, places)}`,
      answer: value,
      operands: [a, b],
      instruction: isSubtraction ? 'Take it away!' : 'Add them up!',
      presetOptions: [value, ...hints].map((v) => ({ value: v, label: decimalLabel(v, places) })),
    };
  },

  /**
   * A percentage of an amount.
   *
   * The amount is always a multiple of whatever makes the answer whole, so
   * "15% of 240" is fair game but nothing ever lands on a fraction of a
   * unit. Distractors include the amount's 10% and 50%, which is what a
   * child lands on when they reach for the easy percentage instead.
   */
  percent: (tier, rng) => {
    const friendly = tier.requiresRegrouping
      ? [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90]
      : [10, 25, 50, 100];
    const percent = friendly[randomInt(0, friendly.length - 1, rng)]!;

    // Whatever percentage was picked, this step keeps the answer a whole
    // number: 15% needs multiples of 20, 25% needs multiples of 4.
    const step = 100 / gcd(percent, 100);
    // Floored at 100 so the gentle tiers still ask about a sensible amount.
    // "25% of 4" is a stranger question than "25% of 60", not an easier one.
    const ceiling = Math.min(Math.max(tier.maxResult, 100), 10000);
    const maxSteps = Math.max(1, Math.floor(ceiling / step));
    const amount = randomInt(1, maxSteps, rng) * step;
    const answer = (amount * percent) / 100;

    return {
      prompt: `${percent}% of ${amount}`,
      answer,
      operands: [amount, percent],
      instruction: 'How much is that?',
      distractorHints: [amount / 10, amount / 2, (amount * percent) / 1000].filter(
        (n) => Number.isInteger(n) && n >= 0,
      ),
    };
  },

  /**
   * Squares, and cubes once the child is high enough up the ladder.
   *
   * Capped by the same 12 times table as multiplying, because that's what a
   * square is. The signature mistake — reading 7² as 7 × 2 — is fed in as a
   * distractor hint, since no generic near-miss rule would ever produce it.
   */
  exponent: (tier, rng) => {
    const squareTop = Math.min(tier.maxFactor, MAX_TIMES_TABLE);
    // Cubes only at the top of the ladder, and only small ones: 5³ is 125,
    // 12³ is not a question for this age group.
    const allowCubes = tier.maxFactor >= MAX_TIMES_TABLE;
    const power = allowCubes && rng() < 0.3 ? 3 : 2;
    const base = power === 3 ? randomInt(2, 5, rng) : randomInt(2, Math.max(3, squareTop), rng);
    const answer = power === 3 ? base * base * base : base * base;

    return {
      prompt: `${base}${power === 3 ? '³' : '²'}`,
      answer,
      operands: [base, power],
      instruction: power === 3 ? 'Times itself, three times!' : 'Times it by itself!',
      // base × power is the classic slip; base + base and one power out are
      // the other two a child actually writes down.
      distractorHints: [base * power, base + base, power === 3 ? base * base : base * base * base],
    };
  },

  /**
   * What one digit is worth inside a bigger number.
   *
   * The width of the number follows the tier, so this grows alongside the
   * six-digit arithmetic rather than staying a tens-and-ones exercise. The
   * options are the same digit at every other column — 7, 70, 700, 7000 —
   * which is precisely the confusion being tested.
   */
  placeValue: (tier, rng) => {
    const width = Math.max(2, Math.min(6, `${tier.maxResult}`.length));

    // Build the number digit by digit so its width is exact.
    const digits: number[] = [];
    for (let i = 0; i < width; i++) digits.push(randomInt(i === 0 ? 1 : 0, 9, rng));

    // The column being asked about is then forced to a digit that appears
    // nowhere else. Without this the question can be unanswerable: "what is
    // the 5 worth in 55352" has three different right answers, and the child
    // gets marked wrong for picking one of the other two. Six digits can
    // never use up 1-9, so there is always a free one.
    const index = randomInt(0, width - 1, rng);
    const used = new Set(digits.filter((_, i) => i !== index));
    const free = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((d) => !used.has(d));
    const digit = free[randomInt(0, free.length - 1, rng)]!;
    digits[index] = digit;

    // Written left to right, so the column's value counts back from the end.
    const chosen = { d: digit, i: index };
    const place = 10 ** (width - 1 - index);
    const number = Number(digits.join(''));
    const answer = digit * place;

    const options: { value: number; label: string }[] = [];
    const offer = (value: number): void => {
      if (value === answer || value <= 0) return;
      if (options.some((o) => o.value === value)) return;
      options.push({ value, label: `${value}` });
    };
    // The same digit read in the wrong column — the mistake being tested.
    for (let p = 0; p < width; p++) offer(chosen.d * 10 ** p);
    // Then the other digits of the number, which are at least on the screen.
    digits.forEach((d, i) => {
      offer(d);
      offer(d * 10 ** (width - 1 - i));
    });
    // A two-digit number only offers one wrong column, so reach one or two
    // past the number's own width. No further: nobody believes 8000000 is
    // what the 8 in 837 is worth, and a dismissible option is a wasted one.
    for (let p = width; p < width + 2; p++) offer(chosen.d * 10 ** p);

    return {
      prompt: `${number}`,
      answer,
      operands: [number, chosen.d],
      instruction: `What is the ${chosen.d} worth?`,
      isEquation: false,
      // Left in priority order rather than shuffled — generateQuestion
      // shuffles what it keeps, so shuffling here would only let a far-
      // fetched option displace a tempting one.
      presetOptions: [{ value: answer, label: `${answer}` }, ...options],
    };
  },
};

/**
 * Generates one question.
 *
 * @param tier Index into DIFFICULTY_TIERS. Out-of-range values are clamped.
 * @param optionCount How many choices to return, including the right one.
 * @param rng Injectable randomness — tests pass a seeded generator.
 * @param operations Which operations to choose from. Defaults to addition.
 */
export function generateQuestion(
  tier: number,
  optionCount = 4,
  rng: () => number = Math.random,
  operations: readonly Operation[] = ['add'],
): Question {
  const tierIndex = clampTier(tier);
  const config = DIFFICULTY_TIERS[tierIndex]!;

  const pool = operations.length > 0 ? operations : (['add'] as const);
  const operation = pool[randomInt(0, pool.length - 1, rng)]!;
  const generated = OPERATIONS[operation](config, rng);

  let options: number[];
  let labels: string[];

  if (generated.presetOptions !== undefined) {
    // Fractions, decimals and place value bring their own labelled options.
    // The answer is first in the list, so taking them in order can never
    // drop it — but duplicates must go, or two options could both be right.
    const picked: { value: number; label: string }[] = [];
    for (const option of generated.presetOptions) {
      if (picked.length === optionCount) break;
      if (option.value < 0) continue;
      if (picked.some((p) => Math.abs(p.value - option.value) < 1e-9)) continue;
      picked.push(option);
    }

    // If the pool was thin, top it up: simple unit fractions for a picture
    // question, whole-number near-misses for anything else.
    const isPicture = generated.visual !== undefined;
    let extra = 2;
    while (picked.length < optionCount && extra <= 20) {
      const value = isPicture ? 1 / extra : generated.answer + extra;
      const label = isPicture ? fractionLabel(1, extra) : `${value}`;
      if (value >= 0 && !picked.some((p) => Math.abs(p.value - value) < 1e-9)) {
        picked.push({ value, label });
      }
      extra += 1;
    }

    const shuffled = shuffle(picked, rng);
    options = shuffled.map((p) => p.value);
    labels = shuffled.map((p) => p.label);
  } else {
    const distractors = generateDistractors(
      generated.answer,
      generated.operands,
      optionCount - 1,
      rng,
      generated.distractorHints ?? [],
    );
    options = shuffle([generated.answer, ...distractors], rng);
    labels = options.map((n) => `${n}`);
  }

  return {
    prompt: generated.prompt,
    answer: generated.answer,
    options,
    optionLabels: labels,
    tier: tierIndex,
    operation,
    instruction: generated.instruction,
    isEquation: generated.isEquation ?? true,
    ...(generated.visual !== undefined ? { visual: generated.visual } : {}),
  };
}

/**
 * Tracks difficulty within a single play session.
 *
 * A game creates one when a round starts, seeded with the player's best
 * tier so far. Correct answers push it up; wrong answers never push it
 * down — being demoted would feel like a punishment, which this game
 * deliberately avoids.
 *
 * In easy/medium/hard the tier is pinned inside that mode's band; only
 * adaptive roams the whole ladder.
 */
export class DifficultyTracker {
  private tierIndex: number;
  private correctInTier = 0;
  private readonly settings: MathSettings;
  /** The tier range the current level allows. */
  private readonly band: { min: number; max: number };

  /**
   * @param startTier Where to begin, usually the player's best so far.
   * @param settings  Chosen operations and difficulty mode.
   * @param band      The level's tier range. Defaults to the whole ladder.
   */
  constructor(
    startTier = 0,
    settings: MathSettings = DEFAULT_MATH_SETTINGS,
    band: { min: number; max: number } = { min: 0, max: DIFFICULTY_TIERS.length - 1 },
  ) {
    this.settings = settings;

    // An explicit Easy/Medium/Hard is the player's own choice and outranks
    // the level's band. It used to be the other way round, which made the
    // setting a lie: Level 1 allows tiers 0-1, so picking "Hard" (tiers 4-6)
    // was clamped straight back down to tier 1 — the same questions Medium
    // was already giving. Only "Just right" defers to the level, because
    // pacing the climb is the whole point of that mode.
    this.band =
      settings.mode === 'adaptive'
        ? { min: clampTier(band.min), max: clampTier(band.max) }
        : { ...MODE_TIERS[settings.mode] };

    // Within the band, start from where the player left off, so a child who
    // has been climbing doesn't restart at the bottom of the band each round.
    this.tierIndex = Math.max(this.band.min, Math.min(this.band.max, clampTier(startTier)));
  }

  get tier(): number {
    return this.tierIndex;
  }

  get config(): DifficultyTier {
    return DIFFICULTY_TIERS[this.tierIndex]!;
  }

  /** The highest tier reachable: whichever of mode and level is stricter. */
  private get ceiling(): number {
    return Math.min(MODE_TIERS[this.settings.mode].max, this.band.max);
  }

  /**
   * Records a correct answer, advancing the tier if enough have been
   * answered at this level.
   * @returns true if the player just levelled up.
   */
  recordCorrect(): boolean {
    this.correctInTier += 1;
    if (this.correctInTier >= this.config.correctToAdvance && this.tierIndex < this.ceiling) {
      this.tierIndex += 1;
      this.correctInTier = 0;
      return true;
    }
    return false;
  }

  /**
   * Records a wrong answer.
   *
   * Deliberately a no-op on difficulty. It exists so calling code reads
   * symmetrically, and gives one obvious place to change if the design
   * ever wants easing-off behaviour.
   */
  recordWrong(): void {
    // Intentionally empty — see doc comment.
  }

  /** Asks for the next question at the current difficulty. */
  nextQuestion(optionCount = 4, rng: () => number = Math.random): Question {
    return generateQuestion(this.tierIndex, optionCount, rng, this.settings.operations);
  }
}
