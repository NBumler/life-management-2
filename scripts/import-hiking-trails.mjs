#!/usr/bin/env node
// backlog/tura-utvonaltervezo/104-... — kézi/admin-triggerelt import: az OSM route=hiking
// relációkat (magyar turistaút-hálózat) tölti le az Overpass API-ból, és az admin
// /api/admin/tura/trail-segments/import endpointon keresztül tölti be őket a backendbe.
//
// Ütemezett automatizálás egyelőre nem kell (ld. a 104-es ticket döntése) — ezt a scriptet
// kézzel futtatjuk, amikor friss adatra van szükség.
//
// Használat:
//   node scripts/import-hiking-trails.mjs [--country HU] [--bbox minLat,minLon,maxLat,maxLon]
//                                          [--base-url http://localhost:8080] [--key <admin-api-key>]
//
// Az admin API kulcs vagy a --key kapcsolóval, vagy az LM2_ADMIN_API_KEY env változóval adható meg.

import { writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter';

// Az Overpass API a nem-böngésző User-Agent/Referer nélküli kéréseket bot-védelemből 406-tal
// utasítja el — ez nem hitelesítés, csak egy heurisztikus szűrő, ezért egy valós böngésző
// fejlécekkel imitálja a kérést.
const BROWSER_HEADERS = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
	Referer: 'https://overpass-turbo.eu/',
};

const HUNGARY_BBOX = { minLat: 45.7, minLon: 16.0, maxLat: 48.6, maxLon: 22.9 };

// OSM osmc:symbol = "szín:háttérszín:alakzat[:betű:betűszín]" — a színt és az alakzatot a saját
// PIROS_SAV / KEK_HAROMSZOG / ... elnevezési sémánkra fordítja. Ismeretlen kombinációra null-t ad
// vissza, ilyenkor a symbol:hu tag (ékezet nélkül, uppercase) a tartalék, végső esetben "EGYEB" —
// a frontend (trail-segment-symbol-color.ts) ismeretlen symbolra is szürkével rajzol, tehát ez nem
// hibás állapot, csak kevésbé informatív színezés.
const COLOR_WORDS = {
	red: 'PIROS',
	blue: 'KEK',
	green: 'ZOLD',
	yellow: 'SARGA',
	white: 'FEHER',
	black: 'FEKETE',
	orange: 'NARANCS',
	purple: 'LILA',
	violet: 'LILA',
};

const SHAPE_WORDS = {
	bar: 'SAV',
	stripe: 'SAV',
	cross: 'KERESZT',
	triangle: 'HAROMSZOG',
	circle: 'KOR',
	rectangle: 'NEGYSZOG',
	square: 'NEGYSZOG',
	dot: 'PONT',
};

// backlog/198, backlog/199 — a magyar helyi jelzések alakzat-tokenjei (osmc:symbol 3. mezője a szín
// után, pl. `green_arch`): Ω barlang, L rom, ♟ kilátó, ✞ templom, ♜ emlékmű, ⌂ menedékház. Pontos
// egyezés, mert az `L` / `T` betű részszóként sok más tokenben is előfordul.
const LOCAL_SHAPE_TOKENS = {
	arch: 'OMEGA',
	L: 'ROM',
	turned_T: 'KILATO',
	chapel: 'TEMPLOM',
	memorial: 'EMLEKMU',
	house: 'HAZ',
};

function stripAccents(text) {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// osmc:symbol = `útszín:háttér:előtér[:szöveg:szövegszín]`. A jelzés színe az előtér-token szín-
// előtagja (`red_bar` → piros); az útszín (1. mező) gyakran csak általános `black`, ezért az csak
// tartalék. A kód `<SZÍN>_<ALAKZAT>` — a frontend a vonal színét csak a szín-előtagból veszi
// (trail-segment-symbol-color.ts), az alakzat a jelmagyarázatban / kártyán számít. Sorrend:
// ismert alakzat → a `symbol:hu` tag (pl. `LILA_M`) → a szöveg-mező betűjele (T tanösvény, P Pálos
// út, …) → `<SZÍN>_JEL`; így egy színnel jelzett út sosem esik a szürke `EGYEB`-be.
function symbolFromTags(tags) {
	const osmcSymbol = tags['osmc:symbol'];
	const hu = tags['symbol:hu'];
	const huSymbol = hu ? stripAccents(hu.toUpperCase()).replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '') : '';
	if (osmcSymbol) {
		const parts = osmcSymbol.split(':');
		const shapeToken = parts[2] ?? '';
		// A fehér előtér (pl. az osztrák `red:red:white_bar` piros-fehér-piros) a vonalon nem a jelzés
		// színe — ilyenkor az útszín, majd a háttér színe dönt; fehér csak a teljesen fehér jelzés.
		const colors = [shapeToken, parts[0], parts[1] ?? ''].map((token) => COLOR_WORDS[token.split('_')[0]]).filter(Boolean);
		const color = colors.find((candidate) => candidate !== 'FEHER') ?? colors[0];
		if (color) {
			const localShape = LOCAL_SHAPE_TOKENS[shapeToken.replace(/^[a-z]+_/, '')];
			const shapeWord = Object.keys(SHAPE_WORDS).find((word) => shapeToken.includes(word));
			if (localShape) {
				return `${color}_${localShape}`;
			}
			if (shapeWord) {
				return `${color}_${SHAPE_WORDS[shapeWord]}`;
			}
			if (huSymbol) {
				return huSymbol;
			}
			const text = stripAccents((parts[3] ?? '').toUpperCase()).replace(/[^A-Z0-9]+/g, '');
			return `${color}_${text || 'JEL'}`;
		}
	}
	return huSymbol || 'EGYEB';
}

async function fetchOverpass(query, { attempts = 5, timeoutMs = 90_000 } = {}) {
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
			console.warn(`[import-hiking-trails] Overpass kísérlet ${attempt}/${attempts} sikertelen: ${error.message}`);
			if (attempt < attempts) {
				await new Promise((resolve) => setTimeout(resolve, 8000 * attempt));
			}
		} finally {
			clearTimeout(timeout);
		}
	}
	throw lastError;
}

function parseArgs(argv) {
	const args = { country: 'HU', bbox: HUNGARY_BBOX, baseUrl: 'http://localhost:8080', key: process.env.LM2_ADMIN_API_KEY };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--country') args.country = argv[++i];
		else if (argv[i] === '--bbox') {
			const [minLat, minLon, maxLat, maxLon] = argv[++i].split(',').map(Number);
			args.bbox = { minLat, minLon, maxLat, maxLon };
		} else if (argv[i] === '--base-url') args.baseUrl = argv[++i];
		else if (argv[i] === '--key') args.key = argv[++i];
	}
	if (!args.key) {
		throw new Error('Hiányzó admin API kulcs — add meg --key kapcsolóval vagy LM2_ADMIN_API_KEY env változóval.');
	}
	return args;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const { minLat, minLon, maxLat, maxLon } = args.bbox;
	console.log(`[import-hiking-trails] route=hiking relációk lekérése Overpass-ból (${args.country}, bbox ${minLat},${minLon},${maxLat},${maxLon})...`);

	const query = `[out:json][timeout:180];relation["route"="hiking"](${minLat},${minLon},${maxLat},${maxLon});out geom;`;
	const data = await fetchOverpass(query, { timeoutMs: 200_000 });
	const relations = data.elements.filter((element) => element.type === 'relation');
	console.log(`[import-hiking-trails] ${relations.length} hiking-relation letöltve.`);

	const segments = [];
	const symbolCounts = new Map();
	for (const relation of relations) {
		const symbol = symbolFromTags(relation.tags ?? {});
		// backlog/201 — a reláció neve (pl. „Országos Kéktúra”), hogy a térképen egy vonalra koppintva kiderüljön.
		const routeName = relation.tags?.name?.trim() || null;
		symbolCounts.set(symbol, (symbolCounts.get(symbol) ?? 0) + 1);
		for (const member of relation.members ?? []) {
			if (member.type !== 'way' || !Array.isArray(member.geometry) || member.geometry.length < 2) {
				continue;
			}
			// Az Overpass geometria-tömbben egy hiányzó (nem letöltött) node egy üres {} elemként
			// jelenik meg — ezeket ki kell szűrni, különben érvénytelen [undefined, undefined]
			// koordináta kerülne a szakaszba.
			const coordinates = member.geometry
				.filter((point) => typeof point.lon === 'number' && typeof point.lat === 'number')
				.map((point) => [point.lon, point.lat]);
			if (coordinates.length < 2) {
				continue;
			}
			segments.push({ symbol, routeName, osmWayId: member.ref, coordinates });
		}
	}
	console.log(`[import-hiking-trails] ${segments.length} útszakasz (way) előállítva. Jelzés-eloszlás:`);
	for (const [symbol, count] of [...symbolCounts.entries()].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${symbol}: ${count}`);
	}

	console.log(`[import-hiking-trails] importálás a backendbe (${args.baseUrl})... (nagy adatmennyiségnél ez percekig is eltarthat)`);
	// Egy országos import 100 000+ soros insert-sorozatot jelent a backend oldalon, ami percekig
	// tarthat. Node beépített fetch-jének (undici) van egy ~300s-os alapértelmezett body/headers
	// timeout-ja, ami ennél hosszabb importnál idő előtt "fetch failed"-et dobna, holott a szerver
	// oldali tranzakció helyesen lefutna/commitolna a háttérben — ezért ezt a hívást a
	// gyerekfolyamatként indított curl-ra bízzuk, aminek a timeout-ja explicit, tetszőlegesen
	// hosszúra állítható (--max-time), fetch-dispatcher-bütykölés nélkül.
	const payloadPath = join(tmpdir(), `tura-import-${Date.now()}.json`);
	writeFileSync(payloadPath, JSON.stringify({ countryCode: args.country, segments }));
	let importBody;
	try {
		importBody = execFileSync(
			'curl',
			[
				'-sS',
				'--max-time',
				// 2026-10-20: a teljes HU-import (232 561 szakasz) 900 s-nál tovább tartott.
				'1800',
				'-X',
				'POST',
				`${args.baseUrl}/api/admin/tura/trail-segments/import`,
				'-H',
				'Content-Type: application/json',
				'-H',
				'Expect:',
				'-H',
				`X-Admin-Api-Key: ${args.key}`,
				'--data-binary',
				`@${payloadPath}`,
			],
			{ encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 },
		);
	} catch (error) {
		// Az execFileSync hibaüzenete a teljes parancssort tartalmazza, benne az admin kulccsal — az ne
		// kerüljön a kimenetre. A szerver oldali tranzakció időtúllépés után is lefuthat a háttérben.
		throw new Error(`a curl import-hívás sikertelen (kilépési kód ${error.status ?? '?'}): ${String(error.stderr ?? '').trim()}`);
	} finally {
		unlinkSync(payloadPath);
	}
	console.log(`[import-hiking-trails] Kész: ${importBody}`);
}

main().catch((error) => {
	console.error(`[import-hiking-trails] HIBA: ${error.stack ?? error.message}`);
	process.exitCode = 1;
});
