import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { ClimbingSession } from '../../api/model/climbingSession';
import { ClimbingSessionDraft, STORAGE_BACKEND } from '../storage/storage-backend';
import { DataChangeNotifier } from '../sync/data-change-notifier';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** `SyncChangeItem.entityType`s whose local rows affect the session list `items()` serves. */
const CLIMBING_CHANGE_TYPES: ReadonlySet<string> = new Set(['ClimbingSession', 'AscentAttempt', 'PitchLog']);

/**
 * Newest first: `date` desc, then `createdAt` desc as a stable tiebreak for several sessions on the
 * same day — matches `SqliteStorageBackend.listClimbingSessions` and the backend's own order.
 */
export function byClimbingRecency(a: ClimbingSession, b: ClimbingSession): number {
  if (a.date !== b.date) {
    return a.date < b.date ? 1 : -1;
  }
  const ac = a.createdAt ?? '';
  const bc = b.createdAt ?? '';
  return ac < bc ? 1 : ac > bc ? -1 : 0;
}

/**
 * Identity of a row set for "did the store actually change?" — session id + version + tombstone, plus
 * the same triple for every attempt and every pitch (a nested-aggregate edit only bumps the child
 * rows). Order-insensitive so a `save()`-sorted in-memory copy and a `listClimbingSessions()` reload
 * of the same rows hash identically (mirrors `workoutSetSignature`).
 */
function climbingSetSignature(rows: readonly ClimbingSession[]): string {
  return rows
    .map(
      (session) =>
        `${session.id}:${session.updatedAt ?? ''}:${session.deleted ? 1 : 0}:[${session.attempts
          .map(
            (attempt) =>
              `${attempt.id}:${attempt.updatedAt ?? ''}:${attempt.deleted ? 1 : 0}(${attempt.pitches
                .map((pitch) => `${pitch.id}:${pitch.updatedAt ?? ''}:${pitch.deleted ? 1 : 0}`)
                .sort()
                .join(',')})`,
          )
          .sort()
          .join(',')}]`,
    )
    .sort()
    .join('|');
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class ClimbingSessionRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly dataChanges = inject(DataChangeNotifier);

  readonly items = signal<ClimbingSession[]>([]);
  readonly loaded = signal(false);

  /**
   * backlog/069 — every distinct climbing-partner name from the user's live sessions, most-used
   * first (most recent session as the tiebreak). Feeds the partner combobox on the session-edit
   * forms; purely client-side aggregation, no separate `Partner` entity, works fully offline.
   */
  readonly partnerSuggestions = computed<string[]>(() => {
    const seen = new Map<string, { name: string; count: number; lastDate: string }>();
    for (const session of this.items()) {
      if (session.deleted) {
        continue;
      }
      for (const raw of session.climbingPartners ?? []) {
        const name = raw.trim();
        if (name === '') {
          continue;
        }
        // `items()` is newest-first, so the first spelling seen for a key is the most recently used one — keep it.
        const key = name.toLowerCase();
        const entry = seen.get(key);
        if (entry) {
          entry.count += 1;
          if (session.date > entry.lastDate) {
            entry.lastDate = session.date;
          }
        } else {
          seen.set(key, { name, count: 1, lastDate: session.date });
        }
      }
    }
    return [...seen.values()]
      .sort(
        (a, b) =>
          b.count - a.count ||
          (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0) ||
          a.name.localeCompare(b.name),
      )
      .map((entry) => entry.name);
  });

  /** See WorkoutSessionRepository — native serves repeat reads from memory; web re-fetches but the signature guard still shields downstream `computed()`s. */
  private readonly cacheEnabled = Capacitor.isNativePlatform();
  private inFlight: Promise<void> | null = null;
  private lastSignature = '';

  constructor() {
    // See WorkoutSessionRepository — re-read after a delta pull; first run only primes the `tick` dependency.
    let primed = false;
    effect(() => {
      this.dataChanges.tick();
      if (!primed) {
        primed = true;
        return;
      }
      const changed = untracked(() => this.dataChanges.changedTypes());
      const touchesClimbing = [...changed].some((type) => CLIMBING_CHANGE_TYPES.has(type));
      if (touchesClimbing && untracked(() => this.loaded())) {
        void this.load({ force: true });
      }
    });
  }

  /**
   * Reads the climbing log (with its full attempt/pitch tree) into `items`. Cached on native; pass
   * `{ force: true }` to re-read after the store changed. `items` is only replaced when the row set
   * — sessions, attempts or pitches — actually differs.
   */
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
    const rows = [...(await this.storage.listClimbingSessions())].sort(byClimbingRecency);
    const signature = climbingSetSignature(rows);
    if (signature !== this.lastSignature || !this.loaded()) {
      this.lastSignature = signature;
      this.items.set(rows);
    }
    this.loaded.set(true);
  }

  /** Returns the live session by id from the in-memory list, or `undefined`. */
  byId(id: string): ClimbingSession | undefined {
    return this.items().find((session) => session.id === id);
  }

  /**
   * backlog/092 — the date of the most recent *earlier* session in which the user successfully
   * climbed this exact linked route / problem, or `null` if there is none. Purely local (works
   * Full-offline); used only to warn — not block — when ONSIGHT / FLASH is picked for a line that
   * was already sent. `ref` is whichever soft link the context uses (`indoorRouteId` / `routeId` /
   * `boulderProblemId`); an ad-hoc attempt with no link (`ref` empty) never matches. Sessions on
   * or after `beforeDate`, and `excludeSessionId` (the session being edited), are skipped.
   */
  priorSuccessfulAscentDate(ref: string | null | undefined, beforeDate: string, excludeSessionId?: string | null): string | null {
    if (!ref) {
      return null;
    }
    let latest: string | null = null;
    for (const session of this.items()) {
      if (session.deleted || session.date >= beforeDate || (excludeSessionId != null && session.id === excludeSessionId)) {
        continue;
      }
      for (const attempt of session.attempts) {
        if (attempt.deleted || !attempt.isSuccess) {
          continue;
        }
        const key = attempt.indoorRouteId ?? attempt.routeId ?? attempt.boulderProblemId ?? null;
        if (key === ref && (latest === null || session.date > latest)) {
          latest = session.date;
        }
      }
    }
    return latest;
  }

  /** Live sessions for one dashboard context (documentation/Features/Mászónapló.md — the 4 tiles), newest first. */
  forContext(
    locationType: ClimbingSession.LocationTypeEnum,
    discipline: ClimbingSession.DisciplineEnum,
  ): ClimbingSession[] {
    return this.items().filter(
      (session) => !session.deleted && session.locationType === locationType && session.discipline === discipline,
    );
  }

  /**
   * documentation/Architektúra/Backend.md "Nested aggregate PUT": session + attempts + pitches in one
   * body. `draft.id` empty → a fresh UUID v4 (a create); otherwise an update of that session.
   */
  async save(draft: ClimbingSessionDraft): Promise<ClimbingSession> {
    const toSave: ClimbingSessionDraft = { ...draft, id: draft.id || uuidV4() };
    const saved = await this.storage.saveClimbingSession(toSave);
    this.items.update((list) => {
      const next = list.filter((session) => session.id !== saved.id);
      next.push(saved);
      next.sort(byClimbingRecency);
      return next;
    });
    this.lastSignature = climbingSetSignature(this.items());
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteClimbingSession(id);
    this.items.update((list) => list.filter((session) => session.id !== id));
    this.lastSignature = climbingSetSignature(this.items());
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}
