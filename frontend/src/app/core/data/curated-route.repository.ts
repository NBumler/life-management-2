import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { CuratedRoute } from '../../api/model/curatedRoute';
import { CuratedRouteActivityType } from '../../api/model/curatedRouteActivityType';
import { CuratedRouteDifficulty } from '../../api/model/curatedRouteDifficulty';
import { CuratedRoutesService } from '../../api/api/curatedRoutes.service';

export interface CuratedRouteFilter {
	difficulty?: CuratedRouteDifficulty;
	activityType?: CuratedRouteActivityType;
	minDistanceMeters?: number;
	maxDistanceMeters?: number;
}

/**
 * backlog/tura-utvonaltervezo/103-... 2.5 fázis. Ugyanaz a minta, mint a TrailSegmentRepository:
 * NEM egy StorageBackend façade, mert a CuratedRoute admin-kurált, megosztott referenciaadat, nem
 * per-user szinkronizált entitás (nincs outbox, nincs offline cache). A GET /api/tura/curated-routes
 * szűrő-paramétereit közvetlenül a szerverre küldi (nem kliens-oldali filter), mindig online.
 */
@Injectable({ providedIn: 'root' })
export class CuratedRouteRepository {
	private readonly curatedRoutesService = inject(CuratedRoutesService);

	private readonly items = signal<CuratedRoute[]>([]);
	readonly routes = this.items.asReadonly();

	async load(filter: CuratedRouteFilter = {}): Promise<void> {
		const result = await firstValueFrom(
			this.curatedRoutesService.listCuratedRoutes(
				filter.difficulty,
				filter.activityType,
				filter.minDistanceMeters,
				filter.maxDistanceMeters,
			),
		);
		this.items.set(result);
	}
}
