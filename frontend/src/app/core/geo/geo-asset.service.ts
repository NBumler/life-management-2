import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BikeWay, decodeBikeTile } from './bike-tile-codec';
import { DemGrid, sampleElevation } from './dem';

/**
 * backlog/150 — a build-asset geo-csomag (DEM + bicikli-úthálózat) lusta betöltése és lefedettség-
 * ellenőrzése (Backend-offline first §15). A csomag az APK-ba épül (`frontend/src/assets/geo/`,
 * `scripts/build-geo-assets.mjs`), ezért futás közben nincs hálózati hívás. Ha a csomag hiányzik,
 * minden lekérdezés `null`-t vagy üres listát ad, soha nem 0-t (§14).
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

export interface GeoManifestBikeTile {
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
	bike: GeoManifestBikeTile[];
}

const BASE_URL = 'assets/geo/';
const MANIFEST_URL = `${BASE_URL}manifest.json`;
const MAX_CACHED_BIKE_TILES = 32;

@Injectable({ providedIn: 'root' })
export class GeoAssetService {
	private readonly http = inject(HttpClient);
	private manifestPromise: Promise<GeoManifest | null> | null = null;
	private readonly demCache = new Map<string, Promise<DemGrid>>();
	private readonly bikeCache = new Map<string, Promise<BikeWay[]>>();

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

	/** A bbox-ot érintő bicikli-csempék összes útja (a csempék átfedése miatt duplikátumokkal). */
	async bikeWaysIntersecting(bbox: BboxTuple): Promise<BikeWay[]> {
		const manifest = await this.manifest();
		if (!manifest) {
			return [];
		}
		const tiles = manifest.bike.filter((tile) => bboxesIntersect(tile.bbox, bbox));
		const perTile = await Promise.all(tiles.map((tile) => this.loadBike(tile)));
		const ways: BikeWay[] = [];
		for (const list of perTile) {
			for (const way of list) {
				ways.push(way);
			}
		}
		return ways;
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

	private loadBike(tile: GeoManifestBikeTile): Promise<BikeWay[]> {
		let cached = this.bikeCache.get(tile.file);
		if (!cached) {
			cached = this.fetchBinary(tile.file).then(decodeBikeTile);
			this.bikeCache.set(tile.file, cached);
			this.evictOldestBikeTiles();
		}
		return cached;
	}

	/** Hibás vagy hiányzó csempénél a cache-ből kivesszük, hogy a következő hívás újrapróbálhassa. */
	private fetchBinary(file: string): Promise<ArrayBuffer> {
		return firstValueFrom(this.http.get(BASE_URL + file, { responseType: 'arraybuffer' })).catch((error: unknown) => {
			this.demCache.delete(file);
			this.bikeCache.delete(file);
			throw error;
		});
	}

	private evictOldestBikeTiles(): void {
		while (this.bikeCache.size > MAX_CACHED_BIKE_TILES) {
			const oldest = this.bikeCache.keys().next().value;
			if (oldest === undefined) {
				return;
			}
			this.bikeCache.delete(oldest);
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
