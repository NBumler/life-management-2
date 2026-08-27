import { DecimalPipe } from '@angular/common';
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
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular/standalone';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Meal } from '../../../api/model/meal';
import { UserProfile } from '../../../api/model/userProfile';
import { FoodRepository } from '../../../core/data/food.repository';
import { MealRepository } from '../../../core/data/meal.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { today } from '../../../shared/local-date';
import { TdeeCalculation, TdeeProfileInput, computeTdee } from '../../../shared/tdee-calculator';
import { calendarDayInZone, deviceTimeZoneId } from '../../../shared/timezone';
import { addDurationToDate } from '../storage/shelf-life';
import { computeDailyNutrition } from './daily-nutrition';
import { NutritionProgressBarComponent } from './nutrition-progress-bar.component';
import { ProgressBarColor, calorieBarColor, macroBarColor, progressStatus } from './progress-bar-status';

interface BarViewModel {
  label: string;
  intake: number;
  goal: number;
  unit: string;
  color: ProgressBarColor;
  statusText: string;
}

function toTdeeInput(profile: UserProfile | null): TdeeProfileInput {
  return {
    birthDate: profile?.birthDate ?? null,
    sex: profile?.sex ?? null,
    heightCm: profile?.heightCm ?? null,
    currentWeightKg: profile?.currentWeightKg ?? null,
    goal: profile?.goal ?? null,
    kgPerWeek: profile?.kgPerWeek ?? null,
  };
}

/**
 * documentation/Subfeatures/Étkezés.md "Dashboard (vékony)" — date nav, the selected day's 4 goal
 * progress bars (+ activity surplus line + daily price), and that day's meal list with
 * add/edit/delete across all three item source types. First real consumer of
 * `computeTdee`/`ProfileRepository` in the app — no dedicated Tápérték kalkulátor screen exists.
 */
@Component({
  selector: 'app-meal-dashboard',
  templateUrl: 'meal-dashboard.page.html',
  styleUrls: ['meal-dashboard.page.scss'],
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
    IonNote,
    TranslatePipe,
    DecimalPipe,
    NutritionProgressBarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MealDashboardPage implements OnInit, ViewWillEnter {
  private readonly segment = viewChild.required<IonSegment>('sectionSegment');

  private readonly repository = inject(MealRepository);
  private readonly recipeRepository = inject(RecipeRepository);
  private readonly foodRepository = inject(FoodRepository);
  private readonly profileRepository = inject(ProfileRepository);
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

  readonly tdee = computed<TdeeCalculation>(() => computeTdee(toTdeeInput(this.profileRepository.profile()), this.selectedDate()));

  readonly dailyTotals = computed(() => computeDailyNutrition(this.dayMeals(), this.recipeRepository.items(), this.foodRepository.items()));

  readonly dailyPriceHuf = computed(() => this.dailyTotals().priceHuf);

  readonly activityExtraKcal = computed(() => {
    const tdee = this.tdee();
    return tdee.computable ? tdee.activityExtraKcal : 0;
  });

  readonly bars = computed<BarViewModel[]>(() => {
    const tdee = this.tdee();
    if (!tdee.computable) {
      return [];
    }
    const totals = this.dailyTotals();
    return [
      this.barFor('FOOD.MEAL.DASHBOARD.CALORIES_LABEL', totals.kcal, tdee.dailyAllowanceKcal, 'kcal', calorieBarColor(totals.kcal, tdee.dailyAllowanceKcal, tdee.maintenanceWithActivityKcal)),
      this.barFor('FOOD.MEAL.DASHBOARD.PROTEIN_LABEL', totals.proteinG, tdee.macros.proteinGoalG, 'g', macroBarColor(totals.proteinG, tdee.macros.proteinGoalG)),
      this.barFor('FOOD.MEAL.DASHBOARD.CARBS_LABEL', totals.carbsG, tdee.macros.carbsGoalG, 'g', macroBarColor(totals.carbsG, tdee.macros.carbsGoalG)),
      this.barFor('FOOD.MEAL.DASHBOARD.FAT_LABEL', totals.fatG, tdee.macros.fatGoalG, 'g', macroBarColor(totals.fatG, tdee.macros.fatGoalG)),
    ];
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.repository.load(), this.recipeRepository.load(), this.foodRepository.load(), this.profileRepository.load()]);
  }

  private barFor(labelKey: string, intake: number, goal: number, unit: string, color: ProgressBarColor): BarViewModel {
    const { remaining, exceeded } = progressStatus(intake, goal);
    const amount = `${Math.round(remaining)} ${unit}`;
    const statusText = this.translate.instant(exceeded ? 'FOOD.MEAL.DASHBOARD.EXCEEDED' : 'FOOD.MEAL.DASHBOARD.REMAINING', { amount });
    return { label: this.translate.instant(labelKey), intake, goal, unit, color, statusText };
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
