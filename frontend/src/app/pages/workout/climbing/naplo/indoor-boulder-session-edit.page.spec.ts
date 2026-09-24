import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { ClimbingSession } from '../../../../api/model/climbingSession';
import { Gym } from '../../../../api/model/gym';
import { GymColorBand } from '../../../../api/model/gymColorBand';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { GymColorBandRepository } from '../../../../core/data/gym-color-band.repository';
import { GymRepository } from '../../../../core/data/gym.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { ClimbingSessionDraft } from '../../../../core/storage/storage-backend';
import { IndoorBoulderSessionEditPage } from './indoor-boulder-session-edit.page';

function boulderGym(): Gym {
  return { id: 'g1', name: 'Blokk', address: null, disciplines: [Gym.DisciplinesEnum.Boulder], defaultWallHeightMeters: null, availableSafetyStyles: null, deleted: false };
}

function band(overrides: Partial<GymColorBand> = {}): GymColorBand {
  return {
    id: 'b1',
    gymId: 'g1',
    name: 'Piros',
    hexColor: '#ff0000',
    variant: GymColorBand.VariantEnum.Neutral,
    gradeLower: '6A',
    gradeUpper: '6B',
    absoluteDifficultyIndexLower: 10,
    absoluteDifficultyIndexUpper: 12,
    deleted: false,
    ...overrides,
  };
}

/** Odd-sum range: floor((15+18)/2) = 16, whereas Math.round would give 17. */
function oddBand(): GymColorBand {
  return band({ id: 'b2', name: 'Kék', hexColor: '#0000ff', gradeLower: '6C', gradeUpper: '7A', absoluteDifficultyIndexLower: 15, absoluteDifficultyIndexUpper: 18 });
}

describe('IndoorBoulderSessionEditPage', () => {
  let fixture: ComponentFixture<IndoorBoulderSessionEditPage>;
  let component: IndoorBoulderSessionEditPage;
  let saveSpy: jasmine.Spy<(draft: ClimbingSessionDraft) => Promise<ClimbingSession>>;

  async function setup(idParam = 'new', previous: ClimbingSession[] = []): Promise<void> {
    saveSpy = jasmine.createSpy('save').and.callFake(async (d: ClimbingSessionDraft) => ({
      ...d,
      id: d.id || 's1',
      deleted: false,
      attempts: [],
    }));

    await TestBed.configureTestingModule({
      imports: [IndoorBoulderSessionEditPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: ClimbingSessionRepository,
          useValue: {
            load: () => Promise.resolve(),
            items: signal<ClimbingSession[]>([]),
            partnerSuggestions: signal<string[]>(['Anna', 'Béla']),
            byId: () => undefined,
            forContext: () => previous,
            save: saveSpy,
            remove: () => Promise.resolve(),
          },
        },
        { provide: GymRepository, useValue: { load: () => Promise.resolve(), items: signal<Gym[]>([boulderGym()]) } },
        { provide: GymColorBandRepository, useValue: { load: () => Promise.resolve(), forGym: () => [band(), oddBand()] } },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal({ currentWeightKg: 70 }) } },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: idParam }) } } },
        { provide: AlertController, useValue: { create: () => Promise.resolve({ present: () => Promise.resolve() }) } },
      ],
    }).compileComponents();

    spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);

    fixture = TestBed.createComponent(IndoorBoulderSessionEditPage);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  it('starts as a fresh session for the "new" route param', async () => {
    await setup();
    expect(component.sessionId()).toBeNull();
  });

  it('lists only boulder gyms in the picker', async () => {
    await setup();
    expect(component.boulderGyms().map((g) => g.id)).toEqual(['g1']);
  });

  it('save() does nothing while the required gym is missing', async () => {
    await setup();
    component.form.patchValue({ gymId: '' });
    await component.save();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('save() forwards the INDOOR + BOULDER context, the gym-name snapshot and a mapped attempt', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1', totalSessionDurationMinutes: 60 });
    component.addAttempt();
    const row = component.attempts()[0];
    row.isSuccess.set(true);
    row.userRawInput.set('6B');
    component.pickBand(row, 'b1');

    await component.save();

    expect(saveSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        locationType: ClimbingSession.LocationTypeEnum.Indoor,
        discipline: ClimbingSession.DisciplineEnum.Boulder,
        gymId: 'g1',
        gymName: 'Blokk',
      }),
    );
    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts.length).toBe(1);
    expect(draft.attempts[0].isSuccess).toBe(true);
    expect(draft.attempts[0].colorName).toBe('Piros');
    // A valid free-text Font grade resolves a matrix index.
    expect(draft.attempts[0].absoluteDifficultyIndex).not.toBeNull();
    expect(draft.attempts[0].pitches).toEqual([]);
  });

  it('save() forwards the picked climbing partners, trimming blanks (backlog 069)', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1', totalSessionDurationMinutes: 60 });
    component.partners.set(['Anna', '  ', 'Béla']);

    await component.save();

    expect(saveSpy.calls.mostRecent().args[0].climbingPartners).toEqual(['Anna', 'Béla']);
  });

  it('save() sends null climbingPartners when none are picked (backlog 069)', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1', totalSessionDurationMinutes: 60 });

    await component.save();

    expect(saveSpy.calls.mostRecent().args[0].climbingPartners).toBeNull();
  });

  it('an attempt with only a colour band takes the band mid index', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1' });
    component.addAttempt();
    component.pickBand(component.attempts()[0], 'b1');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    expect(draft.attempts[0].absoluteDifficultyIndex).toBe(11);
    expect(draft.attempts[0].gradeRange).toBe('6A–6B');
  });

  it('floors the colour-band mid index for an odd-sum range (deterministic, matches the server)', async () => {
    await setup();
    component.form.patchValue({ gymId: 'g1' });
    component.addAttempt();
    component.pickBand(component.attempts()[0], 'b2');

    await component.save();

    const draft = saveSpy.calls.mostRecent().args[0];
    // floor((15 + 18) / 2) = 16 — not Math.round's 17.
    expect(draft.attempts[0].absoluteDifficultyIndex).toBe(16);
  });

  describe('colour-band chips (backlog/123)', () => {
    function previousSession(): ClimbingSession {
      return { id: 'old', date: '2026-09-01', gymId: 'g1', attempts: [], deleted: false } as unknown as ClimbingSession;
    }

    function chips(): HTMLElement[] {
      return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('.band-chip'));
    }

    it('a new session with the prefilled last gym shows the gym bands as chips on a fresh attempt', async () => {
      await setup('new', [previousSession()]);
      component.addAttempt();
      fixture.detectChanges();

      expect(component.form.controls.gymId.value).toBe('g1');
      expect(chips().map((chip) => chip.getAttribute('data-band-id'))).toEqual(['b1', 'b2']);
    });

    it('tapping a chip picks the band, tapping it again clears it', async () => {
      await setup('new', [previousSession()]);
      component.addAttempt();
      fixture.detectChanges();

      chips()[1].click();
      fixture.detectChanges();
      expect(component.attempts()[0].colorBandId()).toBe('b2');
      expect(chips()[1].getAttribute('aria-checked')).toBe('true');

      chips()[1].click();
      fixture.detectChanges();
      expect(component.attempts()[0].colorBandId()).toBeNull();
    });

    it('folds the free-text grade behind "or grade" while the gym has bands', async () => {
      await setup('new', [previousSession()]);
      component.addAttempt();
      fixture.detectChanges();
      const host = fixture.nativeElement as HTMLElement;

      expect(host.querySelector('app-grade-input')).toBeNull();
      (host.querySelector('.grade-toggle') as HTMLElement).click();
      fixture.detectChanges();
      expect(host.querySelector('app-grade-input')).not.toBeNull();
    });
  });
});
