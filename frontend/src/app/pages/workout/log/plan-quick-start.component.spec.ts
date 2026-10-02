import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { CalendarEvent } from '../../../api/model/calendarEvent';
import { ClimbingSession } from '../../../api/model/climbingSession';
import { WeeklyPlan } from '../../../api/model/weeklyPlan';
import { WorkoutPlan } from '../../../api/model/workoutPlan';
import { WorkoutSession } from '../../../api/model/workoutSession';
import { CurrentDayService } from '../../../core/config/current-day.service';
import { CalendarEventRepository } from '../../../core/data/calendar-event.repository';
import { ClimbingSessionRepository } from '../../../core/data/climbing-session.repository';
import { WeeklyPlanRepository } from '../../../core/data/weekly-plan.repository';
import { WorkoutPlanRepository } from '../../../core/data/workout-plan.repository';
import { WorkoutSessionRepository } from '../../../core/data/workout-session.repository';
import { PlanQuickStartComponent } from './plan-quick-start.component';

/** 2026-10-05 is a Monday. */
const TODAY = '2026-10-05';

function plan(id: string, category = 'BACK'): WorkoutPlan {
  return {
    id,
    name: `Plan ${id}`,
    active: true,
    deleted: false,
    exercises: [{ id: `${id}-x`, deleted: false, exerciseCategory: category, exerciseKind: 'WEIGHTED_REPS' }],
  } as unknown as WorkoutPlan;
}

describe('PlanQuickStartComponent (backlog/144 forecast)', () => {
  let fixture: ComponentFixture<PlanQuickStartComponent>;
  let component: PlanQuickStartComponent;
  const day = signal(TODAY);
  const plans = signal<WorkoutPlan[]>([]);
  const sessions = signal<WorkoutSession[]>([]);
  const climbs = signal<ClimbingSession[]>([]);
  const events = signal<CalendarEvent[]>([]);
  const weeks = signal<WeeklyPlan[]>([]);
  const store = <T>(items: ReturnType<typeof signal<T[]>>) => ({ load: () => Promise.resolve(), items });

  beforeEach(async () => {
    day.set(TODAY);
    plans.set([plan('A'), plan('B')]);
    sessions.set([]);
    climbs.set([]);
    events.set([]);
    weeks.set([]);
    await TestBed.configureTestingModule({
      imports: [PlanQuickStartComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: CurrentDayService, useValue: { day } },
        { provide: WorkoutPlanRepository, useValue: { ...store(plans), activePlans: plans } },
        { provide: WorkoutSessionRepository, useValue: store(sessions) },
        { provide: ClimbingSessionRepository, useValue: store(climbs) },
        { provide: CalendarEventRepository, useValue: store(events) },
        { provide: WeeklyPlanRepository, useValue: store(weeks) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(PlanQuickStartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const text = () => (fixture.nativeElement as HTMLElement).textContent ?? '';

  it("suggests the rotation's next template for today with a start button", () => {
    expect(component.todayState()).toBe('SUGGESTED');
    expect(component.todayForecast()?.plan?.id).toBe('A');
    expect(text()).toContain('WORKOUT.LOG.QUICK.TODAY_SUGGESTION');
    expect(text()).toContain('Plan A');
    expect(text()).toContain('WORKOUT.LOG.QUICK.START');
  });

  it('once today is logged: "done", no second start, and the next forecast workout with its day', () => {
    sessions.set([{ id: 's', date: TODAY, planId: 'A', deleted: false, exercises: [] } as unknown as WorkoutSession]);
    fixture.detectChanges();
    expect(component.todayState()).toBe('DONE');
    expect(text()).not.toContain('WORKOUT.LOG.QUICK.START');
    expect(component.nextWorkout()).toEqual(jasmine.objectContaining({ date: '2026-10-06', plan: jasmine.objectContaining({ id: 'B' }) }));
    expect(text()).toContain('WORKOUT.WEEKLY.DAY.TUESDAY');
  });

  it('a planned climb today makes today a climbing day', () => {
    events.set([{ id: 'e', title: 'Mászás', allDay: true, date: TODAY, interval: 1, deleted: false, activityType: 'CLIMBING' } as CalendarEvent]);
    fixture.detectChanges();
    expect(component.todayState()).toBe('CLIMB');
    expect(text()).toContain('WORKOUT.LOG.QUICK.CLIMB_DAY');
  });

  it('a REST override makes today a rest day, set by hand', () => {
    weeks.set([
      {
        id: 'w',
        weekStartDate: TODAY,
        deleted: false,
        slots: [{ id: 's', weeklyPlanId: 'w', dayOfWeek: 'MONDAY', kind: 'REST', planId: null, deleted: false }],
      } as unknown as WeeklyPlan,
    ]);
    fixture.detectChanges();
    expect(component.todayState()).toBe('REST');
    expect(text()).toContain('WORKOUT.LOG.QUICK.MANUAL');
  });

  it('warns when today is overridden to a finger template before a planned climb', () => {
    plans.set([plan('F', 'FOREARM_FINGERS'), plan('P')]);
    weeks.set([
      {
        id: 'w',
        weekStartDate: TODAY,
        deleted: false,
        slots: [{ id: 's', weeklyPlanId: 'w', dayOfWeek: 'MONDAY', kind: 'PLAN', planId: 'F', deleted: false }],
      } as unknown as WeeklyPlan,
    ]);
    events.set([{ id: 'e', title: 'Mászás', allDay: true, date: '2026-10-06', interval: 1, deleted: false, activityType: 'CLIMBING' } as CalendarEvent]);
    fixture.detectChanges();
    expect(component.fingerNote()).toBe('WORKOUT.LOG.QUICK.OVERRIDE_FINGERS_NEAR_CLIMB');
  });

  it('moves on when the calendar day changes (CurrentDayService)', () => {
    sessions.set([{ id: 's', date: TODAY, planId: 'A', deleted: false, exercises: [] } as unknown as WorkoutSession]);
    fixture.detectChanges();
    expect(component.todayState()).toBe('DONE');
    day.set('2026-10-06');
    fixture.detectChanges();
    expect(component.todayState()).toBe('SUGGESTED');
    expect(component.todayForecast()?.plan?.id).toBe('B');
  });
});
