/**
 * Keeps the screen on while a live, hands-free view runs (backlog/169 — the stretching timer). Uses the
 * browser's Screen Wake Lock API, which the Android WebView supports, so no extra Capacitor plugin.
 * Where the API is missing it silently does nothing. The browser drops the lock whenever the page is
 * hidden, so it is re-requested when the page becomes visible again while still wanted.
 */
interface WakeLockSentinelLike {
  release(): Promise<void>;
}

interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>;
}

export class ScreenWakeLock {
  private sentinel: WakeLockSentinelLike | null = null;
  private wanted = false;
  private readonly onVisibility = () => {
    if (this.wanted && document.visibilityState === 'visible') {
      void this.request();
    }
  };

  async acquire(): Promise<void> {
    if (!this.wanted) {
      this.wanted = true;
      document.addEventListener('visibilitychange', this.onVisibility);
    }
    await this.request();
  }

  async release(): Promise<void> {
    this.wanted = false;
    document.removeEventListener('visibilitychange', this.onVisibility);
    const sentinel = this.sentinel;
    this.sentinel = null;
    await sentinel?.release().catch(() => undefined);
  }

  private async request(): Promise<void> {
    const wakeLock = (navigator as unknown as { wakeLock?: WakeLockLike }).wakeLock;
    if (wakeLock === undefined) {
      return;
    }
    try {
      this.sentinel = await wakeLock.request('screen');
    } catch {
      // denied (e.g. battery saver) or the page is hidden — the timer still works, the screen may dim
    }
  }
}
