import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';
import { provideRouter } from '@angular/router';
import { AlertController, NavController } from '@ionic/angular/standalone';
import { provideTranslateService } from '@ngx-translate/core';

import { BIKE_LIVE_ROUTE, BikeLiveSessionService } from '../../../core/data/bike-live-session.service';
import { HelpButtonComponent } from '../../../shared/help-button/help-button.component';
import { By } from '@angular/platform-browser';
import { BIKE_LIVE_DEFAULT_MODE_KEY, BikeLiveStartComponent } from './bike-live-start.component';

describe('BikeLiveStartComponent (backlog/150)', () => {
  let fixture: ComponentFixture<BikeLiveStartComponent>;
  let component: BikeLiveStartComponent;
  let live: jasmine.SpyObj<BikeLiveSessionService>;
  let navigateForward: jasmine.Spy;
  let alertCreate: jasmine.Spy;

  async function setup(): Promise<void> {
    live = jasmine.createSpyObj('BikeLiveSessionService', ['start']);
    alertCreate = jasmine.createSpy('create').and.resolveTo({ present: () => Promise.resolve() });
    await TestBed.configureTestingModule({
      imports: [BikeLiveStartComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: BikeLiveSessionService, useValue: live },
        { provide: AlertController, useValue: { create: alertCreate } },
      ],
    }).compileComponents();
    navigateForward = spyOn(TestBed.inject(NavController), 'navigateForward').and.resolveTo(true);
    fixture = TestBed.createComponent(BikeLiveStartComponent);
    component = fixture.componentInstance;
    await component.ngOnInit();
  }

  beforeEach(async () => {
    await Preferences.remove({ key: BIKE_LIVE_DEFAULT_MODE_KEY });
  });

  afterEach(async () => {
    await Preferences.remove({ key: BIKE_LIVE_DEFAULT_MODE_KEY });
  });

  it('defaults to Pontos; the picked mode is remembered as the next default', async () => {
    await setup();
    expect(component.mode()).toBe('LIVE');

    await component.pick('ESTIMATED');
    TestBed.resetTestingModule();
    await setup();
    expect(component.mode()).toBe('ESTIMATED');
  });

  it('starts the ride in the picked mode and opens the live screen', async () => {
    await setup();
    live.start.and.resolveTo({
      status: 'started',
      draft: { rideId: 'r', startedAtMs: 0, pausedAtMs: null, pausedTotalMs: 0, segmentStarts: [0], endedAtMs: null },
    });
    await component.pick('ESTIMATED');
    await component.start();
    expect(live.start).toHaveBeenCalledWith('ESTIMATED');
    expect(navigateForward).toHaveBeenCalledWith(BIKE_LIVE_ROUTE);
  });

  it('a denied permission explains itself and stays on the list', async () => {
    await setup();
    live.start.and.resolveTo({ status: 'permission-denied' });
    await component.start();
    expect(alertCreate).toHaveBeenCalled();
    expect(navigateForward).not.toHaveBeenCalled();
  });

  it('each mode has a help icon; the texts quote the tracking-config values', async () => {
    await setup();
    fixture.detectChanges();
    const helps = fixture.debugElement.queryAll(By.directive(HelpButtonComponent)).map((el) => el.componentInstance as HelpButtonComponent);
    expect(helps.map((help) => help.textKey)).toEqual([
      'WORKOUT.BIKE.LIVE.MODE_LIVE_HELP_TEXT',
      'WORKOUT.BIKE.LIVE.MODE_ESTIMATED_HELP_TEXT',
    ]);
    expect(helps[1].textParams).toEqual({ accuracy: 30, seconds: 20, speed: 2, factor: '1.3' });
  });
});
