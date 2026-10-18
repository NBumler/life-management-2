import { TestBed } from '@angular/core/testing';
import { Preferences } from '@capacitor/preferences';

import { TrackingFix } from './location-tracking.service';
import { TrackBufferService } from './track-buffer';

function fix(timeMs: number): TrackingFix {
  return { lat: 47.5, lon: 19.05, timeMs, accuracyMeters: 5 };
}

describe('TrackBufferService (backlog/150)', () => {
  let service: TrackBufferService;

  beforeEach(async () => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TrackBufferService);
    await Preferences.clear();
  });

  afterEach(async () => {
    await Preferences.clear();
  });

  it('restore(): an untouched session starts with an empty buffer', async () => {
    expect(await service.restore('bike')).toEqual([]);
    expect(service.current()).toEqual([]);
  });

  it('append(): accumulates in memory immediately, independently of the persist-batch threshold', async () => {
    await service.restore('bike');
    await service.append(fix(1_000));
    await service.append(fix(2_000));

    expect(service.current()).toEqual([fix(1_000), fix(2_000)]);
  });

  it('append() below the batch threshold does not persist yet; flush() forces it', async () => {
    await service.restore('bike');
    await service.append(fix(1_000));

    const stored = await Preferences.get({ key: 'lm2_track_buffer_bike' });
    expect(stored.value).toBeNull();

    await service.flush();
    const afterFlush = await Preferences.get({ key: 'lm2_track_buffer_bike' });
    expect(JSON.parse(afterFlush.value!)).toEqual([fix(1_000)]);
  });

  it('append() auto-flushes once the batch threshold (10) is reached', async () => {
    await service.restore('bike');
    for (let i = 0; i < 10; i++) {
      await service.append(fix(i));
    }

    const stored = await Preferences.get({ key: 'lm2_track_buffer_bike' });
    expect(JSON.parse(stored.value!).length).toBe(10);
  });

  it('restore(): picks up a buffer left behind by a previous "session" (app-kill survival)', async () => {
    await service.restore('bike');
    await service.append(fix(1_000));
    await service.flush();

    const freshInstance = TestBed.inject(TrackBufferService); // same singleton in this TestBed, but exercises the restore path
    expect(await freshInstance.restore('bike')).toEqual([fix(1_000)]);
  });

  it('clear(): removes the persisted buffer and the in-memory points', async () => {
    await service.restore('bike');
    await service.append(fix(1_000));
    await service.flush();

    await service.clear();

    expect(service.current()).toEqual([]);
    const stored = await Preferences.get({ key: 'lm2_track_buffer_bike' });
    expect(stored.value).toBeNull();
  });

  it('keeps separate buffers per session kind', async () => {
    await service.restore('bike');
    await service.append(fix(1_000));
    await service.flush();

    await service.restore('hike');
    expect(service.current()).toEqual([]);
  });
});
