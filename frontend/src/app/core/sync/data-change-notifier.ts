import { Injectable, signal } from '@angular/core';

/**
 * documentation/Architektúra/Backend-offline first.md §8 — a delta pull writes server changes
 * straight into the local SQLite store, but the in-memory `core/data` repositories don't observe
 * SQLite, so a cached repository would keep serving its last snapshot until something forced a
 * re-read. `SyncEngine` bumps `tick` once per pull that applied at least one change, together with
 * the set of entity types that changed; a cached repository reloads off `tick` but only when
 * `changedTypes` intersects the entity types it actually serves.
 *
 * A dependency-free leaf service on purpose: both `SyncEngineService` and every repository inject it,
 * and neither direction may form a cycle (repositories already depend on `SyncEngineService`).
 */
@Injectable({ providedIn: 'root' })
export class DataChangeNotifier {
  /** Monotonic counter — consumers react to the change, not the value. */
  readonly tick = signal(0);

  /** Entity types (`SyncChangeItem.entityType`) touched by the pull that produced the current `tick`. */
  readonly changedTypes = signal<ReadonlySet<string>>(new Set());

  notifyChanged(entityTypes: Iterable<string>): void {
    this.changedTypes.set(new Set(entityTypes));
    this.tick.update((n) => n + 1);
  }
}
