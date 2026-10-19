import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TuraService } from '../../api/api/tura.service';
import { polylineLengthMeters, withExactEndpoints } from '../geo/geo-math';
import { suggestRouteOffline } from '../geo/segment-route-graph';
import { RoutingService } from '../geo/routing.service';
import { TrailSegmentRepository } from './trail-segment.repository';

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis. Ugyanazt a mintát követi, mint
 * `TrailSegmentRepository`: nem `StorageBackend` façade, hanem közvetlen wrapper — a route-javaslat
 * egy stateless számítás eredménye, nem perzisztált/szinkronizált entitás.
 *
 * backlog/151 — **eszköz-elsőbbség** (Backend-offline first §14), három szintben:
 * 1. A már betöltött (viewportból vagy letöltött offline régióból származó)
 *    `TrailSegmentRepository.segments()` adaton futó helyi A* (`core/geo/segment-route-graph.ts`) — ez a
 *    legfrissebb adat, ha van.
 * 2. Ha ez nem talál utat, a backend `suggestRoute` — a két pont köré táguló bbox-ban, a
 *    viewporton túl is keres, de internet kell hozzá.
 * 3. Ha ez sem ad útvonalat (nincs net, vagy a backend is "nincs összeköttetés"-t mond), a
 *    #150/#151 build-asset turistaút-gráfja (`RoutingService`, `HIKE` profil) — ez az APK-ba épült
 *    országos csomag, ezért **soha nem letöltött, internetet soha nem elért eszközön is** ad
 *    útvonalat, nem csak a letöltött régión belül (lásd
 *    backlog/tura-utvonaltervezo/105-tura-offline-terkep-es-utvonalszamitas).
 */
@Injectable({ providedIn: 'root' })
export class RouteSuggestionRepository {
	private readonly turaService = inject(TuraService);
	private readonly trailSegments = inject(TrailSegmentRepository);
	private readonly routing = inject(RoutingService);

	readonly loading = signal(false);

	async suggest(countryCode: string, start: readonly number[], end: readonly number[]): Promise<RouteSuggestion> {
		this.loading.set(true);
		try {
			const local = suggestRouteOffline(this.trailSegments.segments(), start, end);
			if (local.found) {
				return local;
			}
			let remote: RouteSuggestion | null = null;
			try {
				remote = await firstValueFrom(this.turaService.suggestRoute(countryCode, start[0], start[1], end[0], end[1]));
				if (remote.found) {
					return remote;
				}
			} catch {
				// BACKEND_OFFLINE / FULL_OFFLINE — a build-asset tartalék veszi át alább.
			}
			return (await this.fromPackage(countryCode, start, end)) ?? remote ?? local;
		} finally {
			this.loading.set(false);
		}
	}

	/** A build-asset turistaút-gráfon (#150/#151) keres; `null`, ha a csomag nem fedi az országot vagy nincs útvonal. */
	private async fromPackage(countryCode: string, start: readonly number[], end: readonly number[]): Promise<RouteSuggestion | null> {
		if (countryCode !== 'HU') {
			return null;
		}
		const path = await this.routing.route('HIKE', start, end);
		if (path === null) {
			return null;
		}
		const coordinates = withExactEndpoints(path, start, end);
		return { found: true, coordinates, distanceMeters: polylineLengthMeters(coordinates) };
	}
}
