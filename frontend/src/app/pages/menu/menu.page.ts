import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  AlertController,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { AuthService } from '../../api/api/auth.service';
import { AuthSessionService } from '../../core/session/auth-session.service';
import { OfflineQueueService } from '../../core/sync/offline-queue.service';
import { SyncStatusButtonComponent } from '../../shared/sync-status-button/sync-status-button.component';

/** documentation/Architektúra/Frontend.md route-térkép: Profile / Téma / Nyelv / Szinkronizációs központ / Kijelentkezés. */
@Component({
  selector: 'app-menu',
  templateUrl: 'menu.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonIcon, RouterLink, TranslatePipe, SyncStatusButtonComponent],
})
export class MenuPage {
  private readonly authApi = inject(AuthService);
  private readonly authSession = inject(AuthSessionService);
  private readonly offlineQueue = inject(OfflineQueueService);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly offlineCapable = Capacitor.isNativePlatform();
  readonly pendingCount = this.offlineQueue.pendingCount;

  async logout(): Promise<void> {
    const pending = this.pendingCount();
    const alert = await this.alertController.create({
      header: this.translate.instant('MENU.LOGOUT_CONFIRM_TITLE'),
      message:
        pending > 0
          ? this.translate.instant('MENU.LOGOUT_CONFIRM_PENDING', { count: pending })
          : this.translate.instant('MENU.LOGOUT_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('MENU.LOGOUT'), role: 'destructive', handler: () => void this.doLogout() },
      ],
    });
    await alert.present();
  }

  private async doLogout(): Promise<void> {
    const refreshToken = this.authSession.getRefreshToken();
    await this.authSession.clear();
    await this.router.navigateByUrl('/login');
    if (refreshToken !== null) {
      // documentation/Features/Bejelentkezés.md: best-effort server-side revoke, local logout succeeds regardless.
      this.authApi.logout({ refreshToken }).subscribe({ error: () => undefined });
    }
  }
}
