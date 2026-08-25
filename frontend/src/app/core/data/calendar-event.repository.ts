import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { CalendarEvent } from '../../api/model/calendarEvent';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface CalendarEventSaveInput {
  id?: string;
  title: string;
  location: string | null;
  notes: string | null;
  allDay: boolean;
  date: string;
  startTime: string | null;
  endTime: string | null;
  frequency: CalendarEvent.FrequencyEnum | null;
  interval: number;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class CalendarEventRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly items = signal<CalendarEvent[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.items.set(await this.storage.listEvents());
    this.loaded.set(true);
  }

  /** No name uniqueness for events (documentation/Architektúra/Névegyediség.md: title is not unique). */
  async save(input: CalendarEventSaveInput): Promise<CalendarEvent> {
    const draft: CalendarEvent = {
      id: input.id ?? uuidV4(),
      title: input.title,
      location: input.location,
      notes: input.notes,
      allDay: input.allDay,
      date: input.date,
      startTime: input.startTime,
      endTime: input.endTime,
      frequency: input.frequency,
      interval: input.interval,
      deleted: false,
    };
    const saved = await this.storage.upsertEvent(draft);
    this.items.update((list) => {
      const next = list.filter((event) => event.id !== saved.id);
      next.push(saved);
      return next;
    });
    this.requestDrainIfNative();
    return saved;
  }

  /** documentation/Features/Események.md "Modell: egy sor = egy sorozat": deletes the whole series. */
  async remove(id: string): Promise<void> {
    await this.storage.deleteEvent(id);
    this.items.update((list) => list.filter((event) => event.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}
