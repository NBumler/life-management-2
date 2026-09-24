import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';

import { ClimbingSession } from '../../../../api/model/climbingSession';
import { ClimbingLiveSessionService } from '../../../../core/data/climbing-live-session.service';
import { ClimbingSessionRepository } from '../../../../core/data/climbing-session.repository';
import { ProfileRepository } from '../../../../core/data/profile.repository';
import { ClimbingSessionListPage } from './climbing-session-list.page';

describe('ClimbingSessionListPage — live session start (backlog/122)', () => {
  let fixture: ComponentFixture<ClimbingSessionListPage>;
  let component: ClimbingSessionListPage;
  let live: ClimbingLiveSessionService;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClimbingSessionListPage],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        {
          provide: ClimbingSessionRepository,
          useValue: { load: () => Promise.resolve(), loaded: signal(true), forContext: () => [] as ClimbingSession[] },
        },
        { provide: ProfileRepository, useValue: { load: () => Promise.resolve(), profile: signal(null) } },
        { provide: ActivatedRoute, useValue: { snapshot: { data: { contextKey: 'indoor-rope' } } } },
      ],
    }).compileComponents();
    live = TestBed.inject(ClimbingLiveSessionService);
    await live.clear();
    navigate = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(ClimbingSessionListPage);
    component = fixture.componentInstance;
  });

  afterEach(async () => {
    fixture.destroy();
    await live.clear();
  });

  it('"Session indítása" starts a live draft for this context and opens the live screen', async () => {
    await component.startLive();

    expect(live.draft()?.contextKey).toBe('indoor-rope');
    expect(navigate).toHaveBeenCalledWith('/tabs/workout/climbing/indoor-rope/live');
    expect(component.liveHere()).toBeTrue();
  });

  it('is blocked while another context has a live session', async () => {
    await live.start('outdoor-boulder');
    fixture.detectChanges();

    expect(component.otherLiveContextLabel()).toBe('WORKOUT.CLIMBING.CONTEXT.OUTDOOR_BOULDER');
    const button = (fixture.nativeElement as HTMLElement).querySelector('.start-live') as HTMLIonButtonElement;
    expect(button.disabled).toBeTrue();
  });
});
