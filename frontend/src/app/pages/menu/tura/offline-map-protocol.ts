import { Capacitor } from '@capacitor/core';
import maplibregl from 'maplibre-gl';

import { OFFLINE_BASEMAP_ID } from './offline-region.model';
import { readCachedTile } from './offline-tile-store';

/** A `tura.page.ts` BASE_STYLE `osm` forrásának csempe-URL-sémája — ld. `registerOfflineTileProtocol`. */
export const OFFLINE_TILE_PROTOCOL = 'tura-offline-tile';
const OSM_TILE_URL_ROOT = 'https://tile.openstreetmap.org';

const TILE_URL_PATTERN = new RegExp(`^${OFFLINE_TILE_PROTOCOL}://([a-z]+)/(\\d+)/(\\d+)/(\\d+)$`);

let registered = false;

/**
 * backlog/tura-utvonaltervezo/105-... 4. fázis — a MapLibre `addProtocol` mechanizmusán keresztül
 * az `osm` alaptérkép-réteg csempe-kéréseit egy natív Filesystem-cache elé fűzi: ha a csempe egy
 * korábban letöltött offline régió része, onnan szolgálja ki (működik BACKEND_OFFLINE/FULL_OFFLINE
 * alatt is), egyébként a normál hálózati URL-ről tölti — ugyanúgy, mintha az `osm` forrás közvetlen
 * `https://tile.openstreetmap.org/...` URL-sablont használna. Web buildben (nem natív platform) a
 * Filesystem-cache-t sosem próbálja elérni, mindig hálózatról tölt — a web build ezen a területen
 * is online-only marad, ld. [[Backend-offline first]].
 */
export function registerOfflineTileProtocol(): void {
	if (registered) {
		return;
	}
	registered = true;
	maplibregl.addProtocol(OFFLINE_TILE_PROTOCOL, async (params) => {
		const match = TILE_URL_PATTERN.exec(params.url);
		if (!match) {
			throw new Error(`Invalid offline tile URL: ${params.url}`);
		}
		const [, basemap, zStr, xStr, yStr] = match;
		const tile = { z: Number(zStr), x: Number(xStr), y: Number(yStr) };

		if (Capacitor.isNativePlatform() && basemap === OFFLINE_BASEMAP_ID) {
			const cached = await readCachedTile(basemap, tile);
			if (cached) {
				return { data: cached };
			}
		}

		const response = await fetch(`${OSM_TILE_URL_ROOT}/${tile.z}/${tile.x}/${tile.y}.png`);
		if (!response.ok) {
			throw new Error(`Tile fetch error: ${response.statusText}`);
		}
		return { data: await response.arrayBuffer() };
	});
}
