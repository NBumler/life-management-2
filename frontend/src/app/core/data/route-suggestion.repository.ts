import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TuraService } from '../../api/api/tura.service';
import { suggestRouteOffline } from '../../pages/menu/tura/offline-route-graph';
import { TrailSegmentRepository } from './trail-segment.repository';

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis. Ugyanazt a mintát követi, mint
 * `TrailSegmentRepository`: nem `StorageBackend` façade, hanem közvetlen wrapper a generált
 * `TuraService` fölött — a route-javaslat egy stateless számítás eredménye, nem
 * perzisztált/szinkronizált entitás. backlog/tura-utvonaltervezo/105-... 4. fázis: ha a hálózati
 * hívás hibázik, a már betöltött (a viewportból vagy egy letöltött offline régióból származó)
 * `TrailSegmentRepository.segments()` adaton fut le ugyanaz az A* on-device (`offline-route-graph.ts`)
 * — a felhasználó szemszögéből ugyanaz az "Automatikus" mód, csak a backend nélkül.
 */
@Injectable({ providedIn: 'root' })
export class RouteSuggestionRepository {
	private readonly turaService = inject(TuraService);
	private readonly trailSegments = inject(TrailSegmentRepository);

	readonly loading = signal(false);

	async suggest(countryCode: string, start: readonly number[], end: readonly number[]): Promise<RouteSuggestion> {
		this.loading.set(true);
		try {
			return await firstValueFrom(this.turaService.suggestRoute(countryCode, start[0], start[1], end[0], end[1]));
		} catch {
			return suggestRouteOffline(this.trailSegments.segments(), start, end);
		} finally {
			this.loading.set(false);
		}
	}
}
