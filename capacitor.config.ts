import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web game in a native iOS shell (WKWebView) for
 * App Store distribution. The game itself makes no network requests, so the
 * shell needs no entitlements beyond the defaults.
 */
const config: CapacitorConfig = {
  appId: 'com.neonvault.game',
  appName: 'Neon Vault',
  webDir: 'dist',
  backgroundColor: '#05060dff',
  ios: {
    contentInset: 'never',
    backgroundColor: '#05060dff',
    // The game handles its own safe-area insets in CSS/canvas.
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: true,
  },
  server: {
    // Bundled assets only — never load remote content.
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#05060d',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
  },
};

export default config;
