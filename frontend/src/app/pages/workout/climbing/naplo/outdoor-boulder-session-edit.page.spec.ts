import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { BoulderProblem } from '../../../../api/model/boulderProblem';
import { ClimbingSession } from '../../../../api/model/climbingSession';
import { Crag } from '../../../../api/model/crag';
import { Sector } from '../../../../api/model/sector';
import { BoulderProblemRepository } from '../../../../core/data/boulder-problem.repository';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { CragRepository } from '../../../../core/data/crag.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { OutdoorBoulderSessionEditPage } from './outdoor-boulder-session-edit.page';

function crag(overrides: Partial<Crag> = {}): Crag {
  return {
    id: 'c1',
    name: 'Sikló-sziklák',
    latitude: null,
    longitude: null,
    defaultRockType: 'gránit',
    deleted: false,
    ...overrides,
  };
}

function sector(overrides: Partial<Sector> = {}): Sector {
  return { id: 's1', cragId: 'c1', name: 'Főfal', defaultAspect: 'északi', deleted: false, ...overrides };
}

function problem(overrides: Partial<BoulderProblem> = {}): BoulderProblem {
  return { id: 'p1', sectorId: 's1', name: 'Traverz', guidebookGrade: '6B', deleted: false, ...overrides };
}

describe('OutdoorBoulderSessionEditPage', () => {
  let fixture: ComponentFixture<OutdoorBoulderSessionEditPage>;
  let component: OutdoorBoulderSessionEditPage;
  let saveSpy: jasmine.Spy<(draft: ClimbingSessionDraft) => Promise<ClimbingSession>>;
  let bpSaveSpy: jasmine.Spy;

  async function setup(idParam = 'new', crags: Crag[] = [crag()]): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.callFake(async (d: ClimbingSessionDraft) => ({
      ...d,
      id: d.id || 's1',
      deleted: false,
      attempts: [],
    }));
    bpSaveSpy = jasmine.createSpy('bpSave').and.callFake(async (input: { sectorId: string; name: string; guidebookGrade: string }) => ({
      id: 'p-new',
      sectorId: input.sectorId,
      name: input.name,
      guidebookGrade: input.guidebookGrade,
      deleted: false,
    }));

    await TestBed.configureTestingModule({
      imports: [OutdoorBoulderSessionEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: ClimbingSessionRepository,
          useValue: {
            load: () => Promise.resolve(),
            items: signal<ClimbingSession[]>([]),
            byId: () => undefined,
            forContext: () => [],
            save: saveSpy,
            remove: () => Promise.resolve(),
          },
        },
        { provide: CragRepository, useValue: { load: () => Promise.resolve(), items: signal<Crag[]>(crags) } },
        { provide: SectorRepository, useValue: { load: () => Promise.resolve(), forCrag: () => [sector()] } },
        {
          provide: BoulderProblemRepository,
          useValue: { load: () => Promise.resolve(), forSector: () => [problem()], save: bpSaveSpy },
        },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 70 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(OutdoorBoulderSessionEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('starts as a fresh session for the "new" route param', async () => {
    await setup();
    expect(component.sessionId()).toBeNull();
  });

  it('lists only live crags in the picker', async () => {
    await setup('new', [crag(), crag({ id: 'c2', name: 'Törölt', deleted: true })]);
    expect(component.crags().map((c) => c.id)).toEqual(['c1']);
  });

  it('save() does nothing while the required crag is missing', async () => {
    await setup();
    component.form.patchValue({ cragId: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('changing crag prefills the rock type from the crag default and clears the sector', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1', sectorId: 's1', rockType: 'mészkő' });
    component.onCragChange('c1');
    expect(component.form.controls.rockType.value).toBe('gránit');
    expect(component.form.controls.sectorId.value).toBe('');
  });

  it('choosing a sector inherits its default aspect', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.onSectorChange('s1');
    expect(component.form.controls.aspect.value).toBe('északi');
  });

  it('save() forwards the OUTDOOR + BOULDER context, the crag/sector snapshots and session metadata', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.onSectorChange('s1');
    component.form.patchValue({
      sectorId: 's1',
      rockType: 'gránit',
      aspect: 'északi',
      weatherConditions: ClimbingSession.WeatherConditionsEnum.ColdDry,
      totalSessionDurationMinutes: 90,
    });
    component.addAttempt();
    const row = component.attempts()[0];
    row.isSuccess.set(true);
    row.problemName.set('Élmász');
    row.userRawInput.set('7A');

    await component.save();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        locationType: ClimbingSession.LocationTypeEnum.Outdoor,
        discipline: ClimbingSession.DisciplineEnum.Boulder,
        cragId: 'c1',
        cragName: 'Sikló-sziklák',
        sectorId: 's1',
        sectorName: 'Főfal',
        rockType: 'gránit',
        aspect: 'északi',
        weatherConditions: ClimbingSession.WeatherConditionsEnum.ColdDry,
        gymId: null,
      }),
    );
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts.length).toBe(1);
    expect(draft.attempts[0].routeName).toBe('Élmász');
    expect(draft.attempts[0].absoluteDifficultyIndex).not.toBeNull();
    expect(draft.attempts[0].safetyStyle).toBeNull();
    expect(draft.attempts[0].pitches).toEqual([]);
  });

  it('picking a master boulder problem snapshots its name + grade and resolves its index', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.onSectorChange('s1');
    component.form.patchValue({ sectorId: 's1' });
    component.addAttempt();
    component.pickProblem(component.attempts()[0], 'p1');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].boulderProblemId).toBe('p1');
    expect(draft.attempts[0].routeName).toBe('Traverz');
    // "6B" is a valid Font grade → a matrix index.
    expect(draft.attempts[0].absoluteDifficultyIndex).not.toBeNull();
  });

  it('saveToCatalog on an ad-hoc row creates a BoulderProblem master under the sector and links it', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.onSectorChange('s1');
    component.form.patchValue({ sectorId: 's1' });
    component.addAttempt();
    const row = component.attempts()[0];
    row.problemName.set('Új projekt');
    row.userRawInput.set('7B');
    row.saveToCatalog.set(true);

    await component.save();

    expect(bpSaveSpy).toHaveBeenCalledWith({ sectorId: 's1', name: 'Új projekt', guidebookGrade: '7B' });
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].boulderProblemId).toBe('p-new');
    expect(draft.attempts[0].routeName).toBe('Új projekt');
  });

  it('saveToCatalog without a sector does not create a catalog problem', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.addAttempt();
    const row = component.attempts()[0];
    row.problemName.set('Névtelen');
    row.userRawInput.set('6C');
    row.saveToCatalog.set(true);

    await component.save();

    expect(bpSaveSpy).not.toHaveBeenCalled();
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].boulderProblemId).toBeNull();
  });
});
