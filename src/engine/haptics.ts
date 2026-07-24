/**
 * Haptics. Uses the Capacitor Haptics plugin when running as the native iOS
 * app (Taptic Engine), and falls back to the Vibration API on the web.
 * Both are optional — the game never assumes either exists.
 */

type Style = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'select';

interface CapacitorHapticsLike {
  impact(opts: { style: string }): Promise<void>;
  notification(opts: { type: string }): Promise<void>;
  selectionStart?(): Promise<void>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  Plugins?: { Haptics?: CapacitorHapticsLike };
}

const cap = (): CapacitorGlobal | undefined => (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;

const PATTERNS: Record<Style, number | number[]> = {
  light: 8,
  medium: 16,
  heavy: 28,
  success: [10, 40, 18],
  warning: [16, 30, 16],
  error: [30, 50, 40],
  select: 5,
};

export class Haptics {
  enabled = true;
  private lastAt = 0;

  fire(style: Style = 'light'): void {
    if (!this.enabled) return;
    const now = performance.now();
    if (now - this.lastAt < 40) return; // avoid buzz-spam
    this.lastAt = now;

    const c = cap();
    const plugin = c?.Plugins?.Haptics;
    if (c?.isNativePlatform?.() && plugin) {
      try {
        if (style === 'success' || style === 'warning' || style === 'error') {
          void plugin.notification({ type: style.toUpperCase() });
        } else if (style === 'select') {
          void (plugin.selectionStart?.() ?? plugin.impact({ style: 'LIGHT' }));
        } else {
          void plugin.impact({ style: style.toUpperCase() });
        }
        return;
      } catch {
        /* fall through to web */
      }
    }
    try {
      navigator.vibrate?.(PATTERNS[style]);
    } catch {
      /* unsupported — silently ignore */
    }
  }
}

export const haptics = new Haptics();
