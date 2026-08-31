import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { AycmPartner } from '../../api/model/aycmPartner';
import { AycmPriceRule } from '../../api/model/aycmPriceRule';
import { normalizeName } from '../../shared/name-normalization';
import { STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

export interface AycmPartnerSaveInput {
  id?: string;
  name: string;
  notes: string | null;
}

export interface AycmPriceRuleSaveInput {
  id?: string;
  partnerId: string;
  label: string | null;
  appliesMon: boolean;
  appliesTue: boolean;
  appliesWed: boolean;
  appliesThu: boolean;
  appliesFri: boolean;
  appliesSat: boolean;
  appliesSun: boolean;
  startTime: string;
  endTime: string;
  listPriceHuf: number;
  coPaymentHuf: number;
}

/** Raised by `savePartner` when the trimmed name collides with another live partner (Névegyediség). */
export class AycmPartnerNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A partner with this name already exists');
  }
}

/**
 * documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend
 * for AYCM partners + their price rules (documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md).
 * Price rules are cached per partner and loaded lazily when a partner's editor / a Check-In opens.
 */
@Injectable({ providedIn: 'root' })
export class AycmPartnerRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly partners = signal<AycmPartner[]>([]);
  readonly loaded = signal(false);

  /** partnerId → its live price rules (start-time order). */
  readonly priceRulesByPartner = signal<Record<string, AycmPriceRule[]>>({});

  async load(): Promise<void> {
    this.partners.set(await this.storage.listAycmPartners());
    this.loaded.set(true);
  }

  rulesFor(partnerId: string): AycmPriceRule[] {
    return this.priceRulesByPartner()[partnerId] ?? [];
  }

  async loadRules(partnerId: string): Promise<AycmPriceRule[]> {
    const rules = await this.storage.listAycmPriceRules(partnerId);
    this.priceRulesByPartner.update((map) => ({ ...map, [partnerId]: rules }));
    return rules;
  }

  async savePartner(input: AycmPartnerSaveInput): Promise<AycmPartner> {
    const id = input.id ?? uuidV4();
    const name = input.name.trim();
    const normalized = normalizeName(name);
    const conflict = this.partners().find((p) => p.id !== id && normalizeName(p.name) === normalized);
    if (conflict) {
      throw new AycmPartnerNameConflictError(conflict.id);
    }
    const saved = await this.storage.upsertAycmPartner({ id, name, notes: input.notes, deleted: false });
    this.partners.update((list) => [...list.filter((p) => p.id !== saved.id), saved]);
    this.requestDrainIfNative();
    return saved;
  }

  async deletePartner(id: string): Promise<void> {
    await this.storage.deleteAycmPartner(id);
    this.partners.update((list) => list.filter((p) => p.id !== id));
    this.priceRulesByPartner.update((map) => {
      const next = { ...map };
      delete next[id];
      return next;
    });
    this.requestDrainIfNative();
  }

  async saveRule(input: AycmPriceRuleSaveInput): Promise<AycmPriceRule> {
    const id = input.id ?? uuidV4();
    const draft: AycmPriceRule = {
      id,
      partnerId: input.partnerId,
      label: input.label,
      appliesMon: input.appliesMon,
      appliesTue: input.appliesTue,
      appliesWed: input.appliesWed,
      appliesThu: input.appliesThu,
      appliesFri: input.appliesFri,
      appliesSat: input.appliesSat,
      appliesSun: input.appliesSun,
      startTime: input.startTime,
      endTime: input.endTime,
      listPriceHuf: input.listPriceHuf,
      coPaymentHuf: input.coPaymentHuf,
      deleted: false,
    };
    const saved = await this.storage.upsertAycmPriceRule(draft);
    this.replaceRule(saved.partnerId, saved);
    this.requestDrainIfNative();
    return saved;
  }

  async deleteRule(partnerId: string, id: string): Promise<void> {
    await this.storage.deleteAycmPriceRule(partnerId, id);
    this.priceRulesByPartner.update((map) => ({
      ...map,
      [partnerId]: (map[partnerId] ?? []).filter((r) => r.id !== id),
    }));
    this.requestDrainIfNative();
  }

  private replaceRule(partnerId: string, rule: AycmPriceRule): void {
    this.priceRulesByPartner.update((map) => {
      const current = (map[partnerId] ?? []).filter((r) => r.id !== rule.id);
      const next = [...current, rule].sort((a, b) => a.startTime.localeCompare(b.startTime));
      return { ...map, [partnerId]: next };
    });
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}
