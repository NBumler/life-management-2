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
	/** backlog/191 — az utolsó betöltés nem sikerült (offline / backend nem elérhető): az üres lista nem a szűrő miatt üres. */
	private readonly failed = signal(false);
	readonly loadFailed = this.failed.asReadonly();
	/** backlog/227 — a legutolsó kérés még fut: a lista még nem a szűrő eredménye, üres-állapot szöveg nem illik rá. */
	private readonly pending = signal(false);
	readonly loading = this.pending.asReadonly();
	/** Gyors egymás utáni szűrőváltásnál csak a legutolsó kérés eredménye és állapota számít. */
	private requestId = 0;

	async load(filter: CuratedRouteFilter = {}): Promise<void> {
		const requestId = ++this.requestId;
		this.pending.set(true);
		try {
			const result = await firstValueFrom(
				this.curatedRoutesService.listCuratedRoutes(
					filter.difficulty,
					filter.activityType,
					filter.minDistanceMeters,
					filter.maxDistanceMeters,
				),
			);
			if (requestId === this.requestId) {
				this.items.set(result);
				this.failed.set(false);
			}
		} catch {
			if (requestId === this.requestId) {
				this.items.set([]);
				this.failed.set(true);
			}
		} finally {
			if (requestId === this.requestId) {
				this.pending.set(false);
			}
		}
	}
}
