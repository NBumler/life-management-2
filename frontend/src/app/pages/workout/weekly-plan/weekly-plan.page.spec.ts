import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { CalendarEvent } from '../../../api/model/calendarEvent';
import { WeeklyPlan } from '../../../api/model/weeklyPlan';
import { WeeklyPlanSlot } from '../../../api/model/weeklyPlanSlot';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { CurrentDayService } from '../../../core/config/current-day.service';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { ClimbingSessionRepository } from '../../../core/data/climbing-session.repository';
import { WeeklyPlanRepository } from '../../../core/data/weekly-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { WeeklyPlanPage } from './weekly-plan.page';
import { addLocalDays } from './weekly-plan-adherence';

/** A Wednesday; its week starts on 2026-10-05. */
const TODAY = '2026-10-07';
const MONDAY = '2026-10-05';

type SaveSlot = { dayOfWeek: WeeklyPlanSlot.DayOfWeekEnum; kind?: WeeklyPlanSlot.KindEnum; planId: string | null; id?: string };

/** In-memory stand-in for WeeklyPlanRepository: `saveWeek` replaces the week's row like the real one. */
class FakeWeeklyRepository {
  readonly items = signal<WeeklyPlan[]>([]);
  readonly saves: { weekStartDate: string; slots: SaveSlot[] }[] = [];

  load(): Promise<void> {
    return Promise.resolve();
  }

  byWeekStart(weekStartDate: string): WeeklyPlan | undefined {
    return this.items().find((week) => !week.deleted && week.weekStartDate === weekStartDate);
  }

  async saveWeek(weekStartDate: string, slots: SaveSlot[]): Promise<WeeklyPlan> {
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
        kind: slot.kind ?? 'PLAN',
        planId: slot.planId,
        deleted: false,
      })),
    };
    this.items.update((list) => [...list.filter((w) => w.weekStartDate !== weekStartDate), week]);
    return week;
  }
}

describe('WeeklyPlanPage — rotation forecast (backlog/144)', () => {
  let fixture: ComponentFixture<WeeklyPlanPage>;
  let component: WeeklyPlanPage;
  let weekly: FakeWeeklyRepository;
  const sessions = signal<WorkoutSession[]>([]);
  let events: {
    load: () => Promise<void>;
    items: ReturnType<typeof signal<CalendarEvent[]>>;
    save: jasmine.Spy;
    remove: jasmine.Spy;
  };

  const plans = [
    { id: 'pA', name: 'A', active: true, deleted: false, exercises: [] },
    { id: 'pB', name: 'B', active: true, deleted: false, exercises: [] },
  ] as unknown as WorkoutPlan[];

  beforeEach(async () => {
    weekly = new FakeWeeklyRepository();
    sessions.set([]);
    events = {
      load: () => Promise.resolve(),
      items: signal<CalendarEvent[]>([]),
      save: jasmine.createSpy('save').and.resolveTo({}),
      remove: jasmine.createSpy('remove').and.resolveTo(),
    };
    await TestBed.configureTestingModule({
      imports: [WeeklyPlanPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: CurrentDayService, useValue: { day: signal(TODAY), refresh: () => undefined } },
        { provide: WeeklyPlanRepository, useValue: weekly },
        {
          provide: WorkoutPlanRepository,
          useValue: { load: () => Promise.resolve(), items: signal(plans), activePlans: signal(plans) },
        },
        {
          provide: WorkoutSessionRepository,
          useValue: { load: () => Promise.resolve(), reload: () => Promise.resolve(), items: sessions },
        },
        { provide: ClimbingSessionRepository, useValue: { load: () => Promise.resolve(), items: signal([]) } },
        { provide: CalendarEventRepository, useValue: events },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WeeklyPlanPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  });

  function day(date: string) {
    return component.days().find((cell) => cell.date === date)!;
  }

  /** "kind:plan" of the forecast for today … Sunday. */
  function forecastFromToday(): string[] {
    return component
      .days()
      .filter((cell) => cell.forecast !== null)
      .map((cell) => (cell.forecast!.kind === 'WORKOUT' ? `W:${cell.forecast!.plan?.id}` : cell.forecast!.kind));
  }

  it('opens on the current week; past days have no forecast, today and later do', () => {
    expect(component.weekStart()).toBe(MONDAY);
    expect(day(MONDAY).forecast).toBeNull();
    expect(day(MONDAY).past).toBeTrue();
    expect(forecastFromToday()).toEqual(['W:pA', 'W:pB', 'REST', 'W:pA', 'W:pB']);
    expect(component.todayStartPlan(day(TODAY))?.id).toBe('pA');
    expect(component.todayStartPlan(day(addLocalDays(TODAY, 1)))).toBeNull();
  });

  it('a past day shows the logged workout by template name', () => {
    sessions.set([{ id: 's', date: MONDAY, planId: 'pB', deleted: false, exercises: [] } as unknown as WorkoutSession]);
    expect(day(MONDAY).loggedWorkouts).toEqual(['B']);
  });

  it('a template override is saved as this week\'s slot and the rotation continues from it', async () => {
    await component.setOverride(day(TODAY), { kind: 'PLAN', planId: 'pB' });

    expect(weekly.saves).toEqual([
      { weekStartDate: MONDAY, slots: [{ id: undefined, dayOfWeek: 'WEDNESDAY', kind: 'PLAN', planId: 'pB' }] },
    ]);
    expect(day(TODAY).forecast?.reason).toBe('OVERRIDE');
    expect(forecastFromToday().slice(0, 2)).toEqual(['W:pB', 'W:pA']);
  });

  it('a rest override, then back to automatic (the day\'s slot dropped, the others kept)', async () => {
    await component.setOverride(day(TODAY), { kind: 'REST' });
    await component.setOverride(day(addLocalDays(TODAY, 1)), { kind: 'PLAN', planId: 'pA' });
    expect(day(TODAY).forecast).toEqual(jasmine.objectContaining({ kind: 'REST', reason: 'OVERRIDE' }));

    await component.setOverride(day(TODAY), { kind: 'AUTO' });
    const last = weekly.saves[weekly.saves.length - 1];
    expect(last.slots.map((slot) => [slot.dayOfWeek, slot.kind, slot.planId])).toEqual([['THURSDAY', 'PLAN', 'pA']]);
    expect(day(TODAY).forecast?.reason).toBe('ROTATION');
  });

  it('a past day cannot be overridden', async () => {
    await component.setOverride(day(MONDAY), { kind: 'REST' });
    expect(weekly.saves).toEqual([]);
  });

  describe('planned climbs (backlog/143)', () => {
    const friday = addLocalDays(MONDAY, 4);
    function climbEvent(overrides: Partial<CalendarEvent>): CalendarEvent {
      return { id: 'c1', title: 'Mászás', allDay: true, date: friday, interval: 1, deleted: false, activityType: 'CLIMBING', ...overrides } as CalendarEvent;
    }

    it('"+ Mászás" on a free future day creates a one-off all-day CLIMBING event', async () => {
      await component.toggleClimb(day(friday));
      expect(events.save).toHaveBeenCalledWith(
        jasmine.objectContaining({ date: friday, allDay: true, frequency: null, activityType: 'CLIMBING' }),
      );
    });

    it('a planned climb is a climbing day in the forecast (no chip), and the toggle deletes its one-off event', async () => {
      events.items.set([climbEvent({})]);
      expect(day(friday).load.plannedClimb).toBeTrue();
      expect(day(friday).forecast?.kind).toBe('CLIMB');
      expect(component.showsForecastChip(day(friday))).toBeFalse();
      expect(component.loadSummary().plannedClimbDays).toBe(1);

      await component.toggleClimb(day(friday));
      expect(events.remove).toHaveBeenCalledWith('c1');
    });

    it('a day covered only by a recurring climb opens that event instead of deleting the series', async () => {
      events.items.set([climbEvent({ id: 'weekly', frequency: 'WEEKLY' })]);
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);

      await component.toggleClimb(day(friday));

      expect(events.remove).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith(['/tabs/tasks/events', 'weekly']);
    });
  });
});
