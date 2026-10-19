---
id: 193
type: feature
status: backlog
title: Túra — az ajánlott túrák katalógusának nincs tartalomforrása
specs: []
flag: menu.tura
created: 2026-10-19
closed:
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

- [ ] Döntés a tartalomforrásról (pl. OSM `route=hiking` relációk importja a meglévő turistaút-import mintájára, kézzel szerkesztett seed fájl, vagy admin felület).
- [ ] Legalább a fejlesztői környezetben reprodukálható feltöltés (script / seed), hogy a funkció tesztelhető legyen.
- [ ] Összhang a [[151-tura-backend-offline-first-szabalysertesek]] katalógus-offline döntésével.

## Terv / döntési napló

- A 2026-10-19-i teszthez felvett két sor id-je: `7d1c2e4a-1b2c-4d3e-8f90-0a1b2c3d4e01`, `…e02` (helyi adat, törölhető).

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #193
- Kód: <fő fájlok>
