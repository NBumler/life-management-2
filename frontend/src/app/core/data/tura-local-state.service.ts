import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

/**
 * backlog/213 — the Túra page's unsaved route draft: the whole line, the user-picked waypoints, the
 * name and the day breaks. Device-local (`@capacitor/preferences`), never an outbox row — only
 * "Mentés" turns it into a `HikeRoute`. The undo history and the drawing mode are not kept.
 */
export interface StoredTuraDraft {
  coordinates: number[][];
  waypointIndexes: number[];
  name: string;
  dayBreaks: { waypointIndex: number; overnightName: string }[];
  /** backlog/212 — a szerkesztésre betöltött mentett útvonal id-je; hiányzik vagy `null` egy új útvonalnál. */
  routeId?: string | null;
}

/**
 * backlog/214 — where the Túra map was left: centre [lon, lat], zoom, base map and hillshade toggle.
 * backlog/199, backlog/202 — plus the "Jelzés nélküli utak" / "Saját útvonalak" layer toggles; absent in
 * views stored before them, which then read as "on".
 */
export interface StoredTuraMapView {
  center: [number, number];
  zoom: number;
  basemap: string;
  hillshade: boolean;
  myRoutes?: boolean;
  unmarkedTrails?: boolean;
}

const DRAFT_KEY = 'lm2_tura_draft';
const MAP_VIEW_KEY = 'lm2_tura_map_view';

@Injectable({ providedIn: 'root' })
export class TuraLocalStateService {
  async readDraft(): Promise<StoredTuraDraft | null> {
    const value = await this.readJson(DRAFT_KEY);
    return isStoredDraft(value) ? value : null;
  }

  async writeDraft(draft: StoredTuraDraft): Promise<void> {
    await Preferences.set({ key: DRAFT_KEY, value: JSON.stringify(draft) });
  }

  async clearDraft(): Promise<void> {
    await Preferences.remove({ key: DRAFT_KEY });
  }

  async readMapView(): Promise<StoredTuraMapView | null> {
    const value = await this.readJson(MAP_VIEW_KEY);
    return isStoredMapView(value) ? value : null;
  }

  async writeMapView(view: StoredTuraMapView): Promise<void> {
    await Preferences.set({ key: MAP_VIEW_KEY, value: JSON.stringify(view) });
  }

  /** A corrupt or foreign value reads as "nothing stored", never as an error. */
  private async readJson(key: string): Promise<unknown> {
    const stored = await Preferences.get({ key });
    if (!stored.value) {
      return null;
    }
    try {
      return JSON.parse(stored.value) as unknown;
    } catch {
      return null;
    }
  }
}

function isCoordinate(value: unknown): value is number[] {
  return Array.isArray(value) && value.length >= 2 && value.every((n) => typeof n === 'number' && Number.isFinite(n));
}

function isStoredDraft(value: unknown): value is StoredTuraDraft {
  const draft = value as StoredTuraDraft | null;
  return (
    typeof draft === 'object' &&
    draft !== null &&
    Array.isArray(draft.coordinates) &&
    draft.coordinates.every(isCoordinate) &&
    Array.isArray(draft.waypointIndexes) &&
    draft.waypointIndexes.every((index) => Number.isInteger(index) && index >= 0 && index < draft.coordinates.length) &&
    typeof draft.name === 'string' &&
    Array.isArray(draft.dayBreaks) &&
    draft.dayBreaks.every((day) => Number.isInteger(day?.waypointIndex) && typeof day.overnightName === 'string') &&
    (draft.routeId == null || typeof draft.routeId === 'string')
  );
}

function isStoredMapView(value: unknown): value is StoredTuraMapView {
  const view = value as StoredTuraMapView | null;
  return (
    typeof view === 'object' &&
    view !== null &&
    isCoordinate(view.center) &&
    typeof view.zoom === 'number' &&
    Number.isFinite(view.zoom) &&
    typeof view.basemap === 'string' &&
    typeof view.hillshade === 'boolean' &&
    isOptionalBoolean(view.myRoutes) &&
    isOptionalBoolean(view.unmarkedTrails)
  );
}

function isOptionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === 'boolean';
}
