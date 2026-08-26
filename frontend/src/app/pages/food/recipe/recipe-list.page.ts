import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Recipe } from '../../../api/model/recipe';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { compareRank, matchesSearch } from '../../../shared/text-search';

/**
 * documentation/Subfeatures/Recept.md — shared/global recipe catalog list with search and soft
 * delete. Create/edit is a separate route (recipe-edit.page.ts), which also shows the computed
 * summary — mirrors Food's list/edit split (food-list.page.ts).
 */
@Component({
  selector: 'app-recipe-list',
  templateUrl: 'recipe-list.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonContent,
    IonSearchbar,
    IonList,
    IonItem,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecipeListPage implements OnInit {
  private readonly segment = viewChild.required<IonSegment>('sectionSegment');

  private readonly repository = inject(RecipeRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly query = signal('');

  readonly filteredItems = computed(() => {
    const query = this.query();
    return this.repository
      .items()
      .filter((item) => matchesSearch(query, item.name))
      .sort((a, b) => compareRank(query, a.name, b.name) || a.name.localeCompare(b.name));
  });

  async ngOnInit(): Promise<void> {
    await this.repository.load();
  }

  /** documentation/Features/Kaja.md: no full segmented hub yet — see app.routes.ts / food-list.page.ts's ionViewWillEnter comment for why this re-assertion is needed on every (re-)entry. */
  ionViewWillEnter(): void {
    this.segment().value = 'recipe';
  }

  switchSection(section: string): void {
    if (section === 'catalog') {
      void this.router.navigateByUrl('/tabs/food/catalog');
    } else if (section === 'storage') {
      void this.router.navigateByUrl('/tabs/food/storage');
    }
  }

  subtitle(item: Recipe): string {
    const count = item.ingredients.filter((ingredient) => !ingredient.deleted).length;
    return this.translate.instant('FOOD.RECIPE.INGREDIENT_COUNT', { count });
  }

  edit(item: Recipe): void {
    void this.router.navigate(['/tabs/food/recipe', item.id]);
  }

  addRecipe(): void {
    void this.router.navigate(['/tabs/food/recipe', 'new']);
  }

  async delete(item: Recipe): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.RECIPE.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.RECIPE.DELETE_CONFIRM_MESSAGE', { name: item.name }),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(item.id) },
      ],
    });
    await alert.present();
  }
}
