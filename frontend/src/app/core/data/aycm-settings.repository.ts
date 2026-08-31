import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { AycmSettings } from '../../api/model/aycmSettings';
import { AuthSessionService } from '../session/auth-session.service';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV5 } from '../sync/uuid';

/**
 * documentation/Features/AYCM tracker.md — the 1:1-per-user AYCM settings singleton. Its only real
 * field is `linkedRecurringExpenseId` (the monthly pass). Like ProfileRepository the id is a
 * deterministic UUID v5 of "AycmSettings:<userId>", so two offline devices converge; the server's
 * lazy GET carries the same id.
 */
@Injectable({ providedIn: 'root' })
export class AycmSettingsRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly authSession = inject(AuthSessionService);
  private readonly syncEngine = inject(SyncEngineService);

  readonly settings = signal<AycmSettings | null>(null);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.settings.set(await this.storage.getAycmSettings());
    this.loaded.set(true);
  }

  /** The linked RecurringExpense id, or null when nothing is linked / not loaded yet. */
  linkedExpenseId(): string | null {
    return this.settings()?.linkedRecurringExpenseId ?? null;
  }

  /** Set or clear (null) the linked monthly pass. */
  async linkExpense(recurringExpenseId: string | null): Promise<void> {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('AycmSettingsRepository: no authenticated user');
    }
    const id = this.settings()?.id ?? (await uuidV5(`AycmSettings:${userId}`));
    const saved = await this.storage.upsertAycmSettings({ id, linkedRecurringExpenseId: recurringExpenseId });
    this.settings.set(saved);

    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}
