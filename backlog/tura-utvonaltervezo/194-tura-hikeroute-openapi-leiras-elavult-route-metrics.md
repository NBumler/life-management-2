---
id: 194
type: bug
status: backlog
title: Túra — a HikeRoute / HikeRouteDay OpenAPI-leírás a megszűnt route-metrics végpontra hivatkozik
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 194 — Túra — a HikeRoute / HikeRouteDay OpenAPI-leírás a megszűnt route-metrics végpontra hivatkozik

## Motiváció / probléma

A #151 1. köre (`8acd87a`) törölte a `POST /api/tura/route-metrics` végpontot: a metrika azóta
eszközön számolódik (`core/geo/route-metrics.ts`), a napi bontás pedig a #188 óta a teljes útvonal
egyetlen magasság-mintasorából (`splitRouteMetrics`, `RouteMetricsRepository.computeWithDays`). A
sémaleírások ezt nem követték, ezért a spec-first OpenAPI-ból generált kliens és szerver
dokumentációja is félrevezető.

A #151 naplója ezt szándékosan halasztotta, mert a leírás módosítása megváltoztatja az
outbox-payload hash-ét (`verify:outbox`), ami verzióemelést és egy no-op migrátorlépést kíván. Saját
jegy nélkül ez a #151 lezárásakor elsikkadna.

## Jelenlegi működés

- `backend/src/main/resources/openapi/components/schemas/HikeRoute.yaml` `distanceMeters`: „A kliens
  tölti ki a /api/tura/route-metrics hívás eredményéből mentéskor…”.
- `backend/src/main/resources/openapi/components/schemas/HikeRouteDay.yaml` `distanceMeters`: „A kliens
  tölti ki, az /api/tura/route-metrics eredményéből, erre a napi szakaszra hívva.”
- A generált `frontend/src/app/api/model/hikeRoute.ts` / `hikeRouteDay.ts` ugyanezt a szöveget hordozza.
- (A `V42__tura_hike_route_days.sql` fejkomment ugyanezt írja, de alkalmazott migráció — nem szerkeszthető, nem része a jegynek.)

## Elfogadási kritériumok

- [ ] A két sémaleírás a jelenlegi működést írja: a kliens eszközön számolja (`core/geo/route-metrics.ts`); a napi értékek a teljes útvonal mintasorából, felosztva (#188); `null`, ha magassági adat nem volt elérhető.
- [ ] `npm run gen:api` után a generált modellek frissek.
- [ ] Ha a `verify:outbox` piros: `OUTBOX_PAYLOAD_SCHEMA_VERSION` emelés + no-op lépés az `outbox-migrator.ts`-ben, `npm run verify:outbox -- --write` — vagy, ha addig érdemi `HikeRoute`-sémaváltozás jön, azzal együtt egy emeléssel.
- [ ] Backend `openApiGenerate --rerun` + `test` zöld.

## Terv / döntési napló

- 2026-10-19 — felvéve a #188 lezárásakor; a #151 naplójában „szándékosan nem változott” pontként szerepelt.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #194
- Kód: `HikeRoute.yaml`, `HikeRouteDay.yaml`, generált `api/model/`, esetleg `offline-queue.service.ts` + `outbox-migrator.ts` + snapshot
