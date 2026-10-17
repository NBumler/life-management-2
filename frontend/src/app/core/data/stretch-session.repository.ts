import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { StretchSession } from '../../api/model/stretchSession';
import { STORAGE_BACKEND, StretchSessionDraft } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** `SyncChangeItem.entityType`s whose local rows affect the stretching-session list `items()` serves. */
const STRETCH_SESSION_CHANGE_TYPES: ReadonlySet<string> = new Set(['StretchSession', 'StretchSessionItem']);

/** Newest first — date desc, then createdAt desc — matches `SqliteStorageBackend.listStretchSessions`. */
export function byStretchSessionRecency(a: StretchSession, b: StretchSession): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  const ac = a.createdAt ?? '';
  const bc = b.createdAt ?? '';
  return ac < bc ? 1 : ac > bc ? -1 : 0;
}

function sessionSetSignature(rows: readonly StretchSession[]): string {
  return rows
    .map(
      (session) =>
        `${session.id}:${session.updatedAt ?? ''}:${session.deleted ? 1 : 0}:[${session.items
          .map((item) => `${item.id}:${item.updatedAt ?? ''}:${item.deleted ? 1 : 0}`)
          .sort()
          .join(',')}]`,
    )
    .sort()
    .join('|');
}

/**
 * documentation/Subfeatures/Nyújtás.md (backlog/169): typed, signal-based facade over StorageBackend for
 * the logged stretching sessions (the WorkoutPlanRepository / StretchPlanRepository pattern).
 */
@Injectable({ providedIn: 'root' })
export class StretchSessionRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<StretchSession[]>([]);
  readonly loaded = signal(false);

  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // See WorkoutPlanRepository — re-read after a delta pull; first run only primes the `tick` dependency.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touches = [...changed].some((type) => STRETCH_SESSION_CHANGE_TYPES.has(type));
      if (touches && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  async load(options?: { force?: boolean }): Promise<void> {
    if (this.cacheEnabled && this.loaded() && !options?.force) {
      return;
    }
    if (this.inFlight !== null) {
      if (!options?.force) {
        return this.inFlight;
      }
      await this.inFlight.catch(() => undefined);
      if (this.inFlight !== null) {
        return this.inFlight;
      }
    }
    this.inFlight = this.readIntoSignal();
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
  }

  reload(): Promise<void> {
    return this.load({ force: true });
  }

  private async readIntoSignal(): Promise<void> {
    const rows = [...(await this.storage.listStretchSessions())].sort(byStretchSessionRecency);
    const signature = sessionSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(rows);
    }
    this.loaded.set(true);
  }

  byId(id: string): StretchSession | undefined {
    return this.items().find((session) => session.id === id);
  }

  /** backlog/170 — the live stretching session that followed a strength session, if any. */
  byWorkoutSession(workoutSessionId: string): StretchSession | undefined {
    return this.items().find((session) => !session.deleted && session.workoutSessionId === workoutSessionId);
  }

  async save(draft: StretchSessionDraft): Promise<StretchSession> {
    const toSave: StretchSessionDraft = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.saveStretchSession(toSave);
    this.items.update((list) => {
      const next = list.filter((session) => session.id !== saved.id);
      next.push(saved);
      next.sort(byStretchSessionRecency);
      return next;
    });
    this.lastSignature = sessionSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteStretchSession(id);
    this.items.update((list) => list.filter((session) => session.id !== id));
    this.lastSignature = sessionSetSignature(this.items());
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}
