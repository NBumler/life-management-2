---
id: 217
type: bug
status: backlog
title: Túra — ugyanarra a túrára a katalógus és az átvett piszkozat más szintemelkedést és időt mutat
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 217 — Túra — ugyanarra a túrára a katalógus és az átvett piszkozat más szintemelkedést és időt mutat

## Motiváció / probléma

A „P (Dömös – Budaörs)” a katalógusban 54,2 km, 13 ó 17 p, ↑1459 m; átvétel után a piszkozat 54,2 km, 14 ó 17 p, ↑2062 m / ↓2094 m. A felhasználó nem tudja, melyik az igaz.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Katalógus: a backend számolja az admin upsertkor (`RouteMetricsService`, `PROFILE_SAMPLE_COUNT = 50` Open-Meteo mintapont).
- Piszkozat: az eszköz számolja (`core/geo/route-metrics.ts`, sűrűbb mintavétel + zajküszöb).
- A különbség valószínűleg a mintapontok számából adódik (50 pont egy 54 km-es túrán ~1 km-enként mintáz).

## Elfogadási kritériumok

- [ ] A katalógus és az átvett piszkozat ugyanazzal a módszerrel számolt értékeket mutat (pl. a katalógus-import is az eszközös / közös algoritmussal és mintavétellel számol, vagy a katalógus értéke átvételkor megmarad). Döntés a naplóban.
- [ ] Teszt / mérés: legalább egy rövid és egy hosszú katalógus-túrán a két érték egyezik (vagy a dokumentált tűrésen belül van).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- Kapcsolódik: [[179-dem-varosi-szintemelkedes-felulbecsles]], [[176-kozos-dem-mintavetel-tura-bicikli]] (közös DEM-mintavétel), [[195-tura-ajanlott-turak-teljes-feltoltese]] (újrafeltöltéskor ugyanaz a számítás fut).

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #217
- Kód: `backend/.../tura/RouteMetricsService.java`, `core/geo/route-metrics.ts`, esetleg `scripts/import-curated-routes.mjs`
