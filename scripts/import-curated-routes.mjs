#!/usr/bin/env node
// backlog/tura-utvonaltervezo/193-... — az ajánlott túrák katalógusának (`curated_route`) feltöltése
// az OSM jelzett turistaútvonalaiból: a magyar országos (nwn — Kéktúra-szakaszok, Mária-út, …) és
// regionális (rwn) `route=hiking` relációkból egy-egy katalógus-túra lesz, az admin
// `POST /api/admin/tura/curated-routes` upserten át.
//
// backlog/217 — a szint- és időbecslést a szkript számolja, **ugyanazzal a kóddal, mint az app**: a
// frontend `core/geo/route-metrics.ts`-ét és `dem.ts`-ét esbuild-del csomagolja (a frontend
// node_modules-ából), a magasságot a DEM build assetből (`frontend/src/assets/geo/`) olvassa. Így egy
// katalógus-túra átvétele után a piszkozat pontosan a katalógus értékeit mutatja. Külső magasság-API
// nincs (backlog/195: az Open-Meteo kvóta nem fogy); csak a DEM-en kívül eső túránál számol a szerver
// (Open-Meteo, ütemezve). backlog/216 — a túra jelzés-kódja (`symbol`, pl. `PIROS_SAV`) az osmc:symbol
// tagből, a scripts/import-hiking-trails.mjs függvényével.
//
// Futásidő (2026-10-20, ~450 túra): az Overpass-letöltés 1–3 perc, a DEM-metrika ~10 s, a feltöltés
// ~1 perc. Az újrafuttatás ugyanennyi, kvótát nem fogyaszt.
//
// Kézzel futtatandó, mint a scripts/import-hiking-trails.mjs — friss adatra, vagy egy üres fejlesztői
// adatbázis feltöltésére. Idempotens: a túra id-je az OSM reláció id-jéből képzett UUID v5, így az
// újrafuttatás ugyanazokat a sorokat cseréli le. Ami egy korábbi futás óta kiesett a válogatásból,
// azt nem törli (az admin DELETE-tel törölhető).
//
// Használat:
//   node scripts/import-curated-routes.mjs [--network nwn,rwn] [--min-km 5] [--max-km 80]
//                                          [--base-url http://localhost:8080] [--key <admin-api-key>]
//                                          [--dry-run]
//
// Az admin API kulcs vagy a --key kapcsolóval, vagy az LM2_ADMIN_API_KEY env változóval adható meg.
// A --dry-run csak letölt, összefűz és statisztikát ír, a backendet nem hívja (kulcs sem kell).
//
// Válogatás: névvel rendelkező `type=route` reláció (a `superroute`, pl. a teljes Országos Kéktúra,
// kimarad — annak a szakaszai külön relációk), amelynek fő ágai (üres / `main` szerepű tagok)
// egyetlen folytonos vonallá fűzhetők, és a hossza a --min-km … --max-km sávba esik. A leágazások
// (`alternative`, `excursion`, `approach`, …) kimaradnak. A {@link MAX_DAY_KM}-nél hosszabb túra
// (a legtöbb Kéktúra-szakasz) egyenlő hosszú napokra bontva kerül fel; a napváltók az átvétel után a
// Napok panelen szabadon áthelyezhetők.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { symbolFromTags } from './import-hiking-trails.mjs';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GEO_ASSET_DIR = join(REPO_ROOT, 'frontend', 'src', 'assets', 'geo');

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

// Ugyanaz a bot-védelmi megkerülés, mint a scripts/import-hiking-trails.mjs-ben.
const BROWSER_HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
	Referer: 'https://overpass-turbo.eu/',
};

// Rögzített névtér a reláció id → túra id leképezéshez (UUID v5) — soha ne változtasd meg, különben
// az újrafuttatás új sorokat hoz létre a régiek lecserélése helyett.
const CURATED_ROUTE_NAMESPACE = '6b1f5a3e-93c4-4d0a-9e7b-2f8c1d4a5e60';

const MAIN_ROLES = new Set(['', 'main', 'forward', 'backward']);

// Két egymást követő tag (way) vége között ekkora rés még összefűzhető (pl. egy hiányzó rövid
// összekötő way vagy egy út két oldala); nagyobb résnél a reláció nem egy folytonos túra.
const MAX_JOIN_GAP_METERS = 60;

// Douglas–Peucker tűrés: a katalógus-lista minden túra teljes vonalát leküldi, ezért a nyers OSM
// geometria (≈ 5–10 m-enként egy pont) ritkítva kerül fel; 20 m-rel a ~450 túra listája ~1 MB (gzippel ~0,3 MB),
// és egy túra-léptékű nézetben az eltérés nem látható.
const SIMPLIFY_TOLERANCE_METERS = 20;

// A nehézség a távból (a szintemelkedést a szerver csak az upsert után számolja ki): egy napos,
// könnyen teljesíthető / egész napos / megerőltető túra.
const EASY_MAX_KM = 12;
const MODERATE_MAX_KM = 25;

// Egy napra ennél több nem jut: a hosszabb túra ceil(táv / MAX_DAY_KM) egyenlő napra oszlik.
const MAX_DAY_KM = 30;

const EARTH_RADIUS_METERS = 6_371_000;

function haversineMeters([lon1, lat1], [lon2, lat2]) {
	const toRad = (deg) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}

function lengthMeters(line) {
	let total = 0;
	for (let i = 1; i < line.length; i++) total += haversineMeters(line[i - 1], line[i]);
	return total;
}

/**
 * A reláció fő ágainak way-eit egy vonallá fűzi, minden way-t a szükséges irányba fordítva. Először
 * a tagsorrendben próbálja (a rendezett relációknál ez a pontos sorrend); sok OSM-reláció tagjai
 * viszont nincsenek sorba rendezve, ilyenkor a legközelebbi végpontok mentén fűz. `null`, ha egyik
 * sem ad egyetlen folytonos vonalat (elágazó vagy hiányos reláció).
 */
export function stitchWays(ways) {
	return stitchInMemberOrder(ways) ?? stitchByNearestEnds(ways);
}

/** Tagsorrendű fűzés; `null`, ha két egymást követő way vége között {@link MAX_JOIN_GAP_METERS}-nél nagyobb a rés. */
function stitchInMemberOrder(ways) {
	if (ways.length === 0) return null;
	let line = [...ways[0]];
	for (let i = 1; i < ways.length; i++) {
		const way = ways[i];
		const wayStart = way[0];
		const wayEnd = way[way.length - 1];
		const lineEnd = line[line.length - 1];
		if (i === 1) {
			// Az első way iránya csak a másodikhoz képest derül ki: fordítsuk meg, ha a kezdete van közelebb.
			const lineStart = line[0];
			const endGap = Math.min(haversineMeters(lineEnd, wayStart), haversineMeters(lineEnd, wayEnd));
			const startGap = Math.min(haversineMeters(lineStart, wayStart), haversineMeters(lineStart, wayEnd));
			if (startGap < endGap) line.reverse();
		}
		const tail = line[line.length - 1];
		const forwardGap = haversineMeters(tail, wayStart);
		const backwardGap = haversineMeters(tail, wayEnd);
		if (Math.min(forwardGap, backwardGap) > MAX_JOIN_GAP_METERS) return null;
		const oriented = forwardGap <= backwardGap ? way : [...way].reverse();
		const continuesAtSamePoint = haversineMeters(tail, oriented[0]) === 0;
		line = line.concat(continuesAtSamePoint ? oriented.slice(1) : oriented);
	}
	return line;
}

// A legközelebbi végpontok szerinti fűzésnél ennyi way-hossz maradhat ki (rövid leágazások,
// duplikált tagok); ennél több kimaradt rész már egy elágazó, nem egy vonalas túra jele.
const MAX_UNUSED_LENGTH_RATIO = 0.05;

/**
 * Rendezetlen tagok fűzése: a vonal mindkét végén mindig a legközelebbi még fel nem használt way-t
 * illeszti hozzá, amíg {@link MAX_JOIN_GAP_METERS}-en belül van ilyen. A kezdő way a leghosszabb
 * (az biztosan a fő ág része). `null`, ha a kimaradt way-ek hossza túllépi a
 * {@link MAX_UNUSED_LENGTH_RATIO} arányt.
 */
function stitchByNearestEnds(ways) {
	if (ways.length === 0) return null;
	const lengths = ways.map(lengthMeters);
	const totalLength = lengths.reduce((sum, length) => sum + length, 0);
	const unused = new Set(ways.keys());
	const first = lengths.indexOf(Math.max(...lengths));
	unused.delete(first);
	let line = [...ways[first]];
	for (;;) {
		let best = null;
		for (const index of unused) {
			const way = ways[index];
			const candidates = [
				{ atEnd: true, reversed: false, gap: haversineMeters(line[line.length - 1], way[0]) },
				{ atEnd: true, reversed: true, gap: haversineMeters(line[line.length - 1], way[way.length - 1]) },
				{ atEnd: false, reversed: true, gap: haversineMeters(line[0], way[0]) },
				{ atEnd: false, reversed: false, gap: haversineMeters(line[0], way[way.length - 1]) },
			];
			for (const candidate of candidates) {
				if (candidate.gap <= MAX_JOIN_GAP_METERS && (best === null || candidate.gap < best.gap)) best = { ...candidate, index };
			}
		}
		if (best === null) break;
		unused.delete(best.index);
		const oriented = best.reversed ? [...ways[best.index]].reverse() : ways[best.index];
		if (best.atEnd) {
			line = line.concat(best.gap === 0 ? oriented.slice(1) : oriented);
		} else {
			line = (best.gap === 0 ? oriented.slice(0, -1) : oriented).concat(line);
		}
	}
	const unusedLength = [...unused].reduce((sum, index) => sum + lengths[index], 0);
	return unusedLength <= totalLength * MAX_UNUSED_LENGTH_RATIO ? line : null;
}

/** Douglas–Peucker ritkítás, méterben (kis területen az egyenlítői vetítés elég pontos). */
export function simplify(line, toleranceMeters) {
	if (line.length <= 2) return line;
	const origin = line[0];
	const metersPerDegLat = (Math.PI * EARTH_RADIUS_METERS) / 180;
	const metersPerDegLon = metersPerDegLat * Math.cos((origin[1] * Math.PI) / 180);
	const projected = line.map(([lon, lat]) => [(lon - origin[0]) * metersPerDegLon, (lat - origin[1]) * metersPerDegLat]);
	const keep = new Uint8Array(line.length);
	keep[0] = 1;
	keep[line.length - 1] = 1;
	const stack = [[0, line.length - 1]];
	while (stack.length > 0) {
		const [first, last] = stack.pop();
		const [ax, ay] = projected[first];
		const [bx, by] = projected[last];
		const dx = bx - ax;
		const dy = by - ay;
		const segmentLengthSquared = dx * dx + dy * dy;
		let farthest = -1;
		let farthestDistance = toleranceMeters;
		for (let i = first + 1; i < last; i++) {
			const [px, py] = projected[i];
			const t = segmentLengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / segmentLengthSquared));
			const distance = Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
			if (distance > farthestDistance) {
				farthest = i;
				farthestDistance = distance;
			}
		}
		if (farthest >= 0) {
			keep[farthest] = 1;
			stack.push([first, farthest], [farthest, last]);
		}
	}
	return line.filter((_, i) => keep[i] === 1);
}

/** RFC 4122 UUID v5 (SHA-1, névtér + név). */
export function uuidV5(name, namespace) {
	const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
	const hash = createHash('sha1').update(namespaceBytes).update(name, 'utf8').digest();
	hash[6] = (hash[6] & 0x0f) | 0x50;
	hash[8] = (hash[8] & 0x3f) | 0x80;
	const hex = hash.subarray(0, 16).toString('hex');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Napi bontás (`HikeRouteDay[]`, csak `endWaypointIndex`): ceil(táv / {@link MAX_DAY_KM}) nap, minden
 * napváltó a cél-távolsághoz legközelebbi ponton. Egy napos túrára `null` (a katalógusban nincs bontás).
 */
export function splitIntoDays(line) {
	const cumulative = [0];
	for (let i = 1; i < line.length; i++) cumulative.push(cumulative[i - 1] + haversineMeters(line[i - 1], line[i]));
	const total = cumulative[cumulative.length - 1];
	const dayCount = Math.ceil(total / 1000 / MAX_DAY_KM);
	if (dayCount <= 1) return null;
	const ends = [];
	for (let day = 1; day < dayCount; day++) {
		const target = (total * day) / dayCount;
		let nearest = 1;
		for (let i = 1; i < line.length - 1; i++) {
			if (Math.abs(cumulative[i] - target) < Math.abs(cumulative[nearest] - target)) nearest = i;
		}
		if (nearest > (ends[ends.length - 1] ?? 0) && nearest < line.length - 1) ends.push(nearest);
	}
	ends.push(line.length - 1);
	return ends.map((endWaypointIndex) => ({ endWaypointIndex }));
}

export function difficultyForKm(km) {
	if (km <= EASY_MAX_KM) return 'EASY';
	if (km <= MODERATE_MAX_KM) return 'MODERATE';
	return 'HARD';
}

function roundCoordinate([lon, lat]) {
	return [Math.round(lon * 1e6) / 1e6, Math.round(lat * 1e6) / 1e6];
}

function descriptionFor(relation) {
	const own = relation.tags.description?.trim();
	const source = `Forrás: © OpenStreetMap-közreműködők (ODbL), reláció ${relation.id}.`;
	return own ? `${own}\n\n${source}` : source;
}

/** Egy Overpass-relációból a katalógus-upsert kérés, vagy a kihagyás oka. */
export function curatedRouteFromRelation(relation, { minKm, maxKm }) {
	const name = relation.tags?.name?.trim();
	if (!name) return { skipped: 'nincs név' };
	const ways = (relation.members ?? [])
		.filter((member) => member.type === 'way' && MAIN_ROLES.has(member.role ?? '') && Array.isArray(member.geometry))
		.map((member) =>
			member.geometry.filter((point) => typeof point.lon === 'number' && typeof point.lat === 'number').map((point) => [point.lon, point.lat]),
		)
		.filter((way) => way.length >= 2);
	const line = stitchWays(ways);
	if (!line) return { skipped: 'nem folytonos' };
	const km = lengthMeters(line) / 1000;
	if (km < minKm || km > maxKm) return { skipped: 'hossz a sávon kívül' };
	const coordinates = simplify(line, SIMPLIFY_TOLERANCE_METERS).map(roundCoordinate);
	const days = splitIntoDays(coordinates);
	const symbol = symbolFromTags(relation.tags);
	return {
		route: {
			id: uuidV5(`osm-relation:${relation.id}`, CURATED_ROUTE_NAMESPACE),
			name,
			description: descriptionFor(relation),
			// Jelzés nélküli / ismeretlen jelzésű relációnál a mező kimarad (a katalógus nem mutat ikont).
			...(symbol !== 'EGYEB' ? { symbol } : {}),
			difficulty: difficultyForKm(km),
			activityType: 'HIKING',
			coordinates,
			// Egynapos túránál a mező kimarad (a régebbi backend a kifejezett null-t 500-zal utasította el).
			...(days ? { days } : {}),
		},
		km,
	};
}

async function fetchOverpass(query, { attempts = 6, timeoutMs = 240_000 } = {}) {
	let lastError;
	for (let attempt = 1; attempt <= attempts; attempt++) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), timeoutMs);
		try {
			const response = await fetch(OVERPASS_ENDPOINT, {
				method: 'POST',
				headers: { ...BROWSER_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
				body: `data=${encodeURIComponent(query)}`,
				signal: controller.signal,
			});
			const text = await response.text();
			if (!response.ok || text.includes('runtime error')) {
				throw new Error(`Overpass HTTP ${response.status} (attempt ${attempt}/${attempts}): ${text.slice(0, 200)}`);
			}
			return JSON.parse(text);
		} catch (error) {
			lastError = error;
			console.warn(`[import-curated-routes] Overpass kísérlet ${attempt}/${attempts} sikertelen: ${error.message}`);
			if (attempt < attempts) {
				await new Promise((resolve) => setTimeout(resolve, 10_000 * attempt));
			}
		} finally {
			clearTimeout(timeout);
		}
	}
	throw lastError;
}

function parseArgs(argv) {
	const args = {
		networks: ['nwn', 'rwn'],
		minKm: 5,
		maxKm: 80,
		baseUrl: 'http://localhost:8080',
		key: process.env.LM2_ADMIN_API_KEY,
		dryRun: false,
	};
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--network') args.networks = argv[++i].split(',');
		else if (argv[i] === '--min-km') args.minKm = Number(argv[++i]);
		else if (argv[i] === '--max-km') args.maxKm = Number(argv[++i]);
		else if (argv[i] === '--base-url') args.baseUrl = argv[++i];
		else if (argv[i] === '--key') args.key = argv[++i];
		else if (argv[i] === '--dry-run') args.dryRun = true;
	}
	if (!args.dryRun && !args.key) {
		throw new Error('Hiányzó admin API kulcs — add meg --key kapcsolóval vagy LM2_ADMIN_API_KEY env változóval.');
	}
	return args;
}

/**
 * backlog/217 — az app metrika-kódja (`core/geo/route-metrics.ts` + `dem.ts`) esbuild-del egy
 * memóriabeli ESM-modullá csomagolva; így a szkript nem másolja, hanem ugyanazt futtatja.
 */
async function loadAppGeoCode() {
	const esbuildEntry = join(REPO_ROOT, 'frontend', 'node_modules', 'esbuild', 'lib', 'main.js');
	const { default: esbuild } = await import(pathToFileURL(esbuildEntry).href);
	const result = await esbuild.build({
		stdin: {
			contents: "export * from './frontend/src/app/core/geo/route-metrics'; export * from './frontend/src/app/core/geo/dem';",
			resolveDir: REPO_ROOT,
			loader: 'ts',
		},
		bundle: true,
		format: 'esm',
		platform: 'node',
		write: false,
		logLevel: 'silent',
	});
	const code = result.outputFiles[0].text;
	return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

/** A DEM build asset (manifest + `int16` csempék) lustán, csempénként betöltve — mint a GeoAssetService. */
function createDemLookup(geo) {
	const manifest = JSON.parse(readFileSync(join(GEO_ASSET_DIR, 'manifest.json'), 'utf8'));
	const grids = new Map();
	const gridFor = (tile) => {
		let grid = grids.get(tile.file);
		if (!grid) {
			const buffer = readFileSync(join(GEO_ASSET_DIR, tile.file));
			const values = new Int16Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
			grid = { ...tile, values };
			grids.set(tile.file, grid);
		}
		return grid;
	};
	return (lon, lat) => {
		for (const tile of manifest.dem) {
			if (!geo.demTileContains(tile, lon, lat)) continue;
			const elevation = geo.sampleElevation(gridFor(tile), lon, lat);
			if (elevation !== null) return elevation;
		}
		return null;
	};
}

/**
 * A túra szint- és időbecslése pontosan úgy, ahogy az app egy piszkozatra számolja; `null`, ha a
 * vonal egy mintapontja a DEM-en kívül esik (ilyenkor a szerver számol).
 */
export function appRouteMetrics(geo, elevationAt, coordinates) {
	const samples = geo.elevationSamples(coordinates);
	const elevations = samples.map(([lon, lat]) => elevationAt(lon, lat));
	if (elevations.some((elevation) => elevation === null)) return null;
	const metrics = geo.computeRouteMetrics(coordinates, samples, elevations);
	return {
		elevationGainMeters: metrics.elevationGainMeters,
		elevationLossMeters: metrics.elevationLossMeters,
		estimatedDurationMinutes: metrics.estimatedDurationMinutes,
	};
}

// A DEM-en kívül eső túránál a szerver upsertenként egy Open-Meteo magasság-lekérést indít 50
// ponttal, ami az Open-Meteo kvótájában 5 hívásnak számít (600 hívás / perc): ezért az ilyen
// feltöltés ütemezett, és a kvóta kimerülésekor (502 ELEVATION_UNAVAILABLE) egy perc várakozás után
// újrapróbál.
const UPSERT_INTERVAL_MS = 700;
const ELEVATION_RETRY_ATTEMPTS = 3;
const ELEVATION_RETRY_WAIT_MS = 65_000;

async function upsert(route, { baseUrl, key }) {
	for (let attempt = 1; ; attempt++) {
		const response = await fetch(`${baseUrl}/api/admin/tura/curated-routes`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'X-Admin-Api-Key': key, 'Idempotency-Key': crypto.randomUUID() },
			body: JSON.stringify(route),
		});
		if (response.ok) return response.json();
		const body = await response.text();
		if (response.status === 502 && attempt < ELEVATION_RETRY_ATTEMPTS) {
			console.warn(`[import-curated-routes] ${route.name}: magasság-lekérés sikertelen, újrapróbálás ${ELEVATION_RETRY_WAIT_MS / 1000} s múlva...`);
			await new Promise((resolve) => setTimeout(resolve, ELEVATION_RETRY_WAIT_MS));
			continue;
		}
		throw new Error(`HTTP ${response.status}: ${body.slice(0, 200)}`);
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const networkFilter = args.networks.join('|');
	console.log(`[import-curated-routes] route=hiking relációk lekérése Overpass-ból (network ${networkFilter})...`);
	const query = `[out:json][timeout:200];area["ISO3166-1"="HU"][admin_level=2]->.hu;relation["route"="hiking"]["type"="route"]["network"~"^(${networkFilter})$"](area.hu);out geom;`;
	const data = await fetchOverpass(query);
	const relations = data.elements.filter((element) => element.type === 'relation');
	console.log(`[import-curated-routes] ${relations.length} reláció letöltve.`);

	const routes = [];
	const skipped = new Map();
	for (const relation of relations) {
		const result = curatedRouteFromRelation(relation, args);
		if (result.route) routes.push(result);
		else skipped.set(result.skipped, (skipped.get(result.skipped) ?? 0) + 1);
	}
	const pointCount = routes.reduce((sum, { route }) => sum + route.coordinates.length, 0);
	const byDifficulty = Object.groupBy(routes, ({ route }) => route.difficulty);
	console.log(`[import-curated-routes] ${routes.length} túra (${pointCount} pont, ~${Math.round(JSON.stringify(routes.map((r) => r.route)).length / 1024)} KiB).`);
	console.log(`  többnapos: ${routes.filter(({ route }) => route.days).length}`);
	console.log(`  nehézség: ${Object.entries(byDifficulty).map(([difficulty, list]) => `${difficulty} ${list.length}`).join(', ')}`);
	console.log(`  kihagyva: ${[...skipped.entries()].map(([reason, count]) => `${reason} ${count}`).join(', ') || '—'}`);
	console.log(`  jelzéssel: ${routes.filter(({ route }) => route.symbol).length}`);

	const geo = await loadAppGeoCode();
	const elevationAt = createDemLookup(geo);
	let serverComputed = 0;
	for (const entry of routes) {
		const metrics = appRouteMetrics(geo, elevationAt, entry.route.coordinates);
		if (metrics) Object.assign(entry.route, metrics);
		else serverComputed++;
	}
	console.log(`  metrika a DEM-ből: ${routes.length - serverComputed}, a szerver számolja: ${serverComputed}`);
	if (args.dryRun) return;

	let failed = 0;
	for (const [index, { route }] of routes.entries()) {
		try {
			await upsert(route, args);
		} catch (error) {
			failed++;
			console.warn(`[import-curated-routes] ${route.name}: ${error.message}`);
		}
		if ((index + 1) % 25 === 0) console.log(`  ${index + 1}/${routes.length}`);
		if (route.elevationGainMeters === undefined) await new Promise((resolve) => setTimeout(resolve, UPSERT_INTERVAL_MS));
	}
	console.log(`[import-curated-routes] Kész: ${routes.length - failed} feltöltve, ${failed} hiba.`);
	if (failed > 0) process.exitCode = 1;
}

// Csak közvetlen futtatáskor indul — importálva (pl. a geometria-függvények kipróbálásához) nem.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch((error) => {
		console.error(`[import-curated-routes] HIBA: ${error.stack ?? error.message}`);
		process.exitCode = 1;
	});
}
