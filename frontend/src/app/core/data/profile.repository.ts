import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { UserProfile } from '../../api/model/userProfile';
import { AuthSessionService } from '../session/auth-session.service';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV5 } from '../sync/uuid';
import { WeightHistoryRepository } from './weight-history.repository';

export type ProfileDraft = Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend.
 * Page code reads/writes only through this — never the generated client or StorageBackend directly.
 */
@Injectable({ providedIn: 'root' })
export class ProfileRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly authSession = inject(AuthSessionService);
  private readonly syncEngine = inject(SyncEngineService);
  private readonly weightHistory = inject(WeightHistoryRepository);

  readonly profile = signal<UserProfile | null>(null);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.profile.set(await this.storage.getProfile());
    this.loaded.set(true);
  }

  /** documentation/Architektúra/Backend-offline first.md §9: UserProfile is natural-keyed (1:1 per user) → deterministic UUID v5. */
  async save(draft: ProfileDraft): Promise<void> {
    const userId = this.authSession.userId();
    if (userId === null) {
      throw new Error('ProfileRepository: no authenticated user');
    }
    const previousWeight = this.profile()?.currentWeightKg ?? null;
    const id = this.profile()?.id ?? (await uuidV5(`UserProfile:${userId}`));
    const saved = await this.storage.upsertProfile({ ...draft, id });
    this.profile.set(saved);

    // documentation/Features/Profile.md "Súlytörténet": a changed (and filled-in) currentWeightKg opens a history row.
    const nextWeight = saved.currentWeightKg ?? null;
    if (nextWeight !== null && nextWeight !== previousWeight) {
      await this.weightHistory.add(new Date().toISOString(), nextWeight);
    }

    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrain();
    }
  }
}
