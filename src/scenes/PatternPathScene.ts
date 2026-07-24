/**
 * Pattern Caterpillar.
 *
 * Not a sum at all: a caterpillar wears a number pattern along its back —
 * 4, 8, 12, 16 — and the child works out what comes next. Spotting the
 * rule is a genuinely different kind of maths from computing an answer,
 * which is exactly why this game exists.
 *
 * Questions are generated here rather than by the shared maths engine;
 * everything else (round loop, hearts, rewards) is the shared machinery.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleEllipsePoints } from '../shared/art/doodle';
import { shuffle, type Question } from '../shared/mathEngine';
import { fitText } from '../shared/ui';

/** One tappable answer leaf. */
interface Leaf {
  container: Phaser.GameObjects.Container;
  value: number;
}

export class PatternPathScene extends MiniGameScene {
  private leaves: Leaf[] = [];
  private segments: Phaser.GameObjects.Container[] = [];
  /** The empty segment waiting for the answer. */
  private gapSegment: Phaser.GameObjects.Container | null = null;

  constructor() {
    super(SCENES.patternPath, 'patternPath');
    this.optionCount = 4;
    // Pattern-spotting is harder than arithmetic, so it pays better.
    this.coinsPerCorrect = 8;
    this.catChanceBonus = 0.1;
  }

  /** Builds a number-sequence question tuned to the current tier. */
  protected override createQuestion(): Question {
    const tier = this.difficulty.tier;
    const rng = Math.random;
    const pick = (values: number[]): number => values[Math.floor(rng() * values.length)]!;

    // The pattern family grows with the tier: counting steps first, then
    // bigger strides, then doubling and descending runs.
    type Kind = 'add' | 'subtract' | 'double';
    const kinds: Kind[] = tier <= 1 ? ['add'] : tier <= 3 ? ['add', 'subtract'] : ['add', 'subtract', 'double'];
    const kind = kinds[Math.floor(rng() * kinds.length)]!;

    const stepPool =
      tier <= 1 ? [1, 2, 3, 5, 10] : tier <= 3 ? [2, 3, 4, 5, 6, 10, 25] : [6, 7, 8, 9, 11, 12, 15, 25, 50];

    const terms: number[] = [];
    let answer = 0;

    if (kind === 'double') {
      let value = pick([1, 2, 3, 4, 5]);
      for (let i = 0; i < 4; i++) {
        terms.push(value);
        value *= 2;
      }
      answer = value;
    } else {
      const step = pick(stepPool);
      const start =
        kind === 'subtract'
          ? step * 5 + Math.floor(rng() * 8) * step
          : 1 + Math.floor(rng() * (tier <= 1 ? 9 : 20));
      let value = start;
      for (let i = 0; i < 4; i++) {
        terms.push(value);
        value += kind === 'subtract' ? -step : step;
      }
      answer = value;
    }

    // Distractors are the classic slips: one step short, one step long,
    // or carrying on with the wrong stride.
    const last = terms[terms.length - 1]!;
    const stride = Math.abs(answer - last);
    const wrongs = [
      answer + stride,
      answer - stride,
      answer + 1,
      answer - 1,
      last,
      answer + Math.max(2, Math.round(stride / 2)),
    ].filter((v, i, all) => v >= 0 && v !== answer && all.indexOf(v) === i);

    const options = shuffle([answer, ...wrongs.slice(0, this.optionCount - 1)], rng);

    return {
      prompt: `${terms.join(',  ')},  …`,
      answer,
      options,
      optionLabels: options.map((v) => `${v}`),
      tier,
      operation: 'add',
      instruction: 'What comes next?',
      isEquation: false,
    };
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0xd9edb8);

    // A leafy glade: big soft leaf shapes behind everything.
    const rng = makeRng(seedFrom('pattern-glade'));
    const backdrop = this.add.graphics().setDepth(-10);
    for (let i = 0; i < 7; i++) {
      backdrop.fillStyle(i % 2 === 0 ? 0xc9e0a0 : 0xb8d48f, 1);
      backdrop.fillEllipse(
        100 + rng() * (DESIGN_WIDTH - 200),
        180 + rng() * 500,
        180 + rng() * 160,
        90 + rng() * 70,
      );
    }

    this.add.image(1130, 140, 'sun').setScale(0.5).setDepth(-9);

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22, 'Finish the caterpillar’s pattern!', textStyle(25, '#3d5f1f'))
      .setOrigin(0.5)
      .setDepth(30);
  }

  protected presentQuestion(question: Question): void {
    // The caterpillar: head, four numbered segments, one empty segment.
    const terms = question.prompt.replace(',  …', '').split(',').map((t) => t.trim());
    const baseY = 430;
    const spacing = 168;
    const startX = CENTRE_X - spacing * 2.55;

    // Head first, looking back along its own body.
    const head = this.buildSegment(startX - spacing * 0.9, baseY + 14, null, 0x8fd45f, true);
    this.segments.push(head);

    terms.forEach((term, index) => {
      const x = startX + index * spacing;
      const y = baseY + Math.sin(index * 1.1) * 26;
      const colour = index % 2 === 0 ? 0x9cd45f : 0x7ac94a;
      this.segments.push(this.buildSegment(x, y, term, colour, false, index));
    });

    // The waiting gap segment, drawn hollow.
    const gapX = startX + terms.length * spacing;
    const gapY = baseY + Math.sin(terms.length * 1.1) * 26;
    const gap = this.add.container(gapX, gapY).setDepth(10);
    const outline = this.add.graphics();
    const rng = makeRng(seedFrom('gap-segment'));
    const pts = doodleEllipsePoints(rng, 0, 0, 62, 62, 3, 20);
    outline.lineStyle(5, 0x5f8a3a, 1);
    outline.strokePoints(pts.map((p) => new Phaser.Geom.Point(p.x, p.y)), true);
    const mark = this.add
      .text(0, 0, '?', textStyle(52, '#5f8a3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    gap.add([outline, mark]);
    this.tweens.add({
      targets: gap,
      scale: { from: 0.94, to: 1.06 },
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.gapSegment = gap;
    this.segments.push(gap);

    // The answers, as tappable leaves along the bottom.
    const leafW = 200;
    const gapW = 40;
    const total = question.options.length * leafW + (question.options.length - 1) * gapW;
    const leafStart = CENTRE_X - total / 2 + leafW / 2;

    question.options.forEach((value, index) => {
      const x = leafStart + index * (leafW + gapW);
      const y = 650;

      const leafRng = makeRng(seedFrom(`leaf-${index}`));
      const bg = this.add.graphics();
      doodleShape(bg, doodleEllipsePoints(leafRng, 0, 0, 96, 52, 3, 20), PALETTE.green);
      // Centre vein, so it reads as a leaf rather than a button.
      bg.lineStyle(3, 0x3f8c3f, 1);
      bg.beginPath();
      bg.moveTo(-72, 8);
      bg.lineTo(72, -8);
      bg.strokePath();

      const label = this.add
        .text(0, 0, this.labelFor(question, index), textStyle(44, '#1f4f1f', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 148, 44);

      const container = this.add.container(x, y, [bg, label]).setDepth(12);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-100, -60, 200, 120),
        Phaser.Geom.Rectangle.Contains,
      );

      const leaf: Leaf = { container, value };
      container.on('pointerdown', () => this.onLeafTapped(leaf));
      container.on('pointerover', () =>
        this.tweens.add({ targets: container, scale: 1.07, duration: 120 }),
      );
      container.on('pointerout', () =>
        this.tweens.add({ targets: container, scale: 1, duration: 120 }),
      );

      container.setScale(0);
      this.tweens.add({
        targets: container,
        scale: 1,
        duration: 300,
        delay: index * 70,
        ease: 'Back.easeOut',
      });

      this.leaves.push(leaf);
    });
  }

  /** One caterpillar segment; the head gets a face and antennae. */
  private buildSegment(
    x: number,
    y: number,
    term: string | null,
    colour: number,
    isHead: boolean,
    index = 0,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(isHead ? 11 : 10);
    const rng = makeRng(seedFrom(`segment-${isHead ? 'head' : index}`));
    const body = this.add.graphics();
    doodleShape(body, doodleEllipsePoints(rng, 0, 0, isHead ? 58 : 62, isHead ? 58 : 62, 3, 20), colour);
    container.add(body);

    if (isHead) {
      const face = this.add.graphics();
      // Eyes and a smile.
      face.fillStyle(0x2f2b3a, 1);
      face.fillCircle(-14, -8, 7);
      face.fillCircle(14, -8, 7);
      face.fillStyle(0xffffff, 1);
      face.fillCircle(-12, -10, 2.5);
      face.fillCircle(16, -10, 2.5);
      face.lineStyle(4, 0x2f2b3a, 1);
      face.beginPath();
      face.arc(0, 10, 16, 0.15 * Math.PI, 0.85 * Math.PI);
      face.strokePath();
      // Antennae.
      face.lineStyle(4, 0x2f2b3a, 1);
      face.beginPath();
      face.moveTo(-18, -48);
      face.lineTo(-30, -76);
      face.moveTo(18, -48);
      face.lineTo(30, -76);
      face.strokePath();
      face.fillStyle(PALETTE.red, 1);
      face.fillCircle(-30, -78, 7);
      face.fillCircle(30, -78, 7);
      container.add(face);
    } else if (term !== null) {
      const label = this.add
        .text(0, 0, term, textStyle(40, '#1f3d12', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 100, 40);
      container.add(label);
    }

    // A slow idle bob, offset per segment so the body ripples.
    this.tweens.add({
      targets: container,
      y: y - 8,
      duration: 1200 + index * 130,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  protected clearQuestion(): void {
    for (const leaf of this.leaves) {
      this.tweens.killTweensOf(leaf.container);
      leaf.container.destroy();
    }
    for (const segment of this.segments) {
      this.tweens.killTweensOf(segment);
      segment.destroy();
    }
    this.leaves = [];
    this.segments = [];
    this.gapSegment = null;
  }

  private onLeafTapped(leaf: Leaf): void {
    if (!this.acceptingInput) return;

    const wasCorrect = this.submitAnswer(leaf.value, leaf.container);
    if (!wasCorrect) return;

    // The chosen number flies into the gap and the caterpillar wiggles.
    if (this.gapSegment !== null) {
      const gap = this.gapSegment;
      const rng = makeRng(seedFrom('filled-segment'));
      const fill = this.add.graphics();
      doodleShape(fill, doodleEllipsePoints(rng, 0, 0, 62, 62, 3, 20), 0x9cd45f);
      const label = this.add
        .text(0, 0, `${leaf.value}`, textStyle(40, '#1f3d12', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 100, 40);
      gap.add([fill, label]);
      gap.setScale(0.4);
      this.tweens.add({ targets: gap, scale: 1, duration: 300, ease: 'Back.easeOut' });

      for (const [index, segment] of this.segments.entries()) {
        this.tweens.add({
          targets: segment,
          y: segment.y - 18,
          duration: 160,
          yoyo: true,
          delay: index * 60,
          ease: 'Quad.easeOut',
        });
      }
    }
  }
}
