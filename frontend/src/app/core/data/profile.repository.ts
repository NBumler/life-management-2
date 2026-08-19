import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { UserProfile } from '../../api/model/userProfile';
import { AuthSessionService } from '../session/auth-session.service';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV5 } from '../sync/uuid';

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
    const id = this.profile()?.id ?? (await uuidV5(`UserProfile:${userId}`));
    const saved = await this.storage.upsertProfile({ ...draft, id });
    this.profile.set(saved);
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrain();
    }
  }
}
