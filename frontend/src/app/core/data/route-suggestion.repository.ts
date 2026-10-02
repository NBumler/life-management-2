import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TuraService } from '../../api/api/tura.service';
import { suggestRouteOffline } from '../../pages/menu/tura/offline-route-graph';
import { TrailSegmentRepository } from './trail-segment.repository';

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis. Ugyanazt a mintát követi, mint
 * `TrailSegmentRepository`: nem `StorageBackend` façade, hanem közvetlen wrapper — a route-javaslat
 * egy stateless számítás eredménye, nem perzisztált/szinkronizált entitás.
 *
 * backlog/151 — **eszköz-elsőbbség** (Backend-offline first §14): az A* először on-device fut
 * (`offline-route-graph.ts`) a már betöltött (viewportból vagy letöltött offline régióból származó)
 * `TrailSegmentRepository.segments()` adaton. A backend `suggestRoute` csak gyorsító tartalék, ha a
 * helyi adatban nincs összeköttetés (a szerver a két pont köré táguló bbox-ban, a viewporton túl is
 * keres); ha az is elérhetetlen, a helyi "nincs útvonal" eredmény marad.
 */
@Injectable({ providedIn: 'root' })
export class RouteSuggestionRepository {
	private readonly turaService = inject(TuraService);
	private readonly trailSegments = inject(TrailSegmentRepository);

	readonly loading = signal(false);

	async suggest(countryCode: string, start: readonly number[], end: readonly number[]): Promise<RouteSuggestion> {
		this.loading.set(true);
		try {
			const local = suggestRouteOffline(this.trailSegments.segments(), start, end);
			if (local.found) {
				return local;
			}
			try {
				return await firstValueFrom(this.turaService.suggestRoute(countryCode, start[0], start[1], end[0], end[1]));
			} catch {
				return local;
			}
		} finally {
			this.loading.set(false);
		}
	}
}
