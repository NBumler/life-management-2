import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonList,
  IonRadio,
  IonRadioGroup,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { LanguageMode, LanguageService } from '../../../core/config/language.service';

/** documentation/Features/Nyelv választás.md: three radio options, language names in their own language. */
@Component({
  selector: 'app-language',
  templateUrl: 'language.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonRadioGroup, IonItem, IonRadio, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguagePage {
  private readonly languageService = inject(LanguageService);

  readonly mode = this.languageService.mode;

  setMode(mode: LanguageMode): void {
    void this.languageService.setMode(mode);
  }
}
