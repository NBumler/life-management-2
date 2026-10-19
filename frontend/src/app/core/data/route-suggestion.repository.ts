import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';

import { RouteSuggestion } from '../../api/model/routeSuggestion';
import { TuraService } from '../../api/api/tura.service';
import { polylineLengthMeters, withExactEndpoints } from '../geo/geo-math';
import { suggestRouteOffline } from '../geo/segment-route-graph';
import { RoutingService } from '../geo/routing.service';
import { ConnectionState } from '../sync/connection-state';
import { SyncEngineService } from '../sync/sync-engine.service';
import { TrailSegmentRepository } from './trail-segment.repository';

/**
 * backlog/151 — a backend-hívás felső korlátja. Egy elakadó kérés (gyenge Wi-Fi, nem válaszoló
 * proxy) különben a WebView saját időkorlátjáig tartaná vissza a telefonos tartalékot.
 */
export const BACKEND_ROUTE_SUGGESTION_TIMEOUT_MS = 8_000;

/** A következő képkocka kirajzolása után old fel (`requestAnimationFrame` a paint előtt fut, a `setTimeout` utána). */
function afterNextPaint(): Promise<void> {
	return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
}

/** Ezekben az állapotokban a backend-hívás biztosan nem sikerül, ezért el sem indul. */
const BACKEND_UNREACHABLE_STATES: readonly ConnectionState[] = ['BACKEND_OFFLINE', 'FULL_OFFLINE'];

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
 *
 * A backend szándékosan a csomag **előtt** áll: az adata új importtal frissül, app-kiadás nélkül, a
 * csomag a build pillanatát rögzíti (Backend-offline first §14 kivétel). Hogy ez ne lassítsa az
 * offline esetet, a 2. szint kimarad, ha a `SyncEngineService` már Backend- vagy Full-offline-t
 * tud, és legfeljebb `BACKEND_ROUTE_SUGGESTION_TIMEOUT_MS`-ig vár. `UNKNOWN` (hidegindítás) esetén
 * megpróbálja — ott az időkorlát véd.
 */
@Injectable({ providedIn: 'root' })
export class RouteSuggestionRepository {
	private readonly turaService = inject(TuraService);
	private readonly trailSegments = inject(TrailSegmentRepository);
	private readonly routing = inject(RoutingService);
	private readonly syncEngine = inject(SyncEngineService);

	readonly loading = signal(false);

	async suggest(countryCode: string, start: readonly number[], end: readonly number[]): Promise<RouteSuggestion> {
		this.loading.set(true);
		try {
			// backlog/182 — a helyi A* szinkron fut a fő szálon; előbb ki kell rajzolódnia a töltésjelzőnek.
			await afterNextPaint();
			const local = suggestRouteOffline(this.trailSegments.segments(), start, end);
			if (local.found) {
				return local;
			}
			const remote = await this.fromBackend(countryCode, start, end);
			if (remote?.found) {
				return remote;
			}
			return (await this.fromPackage(countryCode, start, end)) ?? remote ?? local;
		} finally {
			this.loading.set(false);
		}
	}

	/** `null`, ha a backend ismerten elérhetetlen, hibázik vagy nem válaszol időben — a csomag veszi át. */
	private async fromBackend(countryCode: string, start: readonly number[], end: readonly number[]): Promise<RouteSuggestion | null> {
		if (BACKEND_UNREACHABLE_STATES.includes(this.syncEngine.connectionState())) {
			return null;
		}
		try {
			return await firstValueFrom(
				this.turaService
					.suggestRoute(countryCode, start[0], start[1], end[0], end[1])
					.pipe(timeout(BACKEND_ROUTE_SUGGESTION_TIMEOUT_MS)),
			);
		} catch {
			return null;
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
