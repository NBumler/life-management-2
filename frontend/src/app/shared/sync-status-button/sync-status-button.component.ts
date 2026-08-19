import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import { IonBadge, IonButton, IonIcon, IonSpinner } from '@ionic/angular/standalone';

import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { SyncEngineService } from '../../core/sync/sync-engine.service';

/**
 * documentation/Architektúra/Frontend.md "Globális chrome": one instance per tab-root toolbar
 * (`end` slot). documentation/Architektúra/Backend-offline first.md §16 for the state → icon table.
 */
@Component({
  selector: 'app-sync-status-button',
  templateUrl: 'sync-status-button.component.html',
  styleUrls: ['sync-status-button.component.scss'],
  imports: [IonButton, IonIcon, IonBadge, IonSpinner],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SyncStatusButtonComponent {
  private readonly router = inject(Router);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly offlineQueue = inject(OfflineQueueService);

  readonly nativeCapable = Capacitor.isNativePlatform();
  readonly connectionState = this.syncEngine.connectionState;
  readonly draining = this.syncEngine.draining;
  /** Web has no outbox — always 0 there, so the badge never renders (documentation/Architektúra/Frontend.md). */
  readonly pendingCount = this.offlineQueue.pendingCount;
  readonly errorCount = this.offlineQueue.errorCount;

  open(): void {
    if (this.nativeCapable) {
      void this.router.navigateByUrl('/tabs/menu/sync');
    }
  }
}
