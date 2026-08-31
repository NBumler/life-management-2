import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { AlertController, IonButton, IonIcon, IonInput, IonNote } from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

/**
 * documentation/Architektúra/Mennyiség mező.md "Helper ikon" — the shared presentational shell for a
 * single-line text field with a trailing help-icon button (the password-field "reveal" placement).
 *
 * Deliberately NOT a `ControlValueAccessor`: it only renders `ion-input` + an optional trailing
 * scale/status badge + the help button (opens an `AlertController` with the passed translation keys)
 * + an optional projected chip row (`[chips]`) + an optional error note. The value-bearing
 * components — `QuantityInputComponent`, `GradeInputComponent` — compose this and keep their own
 * parser + CVA. Text inputs (`*Key`) are i18n keys resolved here so a runtime language switch is
 * reflected without the parent re-translating.
 */
@Component({
  selector: 'app-help-input',
  templateUrl: 'help-input.component.html',
  imports: [IonInput, IonButton, IonIcon, IonNote, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HelpInputComponent {
  @Input() label = '';
  @Input() value = '';
  @Input() placeholder = '';
  @Input() disabled = false;
  /** i18n key for the help alert header + the help button's aria-label. */
  @Input() helpTitleKey = '';
  /** i18n key for the help alert body. */
  @Input() helpTextKey = '';
  /** i18n key of the inline error, or `null` for no error. */
  @Input() errorKey: string | null = null;
  /** Short literal badge shown at the input's trailing edge (e.g. a scale postfix); not translated. */
  @Input() badge: string | null = null;

  @Output() readonly valueChange = new EventEmitter<string>();
  @Output() readonly blurred = new EventEmitter<void>();

  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  async showHelp(): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant(this.helpTitleKey),
      message: this.translate.instant(this.helpTextKey),
      buttons: [this.translate.instant('COMMON.CLOSE')],
    });
    await alert.present();
  }
}
