import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { FeatureFlagsService } from '../../../core/config/feature-flags.service';
import { NotificationSchedulerService } from '../../../core/notifications/notification-scheduler.service';
import { NotificationSettingsService } from '../../../core/notifications/notification-settings.service';
import { NOTIFICATION_SOURCE_FLAG, NOTIFICATION_TYPES, NotificationType } from '../../../core/notifications/notification-types';

interface NotificationRow {
  type: NotificationType;
  enabled: boolean;
}

/**
 * documentation/Features/Értesítések.md "Beállítások UI": Menü → Értesítések. Per-type on/off
 * switches with a short "when it fires" explainer. No lead-time editor, no history list (round one).
 * A type is shown only when its source feature flag is on (documentation/Architektúra/Frontend.md).
 */
@Component({
  selector: 'app-notifications',
  templateUrl: 'notifications.page.html',
  styles: [
    `
      .notification-hint {
        display: block;
        margin-top: 4px;
        white-space: normal;
      }
    `,
  ],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonText,
    IonButton,
    IonToggle,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsPage {
  private readonly settings = inject(NotificationSettingsService);
  private readonly featureFlags = inject(FeatureFlagsService);
  protected readonly scheduler = inject(NotificationSchedulerService);

  protected readonly isNative = Capacitor.isNativePlatform();
  protected readonly permission = this.scheduler.permission;

  constructor() {
    // The user may have changed the OS permission in system settings since cold start / last resume.
    void this.scheduler.syncPermission();
  }

  protected readonly rows = computed<NotificationRow[]>(() => {
    const enabled = this.settings.enabled();
    return NOTIFICATION_TYPES.filter((type) => this.featureFlags.isEnabled(NOTIFICATION_SOURCE_FLAG[type])).map((type) => ({
      type,
      enabled: enabled[type],
    }));
  });

  protected toggle(type: NotificationType, value: boolean): void {
    void this.scheduler.setTypeEnabled(type, value);
  }

  protected requestPermission(): void {
    void this.scheduler.requestPermission();
  }
}
