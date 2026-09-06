import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { AlertController, IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

/**
 * A bare trailing help-icon button: tap opens an `AlertController` with the passed translation keys
 * (header + body). Drop it into an `ion-item` next to a control that needs a one-tap explanation
 * (e.g. the ascent-style select — documentation/Features/Mászónapló.md "Kísérlet stílus súgó").
 *
 * Sibling of `HelpInputComponent`, which bundles the same button with an `ion-input`; this one has
 * no value, so it composes with any control (`ion-select`, chips, …). Text is resolved here so a
 * runtime language switch is reflected without the parent re-translating.
 */
@Component({
  selector: 'app-help-button',
  template: `
    <ion-button fill="clear" (click)="showHelp()" [attr.aria-label]="titleKey | translate">
      <ion-icon slot="icon-only" name="help-circle-outline"></ion-icon>
    </ion-button>
  `,
  imports: [IonButton, IonIcon, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpButtonComponent {
  /** i18n key for the alert header + the button's aria-label. */
  @Input() titleKey = '';
  /** i18n key for the alert body. */
  @Input() textKey = '';

  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  async showHelp(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant(this.titleKey),
      message: this.translate.instant(this.textKey),
      buttons: [this.translate.instant('COMMON.CLOSE')],
    });
    await alert.present();
  }
}
