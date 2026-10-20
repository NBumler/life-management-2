import { Injectable, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';

import { Bbox } from './trail-segment.repository';
import { TrailSegment } from '../../api/model/trailSegment';
import { OFFLINE_BASEMAP_ID, OfflineRegion, bboxIntersects, tileKey } from './offline-region.model';
import { deleteManifest, deleteTiles, readManifest, readRegionIndex, writeRegionIndex } from './offline-tile-store';

/**
 * backlog/tura-utvonaltervezo/105-... 4. fázis — a régiónkénti offline térkép tárolása.
 * Csak natív platformon aktív (ld. `Capacitor.isNativePlatform()` a `StorageBackend`-választás
 * mintájára) — a web build a [[Backend-offline first]] kontraktus szerint explicit online-only
 * marad ezen a területen is, nincs Filesystem-hozzáférés.
 *
 * backlog/223 — új régió **nem tölthető le**: a csempék a tile.openstreetmap.org-ról jöttek, aminek a
 * felhasználási szabálya tiltja a tömeges / offline előletöltést. Amíg a #105 nem választ olyan
 * csempeforrást, ami ezt megengedi, csak a korábban letöltött régiók használata (a térkép-cache és a
 * szakaszok) és törlése marad. A turistaút-tervezéshez és a magassághoz letöltés nem kell: azt a
 * geo build asset adja (Backend-offline first §15).
 */
@Injectable({ providedIn: 'root' })
export class OfflineRegionRepository {
	readonly regions = signal<OfflineRegion[]>([]);

	constructor() {
		if (Capacitor.isNativePlatform()) {
			void this.refresh();
		}
	}

	async refresh(): Promise<void> {
		this.regions.set(await readRegionIndex());
	}

	async remove(id: string): Promise<void> {
		const regions = await readRegionIndex();
		const target = regions.find((region) => region.id === id);
		if (!target) {
			return;
		}
		const manifest = await readManifest(id);
		const remaining = regions.filter((region) => region.id !== id);
		const remainingManifests = await Promise.all(remaining.map((region) => readManifest(region.id)));
		const keep = new Set<string>();
		for (const manifest of remainingManifests) {
			for (const tile of manifest.tiles) {
				keep.add(tileKey(tile));
			}
		}
		const toDelete = manifest.tiles.filter((tile) => !keep.has(tileKey(tile)));

		await deleteTiles(OFFLINE_BASEMAP_ID, toDelete);
		await deleteManifest(id);
		await writeRegionIndex(remaining);
		this.regions.set(remaining);
	}

	/** A `TrailSegmentRepository` hívja, ha a hálózati bbox-lekérdezés hibázik (nincs internet/backend) — minden, a kért bbox-szal metsző letöltött régió szakaszait visszaadja. */
	async getCachedSegmentsInBbox(bbox: Bbox): Promise<TrailSegment[]> {
		if (!Capacitor.isNativePlatform()) {
			return [];
		}
		const intersecting = (await readRegionIndex()).filter((region) => bboxIntersects(region.bbox, bbox));
		const manifests = await Promise.all(intersecting.map((region) => readManifest(region.id)));
		const byId = new Map<string, TrailSegment>();
		for (const manifest of manifests) {
			for (const segment of manifest.segments) {
				byId.set(segment.id, segment);
			}
		}
		return Array.from(byId.values());
	}
}
