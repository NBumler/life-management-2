import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { WeeklyPlan } from '../../../api/model/weeklyPlan';
import { WeeklyPlanSlot } from '../../../api/model/weeklyPlanSlot';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WeeklyPlanRepository } from '../../../core/data/weekly-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { WeeklyPlanPage } from './weekly-plan.page';

const MON = WeeklyPlanSlot.DayOfWeekEnum.Monday;
const WED = WeeklyPlanSlot.DayOfWeekEnum.Wednesday;

/** In-memory stand-in for WeeklyPlanRepository: `saveWeek` replaces the week's row like the real one. */
class FakeWeeklyRepository {
  readonly items = signal<WeeklyPlan[]>([]);
  readonly saves: { weekStartDate: string; slots: { dayOfWeek: string; planId: string; id?: string }[] }[] = [];

  load(): Promise<void> {
    return Promise.resolve();
  }

  byWeekStart(weekStartDate: string): WeeklyPlan | undefined {
    return this.items().find((week) => !week.deleted && week.weekStartDate === weekStartDate);
  }

  async saveWeek(weekStartDate: string, slots: { dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum; planId: string; id?: string }[]): Promise<WeeklyPlan> {
    this.saves.push({ weekStartDate, slots });
    const id = `week-${weekStartDate}`;
    const week: WeeklyPlan = {
      id,
      weekStartDate,
      deleted: false,
      slots: slots.map((slot) => ({
        id: slot.id ?? `${id}-${slot.dayOfWeek}`,
        weeklyPlanId: id,
        dayOfWeek: slot.dayOfWeek,
        planId: slot.planId,
        deleted: false,
      })),
    } as WeeklyPlan;
    this.items.update((list) => [...list.filter((w) => w.weekStartDate !== weekStartDate), week]);
    return week;
  }
}

describe('WeeklyPlanPage — recurring schedule (backlog/127)', () => {
  let fixture: ComponentFixture<WeeklyPlanPage>;
  let component: WeeklyPlanPage;
  let weekly: FakeWeeklyRepository;

  const plans = [
    { id: 'pA', name: 'A', active: true, deleted: false, exercises: [] },
    { id: 'pB', name: 'B', active: true, deleted: false, exercises: [] },
  ] as unknown as WorkoutPlan[];

  beforeEach(async () => {
    weekly = new FakeWeeklyRepository();
    await TestBed.configureTestingModule({
      imports: [WeeklyPlanPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: WeeklyPlanRepository, useValue: weekly },
        {
          provide: WorkoutPlanRepository,
          useValue: { load: () => Promise.resolve(), items: signal(plans), activePlans: signal(plans) },
        },
        {
          provide: WorkoutSessionRepository,
          useValue: { load: () => Promise.resolve(), reload: () => Promise.resolve(), items: signal([]) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WeeklyPlanPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
    component.weekStart.set('2026-09-21');
    await weekly.saveWeek('2026-09-21', [{ dayOfWeek: MON, planId: 'pA' }]);
    weekly.saves.length = 0;
  });

  function day(dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum) {
    return component.days().find((cell) => cell.dayOfWeek === dayOfWeek)!;
  }

  it('a later week without its own row shows the inherited schedule and where it comes from', () => {
    component.weekStart.set('2026-10-05');
    expect(component.effective().inherited).toBeTrue();
    expect(component.effective().sourceWeekStart).toBe('2026-09-21');
    expect(day(MON).planId).toBe('pA');
    // an inherited slot's id belongs to the source week — never offered as this week's slot id
    expect(day(MON).slotId).toBeNull();
  });

  it('"Mostantól": editing an inherited week saves it as its own row that later weeks inherit', async () => {
    component.weekStart.set('2026-10-05');
    await component.assignDay(day(WED), 'pB');

    expect(weekly.saves.length).toBe(1);
    expect(weekly.saves[0].weekStartDate).toBe('2026-10-05');
    expect(weekly.saves[0].slots.map((s) => [s.dayOfWeek, s.planId, s.id])).toEqual([
      [MON, 'pA', undefined],
      [WED, 'pB', undefined],
    ]);
    component.weekStart.set('2026-10-19');
    expect(day(WED).planId).toBe('pB');
    // earlier weeks are untouched
    component.weekStart.set('2026-09-28');
    expect(day(WED).planId).toBeNull();
  });

  it('"Csak erre a hétre": the following week is pinned to the previous schedule, so it resumes there', async () => {
    component.weekStart.set('2026-10-05');
    component.editMode.set('THIS_WEEK_ONLY');
    await component.assignDay(day(MON), '');

    expect(weekly.saves.map((s) => s.weekStartDate)).toEqual(['2026-10-12', '2026-10-05']);
    expect(day(MON).planId).toBeNull();
    component.weekStart.set('2026-10-12');
    expect(day(MON).planId).toBe('pA');
    component.weekStart.set('2026-11-02');
    expect(day(MON).planId).toBe('pA');
  });

  it('"Csak erre a hétre" leaves a following week that already has its own schedule alone', async () => {
    await weekly.saveWeek('2026-09-28', [{ dayOfWeek: WED, planId: 'pB' }]);
    weekly.saves.length = 0;
    component.editMode.set('THIS_WEEK_ONLY');
    await component.assignDay(day(MON), 'pB');

    expect(weekly.saves.map((s) => s.weekStartDate)).toEqual(['2026-09-21']);
  });
});
