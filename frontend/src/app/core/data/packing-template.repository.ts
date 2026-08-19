import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { PackingTemplate } from '../../api/model/packingTemplate';
import { PackingTemplateDetail } from '../../api/model/packingTemplateDetail';
import { normalizeName } from '../../shared/name-normalization';
import { PackingTemplateSaveItem, STORAGE_BACKEND } from '../storage/storage-backend';
import { SyncEngineService } from '../sync/sync-engine.service';
import { uuidV4 } from '../sync/uuid';

/** documentation/Architektúra/Névegyediség.md: thrown by save() before any write when another live template already has this name. */
export class PackingTemplateNameConflictError extends Error {
  constructor(readonly conflictingId: string) {
    super('A packing template with this name already exists');
  }
}

/** Distinct from StorageBackend's `PackingTemplateDraft`: here `id` is optional (repository mints one for a new template). */
export interface PackingTemplateSaveDraft {
  id?: string;
  name: string;
  notes: string | null;
  items: PackingTemplateSaveItem[];
}

/**
 * documentation/Architektúra/Frontend.md `core/data/`: typed, signal-based facade over StorageBackend.
 * `templates` holds template metadata only — a template's item list is loaded on demand via
 * getDetail(), since (unlike Eszközök) there is no scenario that needs every template's items
 * preloaded at once.
 */
@Injectable({ providedIn: 'root' })
export class PackingTemplateRepository {
  private readonly storage = inject(STORAGE_BACKEND);
  private readonly syncEngine = inject(SyncEngineService);

  readonly templates = signal<PackingTemplate[]>([]);
  readonly loaded = signal(false);

  async load(): Promise<void> {
    this.templates.set(await this.storage.listPackingTemplates());
    this.loaded.set(true);
  }

  getDetail(id: string): Promise<PackingTemplateDetail> {
    return this.storage.getPackingTemplateDetail(id);
  }

  /**
   * documentation/Architektúra/Névegyediség.md: the client pre-checks uniqueness against its own
   * already-loaded live list before writing. The server still enforces the same rule for the rare
   * genuine multi-device race this local check cannot see.
   */
  async save(draft: PackingTemplateSaveDraft): Promise<PackingTemplateDetail> {
    const normalized = normalizeName(draft.name);
    const conflict = this.templates().find((template) => template.id !== draft.id && normalizeName(template.name) === normalized);
    if (conflict) {
      throw new PackingTemplateNameConflictError(conflict.id);
    }

    const id = draft.id ?? uuidV4();
    const saved = await this.storage.savePackingTemplate({ id, name: draft.name, notes: draft.notes, items: draft.items });
    this.upsertLocalSummary(saved);
    this.requestDrainIfNative();
    return saved;
  }

  async remove(id: string): Promise<void> {
    await this.storage.deletePackingTemplate(id);
    this.templates.update((list) => list.filter((template) => template.id !== id));
    this.requestDrainIfNative();
  }

  /**
   * documentation/Subfeatures/Sablonok.md "Duplikálás": entirely client-side — reads the source
   * template's live items, mints fresh client UUIDs, and goes through the same save() path as a
   * normal create. No dedicated backend endpoint (SSOT: Backend.md "vagy kliens oldali create+copy
   * ugyanazzal a szerződéssel").
   */
  async duplicate(id: string): Promise<PackingTemplateDetail> {
    const original = await this.getDetail(id);
    const name = this.uniqueDuplicateName(original.name);
    const items: PackingTemplateSaveItem[] = original.items
      .filter((item) => !item.deleted)
      .map((item) => ({ id: uuidV4(), gearItemId: item.gearItemId, sortOrder: item.sortOrder }));
    return this.save({ name, notes: original.notes ?? null, items });
  }

  private uniqueDuplicateName(originalName: string): string {
    const base = `${originalName} (másolat)`;
    const existingNormalized = new Set(this.templates().map((template) => normalizeName(template.name)));
    if (!existingNormalized.has(normalizeName(base))) {
      return base;
    }
    let suffix = 2;
    while (existingNormalized.has(normalizeName(`${base} ${suffix}`))) {
      suffix++;
    }
    return `${base} ${suffix}`;
  }

  private upsertLocalSummary(saved: PackingTemplateDetail): void {
    const summary: PackingTemplate = {
      id: saved.id,
      name: saved.name,
      notes: saved.notes,
      deleted: saved.deleted,
      deletedAt: saved.deletedAt,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
    };
    this.templates.update((list) => {
      const next = list.filter((template) => template.id !== summary.id);
      next.push(summary);
      next.sort((a, b) => a.name.localeCompare(b.name));
      return next;
    });
  }

  private requestDrainIfNative(): void {
    if (Capacitor.isNativePlatform()) {
      this.syncEngine.requestDrainDebounced();
    }
  }
}
