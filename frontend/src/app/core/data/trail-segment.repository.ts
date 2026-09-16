import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TrailSegment } from '../../api/model/trailSegment';
import { TuraService } from '../../api/api/tura.service';
import { OfflineRegionRepository } from '../../pages/menu/tura/offline-region.repository';

/** Bounding box in [minLon, minLat, maxLon, maxLat] order (map SW/NE corner longitudes/latitudes). */
export type Bbox = readonly [number, number, number, number];

/**
 * backlog/tura-utvonaltervezo/103-... 1. fázis. Unlike every other `core/data/` repository, this
 * is NOT a `StorageBackend` façade: `TrailSegment` is shared reference data fetched by bounding
 * box, not a per-user synced entity (no outbox, no offline cache across app restarts). It is only
 * an in-memory dedupe cache over the `GET /api/tura/trail-segments` bbox query, refetched as the
 * map viewport moves. backlog/tura-utvonaltervezo/105-... 4. fázis: if the network call fails
 * (BACKEND_OFFLINE/FULL_OFFLINE), it falls back to `OfflineRegionRepository`'s on-device cache of
 * previously downloaded regions instead of leaving the map empty — a no-op (`[]`) outside a
 * downloaded region or on the web build, same as before this fallback existed.
 */
@Injectable({ providedIn: 'root' })
export class TrailSegmentRepository {
	private readonly turaService = inject(TuraService);
	private readonly offlineRegions = inject(OfflineRegionRepository);

	private readonly byId = signal<ReadonlyMap<string, TrailSegment>>(new Map());

	readonly segments = computed(() => Array.from(this.byId().values()));

	async loadBbox(countryCode: string, bbox: Bbox): Promise<void> {
		let fetched: TrailSegment[];
		try {
			const [minLon, minLat, maxLon, maxLat] = bbox;
			fetched = await firstValueFrom(this.turaService.listTrailSegmentsInBbox(countryCode, minLon, minLat, maxLon, maxLat));
		} catch {
			fetched = await this.offlineRegions.getCachedSegmentsInBbox(bbox);
		}

		const merged = new Map(this.byId());
		for (const segment of fetched) {
			merged.set(segment.id, segment);
		}
		this.byId.set(merged);
	}
}
