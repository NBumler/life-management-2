import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { Food } from '../../../api/model/food';
import { Meal } from '../../../api/model/meal';
import { MealItem } from '../../../api/model/mealItem';
import { Recipe } from '../../../api/model/recipe';
import { UserProfile } from '../../../api/model/userProfile';
import { FoodRepository } from '../../../core/data/food.repository';
import { MealRepository } from '../../../core/data/meal.repository';
import { ProfileRepository } from '../../../core/data/profile.repository';
import { RecipeRepository } from '../../../core/data/recipe.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { today } from '../../../shared/local-date';
import { deviceTimeZoneId } from '../../../shared/timezone';
import { MealDashboardPage } from './meal-dashboard.page';

function meal(overrides: Partial<Meal> = {}): Meal {
  return { id: 'm1', eatenAt: '2026-08-26T10:00:00.000Z', timeZoneId: 'Europe/Budapest', note: null, deleted: false, items: [], ...overrides };
}

function customItem(overrides: Partial<MealItem> = {}): MealItem {
  return { id: 'i1', mealId: 'm1', type: 'CUSTOM', displayName: 'Torta', caloriesKcal: 100, proteinG: null, carbsG: null, fatG: null, priceHuf: 300, servings: 1, sortOrder: 0, deleted: false, ...overrides };
}

function completeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return { id: 'p1', birthDate: '1990-01-01', sex: 'MALE', heightCm: 180, currentWeightKg: 80, goal: 'MAINTENANCE', kgPerWeek: null, ...overrides };
}

describe('MealDashboardPage', () => {
  let fixture: ComponentFixture<MealDashboardPage>;
  let repository: jasmine.SpyObj<Pick<MealRepository, 'load' | 'remove'>> & { items: ReturnType<typeof signal<Meal[]>> };
  let recipeRepository: jasmine.SpyObj<Pick<RecipeRepository, 'load'>> & { items: ReturnType<typeof signal<Recipe[]>> };
  let foodRepository: jasmine.SpyObj<Pick<FoodRepository, 'load'>> & { items: ReturnType<typeof signal<Food[]>> };
  let profileRepository: jasmine.SpyObj<Pick<ProfileRepository, 'load'>> & { profile: ReturnType<typeof signal<UserProfile | null>> };
  let alertController: jasmine.SpyObj<AlertController>;

  beforeEach(async () => {
    repository = jasmine.createSpyObj('MealRepository', ['load', 'remove']) as never;
    repository.load.and.resolveTo();
    repository.items = signal<Meal[]>([]);
    recipeRepository = jasmine.createSpyObj('RecipeRepository', ['load']) as never;
    recipeRepository.load.and.resolveTo();
    recipeRepository.items = signal<Recipe[]>([]);
    foodRepository = jasmine.createSpyObj('FoodRepository', ['load']) as never;
    foodRepository.load.and.resolveTo();
    foodRepository.items = signal<Food[]>([]);
    profileRepository = jasmine.createSpyObj('ProfileRepository', ['load']) as never;
    profileRepository.load.and.resolveTo();
    profileRepository.profile = signal<UserProfile | null>(null);
    alertController = jasmine.createSpyObj('AlertController', ['create']);

    await TestBed.configureTestingModule({
      imports: [MealDashboardPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: MealRepository, useValue: repository },
        { provide: RecipeRepository, useValue: recipeRepository },
        { provide: FoodRepository, useValue: foodRepository },
        { provide: ProfileRepository, useValue: profileRepository },
        { provide: WorkoutSessionRepository, useValue: { load: () => Promise.resolve(), items: signal([]) } },
        { provide: AlertController, useValue: alertController },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MealDashboardPage);
  });

  it('defaults the selected date to today', () => {
    expect(fixture.componentInstance.selectedDate()).toBe(today());
  });

  it('dayMeals(): includes only meals whose eatenAt falls on the selected day in the device zone', () => {
    const zone = deviceTimeZoneId();
    const day = fixture.componentInstance.selectedDate();
    // Build an instant that is guaranteed to resolve to `day` at noon in the device's own zone.
    const noonOnSelectedDay = new Date(`${day}T12:00:00`).toISOString();
    repository.items.set([meal({ id: 'today', eatenAt: noonOnSelectedDay, timeZoneId: zone }), meal({ id: 'far-away', eatenAt: '2000-01-01T00:00:00.000Z' })]);

    expect(fixture.componentInstance.dayMeals().map((m) => m.id)).toEqual(['today']);
  });

  it('previousDay()/nextDay()/goToday() move the selected date by one calendar day and back to today', () => {
    const start = fixture.componentInstance.selectedDate();

    fixture.componentInstance.previousDay();
    expect(fixture.componentInstance.selectedDate()).not.toBe(start);

    fixture.componentInstance.nextDay();
    fixture.componentInstance.nextDay();
    fixture.componentInstance.previousDay();
    fixture.componentInstance.goToday();
    expect(fixture.componentInstance.selectedDate()).toBe(today());
  });

  it('itemCount(): counts only live items', () => {
    const m = meal({
      items: [
        { id: 'i1', mealId: 'm1', type: 'CUSTOM', displayName: 'A', caloriesKcal: 100, proteinG: null, carbsG: null, fatG: null, priceHuf: null, servings: 1, sortOrder: 0, deleted: false },
        { id: 'i2', mealId: 'm1', type: 'CUSTOM', displayName: 'B', caloriesKcal: 100, proteinG: null, carbsG: null, fatG: null, priceHuf: null, servings: 1, sortOrder: 1, deleted: true },
      ],
    });
    expect(fixture.componentInstance.itemCount(m)).toBe(1);
  });

  it('addMeal()/edit() navigate to the meal edit route', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);

    fixture.componentInstance.addMeal();
    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/meal', 'new']);

    fixture.componentInstance.edit(meal({ id: 'm2' }));
    expect(navigateSpy).toHaveBeenCalledWith(['/tabs/food/meal', 'm2']);
  });

  it('delete(): the confirmation handler removes the meal via the repository', async () => {
    repository.remove.and.resolveTo();
    const created = { present: jasmine.createSpy('present').and.resolveTo() };
    alertController.create.and.resolveTo(created as never);

    await fixture.componentInstance.delete(meal({ id: 'm1' }));
    const options = alertController.create.calls.mostRecent().args[0] as { buttons: { role: string; handler?: () => void }[] };
    const destructive = options.buttons.find((b) => b.role === 'destructive')!;
    await destructive.handler!();

    expect(repository.remove).toHaveBeenCalledWith('m1');
  });

  it('tdee(): not computable when the profile is missing/incomplete', () => {
    profileRepository.profile.set(null);
    expect(fixture.componentInstance.tdee().computable).toBeFalse();
    expect(fixture.componentInstance.bars()).toEqual([]);
    expect(fixture.componentInstance.activityExtraKcal()).toBe(0);
  });

  it('bars(): renders 4 goal bars, all yellow when nothing has been eaten yet', () => {
    profileRepository.profile.set(completeProfile());

    const bars = fixture.componentInstance.bars();

    expect(bars.length).toBe(4);
    expect(bars.every((bar) => bar.color === 'yellow')).toBeTrue();
    expect(bars.every((bar) => bar.goal > 0)).toBeTrue();
  });

  it('renders the incomplete-estimate note when a day\'s item references catalog data that no longer resolves', () => {
    const day = fixture.componentInstance.selectedDate();
    const noonOnSelectedDay = new Date(`${day}T12:00:00`).toISOString();
    repository.items.set([
      meal({
        id: 'm1',
        eatenAt: noonOnSelectedDay,
        timeZoneId: deviceTimeZoneId(),
        items: [{ id: 'i1', mealId: 'm1', type: 'RECIPE', recipeId: 'gone', servings: 1, sortOrder: 0, deleted: false }],
      }),
    ]);

    fixture.detectChanges();

    expect(fixture.componentInstance.dailyTotals().incomplete).toBeTrue();
    expect((fixture.nativeElement as HTMLElement).querySelector('.summary-incomplete')).not.toBeNull();
  });

  it('dailyPriceHuf(): sums the selected day\'s live item prices', () => {
    const day = fixture.componentInstance.selectedDate();
    const noonOnSelectedDay = new Date(`${day}T12:00:00`).toISOString();
    repository.items.set([
      meal({ id: 'm1', eatenAt: noonOnSelectedDay, timeZoneId: deviceTimeZoneId(), items: [customItem({ id: 'i1', mealId: 'm1', priceHuf: 300 }), customItem({ id: 'i2', mealId: 'm1', priceHuf: 200, deleted: true })] }),
    ]);

    expect(fixture.componentInstance.dailyPriceHuf()).toBe(300);
  });
});
