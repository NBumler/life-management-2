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

import { CragRepository } from '../../../../core/data/crag.repository';

/**
 * documentation/Subfeatures/Outdoor boulder admin.md "Hierarchikus admin" — the crag list, root of
 * the outdoor location tree. Each row opens the crag editor (with its sector sub-list); a single CTA
 * creates a new one.
 */
@Component({
  selector: 'app-crag-list',
  templateUrl: 'crag-list.page.html',
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
export class CragListPage implements OnInit {
  private readonly repository = inject(CragRepository);

  readonly crags = computed(() =>
    this.repository.items().filter((crag) => !crag.deleted).sort((a, b) => a.name.localeCompare(b.name)),
  );
  readonly isEmpty = computed(() => this.repository.loaded() && this.crags().length === 0);

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }
}
