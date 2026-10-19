import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

import { OfflineRegion, OfflineRegionManifest, TileRef } from './offline-region.model';

const TILES_ROOT = 'tura-offline/tiles';
const MANIFESTS_ROOT = 'tura-offline/manifests';
const REGIONS_INDEX_PATH = 'tura-offline/regions.json';

function tilePath(basemap: string, tile: TileRef): string {
	return `${TILES_ROOT}/${basemap}/${tile.z}/${tile.x}/${tile.y}.png`;
}

function manifestPath(regionId: string): string {
	return `${MANIFESTS_ROOT}/${regionId}.json`;
}

/**
 * `Filesystem.readFile` binary results come back as a base64 string on native (chunked here to
 * avoid a call-stack blowup from spreading a large `Uint8Array` into `String.fromCharCode`).
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer);
	const chunkSize = 0x8000;
	let binary = '';
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes.buffer;
}

export async function readCachedTile(basemap: string, tile: TileRef): Promise<ArrayBuffer | null> {
	try {
		const result = await Filesystem.readFile({ path: tilePath(basemap, tile), directory: Directory.Data });
		return base64ToArrayBuffer(result.data as string);
	} catch {
		return null;
	}
}

/** Returns the tile's byte size (for the region's approximate size total). */
export async function writeTile(basemap: string, tile: TileRef, data: ArrayBuffer): Promise<number> {
	await Filesystem.writeFile({
		path: tilePath(basemap, tile),
		directory: Directory.Data,
		data: arrayBufferToBase64(data),
		recursive: true,
	});
	return data.byteLength;
}

export async function deleteTiles(basemap: string, tiles: readonly TileRef[]): Promise<void> {
	for (const tile of tiles) {
		try {
			await Filesystem.deleteFile({ path: tilePath(basemap, tile), directory: Directory.Data });
		} catch {
			// Already gone — nothing to clean up.
		}
	}
}

export async function readRegionIndex(): Promise<OfflineRegion[]> {
	try {
		const result = await Filesystem.readFile({ path: REGIONS_INDEX_PATH, directory: Directory.Data, encoding: Encoding.UTF8 });
		return JSON.parse(result.data as string) as OfflineRegion[];
	} catch {
		return [];
	}
}

export async function writeRegionIndex(regions: readonly OfflineRegion[]): Promise<void> {
	await Filesystem.writeFile({
		path: REGIONS_INDEX_PATH,
		directory: Directory.Data,
		data: JSON.stringify(regions),
		encoding: Encoding.UTF8,
		recursive: true,
	});
}

export async function readManifest(regionId: string): Promise<OfflineRegionManifest> {
	try {
		const result = await Filesystem.readFile({ path: manifestPath(regionId), directory: Directory.Data, encoding: Encoding.UTF8 });
		return JSON.parse(result.data as string) as OfflineRegionManifest;
	} catch {
		return { tiles: [], segments: [] };
	}
}

export async function writeManifest(regionId: string, manifest: OfflineRegionManifest): Promise<void> {
	await Filesystem.writeFile({
		path: manifestPath(regionId),
		directory: Directory.Data,
		data: JSON.stringify(manifest),
		encoding: Encoding.UTF8,
		recursive: true,
	});
}

export async function deleteManifest(regionId: string): Promise<void> {
	try {
		await Filesystem.deleteFile({ path: manifestPath(regionId), directory: Directory.Data });
	} catch {
		// Already gone — nothing to clean up.
	}
}
