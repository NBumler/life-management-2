import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { LocalNotificationsGateway } from '../notifications/local-notifications.gateway';
import { ClimbingLiveSessionService, liveRoute } from './climbing-live-session.service';

describe('ClimbingLiveSessionService (backlog/122)', () => {
  let service: ClimbingLiveSessionService;
  let gateway: jasmine.SpyObj<LocalNotificationsGateway>;

  beforeEach(async () => {
    gateway = jasmine.createSpyObj('LocalNotificationsGateway', ['checkPermissions', 'requestPermissions', 'schedule', 'cancelIds']);
    TestBed.configureTestingModule({
      providers: [provideTranslateService(), { provide: LocalNotificationsGateway, useValue: gateway }],
    });
    service = TestBed.inject(ClimbingLiveSessionService);
    await service.clear();
  });

  afterEach(async () => {
    await service.clear();
  });

  it('start() creates a persisted draft for the context with a fresh session id and start time', async () => {
    const draft = await service.start('outdoor-rope', 1_000);

    expect(draft.contextKey).toBe('outdoor-rope');
    expect(draft.startedAtMs).toBe(1_000);
    expect(draft.endedAtMs).toBeNull();
    expect(draft.session.id).toBeTruthy();
    expect(draft.session.locationType).toBe('OUTDOOR');
    expect(draft.session.discipline).toBe('ROPE');

    service.draft.set(null);
    expect((await service.refresh())?.session.id).toBe(draft.session.id); // survives a "restart"
  });

  it('keeps at most one live session: a second start() returns the running one', async () => {
    const first = await service.start('indoor-boulder');
    const second = await service.start('outdoor-rope');
    expect(second.session.id).toBe(first.session.id);
    expect(second.contextKey).toBe('indoor-boulder');
  });

  it('saveSession / setTimes update the draft; clear() removes it', async () => {
    const draft = await service.start('indoor-rope', 0);
    await service.saveSession({ ...draft.session, notes: 'jó nap' });
    await service.setTimes(0, 60_000);

    const stored = await service.refresh();
    expect(stored?.session.notes).toBe('jó nap');
    expect(stored?.endedAtMs).toBe(60_000);

    await service.clear();
    expect(await service.refresh()).toBeNull();
  });

  it('the web build shows no notification', async () => {
    await service.start('indoor-rope');
    expect(gateway.schedule).not.toHaveBeenCalled();
  });

  it('liveRoute points at the context live screen', () => {
    expect(liveRoute('indoor-boulder')).toBe('/tabs/workout/climbing/indoor-boulder/live');
  });
});
