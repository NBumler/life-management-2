import { TestBed } from '@angular/core/testing';
import { Capacitor } from '@capacitor/core';

import { UserProfile } from '../../api/model/userProfile';
import { AuthSessionService } from '../session/auth-session.service';
import { StorageBackend, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { ProfileRepository } from './profile.repository';
import { WeightHistoryRepository } from './weight-history.repository';

describe('ProfileRepository', () => {
  let repository: ProfileRepository;
  let storage: jasmine.SpyObj<StorageBackend>;
  let syncEngine: jasmine.SpyObj<Pick<SyncEngineService, 'requestDrainDebounced'>>;
  let weightHistory: jasmine.SpyObj<Pick<WeightHistoryRepository, 'add'>>;

  const savedProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
    id: 'profile-1',
    birthDate: null,
    sex: null,
    heightCm: null,
    currentWeightKg: 80,
    goal: null,
    kgPerWeek: null,
    grossMonthlySalaryHuf: null,
    ...overrides,
  });

  beforeEach(() => {
    storage = jasmine.createSpyObj('StorageBackend', ['getProfile', 'upsertProfile']);
    syncEngine = jasmine.createSpyObj('SyncEngineService', ['requestDrainDebounced']);
    weightHistory = jasmine.createSpyObj('WeightHistoryRepository', ['add']);

    TestBed.configureTestingModule({
      providers: [
        { provide: STORAGE_BACKEND, useValue: storage },
        { provide: AuthSessionService, useValue: { userId: () => 'user-1' } },
        { provide: SyncEngineService, useValue: syncEngine },
        { provide: WeightHistoryRepository, useValue: weightHistory },
      ],
    });
    repository = TestBed.inject(ProfileRepository);
  });

  describe('load()', () => {
    it('reads the profile from the storage backend into the signal', async () => {
      const profile = savedProfile();
      storage.getProfile.and.resolveTo(profile);

      await repository.load();

      expect(repository.profile()).toEqual(profile);
      expect(repository.loaded()).toBe(true);
    });

    it('handles no local profile yet', async () => {
      storage.getProfile.and.resolveTo(null);

      await repository.load();

      expect(repository.profile()).toBeNull();
      expect(repository.loaded()).toBe(true);
    });
  });

  describe('save()', () => {
    it('opens a weight-history entry when currentWeightKg changes to a non-null value', async () => {
      storage.upsertProfile.and.resolveTo(savedProfile({ currentWeightKg: 82 }));

      await repository.save({ currentWeightKg: 82 } as Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>);

      expect(weightHistory.add).toHaveBeenCalledTimes(1);
      expect(weightHistory.add.calls.mostRecent().args[1]).toBe(82);
    });

    it('does not open a weight-history entry when the weight is unchanged', async () => {
      storage.getProfile.and.resolveTo(savedProfile({ currentWeightKg: 80 }));
      await repository.load();
      storage.upsertProfile.and.resolveTo(savedProfile({ currentWeightKg: 80 }));

      await repository.save({ currentWeightKg: 80 } as Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>);

      expect(weightHistory.add).not.toHaveBeenCalled();
    });

    it('does not open a weight-history entry when the new weight is null (cleared)', async () => {
      storage.getProfile.and.resolveTo(savedProfile({ currentWeightKg: 80 }));
      await repository.load();
      storage.upsertProfile.and.resolveTo(savedProfile({ currentWeightKg: null }));

      await repository.save({ currentWeightKg: null } as Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>);

      expect(weightHistory.add).not.toHaveBeenCalled();
    });

    it('triggers a debounced drain on native, not the immediate one', async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(true);
      storage.upsertProfile.and.resolveTo(savedProfile());

      await repository.save({ currentWeightKg: null } as Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>);

      expect(syncEngine.requestDrainDebounced).toHaveBeenCalledTimes(1);
    });

    it('does not trigger any drain on web (no outbox to drain)', async () => {
      spyOn(Capacitor, 'isNativePlatform').and.returnValue(false);
      storage.upsertProfile.and.resolveTo(savedProfile());

      await repository.save({ currentWeightKg: null } as Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>);

      expect(syncEngine.requestDrainDebounced).not.toHaveBeenCalled();
    });

    it('updates the profile signal with the storage backend result', async () => {
      const saved = savedProfile({ heightCm: 180 });
      storage.upsertProfile.and.resolveTo(saved);

      await repository.save({ heightCm: 180 } as Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>);

      expect(repository.profile()).toEqual(saved);
    });
  });
});
