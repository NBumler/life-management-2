import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { TrailSegment } from '../../api/model/trailSegment';
import { TuraService } from '../../api/api/tura.service';

/** Bounding box in [minLon, minLat, maxLon, maxLat] order (map SW/NE corner longitudes/latitudes). */
export type Bbox = readonly [number, number, number, number];

/**
 * backlog/tura-utvonaltervezo/103-... 1. fázis. Unlike every other `core/data/` repository, this
 * is NOT a `StorageBackend` façade: `TrailSegment` is shared reference data fetched by bounding
 * box, not a per-user synced entity (no outbox, no offline cache across app restarts — see the
 * plan's "Trail-adat kiszolgálás" decision). It is only an in-memory dedupe cache over the
 * `GET /api/tura/trail-segments` bbox query, refetched as the map viewport moves; always requires
 * network (offline map/routing on this data is backlog/tura-utvonaltervezo/105-... scope).
 */
@Injectable({ providedIn: 'root' })
export class TrailSegmentRepository {
	private readonly turaService = inject(TuraService);

	private readonly byId = signal<ReadonlyMap<string, TrailSegment>>(new Map());

	readonly segments = computed(() => Array.from(this.byId().values()));

	async loadBbox(countryCode: string, bbox: Bbox): Promise<void> {
		const [minLon, minLat, maxLon, maxLat] = bbox;
		const fetched = await firstValueFrom(this.turaService.listTrailSegmentsInBbox(countryCode, minLon, minLat, maxLon, maxLat));

		const merged = new Map(this.byId());
		for (const segment of fetched) {
			merged.set(segment.id, segment);
		}
		this.byId.set(merged);
	}
}
