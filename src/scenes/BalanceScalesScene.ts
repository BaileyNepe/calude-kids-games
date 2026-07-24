/**
 * Balance Scales.
 *
 * A missing-number puzzle: the scales show "27 + ? = 63" as a lopsided
 * seesaw, and the child picks the weight that makes both sides equal.
 * Working *backwards* from an answer is real algebraic thinking, dressed
 * up as a fairground weighing game.
 *
 * Questions are generated here (the shared engine only asks forwards);
 * the round loop, hearts and rewards are the shared machinery.
 */

import Phaser from 'phaser';
import { MiniGameScene } from '../shared/MiniGameScene';
import { CENTRE_X, DESIGN_HEIGHT, DESIGN_WIDTH, SCENES, textStyle } from '../shared/config';
import { PALETTE, makeRng, seedFrom, doodleShape, doodleRectPoints, doodleEllipsePoints } from '../shared/art/doodle';
import { generateDistractors, shuffle, type Question } from '../shared/mathEngine';
import { sfx } from '../shared/audio';
import { fitText } from '../shared/ui';

/** One tappable weight. */
interface Weight {
  container: Phaser.GameObjects.Container;
  value: number;
}

export class BalanceScalesScene extends MiniGameScene {
  private weights: Weight[] = [];
  /** Everything that tilts: beam, pans, and their labels. */
  private beamGroup: Phaser.GameObjects.Container | null = null;
  /** The "?" label on the left pan, filled in on a correct answer. */
  private mysteryLabel: Phaser.GameObjects.Text | null = null;

  constructor() {
    super(SCENES.balanceScales, 'balanceScales');
    this.optionCount = 4;
    // Missing-number puzzles are the hardest game here, and pay like it.
    this.coinsPerCorrect = 9;
    this.catChanceBonus = 0.15;
  }

  /** Builds a missing-number question: a + ? = b, or a − ? = b later on. */
  protected override createQuestion(): Question {
    const tier = this.difficulty.tier;
    const cfg = this.difficulty.config;
    const rng = Math.random;
    const randInt = (min: number, max: number): number =>
      Math.floor(rng() * (max - min + 1)) + min;

    // Numbers stay readable on a seesaw: big enough to need thought,
    // capped so the pans aren't wearing six-digit labels.
    const lo = Math.min(cfg.minOperand, 500);
    const hi = Math.min(cfg.maxOperand, 999);

    const subtractForm = tier >= 2 && rng() < 0.4;
    let prompt: string;
    let answer: number;
    let known: number;
    let result: number;

    if (subtractForm) {
      // a − ? = b, with a > b so the answer is positive.
      const a = randInt(Math.max(lo, 10), hi);
      const b = randInt(Math.max(1, Math.floor(lo / 2)), a - 1);
      answer = a - b;
      known = a;
      result = b;
      prompt = `${a} − ? = ${b}`;
    } else {
      const a = randInt(lo, hi);
      answer = randInt(Math.max(1, Math.floor(lo / 2)), hi);
      known = a;
      result = a + answer;
      prompt = `${a} + ? = ${result}`;
    }

    const distractors = generateDistractors(answer, [known, result], this.optionCount - 1, rng);
    const options = shuffle([answer, ...distractors], rng);

    return {
      prompt,
      answer,
      options,
      optionLabels: options.map((v) => `${v}`),
      tier,
      operation: subtractForm ? 'subtract' : 'add',
      instruction: 'Balance the scales!',
      isEquation: false,
    };
  }

  protected buildBackground(): void {
    this.cameras.main.setBackgroundColor(0xf5e8d0);

    // A fairground tent wall: soft stripes.
    const stripes = this.add.graphics().setDepth(-10);
    for (let i = 0; i < 10; i++) {
      stripes.fillStyle(i % 2 === 0 ? 0xf5e8d0 : 0xf0ddbd, 1);
      stripes.fillRect(i * 128, 0, 128, DESIGN_HEIGHT);
    }
    // Floorboards.
    const floor = this.add.graphics().setDepth(-9);
    floor.fillStyle(0xc9a878, 1);
    floor.fillRect(0, 600, DESIGN_WIDTH, DESIGN_HEIGHT - 600);
    floor.fillStyle(0xb8905a, 1);
    for (let x = 0; x < DESIGN_WIDTH; x += 160) floor.fillRect(x, 600, 4, DESIGN_HEIGHT - 600);

    this.add
      .text(DESIGN_WIDTH / 2, DESIGN_HEIGHT - 22, 'Pick the weight that balances the scales!', textStyle(25, '#6b4a25'))
      .setOrigin(0.5)
      .setDepth(30);
  }

  protected presentQuestion(question: Question): void {
    // Parse the prompt back into its parts for the pan labels.
    const subtract = question.prompt.includes('−');
    const [leftSide, rightSide] = question.prompt.split('=').map((s) => s.trim());
    const knownText = leftSide!.split(subtract ? '−' : '+')[0]!.trim();
    const resultText = rightSide!;

    // The pedestal, static.
    const pedestal = this.add.container(CENTRE_X, 470).setDepth(8);
    const pedRng = makeRng(seedFrom('scales-pedestal'));
    const ped = this.add.graphics();
    doodleShape(
      ped,
      [
        { x: -26, y: 0 },
        { x: 26, y: 0 },
        { x: 54, y: 138 },
        { x: -54, y: 138 },
      ],
      PALETTE.darkBrown,
      { offset: 2, lineWidth: 5 },
    );
    doodleShape(ped, doodleEllipsePoints(pedRng, 0, 140, 92, 16, 2, 18), PALETTE.brown, {
      offset: 1,
      lineWidth: 4,
    });
    pedestal.add(ped);
    this.weights.push({ container: pedestal, value: Number.NaN }); // cleaned up with the rest

    // Everything that tilts hangs off this one container.
    const group = this.add.container(CENTRE_X, 470).setDepth(9);
    const rng = makeRng(seedFrom('scales-beam'));

    const beam = this.add.graphics();
    doodleShape(beam, doodleRectPoints(rng, -330, -14, 660, 28, 3), PALETTE.brown, {
      offset: 2,
      lineWidth: 5,
    });
    group.add(beam);

    // Pans hang from each end on little chains.
    for (const dir of [-1, 1]) {
      const chains = this.add.graphics();
      chains.lineStyle(4, 0x5f5f6b, 1);
      chains.beginPath();
      chains.moveTo(dir * 310, 8);
      chains.lineTo(dir * 250, 96);
      chains.moveTo(dir * 310, 8);
      chains.lineTo(dir * 370, 96);
      chains.strokePath();
      group.add(chains);

      const pan = this.add.graphics();
      doodleShape(pan, doodleEllipsePoints(rng, dir * 310, 112, 96, 24, 2.5, 20), 0xd9b070);
      group.add(pan);
    }

    // Left pan: the known weight and the mystery box.
    const knownLabel = this.add
      .text(-352, 78, knownText, textStyle(38, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    fitText(knownLabel, 110, 38);
    const mysteryBg = this.add.graphics();
    doodleShape(mysteryBg, doodleRectPoints(rng, -304, 42, 76, 56, 2.5), PALETTE.sun, {
      offset: 1,
      lineWidth: 4,
    });
    this.mysteryLabel = this.add
      .text(-266, 70, subtract ? '−?' : '?', textStyle(36, '#8a6100', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    group.add([knownLabel, mysteryBg, this.mysteryLabel]);

    // Right pan: the target total.
    const resultLabel = this.add
      .text(310, 74, resultText, textStyle(42, '#2f2b3a', { fontStyle: 'bold' }))
      .setOrigin(0.5);
    fitText(resultLabel, 160, 42);
    group.add(resultLabel);

    // Lopsided until solved — the whole point of the picture.
    group.setAngle(subtract ? -7 : 7);
    this.tweens.add({
      targets: group,
      angle: group.angle + (subtract ? 1.6 : -1.6),
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    this.beamGroup = group;

    // The candidate weights along the bottom.
    const spacing = 240;
    const startX = CENTRE_X - ((question.options.length - 1) * spacing) / 2;

    question.options.forEach((value, index) => {
      const x = startX + index * spacing;
      const y = 692;

      const image = this.add.image(0, 0, 'block-blank').setScale(0.82);
      const label = this.add
        .text(0, 0, this.labelFor(question, index), textStyle(44, '#2f2b3a', { fontStyle: 'bold' }))
        .setOrigin(0.5);
      fitText(label, 88, 44);

      const container = this.add.container(x, y, [image, label]).setDepth(12);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-64, -64, 128, 128),
        Phaser.Geom.Rectangle.Contains,
      );

      const weight: Weight = { container, value };
      container.on('pointerdown', () => this.onWeightTapped(weight));
      container.on('pointerover', () =>
        this.tweens.add({ targets: container, scale: 1.08, duration: 120 }),
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

      this.weights.push(weight);
    });
  }

  protected clearQuestion(): void {
    for (const weight of this.weights) {
      this.tweens.killTweensOf(weight.container);
      weight.container.destroy();
    }
    this.weights = [];
    if (this.beamGroup !== null) {
      this.tweens.killTweensOf(this.beamGroup);
      this.beamGroup.destroy();
      this.beamGroup = null;
    }
    this.mysteryLabel = null;
  }

  private onWeightTapped(weight: Weight): void {
    if (!this.acceptingInput || Number.isNaN(weight.value)) return;

    const wasCorrect = this.submitAnswer(weight.value, weight.container);
    if (!wasCorrect) return;

    // The mystery box takes the weight and the beam swings level.
    sfx.whoosh();
    this.mysteryLabel?.setText(`${weight.value}`);
    this.mysteryLabel?.setFontSize(30);
    if (this.beamGroup !== null) {
      this.tweens.killTweensOf(this.beamGroup);
      this.tweens.add({
        targets: this.beamGroup,
        angle: 0,
        duration: 700,
        ease: 'Elastic.easeOut',
        easeParams: [1.1, 0.6],
      });
    }
    this.tweens.add({
      targets: weight.container,
      y: weight.container.y - 40,
      alpha: 0,
      scale: 0.6,
      duration: 380,
      ease: 'Cubic.easeIn',
    });
  }
}
