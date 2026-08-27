import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Meal } from '../../../api/model/meal';
import { FoodRepository } from '../../../core/data/food.repository';
import { MealRepository } from '../../../core/data/meal.repository';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { today } from '../../../shared/local-date';
import { calendarDayInZone, deviceTimeZoneId } from '../../../shared/timezone';
import { addDurationToDate } from '../storage/shelf-life';

/**
 * documentation/Subfeatures/Étkezés.md "Dashboard (vékony)" — 6a scope: date nav + the selected
 * day's meal list with add/edit/delete across all three item source types. The 4 progress bars /
 * activity line / daily price line are 6b (need `Tápérték kalkulátor` + the daily aggregation
 * module, not part of this slice).
 */
@Component({
  selector: 'app-meal-dashboard',
  templateUrl: 'meal-dashboard.page.html',
  imports: [
    IonHeader,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonButtons,
    IonTitle,
    IonContent,
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
export class MealDashboardPage implements OnInit, ViewWillEnter {
  private readonly segment = viewChild.required<IonSegment>('sectionSegment');

  private readonly repository = inject(MealRepository);
  private readonly recipeRepository = inject(RecipeRepository);
  private readonly foodRepository = inject(FoodRepository);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  readonly selectedDate = signal(today());

  readonly dayMeals = computed(() => {
    const day = this.selectedDate();
    const zone = deviceTimeZoneId();
    return this.repository
      .items()
      .filter((meal) => calendarDayInZone(meal.eatenAt, zone) === day)
      .sort((a, b) => a.eatenAt.localeCompare(b.eatenAt));
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.recipeRepository.load(), this.foodRepository.load()]);
  }

  /** See StorageListPage.ionViewWillEnter — same re-assert-on-every-entry rationale. */
  ionViewWillEnter(): void {
    this.segment().value = 'meal';
  }

  /** documentation/Features/Kaja.md: no full segmented hub yet (see app.routes.ts) — this is the lightweight stand-in until Stat exists too. */
  switchSection(section: string): void {
    if (section === 'catalog') {
      void this.router.navigateByUrl('/tabs/food/catalog');
    } else if (section === 'storage') {
      void this.router.navigateByUrl('/tabs/food/storage');
    } else if (section === 'recipe') {
      void this.router.navigateByUrl('/tabs/food/recipe');
    }
  }

  previousDay(): void {
    this.selectedDate.update((date) => addDurationToDate(date, -1, 'nap'));
  }

  nextDay(): void {
    this.selectedDate.update((date) => addDurationToDate(date, 1, 'nap'));
  }

  goToday(): void {
    this.selectedDate.set(today());
  }

  itemCount(meal: Meal): number {
    return meal.items.filter((item) => !item.deleted).length;
  }

  timeOf(meal: Meal): string {
    const date = new Date(meal.eatenAt);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  addMeal(): void {
    this.router.navigate(['/tabs/food/meal', 'new']);
  }

  edit(meal: Meal): void {
    this.router.navigate(['/tabs/food/meal', meal.id]);
  }

  async delete(meal: Meal): Promise<void> {
    const alert = await this.alertController.create({
      header: this.translate.instant('FOOD.MEAL.DELETE_CONFIRM_TITLE'),
      message: this.translate.instant('FOOD.MEAL.DELETE_CONFIRM_MESSAGE'),
      buttons: [
        { text: this.translate.instant('COMMON.CANCEL'), role: 'cancel' },
        { text: this.translate.instant('COMMON.DELETE'), role: 'destructive', handler: () => void this.repository.remove(meal.id) },
      ],
    });
    await alert.present();
  }
}
