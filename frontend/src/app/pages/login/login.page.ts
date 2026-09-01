import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Capacitor } from '@capacitor/core';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonList,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { ActivityStepSyncService } from '../../core/health/activity-step-sync.service';
import { NotificationSchedulerService } from '../../core/notifications/notification-scheduler.service';
import { AuthSessionService } from '../../core/session/auth-session.service';
import { LocalDatabaseService } from '../../core/storage/local-database.service';
import { SyncEngineService } from '../../core/sync/sync-engine.service';

/** documentation/Features/Bejelentkezés.md: username + password, generic error, no registration link. */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  styleUrls: ['login.page.scss'],
  imports: [ReactiveFormsModule, IonContent, IonList, IonItem, IonInput, IonButton, IonIcon, IonSpinner, IonText, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly localDb = inject(LocalDatabaseService);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly stepSync = inject(ActivityStepSyncService);
  private readonly notificationScheduler = inject(NotificationSchedulerService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
  });

  readonly submitting = signal(false);
  readonly passwordVisible = signal(false);
  /** documentation/Architektúra/Backend-offline first.md §12 "Első login": no connection is a distinct
   * case from wrong credentials, not the same generic message. */
  readonly errorKey = signal<'CREDENTIALS' | 'NETWORK' | null>(null);

  constructor() {
    if (this.authSession.isAuthenticated()) {
      void this.router.navigateByUrl('/tabs');
    }
  }

  togglePasswordVisibility(): void {
    this.passwordVisible.update((visible) => !visible);
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorKey.set(null);
    try {
      const { username, password } = this.form.getRawValue();
      await this.authSession.login(username, password);
      const userId = this.authSession.userId();
      if (userId !== null && Capacitor.isNativePlatform()) {
        await this.localDb.open(userId);
      }
      this.syncEngine.requestDrain();
      // provideAppInitializer already ran stepSync.init() while logged out (a no-op then); re-invoke
      // it now so Health Connect auto-sync starts without an app restart. Idempotent, not awaited.
      void this.stepSync.init();
      // Same pattern: provideAppInitializer ran this while logged out. Re-invoke so the local
      // notification scheduler picks up this user's store without an app restart.
      void this.notificationScheduler.init();
      await this.router.navigateByUrl('/tabs');
    } catch (error) {
      const isNetworkError = error instanceof HttpErrorResponse && error.status === 0;
      this.errorKey.set(isNetworkError ? 'NETWORK' : 'CREDENTIALS');
    } finally {
      this.submitting.set(false);
    }
  }
}
