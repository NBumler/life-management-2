import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DemGrid, sampleElevation } from './dem';
import { WayFeature, decodeWayTile } from './way-tile-codec';

/**
 * backlog/150 + backlog/151 — a build-asset geo-csomag (DEM + bicikli- és turistaút-hálózat) lusta
 * betöltése és lefedettség-ellenőrzése (Backend-offline first §15). A csomag az APK-ba épül
 * (`frontend/src/assets/geo/`, `scripts/build-geo-assets.mjs`), ezért futás közben nincs hálózati
 * hívás. Ha a csomag hiányzik, minden lekérdezés `null`-t vagy üres listát ad, soha nem 0-t (§14).
 */

export type BboxTuple = [minLon: number, minLat: number, maxLon: number, maxLat: number];

export interface GeoManifestDemTile {
	file: string;
	originLon: number;
	originLat: number;
	stepLon: number;
	stepLat: number;
	cols: number;
	rows: number;
	noData: number;
	bytes: number;
}

/** Közös csempe-alak a bicikli- és a turistaút-hálózatnak is — csak a mappa (`bike/` / `hike/`) különbözik. */
export interface GeoManifestWayTile {
	file: string;
	bbox: BboxTuple;
	ways: number;
	points: number;
	bytes: number;
}

export interface GeoManifest {
	version: number;
	generatedAt: string;
	bbox: BboxTuple;
	attribution: string[];
	dem: GeoManifestDemTile[];
	bike: GeoManifestWayTile[];
	hike: GeoManifestWayTile[];
}

const BASE_URL = 'assets/geo/';
const MANIFEST_URL = `${BASE_URL}manifest.json`;
/** A fájlnevek a `bike/` / `hike/` mappa miatt eleve nem ütköznek, ezért egy közös cache elég. */
const MAX_CACHED_WAY_TILES = 32;

@Injectable({ providedIn: 'root' })
export class GeoAssetService {
	private readonly http = inject(HttpClient);
	private manifestPromise: Promise<GeoManifest | null> | null = null;
	private readonly demCache = new Map<string, Promise<DemGrid>>();
	private readonly wayCache = new Map<string, Promise<WayFeature[]>>();

	/** A csomag fejléce; ha nincs csomag az eszközön, `null`. */
	manifest(): Promise<GeoManifest | null> {
		this.manifestPromise ??= firstValueFrom(this.http.get<GeoManifest>(MANIFEST_URL)).catch(() => null);
		return this.manifestPromise;
	}

	/** A csomag lefedi-e a pontot (a manifest országos bbox-a alapján). */
	async covers(lon: number, lat: number): Promise<boolean> {
		const manifest = await this.manifest();
		return manifest !== null && inBbox(manifest.bbox, lon, lat);
	}

	/**
	 * Magasság a DEM-ből, bilineárisan. `null`, ha a pont a csomagon kívül esik vagy a
	 * környező cellák között noData van.
	 */
	async elevationAt(lon: number, lat: number): Promise<number | null> {
		const manifest = await this.manifest();
		if (!manifest) {
			return null;
		}
		for (const tile of manifest.dem) {
			if (!demTileContains(tile, lon, lat)) {
				continue;
			}
			let grid: DemGrid;
			try {
				grid = await this.loadDem(tile);
			} catch {
				// Sérült vagy hiányzó csempe: a pont ismeretlen magasságú, nem 0 m (§14).
				continue;
			}
			const elevation = sampleElevation(grid, lon, lat);
			if (elevation !== null) {
				return elevation;
			}
		}
		return null;
	}

	/**
	 * A bbox-ot érintő bicikli-csempék összes útja (a csempék átfedése miatt duplikátumokkal), a
	 * `tileFiles`-szel együtt — a `RoutingService` ebből képez gráf-gyorsítótár kulcsot, hogy ugyanazt
	 * a térséget ne építse fel újra minden lekérdezésnél.
	 */
	async bikeWaysIntersecting(bbox: BboxTuple): Promise<{ tileFiles: string[]; ways: WayFeature[] }> {
		const manifest = await this.manifest();
		return manifest ? this.waysIntersecting(manifest.bike, bbox) : { tileFiles: [], ways: [] };
	}

	/** Ugyanaz, mint a `bikeWaysIntersecting`, csak a turistaút-hálózat csempéire (#151). */
	async hikeWaysIntersecting(bbox: BboxTuple): Promise<{ tileFiles: string[]; ways: WayFeature[] }> {
		const manifest = await this.manifest();
		return manifest ? this.waysIntersecting(manifest.hike, bbox) : { tileFiles: [], ways: [] };
	}

	private async waysIntersecting(
		tiles: readonly GeoManifestWayTile[],
		bbox: BboxTuple,
	): Promise<{ tileFiles: string[]; ways: WayFeature[] }> {
		const matching = tiles.filter((tile) => bboxesIntersect(tile.bbox, bbox));
		const perTile = await Promise.all(matching.map((tile) => this.loadWayTile(tile)));
		const ways: WayFeature[] = [];
		for (const list of perTile) {
			for (const way of list) {
				ways.push(way);
			}
		}
		return { tileFiles: matching.map((tile) => tile.file), ways };
	}

	private loadDem(tile: GeoManifestDemTile): Promise<DemGrid> {
		let cached = this.demCache.get(tile.file);
		if (!cached) {
			cached = this.fetchBinary(tile.file).then((buffer) => ({
				originLon: tile.originLon,
				originLat: tile.originLat,
				stepLon: tile.stepLon,
				stepLat: tile.stepLat,
				cols: tile.cols,
				rows: tile.rows,
				values: new Int16Array(buffer),
				noData: tile.noData,
			}));
			this.demCache.set(tile.file, cached);
		}
		return cached;
	}

	private loadWayTile(tile: GeoManifestWayTile): Promise<WayFeature[]> {
		let cached = this.wayCache.get(tile.file);
		if (!cached) {
			cached = this.fetchBinary(tile.file).then(decodeWayTile);
			this.wayCache.set(tile.file, cached);
			this.evictOldestWayTiles();
		}
		return cached;
	}

	/** Hibás vagy hiányzó csempénél a cache-ből kivesszük, hogy a következő hívás újrapróbálhassa. */
	private fetchBinary(file: string): Promise<ArrayBuffer> {
		return firstValueFrom(this.http.get(BASE_URL + file, { responseType: 'arraybuffer' })).catch((error: unknown) => {
			this.demCache.delete(file);
			this.wayCache.delete(file);
			throw error;
		});
	}

	private evictOldestWayTiles(): void {
		while (this.wayCache.size > MAX_CACHED_WAY_TILES) {
			const oldest = this.wayCache.keys().next().value;
			if (oldest === undefined) {
				return;
			}
			this.wayCache.delete(oldest);
		}
	}
}

function inBbox(bbox: BboxTuple, lon: number, lat: number): boolean {
	return lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

function bboxesIntersect(a: BboxTuple, b: BboxTuple): boolean {
	return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

/** A csempe cellaközpontjainak tartománya (a szélső félcella nélkül a mintavétel nem értelmezett). */
function demTileContains(tile: GeoManifestDemTile, lon: number, lat: number): boolean {
	const minLon = tile.originLon - tile.stepLon / 2;
	const maxLon = tile.originLon + (tile.cols - 0.5) * tile.stepLon;
	const maxLat = tile.originLat + tile.stepLat / 2;
	const minLat = tile.originLat - (tile.rows - 0.5) * tile.stepLat;
	return lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
}
