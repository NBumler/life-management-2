import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe } from '@ngx-translate/core';

import { GymRepository } from '../../../../core/data/gym.repository';

/**
 * documentation/Subfeatures/Indoor boulder admin.md "terem lista" — the indoor gym list. Each row
 * opens the gym editor (with its colour-band and indoor-route sub-lists); a single CTA creates a new
 * one.
 */
@Component({
  selector: 'app-gym-list',
  templateUrl: 'gym-list.page.html',
  imports: [
    RouterLink,
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
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GymListPage implements OnInit {
  private readonly repository = inject(GymRepository);

  readonly gyms = computed(() => this.repository.items().filter((gym) => !gym.deleted).sort((a, b) => a.name.localeCompare(b.name)));
  readonly isEmpty = computed(() => this.repository.loaded() && this.gyms().length === 0);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }
}
