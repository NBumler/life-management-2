#!/usr/bin/env node
// backlog/150 1. fázis — build-asset (Backend-offline first §15): az eszközön offline futó DEM-rács és
// bicikli-úthálózat előállítása. Az eredmény a `frontend/src/assets/geo/` alá kerül (git-ignored), és a
// `cap sync` révén az APK-ba épül. Ritkán, kézzel futtatandó (OSM- vagy DEM-frissítéskor).
//
//   node scripts/build-geo-assets.mjs [--force] [--skip-dem] [--skip-bike] [--pbf <fájl>]
//
// Források:
//  - DEM: Copernicus DEM GLO-90 (3″, ~90 m), a copernicus-dem-90m AWS-bucketből, 1°×1° GeoTIFF-ek.
//    Attribúció: © DLR e.V. / Airbus Defence and Space — a manifest tartalmazza.
//  - Bicikli-úthálózat: OSM Magyarország extract (Geofabrik `hungary-latest.osm.pbf`), beolvasva a
//    PBF-ből (nincs hálózati hívás és nincs lekérdezési korlát). ODbL — a manifest tartalmazza.
//
// Bináris formátumok (little-endian), a dekódolók: frontend/src/app/core/geo/*-codec.ts
//  - DEM csempe (.bin): `Int16` értékek sorfolytonosan, észak → dél, nyugat → kelet. A noData = -32768.
//    A rács geometriáját a manifest adja (origin, lépés, méret).
//  - Bicikli csempe (.bin): "LMBK" fejléc, u32 verzió (1), u32 úthossz-szám. Úthosszonként:
//    u8 költségosztály, u16 pontszám, i32 lon, i32 lat (1e-6 fok); majd (pontszám − 1) lépés, ahol a
//    lépés két i16 eltérés (lon, lat), vagy ha valamelyik nem fér i16-ba: -32768 + két i32 abszolút érték.

import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { inflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FRONTEND = join(ROOT, 'frontend');
const OUT = join(FRONTEND, 'src', 'assets', 'geo');
const CACHE = join(tmpdir(), 'lm2-geo-cache');
const requireFromFrontend = createRequire(join(FRONTEND, 'package.json'));

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const SKIP_DEM = args.includes('--skip-dem');
const SKIP_BIKE = args.includes('--skip-bike');
const PBF_ARG = args.indexOf('--pbf') >= 0 ? args[args.indexOf('--pbf') + 1] : null;
const PBF_PATH = PBF_ARG ?? join(CACHE, 'hungary-latest.osm.pbf');
const PBF_URL = 'https://download.geofabrik.de/europe/hungary-latest.osm.pbf';

// HU-lefedettség: a turistaút-import határaival egyező bbox (scripts/import-hiking-trails.mjs).
const BBOX = { minLat: 45.7, minLon: 16.0, maxLat: 48.6, maxLon: 22.9 };
const BIKE_TILE_DEG = 0.25;
const COPERNICUS_BASE = 'https://copernicus-dem-90m.s3.eu-central-1.amazonaws.com';

const NO_DATA = -32768;
const BIKE_MAGIC = 'LMBK';
const BIKE_VERSION = 1;
const COORD_SCALE = 1_000_000; // 1e-6 fok egységek a bicikli-csempében
const MAX_WAY_POINTS = 65_535;

// Költségosztályok (a szorzókat a TS oldal `bike-routing-profile` táblája adja, nem a binárisban).
const CLASS = { CYCLEWAY: 0, OFFROAD: 1, QUIET_ROAD: 2, ROAD: 3, MAIN_ROAD: 4 };
const HIGHWAY_CLASS = {
	cycleway: CLASS.CYCLEWAY,
	track: CLASS.OFFROAD,
	path: CLASS.OFFROAD,
	bridleway: CLASS.OFFROAD,
	living_street: CLASS.QUIET_ROAD,
	residential: CLASS.QUIET_ROAD,
	service: CLASS.QUIET_ROAD,
	unclassified: CLASS.QUIET_ROAD,
	road: CLASS.QUIET_ROAD,
	tertiary: CLASS.ROAD,
	tertiary_link: CLASS.ROAD,
	secondary: CLASS.MAIN_ROAD,
	secondary_link: CLASS.MAIN_ROAD,
	primary: CLASS.MAIN_ROAD,
	primary_link: CLASS.MAIN_ROAD,
};
// Gyalogos utak csak akkor járhatók biciklivel, ha az OSM ezt kifejezetten jelzi.
const BIKE_EXPLICIT_HIGHWAYS = new Set(['footway', 'pedestrian']);
const BIKE_TAG_OK = new Set(['yes', 'designated']);

function log(message) {
	console.log(`[build-geo-assets] ${message}`);
}

function ensureDir(dir) {
	mkdirSync(dir, { recursive: true });
}

function round6(value) {
	return Math.round(value * 1e6) / 1e6;
}

// --- DEM ------------------------------------------------------------------------------------------

function demTileNames() {
	const names = [];
	for (let lat = Math.floor(BBOX.minLat); lat < BBOX.maxLat; lat++) {
		for (let lon = Math.floor(BBOX.minLon); lon < BBOX.maxLon; lon++) {
			names.push({ lat, lon });
		}
	}
	return names;
}

function tileName({ lat, lon }) {
	return `${lat >= 0 ? 'N' : 'S'}${Math.abs(lat)}${lon >= 0 ? 'E' : 'W'}${Math.abs(lon)}`;
}

function copernicusKey({ lat, lon }) {
	const ns = lat >= 0 ? 'N' : 'S';
	const ew = lon >= 0 ? 'E' : 'W';
	const id = `${ns}${String(Math.abs(lat)).padStart(2, '0')}_00_${ew}${String(Math.abs(lon)).padStart(3, '0')}_00`;
	const folder = `Copernicus_DSM_COG_30_${id}_DEM`;
	return `${folder}/${folder}.tif`;
}

async function downloadCached(url, cacheFile) {
	if (!FORCE && existsSync(cacheFile)) {
		return readFileSync(cacheFile);
	}
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Letöltés sikertelen (${response.status}): ${url}`);
	}
	const buffer = Buffer.from(await response.arrayBuffer());
	ensureDir(dirname(cacheFile));
	writeFileSync(cacheFile, buffer);
	return buffer;
}

async function buildDem() {
	const { fromArrayBuffer } = requireFromFrontend('geotiff');
	const demDir = join(OUT, 'dem');
	ensureDir(demDir);
	const entries = [];

	for (const tile of demTileNames()) {
		const name = tileName(tile);
		const cacheFile = join(CACHE, 'dem', `${name}.tif`);
		const bytes = await downloadCached(`${COPERNICUS_BASE}/${copernicusKey(tile)}`, cacheFile);

		const tif = await fromArrayBuffer(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
		const image = await tif.getImage();
		const [minX, minY, maxX, maxY] = image.getBoundingBox();
		const width = image.getWidth();
		const height = image.getHeight();
		const stepLon = (maxX - minX) / width;
		const stepLat = (maxY - minY) / height;
		const raster = await image.readRasters({ interleave: true });

		// PixelIsArea: a rácspont a pixel közepe. A HU-bbox-ra vágjuk, hogy az APK ne tartalmazza a
		// határon túli cellákat. Egy-egy cella átlapolás (minden irányba) kell, különben a csempék
		// közötti fél cellányi sávban nem lenne bilineáris mintavétel.
		const colStart = Math.max(0, Math.ceil((BBOX.minLon - minX) / stepLon - 0.5) - 1);
		const colEnd = Math.min(width - 1, Math.floor((BBOX.maxLon - minX) / stepLon - 0.5) + 1);
		const rowStart = Math.max(0, Math.ceil((maxY - BBOX.maxLat) / stepLat - 0.5) - 1);
		const rowEnd = Math.min(height - 1, Math.floor((maxY - BBOX.minLat) / stepLat - 0.5) + 1);
		const cols = colEnd - colStart + 1;
		const rows = rowEnd - rowStart + 1;
		if (cols <= 0 || rows <= 0) {
			continue;
		}

		const values = new Int16Array(cols * rows);
		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const v = raster[(rowStart + r) * width + (colStart + c)];
				values[r * cols + c] = Number.isFinite(v) && v > -32767 && v < 32767 ? Math.round(v) : NO_DATA;
			}
		}

		const file = `dem/${name}.bin`;
		writeFileSync(join(OUT, file), Buffer.from(values.buffer));
		entries.push({
			file,
			originLon: round6(minX + (colStart + 0.5) * stepLon),
			originLat: round6(maxY - (rowStart + 0.5) * stepLat),
			stepLon: round6(stepLon),
			stepLat: round6(stepLat),
			cols,
			rows,
			noData: NO_DATA,
			bytes: values.byteLength,
		});
		log(`DEM ${name}: ${cols}×${rows}`);
	}
	return entries;
}

// --- OSM PBF olvasó (protobuf, minimális) ----------------------------------------------------------

class PbfReader {
	constructor(buffer, start = 0, end = buffer.length) {
		this.buffer = buffer;
		this.pos = start;
		this.end = end;
	}

	eof() {
		return this.pos >= this.end;
	}

	/** Nem negatív varint; az OSM-azonosítók 2^53 alatt maradnak, így a Number pontos. */
	varint() {
		let result = 0;
		let multiplier = 1;
		for (;;) {
			const byte = this.buffer[this.pos++];
			result += (byte & 0x7f) * multiplier;
			if ((byte & 0x80) === 0) {
				return result;
			}
			multiplier *= 128;
		}
	}

	/** Zigzag-kódolt (sint64) érték. */
	svarint() {
		const n = this.varint();
		return n % 2 === 0 ? n / 2 : -(n + 1) / 2;
	}

	key() {
		const k = this.varint();
		return { field: Math.floor(k / 8), wire: k % 8 };
	}

	bytes() {
		const length = this.varint();
		const sub = new PbfReader(this.buffer, this.pos, this.pos + length);
		this.pos += length;
		return sub;
	}

	skip(wire) {
		if (wire === 0) {
			this.varint();
		} else if (wire === 1) {
			this.pos += 8;
		} else if (wire === 2) {
			// Külön változóba: a `pos += varint()` a régi pozícióval számolna, mert a varint() közben előreléptet.
			const length = this.varint();
			this.pos += length;
		} else if (wire === 5) {
			this.pos += 4;
		} else {
			throw new Error(`Ismeretlen protobuf wire type: ${wire}`);
		}
	}

	/** Ismétlődő skalár: csomagolt (wire 2) vagy egyesével kódolt (wire 0) formában is. */
	repeated(wire, out, signed = false) {
		if (wire === 2) {
			const sub = this.bytes();
			while (!sub.eof()) {
				out.push(signed ? sub.svarint() : sub.varint());
			}
		} else {
			out.push(signed ? this.svarint() : this.varint());
		}
	}
}

function decodeBlobHeader(reader) {
	const header = { type: '', datasize: 0 };
	while (!reader.eof()) {
		const { field, wire } = reader.key();
		if (field === 1) {
			header.type = readStringField(reader);
		} else if (field === 3) {
			header.datasize = reader.varint();
		} else {
			reader.skip(wire);
		}
	}
	return header;
}

function readStringField(reader) {
	const length = reader.varint();
	const text = reader.buffer.toString('utf8', reader.pos, reader.pos + length);
	reader.pos += length;
	return text;
}

/** A `Blob` üzenet: `raw` (nem tömörített) vagy `zlib_data` (zlib-tömörített) tartalommal. */
function decodeBlob(reader) {
	let raw = null;
	let compressed = null;
	while (!reader.eof()) {
		const { field, wire } = reader.key();
		if (field === 1 || field === 3) {
			const sub = reader.bytes();
			const slice = sub.buffer.subarray(sub.pos, sub.end);
			if (field === 1) {
				raw = slice;
			} else {
				compressed = slice;
			}
		} else {
			reader.skip(wire);
		}
	}
	return raw ?? inflateSync(compressed);
}

function decodeStringTable(reader) {
	const strings = [];
	while (!reader.eof()) {
		const { field, wire } = reader.key();
		if (field === 1 && wire === 2) {
			const sub = reader.bytes();
			strings.push(sub.buffer.toString('utf8', sub.pos, sub.end));
		} else {
			reader.skip(wire);
		}
	}
	return strings;
}

function decodeWay(reader) {
	const way = { id: 0, keys: [], vals: [], refs: [] };
	const refDeltas = [];
	while (!reader.eof()) {
		const { field, wire } = reader.key();
		if (field === 1) {
			way.id = reader.varint();
		} else if (field === 2) {
			reader.repeated(wire, way.keys);
		} else if (field === 3) {
			reader.repeated(wire, way.vals);
		} else if (field === 8) {
			reader.repeated(wire, refDeltas, true);
		} else {
			reader.skip(wire);
		}
	}
	let ref = 0;
	for (const delta of refDeltas) {
		ref += delta;
		way.refs.push(ref);
	}
	return way;
}

function decodeDenseNodes(reader) {
	const ids = [];
	const lats = [];
	const lons = [];
	while (!reader.eof()) {
		const { field, wire } = reader.key();
		if (field === 1) {
			reader.repeated(wire, ids, true);
		} else if (field === 8) {
			reader.repeated(wire, lats, true);
		} else if (field === 9) {
			reader.repeated(wire, lons, true);
		} else {
			reader.skip(wire);
		}
	}
	let id = 0;
	let lat = 0;
	let lon = 0;
	const nodes = [];
	for (let i = 0; i < ids.length; i++) {
		id += ids[i];
		lat += lats[i];
		lon += lons[i];
		nodes.push({ id, lat, lon });
	}
	return nodes;
}

function decodeNode(reader) {
	const node = { id: 0, lat: 0, lon: 0 };
	while (!reader.eof()) {
		const { field, wire } = reader.key();
		if (field === 1) {
			node.id = reader.svarint();
		} else if (field === 8) {
			node.lat = reader.svarint();
		} else if (field === 9) {
			node.lon = reader.svarint();
		} else {
			reader.skip(wire);
		}
	}
	return node;
}

function decodePrimitiveBlock(raw) {
	const reader = new PbfReader(raw);
	// Alapértékek az OSM PBF specifikáció szerint (granularity 100 nano-fok, offsetek 0).
	const block = { strings: [], groups: [], granularity: 100, latOffset: 0, lonOffset: 0 };
	while (!reader.eof()) {
		const { field, wire } = reader.key();
		if (field === 1) {
			block.strings = decodeStringTable(reader.bytes());
		} else if (field === 2) {
			const group = { ways: [], nodes: [], dense: [] };
			const sub = reader.bytes();
			while (!sub.eof()) {
				const k = sub.key();
				if (k.field === 1) {
					group.nodes.push(decodeNode(sub.bytes()));
				} else if (k.field === 2) {
					group.dense.push(...decodeDenseNodes(sub.bytes()));
				} else if (k.field === 3) {
					group.ways.push(decodeWay(sub.bytes()));
				} else {
					sub.skip(k.wire);
				}
			}
			block.groups.push(group);
		} else if (field === 17) {
			block.granularity = reader.varint();
		} else if (field === 19) {
			block.latOffset = reader.varint();
		} else if (field === 20) {
			block.lonOffset = reader.varint();
		} else {
			reader.skip(wire);
		}
	}
	return block;
}

/** Az OSM PBF-fájl blokkjait sorban adja: egy-egy `PrimitiveBlock` (csak az OSMData típusúak). */
function* pbfBlocks(buffer) {
	let pos = 0;
	while (pos < buffer.length) {
		const headerLength = buffer.readUInt32BE(pos);
		pos += 4;
		const header = decodeBlobHeader(new PbfReader(buffer, pos, pos + headerLength));
		pos += headerLength;
		const blobEnd = pos + header.datasize;
		if (header.type === 'OSMData') {
			yield decodePrimitiveBlock(decodeBlob(new PbfReader(buffer, pos, blobEnd)));
		}
		pos = blobEnd;
	}
}

// --- Bicikli-úthálózat ----------------------------------------------------------------------------

function bikeTileGrid() {
	const tiles = [];
	for (let lat = BBOX.minLat; lat < BBOX.maxLat - 1e-9; lat += BIKE_TILE_DEG) {
		for (let lon = BBOX.minLon; lon < BBOX.maxLon - 1e-9; lon += BIKE_TILE_DEG) {
			tiles.push({
				minLat: round6(lat),
				minLon: round6(lon),
				maxLat: round6(Math.min(lat + BIKE_TILE_DEG, BBOX.maxLat)),
				maxLon: round6(Math.min(lon + BIKE_TILE_DEG, BBOX.maxLon)),
			});
		}
	}
	return tiles;
}

/** Az OSM-úthoz költségosztályt rendel; `null`, ha nem biciklivel járható. */
function bikeClassOf(tags) {
	const highway = tags.highway;
	if (!highway || tags.access === 'private' || tags.bicycle === 'no') {
		return null;
	}
	if (BIKE_EXPLICIT_HIGHWAYS.has(highway)) {
		return BIKE_TAG_OK.has(tags.bicycle) ? CLASS.OFFROAD : null;
	}
	return HIGHWAY_CLASS[highway] ?? null;
}

function fitsInt16(delta) {
	return delta >= -32767 && delta <= 32767;
}

/** A csempe bináris kódolása (lásd a fájl fejlécét). `pts` lapos [lonU, latU, …] Int32Array. */
function encodeBikeTile(ways) {
	let size = 12;
	for (const way of ways) {
		size += 11;
		const n = way.pts.length / 2;
		for (let i = 1; i < n; i++) {
			const dLon = way.pts[2 * i] - way.pts[2 * i - 2];
			const dLat = way.pts[2 * i + 1] - way.pts[2 * i - 1];
			size += fitsInt16(dLon) && fitsInt16(dLat) ? 4 : 10;
		}
	}
	const buffer = Buffer.alloc(size);
	let o = 0;
	buffer.write(BIKE_MAGIC, o, 'ascii');
	o += 4;
	buffer.writeUInt32LE(BIKE_VERSION, o);
	o += 4;
	buffer.writeUInt32LE(ways.length, o);
	o += 4;
	for (const way of ways) {
		const n = way.pts.length / 2;
		buffer.writeUInt8(way.cls, o);
		buffer.writeUInt16LE(n, o + 1);
		buffer.writeInt32LE(way.pts[0], o + 3);
		buffer.writeInt32LE(way.pts[1], o + 7);
		o += 11;
		for (let i = 1; i < n; i++) {
			const dLon = way.pts[2 * i] - way.pts[2 * i - 2];
			const dLat = way.pts[2 * i + 1] - way.pts[2 * i - 1];
			if (fitsInt16(dLon) && fitsInt16(dLat)) {
				buffer.writeInt16LE(dLon, o);
				buffer.writeInt16LE(dLat, o + 2);
				o += 4;
			} else {
				buffer.writeInt16LE(NO_DATA, o);
				buffer.writeInt32LE(way.pts[2 * i], o + 2);
				buffer.writeInt32LE(way.pts[2 * i + 1], o + 6);
				o += 10;
			}
		}
	}
	return buffer;
}

/** A hosszú utakat átfedő darabokra vágja (a csempe-fejléc u16 pontszámot ad). */
function splitWay(cls, pts) {
	const n = pts.length / 2;
	if (n <= MAX_WAY_POINTS) {
		return [{ cls, pts }];
	}
	const pieces = [];
	for (let start = 0; start < n - 1; start += MAX_WAY_POINTS - 1) {
		const end = Math.min(start + MAX_WAY_POINTS, n);
		pieces.push({ cls, pts: pts.subarray(2 * start, 2 * end) });
	}
	return pieces;
}

async function ensurePbf() {
	if (existsSync(PBF_PATH)) {
		return PBF_PATH;
	}
	ensureDir(dirname(PBF_PATH));
	log(`OSM PBF letöltése: ${PBF_URL}`);
	const response = await fetch(PBF_URL);
	if (!response.ok) {
		throw new Error(`OSM PBF letöltés sikertelen (${response.status})`);
	}
	writeFileSync(PBF_PATH, Buffer.from(await response.arrayBuffer()));
	return PBF_PATH;
}

async function buildBike() {
	const bikeDir = join(OUT, 'bike');
	ensureDir(bikeDir);
	const tiles = bikeTileGrid();
	const pbf = readFileSync(await ensurePbf());
	log(`OSM PBF beolvasva (${pbf.length} B), első menet: bicikli-utak`);

	// 1. menet: a bicikli-utak és a szükséges csomópont-azonosítók.
	const ways = [];
	const neededNodes = new Map(); // OSM node id → sorszám a koordináta-tömbökben
	for (const block of pbfBlocks(pbf)) {
		for (const group of block.groups) {
			for (const way of group.ways) {
				const tags = {};
				for (let i = 0; i < way.keys.length; i++) {
					tags[block.strings[way.keys[i]]] = block.strings[way.vals[i]];
				}
				const cls = bikeClassOf(tags);
				if (cls === null || way.refs.length < 2) {
					continue;
				}
				ways.push({ cls, refs: way.refs });
				for (const ref of way.refs) {
					if (!neededNodes.has(ref)) {
						neededNodes.set(ref, neededNodes.size);
					}
				}
			}
		}
	}
	log(`${ways.length} bicikli-út, ${neededNodes.size} szükséges csomópont; második menet: koordináták`);

	// 2. menet: a szükséges csomópontok koordinátái (1e-6 fok, egész).
	const lonU = new Int32Array(neededNodes.size);
	const latU = new Int32Array(neededNodes.size);
	const found = new Uint8Array(neededNodes.size);
	for (const block of pbfBlocks(pbf)) {
		// A PBF koordináta nano-fokban: (offset + granularity × érték) × 1e-9 fok. Ezt 1e-6 fokra vetítjük.
		const place = (id, latRaw, lonRaw) => {
			const index = neededNodes.get(id);
			if (index === undefined) {
				return;
			}
			latU[index] = Math.round((block.latOffset + latRaw * block.granularity) / 1000);
			lonU[index] = Math.round((block.lonOffset + lonRaw * block.granularity) / 1000);
			found[index] = 1;
		};
		for (const group of block.groups) {
			for (const node of group.dense) {
				place(node.id, node.lat, node.lon);
			}
			for (const node of group.nodes) {
				place(node.id, node.lat, node.lon);
			}
		}
	}

	// 3. menet: utak elhelyezése a csempékbe (egy út minden csempébe bekerül, amelyet érint).
	const tileWays = tiles.map(() => []);
	let droppedWays = 0;
	for (const way of ways) {
		const pts = new Int32Array(way.refs.length * 2);
		let complete = true;
		for (let i = 0; i < way.refs.length; i++) {
			const index = neededNodes.get(way.refs[i]);
			if (!found[index]) {
				complete = false;
				break;
			}
			pts[2 * i] = lonU[index];
			pts[2 * i + 1] = latU[index];
		}
		if (!complete) {
			droppedWays++;
			continue;
		}
		let minLat = Infinity;
		let maxLat = -Infinity;
		let minLon = Infinity;
		let maxLon = -Infinity;
		for (let i = 0; i < pts.length; i += 2) {
			minLon = Math.min(minLon, pts[i]);
			maxLon = Math.max(maxLon, pts[i]);
			minLat = Math.min(minLat, pts[i + 1]);
			maxLat = Math.max(maxLat, pts[i + 1]);
		}
		const pieces = splitWay(way.cls, pts);
		tiles.forEach((tile, index) => {
			const tileMinLon = Math.round(tile.minLon * COORD_SCALE);
			const tileMaxLon = Math.round(tile.maxLon * COORD_SCALE);
			const tileMinLat = Math.round(tile.minLat * COORD_SCALE);
			const tileMaxLat = Math.round(tile.maxLat * COORD_SCALE);
			if (maxLon < tileMinLon || minLon > tileMaxLon || maxLat < tileMinLat || minLat > tileMaxLat) {
				return;
			}
			for (const piece of pieces) {
				tileWays[index].push(piece);
			}
		});
	}
	if (droppedWays > 0) {
		log(`${droppedWays} út kimaradt (hiányzó csomópont az extractból)`);
	}

	const entries = [];
	for (const [index, tile] of tiles.entries()) {
		const name = `bike_${tile.minLat}_${tile.minLon}`.replace(/\./g, 'p');
		const file = `bike/${name}.bin`;
		const buffer = encodeBikeTile(tileWays[index]);
		writeFileSync(join(OUT, file), buffer);
		const points = tileWays[index].reduce((sum, w) => sum + w.pts.length / 2, 0);
		entries.push({
			file,
			bbox: [tile.minLon, tile.minLat, tile.maxLon, tile.maxLat],
			ways: tileWays[index].length,
			points,
			bytes: buffer.length,
		});
	}
	log(`bicikli csempék: ${entries.length}, ${entries.reduce((s, e) => s + e.ways, 0)} út-darab, ${entries.reduce((s, e) => s + e.bytes, 0)} B`);
	return entries;
}

// --- Főprogram -------------------------------------------------------------------------------------

async function main() {
	if (FORCE) {
		rmSync(OUT, { recursive: true, force: true });
	}
	ensureDir(OUT);

	const previous = existsSync(join(OUT, 'manifest.json'))
		? JSON.parse(readFileSync(join(OUT, 'manifest.json'), 'utf8'))
		: { dem: [], bike: [] };
	const dem = SKIP_DEM ? previous.dem : await buildDem();
	const bike = SKIP_BIKE ? previous.bike : await buildBike();

	const manifest = {
		version: 1,
		generatedAt: new Date().toISOString(),
		bbox: [BBOX.minLon, BBOX.minLat, BBOX.maxLon, BBOX.maxLat],
		attribution: [
			'DEM: Copernicus DEM GLO-90 © DLR e.V. and Airbus Defence and Space (Copernicus Space Component)',
			'Úthálózat: © OpenStreetMap contributors (ODbL), Geofabrik hungary-latest extract',
		],
		dem,
		bike,
	};
	writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

	const demBytes = dem.reduce((sum, e) => sum + e.bytes, 0);
	const bikeBytes = bike.reduce((sum, e) => sum + e.bytes, 0);
	log(`kész: DEM ${dem.length} csempe, ${demBytes} B; bicikli ${bike.length} csempe, ${bikeBytes} B`);
}

main().catch((error) => {
	console.error(`[build-geo-assets] HIBA: ${error.stack ?? error.message}`);
	process.exit(1);
});
