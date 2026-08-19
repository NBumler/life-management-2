import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { HttpStorageBackend } from './http-storage-backend';
import { SqliteStorageBackend } from './sqlite-storage-backend';
import { STORAGE_BACKEND } from './storage-backend';

/** documentation/Architektúra/Frontend.md `core/storage/`: the choice is made once, in DI, from `offlineCapable`. */
export function provideStorageBackend(): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: STORAGE_BACKEND,
      useExisting: Capacitor.isNativePlatform() ? SqliteStorageBackend : HttpStorageBackend,
    },
  ]);
}
