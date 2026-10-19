import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { IonBadge, IonButton, IonIcon, IonSpinner, ToastController } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ConnectionState } from '../../core/sync/connection-state';
import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { SyncEngineService } from '../../core/sync/sync-engine.service';

/** backlog/225 — how long a press must last before it shows the button's meaning instead of navigating. */
const LONG_PRESS_MS = 500;
const LABEL_TOAST_DURATION_MS = 3000;

export interface SyncButtonLabel {
  key: string;
  params?: Record<string, number>;
}

/**
 * backlog/225 — the translated meaning of the button's current icon (same precedence as the
 * template): syncing → failed changes → pending changes → connection state.
 */
export function syncButtonLabel(state: {
  draining: boolean;
  errorCount: number;
  pendingCount: number;
  connectionState: ConnectionState;
}): SyncButtonLabel {
  if (state.draining) {
    return { key: 'SYNC.BUTTON.SYNCING' };
  }
  if (state.errorCount > 0) {
    return { key: 'SYNC.BUTTON.ERRORS', params: { count: state.errorCount } };
  }
  if (state.pendingCount > 0) {
    return { key: 'SYNC.BUTTON.PENDING', params: { count: state.pendingCount } };
  }
  return { key: `SYNC.BUTTON.${state.connectionState}` };
}

/**
 * documentation/Architektúra/Frontend.md "Globális chrome": one instance per tab-root toolbar
 * (`end` slot). documentation/Architektúra/Backend-offline first.md §16 for the state → icon table.
 * backlog/225: the state is also the button's `aria-label` / `title`, and a long press shows it as a toast.
 */
@Component({
  selector: 'app-sync-status-button',
  templateUrl: 'sync-status-button.component.html',
  styleUrls: ['sync-status-button.component.scss'],
  imports: [IonButton, IonIcon, IonBadge, IonSpinner, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatusButtonComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly toastController = inject(ToastController);
  private readonly translate = inject(TranslateService);

  readonly nativeCapable = Capacitor.isNativePlatform();
  readonly connectionState = this.syncEngine.connectionState;
  readonly draining = this.syncEngine.draining;
  /** Web has no outbox — always 0 there, so the badge never renders (documentation/Architektúra/Frontend.md). */
  readonly pendingCount = this.offlineQueue.pendingCount;
  readonly errorCount = this.offlineQueue.errorCount;
  readonly label = computed(() =>
    syncButtonLabel({
      draining: this.draining(),
      errorCount: this.errorCount(),
      pendingCount: this.pendingCount(),
      connectionState: this.connectionState(),
    }),
  );

  private longPressHandle?: ReturnType<typeof setTimeout>;
  private longPressed = false;
  private labelToast?: HTMLIonToastElement;

  open(): void {
    if (this.longPressed) {
      // The press already showed the label; its trailing click must not navigate as well.
      this.longPressed = false;
      return;
    }
    if (this.nativeCapable) {
      void this.router.navigateByUrl('/tabs/menu/sync');
    }
  }

  pressStart(): void {
    this.longPressed = false;
    clearTimeout(this.longPressHandle);
    this.longPressHandle = setTimeout(() => {
      this.longPressed = true;
      void this.showLabel();
    }, LONG_PRESS_MS);
  }

  pressEnd(): void {
    clearTimeout(this.longPressHandle);
  }

  ngOnDestroy(): void {
    clearTimeout(this.longPressHandle);
    void this.labelToast?.dismiss();
  }

  private async showLabel(): Promise<void> {
    await this.labelToast?.dismiss();
    const label = this.label();
    this.labelToast = await this.toastController.create({
      header: this.translate.instant(label.key, label.params),
      message: this.nativeCapable ? this.translate.instant('SYNC.BUTTON.OPEN_HINT') : undefined,
      duration: LABEL_TOAST_DURATION_MS,
      position: 'top',
    });
    await this.labelToast.present();
  }
}
