import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { firstValueFrom } from 'rxjs';

import { Bbox } from '../../../core/data/trail-segment.repository';
import { uuidV4 } from '../../../core/sync/uuid';
import { TrailSegment } from '../../../api/model/trailSegment';
import { TuraService } from '../../../api/api/tura.service';
import {
	OFFLINE_BASEMAP_ID,
	OFFLINE_TILE_MAX_COUNT,
	OfflineRegion,
	TileRef,
	bboxIntersects,
	tileKey,
	tilesInBbox,
} from './offline-region.model';
import { deleteManifest, deleteTiles, readManifest, readRegionIndex, writeManifest, writeRegionIndex, writeTile } from './offline-tile-store';

const OSM_TILE_URL_ROOT = 'https://tile.openstreetmap.org';
const DOWNLOAD_CONCURRENCY = 6;

export type DownloadResult = { ok: true } | { ok: false; reason: 'too-large'; tileCount: number };

async function runWithConcurrency<T>(items: readonly T[], limit: number, task: (item: T) => Promise<void>): Promise<void> {
	let cursor = 0;
	async function worker(): Promise<void> {
		while (cursor < items.length) {
			const item = items[cursor++];
			await task(item);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

/**
 * backlog/tura-utvonaltervezo/105-... 4. fázis — régiónkénti offline térkép-letöltés és -tárolás.
 * Csak natív platformon aktív (ld. `Capacitor.isNativePlatform()` a `StorageBackend`-választás
 * mintájára) — a web build a [[Backend-offline first]] kontraktus szerint explicit online-only
 * marad ezen a területen is, nincs Filesystem-hozzáférés.
 */
@Injectable({ providedIn: 'root' })
export class OfflineRegionRepository {
	private readonly turaService = inject(TuraService);

	readonly regions = signal<OfflineRegion[]>([]);
	readonly downloadProgress = signal<{ done: number; total: number } | null>(null);

	constructor() {
		if (Capacitor.isNativePlatform()) {
			void this.refresh();
		}
	}

	async refresh(): Promise<void> {
		this.regions.set(await readRegionIndex());
	}

	estimateTileCount(bbox: Bbox): number {
		return tilesInBbox(bbox).length;
	}

	async download(countryCode: string, bbox: Bbox, name: string): Promise<DownloadResult> {
		const tiles = tilesInBbox(bbox);
		if (tiles.length === 0 || tiles.length > OFFLINE_TILE_MAX_COUNT) {
			return { ok: false, reason: 'too-large', tileCount: tiles.length };
		}

		this.downloadProgress.set({ done: 0, total: tiles.length });
		const downloadedTiles: TileRef[] = [];
		let totalBytes = 0;
		await runWithConcurrency(tiles, DOWNLOAD_CONCURRENCY, async (tile) => {
			try {
				const response = await fetch(`${OSM_TILE_URL_ROOT}/${tile.z}/${tile.x}/${tile.y}.png`);
				if (response.ok) {
					const buffer = await response.arrayBuffer();
					totalBytes += await writeTile(OFFLINE_BASEMAP_ID, tile, buffer);
					downloadedTiles.push(tile);
				}
			} finally {
				this.downloadProgress.update((progress) => (progress ? { done: progress.done + 1, total: progress.total } : progress));
			}
		});

		let segments: TrailSegment[] = [];
		try {
			const [minLon, minLat, maxLon, maxLat] = bbox;
			segments = await firstValueFrom(this.turaService.listTrailSegmentsInBbox(countryCode, minLon, minLat, maxLon, maxLat));
		} catch {
			// Az útvonal-adat nélkül is hasznos a letöltött alaptérkép — best-effort, nem hiba.
			segments = [];
		}

		const id = uuidV4();
		await writeManifest(id, { tiles: downloadedTiles, segments });
		const region: OfflineRegion = {
			id,
			name,
			bbox,
			tileCount: downloadedTiles.length,
			approxSizeBytes: totalBytes,
			createdAt: new Date().toISOString(),
		};
		const regions = [...(await readRegionIndex()), region];
		await writeRegionIndex(regions);
		this.regions.set(regions);
		this.downloadProgress.set(null);
		return { ok: true };
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
