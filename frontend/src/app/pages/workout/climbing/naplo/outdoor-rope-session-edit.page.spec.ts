import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { AscentAttempt } from '../../../../api/model/ascentAttempt';
import { ClimbingSession } from '../../../../api/model/climbingSession';
import { Crag } from '../../../../api/model/crag';
import { Route } from '../../../../api/model/route';
import { Sector } from '../../../../api/model/sector';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { CragRepository } from '../../../../core/data/crag.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { RouteRepository } from '../../../../core/data/route.repository';
import { SectorRepository } from '../../../../core/data/sector.repository';
import { ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { OutdoorRopeSessionEditPage } from './outdoor-rope-session-edit.page';

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

function route(overrides: Partial<Route> = {}): Route {
  return {
    id: 'rt1',
    sectorId: 's1',
    name: 'Központi pillér',
    guidebookGrade: '6a',
    lengthInMeters: 40,
    totalPitches: 3,
    rockType: 'mészkő',
    aspect: 'déli',
    deleted: false,
    ...overrides,
  };
}

describe('OutdoorRopeSessionEditPage', () => {
  let fixture: ComponentFixture<OutdoorRopeSessionEditPage>;
  let component: OutdoorRopeSessionEditPage;
  let saveSpy: jasmine.Spy<(draft: ClimbingSessionDraft) => Promise<ClimbingSession>>;
  let routeSaveSpy: jasmine.Spy;

  async function setup(idParam = 'new', crags: Crag[] = [crag()]): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.callFake(async (d: ClimbingSessionDraft) => ({
      ...d,
      id: d.id || 's1',
      deleted: false,
      attempts: [],
    }));
    routeSaveSpy = jasmine
      .createSpy('routeSave')
      .and.callFake(async (input: { sectorId: string; name: string; guidebookGrade: string }) => ({
        id: 'rt-new',
        sectorId: input.sectorId,
        name: input.name,
        guidebookGrade: input.guidebookGrade,
        lengthInMeters: null,
        totalPitches: null,
        rockType: null,
        aspect: null,
        deleted: false,
      }));

    await TestBed.configureTestingModule({
      imports: [OutdoorRopeSessionEditPage],
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
          provide: RouteRepository,
          useValue: { load: () => Promise.resolve(), forSector: () => [route()], save: routeSaveSpy },
        },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 70 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(OutdoorRopeSessionEditPage);
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

  it('offers TOPROPE + LEAD + TRAD', async () => {
    await setup();
    expect(component.safetyStyles).toEqual([
      AscentAttempt.SafetyStyleEnum.Toprope,
      AscentAttempt.SafetyStyleEnum.Lead,
      AscentAttempt.SafetyStyleEnum.Trad,
    ]);
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

  it('save() forwards the OUTDOOR + ROPE context, the crag/sector snapshots and a LEAD attempt', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.onSectorChange('s1');
    component.form.patchValue({
      sectorId: 's1',
      weatherConditions: ClimbingSession.WeatherConditionsEnum.Windy,
      totalSessionDurationMinutes: 120,
    });
    component.addAttempt();
    const row = component.attempts()[0];
    row.isSuccess.set(true);
    row.routeName.set('Sarok');
    row.userRawInput.set('6b');
    row.lengthInMeters.set(30);

    await component.save();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        locationType: ClimbingSession.LocationTypeEnum.Outdoor,
        discipline: ClimbingSession.DisciplineEnum.Rope,
        cragId: 'c1',
        cragName: 'Sikló-sziklák',
        sectorId: 's1',
        sectorName: 'Főfal',
        weatherConditions: ClimbingSession.WeatherConditionsEnum.Windy,
        gymId: null,
      }),
    );
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts.length).toBe(1);
    expect(draft.attempts[0].safetyStyle).toBe(AscentAttempt.SafetyStyleEnum.Lead);
    expect(draft.attempts[0].lengthInMeters).toBe(30);
    expect(draft.attempts[0].absoluteDifficultyIndex).not.toBeNull();
    expect(draft.attempts[0].colorBandId).toBeNull();
    expect(draft.attempts[0].pitches).toEqual([]);
  });

  it('picking a master route snapshots its name + grade, prefills the length and lets its rock type / aspect win', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.onSectorChange('s1');
    component.form.patchValue({ sectorId: 's1' });
    component.addAttempt();
    component.pickRoute(component.attempts()[0], 'rt1');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].routeId).toBe('rt1');
    expect(draft.attempts[0].routeName).toBe('Központi pillér');
    expect(draft.attempts[0].absoluteDifficultyIndex).not.toBeNull();
    expect(draft.attempts[0].lengthInMeters).toBe(40);
    expect(draft.rockType).toBe('mészkő');
    expect(draft.aspect).toBe('déli');
  });

  it('forwards a TRAD safety style', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.addAttempt();
    component.setSafetyStyle(component.attempts()[0], AscentAttempt.SafetyStyleEnum.Trad);

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].safetyStyle).toBe(AscentAttempt.SafetyStyleEnum.Trad);
  });

  it('forwards an optional PitchLog list with numbering and lead flags', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.addAttempt();
    const row = component.attempts()[0];
    component.addPitch(row);
    component.addPitch(row);
    row.pitches()[0].rawGrade.set('6a');
    row.pitches()[1].rawGrade.set('5c');
    component.togglePitchLead(row.pitches()[1]);

    await component.save();

    const pitches = saveSpy.calls.mostRecent().args[0].attempts[0].pitches;
    expect(pitches.length).toBe(2);
    expect(pitches[0].pitchNumber).toBe(1);
    expect(pitches[0].isLead).toBe(true);
    expect(pitches[0].absoluteDifficultyIndex).not.toBeNull();
    expect(pitches[1].pitchNumber).toBe(2);
    expect(pitches[1].isLead).toBe(false);
  });

  it('saveToCatalog on an ad-hoc row creates a Route master under the sector and links it', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.onSectorChange('s1');
    component.form.patchValue({ sectorId: 's1' });
    component.addAttempt();
    const row = component.attempts()[0];
    row.routeName.set('Új vonal');
    row.userRawInput.set('7a');
    row.saveToCatalog.set(true);

    await component.save();

    expect(routeSaveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({ sectorId: 's1', name: 'Új vonal', guidebookGrade: '7a' }),
    );
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].routeId).toBe('rt-new');
    expect(draft.attempts[0].routeName).toBe('Új vonal');
  });

  it('saveToCatalog without a sector does not create a catalog route', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.addAttempt();
    const row = component.attempts()[0];
    row.routeName.set('Névtelen');
    row.userRawInput.set('6c');
    row.saveToCatalog.set(true);

    await component.save();

    expect(routeSaveSpy).not.toHaveBeenCalled();
    expect(saveSpy.calls.mostRecent().args[0].attempts[0].routeId).toBeNull();
  });

  it('keeps a typed failure point on a missed attempt and drops the ascent style', async () => {
    await setup();
    component.form.patchValue({ cragId: 'c1' });
    component.addAttempt();
    const row = component.attempts()[0];
    row.ascentStyle.set(AscentAttempt.AscentStyleEnum.Redpoint);
    row.failurePoint.set('kulcsmozdulat');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].isSuccess).toBe(false);
    expect(draft.attempts[0].ascentStyle).toBeNull();
    expect(draft.attempts[0].failurePoint).toBe('kulcsmozdulat');
  });
});
