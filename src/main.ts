/**
 * Entry point.
 *
 * Creates the Phaser game, registers every scene, and wires up the one bit
 * of browser plumbing the game needs: unlocking audio on first interaction.
 */

import Phaser from 'phaser';
import { DESIGN_WIDTH, DESIGN_HEIGHT } from './shared/config';
import { PALETTE } from './shared/art/doodle';
import { sfx } from './shared/audio';
import { initDevMode } from './shared/devMode';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { BalloonPopScene } from './scenes/BalloonPopScene';
import { PirateShipScene } from './scenes/PirateShipScene';
import { FeedTheCatScene } from './scenes/FeedTheCatScene';
import { NumberNinjaScene } from './scenes/NumberNinjaScene';
import { BuildNumberScene } from './scenes/BuildNumberScene';
import { CatCafeScene } from './scenes/CatCafeScene';
import { RocketLaunchScene } from './scenes/RocketLaunchScene';
import { FrogPondScene } from './scenes/FrogPondScene';
import { HoneyHiveScene } from './scenes/HoneyHiveScene';
import { TreasureDiveScene } from './scenes/TreasureDiveScene';
import { MagicPotionScene } from './scenes/MagicPotionScene';
import { NumberTrainScene } from './scenes/NumberTrainScene';
import { UfoCatchScene } from './scenes/UfoCatchScene';
import { MemoryMatchScene } from './scenes/MemoryMatchScene';
import { PatternPathScene } from './scenes/PatternPathScene';
import { BalanceScalesScene } from './scenes/BalanceScalesScene';
import { CastleKnockScene } from './scenes/CastleKnockScene';
import { PetsScene } from './scenes/PetsScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';
import { CharacterSelectScene } from './scenes/CharacterSelectScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: PALETTE.sky,
  scale: {
    // FIT letterboxes the fixed design resolution into whatever space is
    // available, so one layout works on a laptop and a tablet alike.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
  },
  input: {
    // One pointer at a time: a second finger landing mid-drag would
    // otherwise steal the fish out from under the first.
    activePointers: 1,
  },
  render: {
    antialias: true,
    // The doodle art has soft edges; rounding pixels makes it look crunchy.
    roundPixels: false,
  },
  scene: [
    BootScene,
    WorldScene,
    BalloonPopScene,
    PirateShipScene,
    FeedTheCatScene,
    NumberNinjaScene,
    BuildNumberScene,
    CatCafeScene,
    RocketLaunchScene,
    FrogPondScene,
    HoneyHiveScene,
    TreasureDiveScene,
    MagicPotionScene,
    NumberTrainScene,
    UfoCatchScene,
    MemoryMatchScene,
    PatternPathScene,
    BalanceScalesScene,
    CastleKnockScene,
    PetsScene,
    SettingsScene,
    ShopScene,
    CharacterSelectScene,
  ],
};

const game = new Phaser.Game(config);

// Handy during development: lets you poke at scenes and textures from the
// browser console. Stripped from production builds.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}

// The hidden dev panel (cmd+shift+\): level jumps, free coins, and shown
// answers. Shipped in every build — the shortcut is the gate, and it needs
// a physical keyboard, which the tablets this is played on don't have.
initDevMode(game);

/**
 * Browsers will not start an AudioContext until the user has interacted
 * with the page. Listening on the document (rather than inside a scene)
 * means the very first tap anywhere unlocks sound for the whole session,
 * no matter which scene is showing.
 */
function unlockAudio(): void {
  sfx.unlock();
}
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });
