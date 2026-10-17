import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType } from '@capacitor/haptics';

/**
 * The short "time is up" signal of the live views — a haptic (native) plus a WebAudio beep. Shared by
 * the Edzésnapló rest timer and (backlog/169) the stretching timer. One instance per page: it keeps a
 * single reused AudioContext, because recreating one per beep can exhaust the browser's
 * hardware-context pool on a long session. Call `dispose()` when the page goes away.
 */
export class AlertTone {
  private audioContext: AudioContext | null = null;

  /** Haptic (native only) + beep. */
  fire(): void {
    if (Capacitor.isNativePlatform()) {
      void Haptics.notification({ type: NotificationType.Success }).catch(() => undefined);
    }
    this.beep();
  }

  /** Short WebAudio tone — works in the browser and the native webview; silently no-ops if unavailable. */
  beep(frequency = 880, durationSeconds = 0.15): void {
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor === undefined) {
        return;
      }
      if (this.audioContext === null || this.audioContext.state === 'closed') {
        this.audioContext = new Ctor();
      }
      const ctx = this.audioContext;
      void ctx.resume().catch(() => undefined);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.1;
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + durationSeconds);
    } catch {
      // no audio in this environment — the haptic (native) is enough
    }
  }

  dispose(): void {
    void this.audioContext?.close().catch(() => undefined);
    this.audioContext = null;
  }
}
