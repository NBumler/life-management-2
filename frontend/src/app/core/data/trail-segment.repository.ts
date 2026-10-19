import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { TrailSegment } from '../../api/model/trailSegment';
import { TuraService } from '../../api/api/tura.service';
import { bboxesIntersect, expandBboxFraction } from '../geo/geo-math';
import { trailSegmentBbox } from '../geo/segment-route-graph';
import { OfflineRegionRepository } from './offline-region.repository';

/** Bounding box in [minLon, minLat, maxLon, maxLat] order (map SW/NE corner longitudes/latitudes). */
export type Bbox = readonly [number, number, number, number];

/** Share of the bbox width / height kept on every side beyond the requested bbox (backlog/180). */
export const TRAIL_SEGMENT_RETAIN_MARGIN_FRACTION = 0.5;

/**
 * backlog/tura-utvonaltervezo/103-... 1. fázis. Unlike every other `core/data/` repository, this
 * is NOT a `StorageBackend` façade: `TrailSegment` is shared reference data fetched by bounding
 * box, not a per-user synced entity (no outbox, no offline cache across app restarts). It is only
 * an in-memory dedupe cache over the `GET /api/tura/trail-segments` bbox query, refetched as the
 * map viewport moves. backlog/tura-utvonaltervezo/105-... 4. fázis: if the network call fails
 * (BACKEND_OFFLINE/FULL_OFFLINE), it falls back to `OfflineRegionRepository`'s on-device cache of
 * previously downloaded regions instead of leaving the map empty — a no-op (`[]`) outside a
 * downloaded region or on the web build, same as before this fallback existed.
 *
 * backlog/180 — the cache is bounded: after each load it keeps only the segments that intersect
 * the requested bbox grown by `TRAIL_SEGMENT_RETAIN_MARGIN_FRACTION`, so panning across the
 * country no longer accumulates every segment ever seen. A response that arrives after a newer
 * `loadBbox` call started is dropped (the map moved on). A `400` (the backend's
 * `BBOX_TOO_LARGE` guard) means "nothing to show here", not "offline" — no cache fallback.
 */
@Injectable({ providedIn: 'root' })
export class TrailSegmentRepository {
	private readonly turaService = inject(TuraService);
	private readonly offlineRegions = inject(OfflineRegionRepository);

	private readonly byId = signal<ReadonlyMap<string, TrailSegment>>(new Map());

	readonly segments = computed(() => Array.from(this.byId().values()));

	private latestRequestId = 0;

	async loadBbox(countryCode: string, bbox: Bbox): Promise<void> {
		const requestId = ++this.latestRequestId;
		let fetched: TrailSegment[];
		try {
			const [minLon, minLat, maxLon, maxLat] = bbox;
			fetched = await firstValueFrom(this.turaService.listTrailSegmentsInBbox(countryCode, minLon, minLat, maxLon, maxLat));
		} catch (error) {
			fetched = error instanceof HttpErrorResponse && error.status === 400 ? [] : await this.offlineRegions.getCachedSegmentsInBbox(bbox);
		}
		if (requestId !== this.latestRequestId) {
			return;
		}

		const retained = expandBboxFraction(bbox, TRAIL_SEGMENT_RETAIN_MARGIN_FRACTION);
		const next = new Map<string, TrailSegment>();
		for (const segment of [...this.byId().values(), ...fetched]) {
			if (bboxesIntersect(trailSegmentBbox(segment), retained)) {
				next.set(segment.id, segment);
			}
		}
		this.byId.set(next);
	}
}
