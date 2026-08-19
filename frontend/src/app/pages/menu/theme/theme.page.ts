import { Component, inject } from '@angular/core';
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

import { ThemeMode, ThemeService } from '../../../core/config/theme.service';

/** documentation/Features/Dark&Light mode.md: three radio options, no save button, applies immediately. */
@Component({
  selector: 'app-theme',
  templateUrl: 'theme.page.html',
  imports: [IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent, IonList, IonRadioGroup, IonItem, IonRadio, TranslatePipe],
})
export class ThemePage {
  private readonly themeService = inject(ThemeService);

  readonly mode = this.themeService.mode;

  setMode(mode: ThemeMode): void {
    void this.themeService.setMode(mode);
  }
}
