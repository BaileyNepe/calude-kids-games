import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web game in a native iOS shell.
 *
 * The game itself needs no changes — Capacitor serves `dist/` inside a
 * WKWebView. Rebuild and sync with:
 *
 *   npm run ios:sync
 */
const config: CapacitorConfig = {
  // Change this if you'd rather use your own domain in reverse order.
  // It must match the bundle identifier set in Xcode and App Store Connect.
  appId: 'com.mathworld.game',
  appName: 'Math World',
  webDir: 'dist',

  ios: {
    // The game is landscape and draws its own background, so the web view
    // should not bounce or show scroll indicators.
    scrollEnabled: false,
    // Matches the sky colour, so the area behind the canvas isn't white
    // during rotation.
    backgroundColor: '#7ecbff',
    // Keeps the status bar out of the way of the game.
    contentInset: 'never',
  },

  server: {
    // Local files rather than a remote URL — the game works fully offline.
    androidScheme: 'https',
  },
};

export default config;
