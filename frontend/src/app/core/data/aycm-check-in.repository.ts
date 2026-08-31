import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { AycmCheckIn } from '../../api/model/aycmCheckIn';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/**
 * The client-assembled snapshot for a Check-In save. The calling page runs `matchPriceRule` against
 * the partner's current live rules and fills every field; the repository only persists it (the
 * server never re-matches — documentation/Subfeatures/AYCM Check-In.md).
 */
export interface AycmCheckInSaveInput {
  id?: string;
  checkInDate: string;
  checkInTime: string;
  partnerId: string;
  partnerName: string;
  ruleId: string | null;
  ruleLabel: string;
  listPriceHuf: number;
  coPaymentHuf: number;
  visitValueHuf: number;
  notes: string | null;
}

/** documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend. */
@Injectable({ providedIn: 'root' })
export class AycmCheckInRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly checkIns = signal<AycmCheckIn[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.checkIns.set(await this.storage.listAycmCheckIns());
    this.loaded.set(true);
  }

  /** documentation/Subfeatures/AYCM Check-In.md "Napi egyediség": the live row for a calendar day, or null. */
  checkInForDate(date: string): AycmCheckIn | null {
    return this.checkIns().find((c) => !c.deleted && c.checkInDate === date) ?? null;
  }

  async save(input: AycmCheckInSaveInput): Promise<AycmCheckIn> {
    const id = input.id ?? uuidV4();
    const draft: AycmCheckIn = {
      id,
      checkInDate: input.checkInDate,
      checkInTime: input.checkInTime,
      partnerId: input.partnerId,
      partnerName: input.partnerName,
      ruleId: input.ruleId,
      ruleLabel: input.ruleLabel,
      listPriceHuf: input.listPriceHuf,
      coPaymentHuf: input.coPaymentHuf,
      visitValueHuf: input.visitValueHuf,
      notes: input.notes,
      deleted: false,
    };
    const saved = await this.storage.upsertAycmCheckIn(draft);
    this.checkIns.update((list) => [...list.filter((c) => c.id !== saved.id), saved]);
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deleteAycmCheckIn(id);
    this.checkIns.update((list) => list.filter((c) => c.id !== id));
    this.requestDrainIfNative();
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}
