import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { StretchPlan } from '../../../api/model/stretchPlan';
import { StretchPlanItem } from '../../../api/model/stretchPlanItem';
import { ActiveStretchDraft, StretchDraftService } from '../../../core/data/stretch-draft.service';
import { StretchExerciseRepository } from '../../../core/data/stretch-exercise.repository';
import { StretchPlanRepository } from '../../../core/data/stretch-plan.repository';
import { StretchSessionRepository } from '../../../core/data/stretch-session.repository';
import { StretchSessionDraft } from '../../../core/storage/storage-backend';
import { AlertTone } from '../../../shared/alert-tone';
import { ActiveStretchPage } from './active-stretch.page';
import { STRETCH_TRANSITION_SECONDS } from './stretch-timing';

function planItem(id: string, orderIndex: number, overrides: Partial<StretchPlanItem> = {}): StretchPlanItem {
  return {
    id,
    planId: 'p1',
    stretchExerciseId: `ex-${id}`,
    stretchName: id,
    stretchCategory: StretchPlanItem.StretchCategoryEnum.Legs,
    orderIndex,
    holdSeconds: 30,
    perSide: false,
    repetitions: 1,
    notes: null,
    deleted: false,
    ...overrides,
  };
}

const PLAN: StretchPlan = {
  id: 'p1',
  name: 'Esti',
  active: true,
  deleted: false,
  items: [planItem('A', 0, { perSide: true }), planItem('B', 1, { holdSeconds: 20 })],
};

class FakeDraftService {
  readonly draft = signal<ActiveStretchDraft | null>(null);
  readonly hasDraft = () => this.draft() !== null;
  refresh(): Promise<void> {
    return Promise.resolve();
  }
  write(draft: ActiveStretchDraft): Promise<void> {
    this.draft.set(draft);
    return Promise.resolve();
  }
  clear(): Promise<void> {
    this.draft.set(null);
    return Promise.resolve();
  }
}

describe('ActiveStretchPage (backlog/169)', () => {
  let fixture: ComponentFixture<ActiveStretchPage>;
  let page: ActiveStretchPage;
  let drafts: FakeDraftService;
  let saved: StretchSessionDraft[];
  let navController: jasmine.SpyObj<Pick<NavController, 'navigateBack'>>;

  async function create(query: Record<string, string>, draft: ActiveStretchDraft | null = null): Promise<void> {
    drafts = new FakeDraftService();
    drafts.draft.set(draft);
    saved = [];
    navController = jasmine.createSpyObj('NavController', ['navigateBack']);
    navController.navigateBack.and.resolveTo(true);
    spyOn(AlertTone.prototype, 'fire');
    await TestBed.configureTestingModule({
      imports: [ActiveStretchPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
        { provide: StretchDraftService, useValue: drafts },
        { provide: StretchPlanRepository, useValue: { load: () => Promise.resolve(), byId: (id: string) => (id === 'p1' ? PLAN : undefined) } },
        { provide: StretchExerciseRepository, useValue: { load: () => Promise.resolve(), items: signal([]) } },
        {
          provide: StretchSessionRepository,
          useValue: {
            save: (d: StretchSessionDraft) => {
              saved.push(d);
              return Promise.resolve(d);
            },
          },
        },
        { provide: NavController, useValue: navController },
        { provide: AlertController, useValue: jasmine.createSpyObj('AlertController', ['create']) },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ActiveStretchPage);
    page = fixture.componentInstance;
    await page.ngOnInit();
  }

  afterEach(() => page?.ngOnDestroy());

  it('starts the template running: a get-ready phase before the first hold, the plan items in order', async () => {
    await create({ stretchPlanId: 'p1', workoutSessionId: 'w1' });

    expect(page.items().map((item) => item.stretchName)).toEqual(['A', 'B']);
    expect(page.running()).toBeTrue();
    expect(page.phase()).toEqual(jasmine.objectContaining({ kind: 'TRANSITION', side: 'LEFT', itemIndex: 0 }));
    expect(drafts.draft()?.workoutSessionId).toBe('w1');
  });

  it('the wall clock drives the phases — a long gap catches up over several, with one alert', async () => {
    await create({ stretchPlanId: 'p1' });
    const start = Date.now();

    page.tick(start + STRETCH_TRANSITION_SECONDS * 1000 + 100);
    expect(page.phase()).toEqual(jasmine.objectContaining({ kind: 'HOLD', side: 'LEFT' }));

    // past the left hold, the transition and into the right hold
    page.tick(start + (STRETCH_TRANSITION_SECONDS * 2 + 30) * 1000 + 200);
    expect(page.phase()).toEqual(jasmine.objectContaining({ kind: 'HOLD', side: 'RIGHT' }));
    expect(AlertTone.prototype.fire).toHaveBeenCalledTimes(2);
    expect(drafts.draft()?.phaseIndex).toBe(3);
  });

  it('pause freezes the countdown; resume continues from it', async () => {
    await create({ stretchPlanId: 'p1' });
    page.togglePause();
    const left = page.remainingSeconds();
    expect(page.running()).toBeFalse();

    page.tick(Date.now() + 60_000);
    expect(page.remainingSeconds()).toBe(left);

    page.togglePause();
    expect(page.running()).toBeTrue();
  });

  it('skip marks the stretch not done and moves to the next one; the save reflects it', async () => {
    await create({ stretchPlanId: 'p1' });

    page.skip();
    expect(page.phase()?.itemIndex).toBe(1);

    page.openSummary();
    await page.save();

    expect(saved[0].stretchPlanId).toBe('p1');
    expect(saved[0].items.map((item) => item.completed)).toEqual([false, false]);
    expect(saved[0].durationMinutes).toBeGreaterThanOrEqual(1);
    expect(drafts.draft()).toBeNull();
    expect(navController.navigateBack).toHaveBeenCalledWith('/tabs/workout/log');
  });

  it('running to the end completes every stretch', async () => {
    await create({ stretchPlanId: 'p1' });

    page.tick(Date.now() + 10 * 60_000);
    expect(page.finishedAll()).toBeTrue();
    expect(page.running()).toBeFalse();

    page.openSummary();
    await page.save();
    expect(saved[0].items.map((item) => item.completed)).toEqual([true, true]);
  });

  it('an existing draft is restored paused, where it was', async () => {
    const draft: ActiveStretchDraft = {
      sessionId: 's1',
      startedAtMs: Date.now() - 120_000,
      date: '2026-10-17',
      stretchPlanId: null,
      workoutSessionId: null,
      items: [{ id: 'i', stretchExerciseId: null, stretchName: 'X', stretchCategory: 'LEGS', holdSeconds: 40, perSide: false, repetitions: 1 }],
      phaseIndex: 1,
      phaseRemainingSeconds: 12,
      skippedItems: [],
    };
    await create({}, draft);

    expect(page.running()).toBeFalse();
    expect(page.phase()).toEqual(jasmine.objectContaining({ kind: 'HOLD' }));
    expect(page.remainingSeconds()).toBe(12);
  });

  it('ad-hoc: starts empty; picked stretches get their defaults and start running', async () => {
    await create({});
    expect(page.items()).toEqual([]);

    page.onPicked([
      { id: 'e', name: 'Nyak', category: 'NECK', isFavorite: false, defaultHoldSeconds: 25, defaultPerSide: true, deleted: false },
    ]);

    expect(page.items()[0]).toEqual(jasmine.objectContaining({ stretchName: 'Nyak', holdSeconds: 25, perSide: true, repetitions: 1 }));
    expect(page.running()).toBeTrue();
  });
});
