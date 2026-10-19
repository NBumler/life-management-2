---
id: 193
type: feature
status: done
title: Túra — az ajánlott túrák katalógusának nincs tartalomforrása
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 193 — Túra — az ajánlott túrák katalógusának nincs tartalomforrása

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A helyi adatbázis `curated_route` táblája üres volt; a panelt csak két kézzel,
az admin API-n felvett „TESZT …” túrával lehetett kipróbálni. A katalógus ma kizárólag
`POST /api/admin/tura/curated-routes` admin upserttel tölthető, nincs import, seed vagy szerkesztő.

## Jelenlegi működés

Backend: `CuratedRouteService` admin upsert (`X-Admin-Api-Key`), a metrikákat a szerver számolja.
Frontend: `GET /api/tura/curated-routes` szűrhető lista. A
[[151-tura-backend-offline-first-szabalysertesek]] nyitott pontja szerint a katalógus offline
elérhetősége (pull vs. build asset) is eldöntetlen.

## Elfogadási kritériumok

- [x] Döntés a tartalomforrásról (pl. OSM `route=hiking` relációk importja a meglévő turistaút-import mintájára, kézzel szerkesztett seed fájl, vagy admin felület).
- [x] Legalább a fejlesztői környezetben reprodukálható feltöltés (script / seed), hogy a funkció tesztelhető legyen.
- [x] Összhang a [[151-tura-backend-offline-first-szabalysertesek]] katalógus-offline döntésével.

## Terv / döntési napló

- A 2026-10-19-i teszthez felvett két sor id-je: `7d1c2e4a-1b2c-4d3e-8f90-0a1b2c3d4e01`, `…e02` (helyi adat, törölhető).
- 2026-10-19 — döntés (felhasználó): a javasolt OSM `route=hiking` import.
- Megvalósítva: `scripts/import-curated-routes.mjs` (a `import-hiking-trails.mjs` mintájára, Overpass →
  `POST /api/admin/tura/curated-routes`). Válogatás: a magyar országos (`nwn`) és regionális (`rwn`)
  `type=route` relációk, névvel, 5–80 km között, ha a fő águk (üres / `main` szerep) egy folytonos vonallá
  fűzhető. Sok reláció tagjai nincsenek sorba rendezve, ezért a tagsorrendű fűzés után a legközelebbi
  végpontok menti fűzés a tartalék (≤ 60 m rés, a kimaradt leágazások ≤ 5%). Douglas–Peucker ritkítás
  20 m-rel (a ~450 túra listája ~1 MB, gzippel ~0,3 MB). A 30 km-nél hosszabb túra (a legtöbb
  Kéktúra-szakasz) egyenlő napokra bontva, a napváltók az átvétel (#189) után szerkeszthetők. A nehézség a
  távból (≤ 12 km könnyű, ≤ 25 km közepes, felette nehéz). Id: UUID v5 a reláció id-jéből → idempotens
  újrafuttatás. A leírás tartalmazza az OSM-attribúciót (ODbL). `--dry-run` statisztikával.
  Eredmény a 2026-10-19-i OSM-adaton: 620 relációból 447 túra (94 többnapos); kimaradt 125 a hossz, 41 a
  folytonosság, 7 a hiányzó név miatt.
- Közben javítva (backend hiba): a kifejezett `"days": null` a `CuratedRouteService` **és** a
  `HikeRouteService` upsertjében 500-at adott (a `JsonNullable` jelen van, null értékkel → NPE a
  validációban). A frontend `hike-route.repository.ts` egynapos útvonalnál pont ezt küldi, tehát a saját
  útvonalak szerver-szinkronját is érintette. Javítva + integrációs teszt mindkét végpontra.
- Backend: `server.compression` (gzip) a JSON-válaszokra — a katalógus-lista és a turistaút-bbox nagy,
  jól tömöríthető. A futó helyi `bootRun` újraindításáig nem él.
- Feltöltés: a szerver túránként egy Open-Meteo magasság-lekérést indít, és a kvóta pár tucat túra után
  kimerült (502); a szkript ütemezve fut és újrapróbál, de a teljes futás órákig tartott volna. Leállítva
  87 feltöltött túránál (25 többnapos); a befejezés: [[195-tura-ajanlott-turak-teljes-feltoltese]].
  A két „TESZT …” sor törölve.
- Összhang a #151-gyel: a katalógus kiszállítása nem változott (online `GET`, offline üres + #191
  üzenet); a pull vs. build-asset döntés a [[151-tura-backend-offline-first-szabalysertesek]]-ben nyitott
  marad, ott rögzítve.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #193
- Kód: `scripts/import-curated-routes.mjs`; `backend/.../tura/CuratedRouteService.java`, `HikeRouteService.java` (+ integrációs tesztek); `backend/src/main/resources/application.yaml`.
