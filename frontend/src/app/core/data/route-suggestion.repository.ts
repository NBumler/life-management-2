import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TuraService } from '../../api/api/tura.service';

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis. Ugyanazt a mintát követi, mint
 * `TrailSegmentRepository`: nem `StorageBackend` façade, hanem közvetlen wrapper a generált
 * `TuraService` fölött — a route-javaslat egy stateless számítás eredménye, nem
 * perzisztált/szinkronizált entitás.
 */
@Injectable({ providedIn: 'root' })
export class RouteSuggestionRepository {
	private readonly turaService = inject(TuraService);

	readonly loading = signal(false);

	async suggest(countryCode: string, start: readonly number[], end: readonly number[]): Promise<RouteSuggestion> {
		this.loading.set(true);
		try {
			return await firstValueFrom(this.turaService.suggestRoute(countryCode, start[0], start[1], end[0], end[1]));
		} finally {
			this.loading.set(false);
		}
	}
}
