---
id: 201
type: feature
status: done
title: Túra — egy vonalra koppintva nem derül ki, melyik turistaút vagy útvonal az
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 201 — Túra — egy vonalra koppintva nem derül ki, melyik turistaút vagy útvonal az

## Motiváció / probléma

A térképen nem lehet megtudni egy vonalról, hogy milyen jelzés, melyik túraútvonal része, vagy hogy az egy saját mentett útvonal-e.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `map.on('click')` csak Rajzolás / Automatikus módban csinál valamit; alapállapotban a koppintás hatástalan.
- A `TrailSegment` csak `symbol`-t hordoz (név / reláció nélkül).

## Elfogadási kritériumok

- [x] Alapállapotban egy turistaút-szakaszra koppintva kártya / popup jelenik meg a jelzés nevével (pl. „Kék sáv”), és ha elérhető, a túraútvonal nevével.
- [x] Saját mentett útvonalra koppintva a [[212-tura-mentett-utvonal-megnyitasa-csak-odarepul]] részletnézete nyílik.
- [x] Rajzolás / Automatikus módban a koppintás továbbra is pontot tesz le (nincs ütközés).
- [x] Ha a reláció neve kell: az import és a `TrailSegment` séma bővítése (Flyway + OpenAPI + build asset) — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés: a reláció neve kell → `trail_segment.route_name` (nullable) — Flyway `V62`, OpenAPI `TrailSegment.routeName` és `TrailSegmentImportItem.routeName`, az import a reláció `name` tagjéből tölti. A build-asset turistaút-gráf nem változik (csak geometriát hordoz), így nem kellett újragenerálni. Az offline régió-cache régi elemei név nélkül maradnak.
- 2026-10-20 — újraimport (a `bootRun` V62-vel indítása után): 6437 reláció, 232 561 szakasz, ebből 220 246 (95%) névvel. A szerver 900 s-nál tovább dolgozott; a script curl-hívása 900 s után időtúllépett, a tranzakció ettől függetlenül lefutott — a `--max-time` 1800 s lett, és a script hibaüzenete nem írja ki többé a parancssort (benne az admin kulccsal).
- 2026-10-20 — megvalósítva: alapállapotban (nincs mód, nincs előnézet) egy koppintás ±10 px-es körzetében előbb a saját mentett útvonalat keresi → a #212 kártyáját nyitja; különben a turistautakat: a lebegő kártyán színminta + a jelzés neve („Kék sáv”, „Zöld Ω (barlang)”, „Lila M”; ismeretlen alakzatnál „Kék jelzés”, szín nélkül „Jelzés nélküli turistaút”) + a túraútvonal neve; egymásra futó utaknál mind (legfeljebb 4). Üres helyre koppintva bezárul. Kézi / Turistaúton módban a koppintás továbbra is pontot tesz le.
- 2026-10-20 — emulátoron (Pilis): egy kék vonalra koppintva „Kék sáv — Országos Kéktúra”, „Kék sáv — K, OKT 16. (Dobogókő – Pilisszentlászló – Visegrád – Nagymaros, visegrádi rév)”, „Jelzés nélküli turistaút — E4 európai hosszútávú turistaút (magyarországi szakasz)”; egy saját útvonalra koppintva a kártyája nyílt. hu + en.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #212, #218, #219, #209, #201
- Kód: `backend/.../tura/TrailSegment{Entity,Mapper,Service}.java`, `V62__trail_segment_route_name.sql`, `openapi/components/schemas/TrailSegment{,ImportItem}.yaml`, `scripts/import-hiking-trails.mjs`, `frontend/.../tura/tura.page.ts|html|scss`, `trail-symbol-text.ts` (+ spec), `trail-segments-geojson.ts`, `hike-routes-geojson.ts`
