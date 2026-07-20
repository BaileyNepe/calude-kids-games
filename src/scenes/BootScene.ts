/**
 * BootScene.
 *
 * Runs once at startup. Because all the art is generated rather than
 * downloaded, "loading" here means drawing every texture into the texture
 * manager. It's fast, but doing it in one place keeps the mini-games free
 * of art code and avoids a stutter when a scene first opens.
 */

import Phaser from 'phaser';
import { SCENES, FONT, CENTRE_X, CENTRE_Y } from '../shared/config';
import { PALETTE } from '../shared/art/doodle';
import {
  makeBalloonTexture,
  makeBurstTexture,
  makeCatSilhouette,
  makeCatTexture,
  makeCloudTexture,
  makeCoinTexture,
  makeFishTexture,
  makeKidTexture,
  makeShipTexture,
  makeSkullFlagTexture,
  makeStarTexture,
  makeSunTexture,
  makeBlockTexture,
  makeSlotTexture,
  makeRocketTexture,
  makeFlameTexture,
  makeTreatTexture,
  type KidLook,
} from '../shared/art/sprites';
import { makeFaceTextures, makeIconTextures } from '../shared/art/faces';
import { makeWardrobeTextures } from '../shared/art/wardrobe';
import { CAT_CATALOG } from '../shared/pets';
import { gameState } from '../shared/gameState';

/** Colours used for balloons and fish, keyed by a stable name. */
export const PIECE_COLOURS: readonly { name: string; colour: number }[] = [
  { name: 'red', colour: PALETTE.red },
  { name: 'blue', colour: PALETTE.blue },
  { name: 'green', colour: PALETTE.green },
  { name: 'yellow', colour: PALETTE.yellow },
  { name: 'purple', colour: PALETTE.purple },
  { name: 'orange', colour: PALETTE.orange },
  { name: 'pink', colour: PALETTE.pink },
  { name: 'teal', colour: PALETTE.teal },
];

/** The treats on sale in the Cat Cafe. */
export const TREATS: readonly { name: string; label: string; colour: number; price: number }[] = [
  { name: 'fish', label: 'Fish', colour: PALETTE.teal, price: 4 },
  { name: 'milk', label: 'Milk', colour: PALETTE.white, price: 5 },
  { name: 'biscuit', label: 'Biscuits', colour: PALETTE.orange, price: 3 },
  { name: 'cake', label: 'Cake', colour: PALETTE.pink, price: 6 },
];

/**
 * The world's kids.
 *
 * The first two are taken straight from the reference drawing — the "boy"
 * in an orange top over a red skirt with teal shoes, and the "girl" in a
 * purple dress with a yellow collar and magenta shoes.
 */
export const KID_LOOKS: readonly { name: string; look: KidLook }[] = [
  {
    name: 'boy',
    look: {
      top: PALETTE.orange,
      bottom: PALETTE.red,
      hair: 0x6b4423,
      shoes: 0x1a8f7a,
      hairLength: 'short',
      bottoms: 'shorts',
      armPose: 'rightUp',
    },
  },
  {
    name: 'girl',
    look: {
      top: 0x8b7fe8,
      bottom: 0x8b7fe8,
      hair: 0x8b5a2b,
      shoes: 0xc42fb4,
      collar: PALETTE.yellow,
      hairLength: 'long',
      armPose: 'leftUp',
    },
  },
  {
    name: 'green',
    look: {
      top: PALETTE.green,
      bottom: PALETTE.teal,
      hair: 0x2f2b3a,
      shoes: PALETTE.red,
      hairLength: 'short',
      armPose: 'bothDown',
    },
  },
  {
    name: 'pink',
    look: {
      top: PALETTE.pink,
      bottom: PALETTE.purple,
      hair: 0xd98a3a,
      shoes: PALETTE.blue,
      collar: PALETTE.white,
      hairLength: 'long',
      armPose: 'rightUp',
    },
  },
  {
    name: 'blue',
    look: {
      top: PALETTE.blue,
      bottom: PALETTE.sun,
      hair: 0x4a3520,
      shoes: PALETTE.green,
      hairLength: 'short',
      armPose: 'leftUp',
    },
  },
  // Two more boys. In this drawing style the read is almost entirely hair
  // length plus a scarf, so these are short-haired, collarless, and in
  // colours the existing kids don't already use.
  {
    name: 'sam',
    look: {
      top: 0x3f7fd0,
      bottom: 0x2f4858,
      hair: 0x1f1a15,
      shoes: PALETTE.orange,
      hairLength: 'short',
      bottoms: 'shorts',
      armPose: 'rightUp',
    },
  },
  {
    name: 'leo',
    look: {
      top: 0x2fa87a,
      bottom: 0x8a5a2b,
      hair: 0xc46a1f,
      shoes: 0x2f2b3a,
      hairLength: 'short',
      bottoms: 'shorts',
      armPose: 'bothDown',
    },
  },
];

/**
 * The look belonging to one character, by name.
 *
 * Falls back to the first kid so a save naming a character that no longer
 * exists still draws somebody rather than nothing.
 */
export function getKidLook(name: string): KidLook {
  return (KID_LOOKS.find((kid) => kid.name === name) ?? KID_LOOKS[0]!).look;
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.boot);
  }

  create(): void {
    // Restore the player's save before anything reads it.
    gameState.load();

    this.cameras.main.setBackgroundColor(PALETTE.sky);

    const title = this.add
      .text(CENTRE_X, CENTRE_Y - 40, 'Math World', {
        fontFamily: FONT,
        fontSize: '84px',
        color: '#2f2b3a',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(CENTRE_X, CENTRE_Y + 50, 'Getting the crayons out…', {
        fontFamily: FONT,
        fontSize: '32px',
        color: '#2f2b3a',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: { from: 0.9, to: 1 },
      duration: 700,
      ease: 'Back.easeOut',
    });

    this.buildTextures();

    // A beat so the title is actually seen, rather than flashing past.
    // First-time players choose a character before entering the world.
    this.time.delayedCall(650, () => {
      this.scene.start(gameState.character === null ? SCENES.characterSelect : SCENES.world);
    });
  }

  /** Draws and registers every texture the game will use. */
  private buildTextures(): void {
    // Scenery and HUD.
    makeCloudTexture(this);
    makeSunTexture(this);
    makeCoinTexture(this);
    makeShipTexture(this);
    makeSkullFlagTexture(this);

    // Celebration particles.
    makeStarTexture(this, 'gold', PALETTE.sun);
    makeStarTexture(this, 'pink', PALETTE.pink);
    makeStarTexture(this, 'teal', PALETTE.teal);

    // Balloons, their burst shapes, and fish.
    for (const { name, colour } of PIECE_COLOURS) {
      makeBalloonTexture(this, name, colour);
      makeBurstTexture(this, name, colour);
      makeFishTexture(this, name, colour);
    }

    // The world's kids, plus the pirate captain.
    for (const { name, look } of KID_LOOKS) {
      makeKidTexture(this, name, look);
    }
    makeKidTexture(
      this,
      'captain',
      { top: PALETTE.red, bottom: 0x2a2636, hair: 0x3a2a18, shoes: 0x5a3a1a, hairLength: 'short' },
      'pirate',
    );

    // Pieces for the newer mini-games.
    makeBlockTexture(this, 'blank', PALETTE.brown);
    makeSlotTexture(this);
    makeRocketTexture(this);
    makeFlameTexture(this);
    for (const treat of TREATS) makeTreatTexture(this, treat.name, treat.colour);

    // Drawn faces and icons, replacing the system emoji.
    makeFaceTextures(this);
    makeIconTextures(this);
    makeWardrobeTextures(this);

    // Every collectible cat gets an idle pose and a locked silhouette.
    //
    // The three reacting expressions (open / happy / noseUp) are NOT baked
    // here. With 52 cats that would be 260 textures at boot — several
    // seconds of drawing and a lot of texture memory for faces that are
    // only ever used by whichever single cat is starring in a game. Those
    // are baked on demand instead, via ensureCatFaces().
    for (const cat of CAT_CATALOG) {
      makeCatTexture(this, cat.id, cat.look, 'idle');
      makeCatSilhouette(this, cat.id, cat.look);
    }
  }
}
