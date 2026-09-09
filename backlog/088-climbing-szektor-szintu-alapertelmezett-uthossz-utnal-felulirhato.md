---
id: 88
type: change-request
status: backlog
title: Mászás — szektor-szintű alapértelmezett úthossz, az adott útnál felülírható
specs:
  - "[[Outdoor köteles admin]]"
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles napló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-09
closed:
---

# 88 — Mászás — szektor-szintű alapértelmezett úthossz, az adott útnál felülírható

## Motiváció / probléma

Egy szektorban az utak jellemzően hasonló hosszúak. Jó lenne a **szektoron** megadni egy
alapértelmezett úthosszt, amit az egyes utak (és a naplóbeli kísérletek) örökölnek, de
felül lehet írni — pontosan úgy, ahogy az égtáj (`aspect`) és a kőzettípus (`rockType`)
öröklődik ([[Outdoor boulder admin]] mintája).

## Jelenlegi működés

- [[Outdoor köteles admin]] `Route`: `lengthInMeters` per út (opcionális).
- `Sector`: `cragId`, `name`, default `aspect` — **nincs** default hossz mező.
- [[Outdoor köteles napló]]: `lengthInMeters` a Route-ból vagy kézzel; útváltáskor újratöltődik
  (kivéve kézi felülírás — [[Mászónapló]] `AscentAttempt`, `lengthAutoFilled` provenance).

## Elfogadási kritériumok

- [ ] `Sector` kap opcionális `defaultLengthInMeters` mezőt (a `Route.lengthInMeters` marad).
- [ ] Öröklési sorrend: **1.** `Route.lengthInMeters` (ha kitöltött) → **2.** `Sector.defaultLengthInMeters`
      → **3.** napló kísérlet szinten felülírható (a meglévő `lengthAutoFilled` provenance-flag
      kiterjesztve a szektor-defaultra is).
- [ ] Szektor szerkesztő: hossz mező ([[Mennyiség mező]] `m`, vagy sima szám-input méterben).
- [ ] Flyway `V<n>` + helyi `SCHEMA_Vn` + OpenAPI `Sector` séma + `gen:api`.
- [ ] A kalória-számítás (kötél aktív idő = `lengthInMeters × {25|45|60}`) a feloldott hosszt
      használja.
- [ ] Boulder-oldal: a `Sector` közös entitás — a mező ott is megjelenik, de a boulder naplónak
      nincs hossz-fogyasztója; döntés, hogy elrejtjük-e a boulder szektor-szerkesztőn.

## Terv / döntési napló

_Kapcsolódik: [[084-climbing-szektor-a-sessionrol-a-kiserletre-attempt-szintre]] — ha a szektor
attemptre költözik, a hossz-öröklés az attempt szektorából számol. Sorrendben a 084 után
érdemes csinálni._

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor köteles admin]] (`Sector.defaultLengthInMeters`),
  [[Outdoor köteles napló]] (`lengthInMeters` öröklési sor), [[Mászónapló]] (`AscentAttempt`
  hossz-provenance), [[Outdoor boulder admin]] (közös `Sector` jegyzet)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: backend `SectorEntity`/`SectorMapper`/`SectorService` + `V<n>` + OpenAPI `Sector`;
  frontend `sector-edit` page, `sector.repository.ts`, `SCHEMA_V<n>`, `local-rows.ts`,
  `outdoor-rope-session-edit.*`, érintett `*.spec.ts`
