import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { CalendarEvent } from '../../api/model/calendarEvent';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { CalendarEventRepository } from './calendar-event.repository';

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'e1',
    title: 'Fogorvos',
    location: null,
    notes: null,
    allDay: false,
    date: '2026-06-01',
    startTime: '10:00',
    endTime: '11:00',
    frequency: null,
    interval: 1,
    deleted: false,
    ...overrides,
  };
}

describe('CalendarEventRepository', () => {
  let repository: CalendarEventRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['listEvents', 'upsertEvent', 'deleteEvent']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: SyncEngineService, useValue: syncEngine },
      ],
    });
    repository = TestBed.inject(CalendarEventRepository);
  });

  it('load(): reads all events from the storage backend', async () => {
    storage.listEvents.and.resolveTo([event({ id: 'a' }), event({ id: 'b' })]);

    await repository.load();

    expect(repository.items().map((e) => e.id)).toEqual(['a', 'b']);
    expect(repository.loaded()).toBe(true);
  });

  it('save(): creates a new event with a fresh id when none is given', async () => {
    storage.upsertEvent.and.resolveTo(event({ id: 'new-1' }));

    const saved = await repository.save({
      title: 'Fogorvos',
      location: null,
      notes: null,
      allDay: false,
      date: '2026-06-01',
      startTime: '10:00',
      endTime: '11:00',
      frequency: null,
      interval: 1,
    });

    expect(saved.id).toBe('new-1');
    expect(repository.items().map((e) => e.id)).toEqual(['new-1']);
  });

  it('remove(): deletes via the storage backend and drops it from the signal', async () => {
    storage.listEvents.and.resolveTo([event({ id: 'a' })]);
    await repository.load();
    storage.deleteEvent.and.resolveTo(event({ id: 'a', deleted: true }));

    await repository.remove('a');

    expect(repository.items()).toEqual([]);
    expect(storage.deleteEvent).toHaveBeenCalledWith('a');
  });

  it('triggers a debounced drain on native for both save and remove', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
    storage.upsertEvent.and.resolveTo(event());
    storage.deleteEvent.and.resolveTo(event({ deleted: true }));

    await repository.save({
      title: 'Fogorvos',
      location: null,
      notes: null,
      allDay: false,
      date: '2026-06-01',
      startTime: '10:00',
      endTime: '11:00',
      frequency: null,
      interval: 1,
    });
    await repository.remove('e1');

    expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(2);
  });

  it('does not trigger a drain on web', async () => {
    spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
    storage.upsertEvent.and.resolveTo(event());

    await repository.save({
      title: 'Fogorvos',
      location: null,
      notes: null,
      allDay: false,
      date: '2026-06-01',
      startTime: '10:00',
      endTime: '11:00',
      frequency: null,
      interval: 1,
    });

    expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
  });
});
