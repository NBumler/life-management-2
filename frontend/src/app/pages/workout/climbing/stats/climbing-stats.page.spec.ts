import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { AscentAttempt } from '../../../../api/model/ascentAttempt';
import { ClimbingSession } from '../../../../api/model/climbingSession';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { ClimbingStatsPage } from './climbing-stats.page';

function attempt(overrides: Partial<AscentAttempt> = {}): AscentAttempt {
  return {
    id: 'a1',
    sessionId: 's1',
    isSuccess: true,
    userRawInput: null,
    absoluteDifficultyIndex: null,
    ascentStyle: null,
    safetyStyle: null,
    failurePoint: null,
    attemptCount: null,
    colorBandId: null,
    colorName: null,
    hexColor: null,
    gradeRange: null,
    indoorRouteId: null,
    routeId: null,
    boulderProblemId: null,
    routeName: null,
    lengthInMeters: null,
    notes: null,
    orderIndex: 0,
    pitches: [],
    deleted: false,
    ...overrides,
  };
}

function session(overrides: Partial<ClimbingSession> = {}): ClimbingSession {
  return {
    id: 's1',
    date: '2026-08-28',
    locationType: ClimbingSession.LocationTypeEnum.Indoor,
    discipline: ClimbingSession.DisciplineEnum.Boulder,
    totalSessionDurationMinutes: null,
    pumpRating: null,
    headspaceRating: null,
    notes: null,
    climbingPartners: null,
    weatherConditions: null,
    gymId: null,
    gymName: null,
    cragId: null,
    cragName: null,
    sectorId: null,
    sectorName: null,
    rockType: null,
    aspect: null,
    attempts: [],
    deleted: false,
    ...overrides,
  };
}

describe('ClimbingStatsPage', () => {
  let fixture: ComponentFixture<ClimbingStatsPage>;
  let component: ClimbingStatsPage;
  let items: ReturnType<typeof signal<ClimbingSession[]>>;

  async function setup(sessions: ClimbingSession[] = []): Promise<void> {
    items = signal<ClimbingSession[]>(sessions);
    await TestBed.configureTestingModule({
      imports: [ClimbingStatsPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ClimbingSessionRepository, useValue: { load: () => Promise.resolve(), items } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ClimbingStatsPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
    fixture.detectChanges();
  }

  it('defaults to the 90-day period and always renders all four contexts', async () => {
    await setup();
    expect(component.period()).toBe(90);
    expect(component.contexts().map((c) => c.key)).toEqual(['indoor-boulder', 'indoor-rope', 'outdoor-boulder', 'outdoor-rope']);
    expect(component.contexts().every((c) => !c.hasData)).toBeTrue();
  });

  it('setPeriod() switches the window and ignores an unknown value', async () => {
    await setup();
    component.setPeriod('30');
    expect(component.period()).toBe(30);
    component.setPeriod('7');
    expect(component.period()).toBe(30);
  });

  it('builds a context view-model with success %, outcome slices and pyramid bar ratios', async () => {
    await setup([
      session({
        date: '2026-08-28',
        attempts: [
          attempt({ id: 'a', isSuccess: true, userRawInput: '6A', absoluteDifficultyIndex: 16, ascentStyle: AscentAttempt.AscentStyleEnum.Flash }),
          attempt({ id: 'b', isSuccess: true, userRawInput: '6A', absoluteDifficultyIndex: 16, ascentStyle: AscentAttempt.AscentStyleEnum.Redpoint }),
          attempt({ id: 'c', isSuccess: true, userRawInput: '7A', absoluteDifficultyIndex: 24, ascentStyle: AscentAttempt.AscentStyleEnum.Redpoint }),
          attempt({ id: 'd', isSuccess: false }),
        ],
      }),
    ]);

    const ib = component.contexts().find((c) => c.key === 'indoor-boulder')!;
    expect(ib.hasData).toBeTrue();
    expect(ib.sessionCount).toBe(1);
    expect(ib.attemptCount).toBe(4);
    expect(ib.maxGradeLabel).toBe('7A');
    expect(ib.totalVolume).toBe(4 * 16 + 4 * 16 + 4 * 24);
    expect(Math.round(ib.successPct)).toBe(75);
    expect(ib.outcomes.map((o) => o.count)).toEqual([0, 1, 2, 1]); // onsight, flash, redpoint, failed
    expect(ib.pyramid.map((p) => [p.label, p.sends])).toEqual([
      ['7A', 1],
      ['6A', 2],
    ]);
    expect(ib.pyramid[1].ratio).toBe(1); // the busiest bucket normalises to 1
    expect(ib.pyramid[0].ratio).toBe(0.5);
  });
});
