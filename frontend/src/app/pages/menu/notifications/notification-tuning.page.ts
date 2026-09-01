import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Capacitor } from '@capacitor/core';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonList,
  IonListHeader,
  IonNote,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import {
  NotificationTuning,
  NotificationTuningService,
  TUNING_BOUNDS,
} from '../../../core/notifications/notification-tuning.service';

/**
 * documentation/Features/Értesítések.md "Lead-time szerkesztő" — device-local overrides for the
 * notification thresholds that ship as fixed constants in `notification-rules`. Native only (the
 * whole notification feature is); web shows the "mobile only" note.
 */
@Component({
  selector: 'app-notification-tuning',
  templateUrl: 'notification-tuning.page.html',
  styles: [
    `
      .tuning-hint {
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
    IonButton,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonInput,
    IonNote,
    IonText,
    FormsModule,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationTuningPage {
  private readonly service = inject(NotificationTuningService);

  protected readonly isNative = Capacitor.isNativePlatform();
  protected readonly bounds = TUNING_BOUNDS;

  /** Working copy — committed to the store only on Save. */
  protected readonly draft = signal<NotificationTuning>({ ...this.service.tuning() });
  protected readonly dirty = computed(() => {
    const saved = this.service.tuning();
    const d = this.draft();
    return (Object.keys(d) as (keyof NotificationTuning)[]).some((k) => d[k] !== saved[k]);
  });

  protected setField(key: keyof NotificationTuning, value: number | string | null | undefined): void {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) {
      return;
    }
    this.draft.update((d) => ({ ...d, [key]: num }));
  }

  protected async save(): Promise<void> {
    await this.service.set(this.draft());
    // Re-sync so the draft shows the clamped/rounded values the store settled on.
    this.draft.set({ ...this.service.tuning() });
  }

  protected async resetToDefaults(): Promise<void> {
    await this.service.reset();
    this.draft.set({ ...this.service.tuning() });
  }
}
