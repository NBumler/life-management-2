import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { NotificationHistoryEntry, NotificationHistoryStore } from '../../../core/notifications/notification-history.store';

interface HistoryRow extends NotificationHistoryEntry {
  /** Falls back to the rendered title, then a per-type label, so a route-only row still shows something. */
  displayTitle: string;
}

/**
 * documentation/Features/Értesítések.md "Értesítés-előzmény lista" — a read-only log of the banners
 * that actually went out, newest first. Tapping a row re-opens the screen the banner pointed at.
 */
@Component({
  selector: 'app-notification-history',
  templateUrl: 'notification-history.page.html',
  styles: [
    `
      .history-body {
        display: block;
        margin-top: 2px;
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
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonText,
    TranslatePipe,
    DatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationHistoryPage {
  private readonly store = inject(NotificationHistoryStore);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  protected readonly isNative = Capacitor.isNativePlatform();

  protected readonly rows = computed<HistoryRow[]>(() =>
    this.store.entries().map((entry) => ({
      ...entry,
      displayTitle: entry.title || this.translate.instant(`NOTIFICATIONS.TYPE.${entry.type}.LABEL`),
    })),
  );

  protected open(row: HistoryRow): void {
    if (row.route.length > 0) {
      void this.router.navigateByUrl(row.route);
    }
  }

  protected async confirmClear(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('NOTIFICATIONS.HISTORY.CLEAR_CONFIRM_TITLE'),
      message: this.translate.instant('NOTIFICATIONS.HISTORY.CLEAR_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        {
          text: this.translate.instant('NOTIFICATIONS.HISTORY.CLEAR'),
          role: 'destructive',
          handler: () => void this.store.clear(),
        },
      ],
    });
    await alert.present();
  }
}
