---
id: 177
type: change-request
status: done
title: A túra viewport-gráfja (offline-route-graph) a core/geo rétegbe, közös illesztési küszöbbel
specs:
  - "[[Frontend]]"
flag:
created: 2026-10-19
closed: 2026-10-19
---

# 177 — A túra viewport-gráfja (`offline-route-graph`) a `core/geo` rétegbe, közös illesztési küszöbbel

## Motiváció / probléma

A #150 utáni architektúra-ellenőrzés (2026-10-19) találata: rétegsértés és egy duplikált konstans a
közös geo-réteg körül.

- A `core/data/route-suggestion.repository.ts` a `pages/` rétegből importál
  (`pages/menu/tura/offline-route-graph.ts` → `suggestRouteOffline`). A [[Frontend]] rétegzése szerint
  a `core/` nem függhet a `pages/`-től.
- Az `offline-route-graph.ts` saját `MAX_SNAP_DISTANCE_METERS = 2_000` konstanst tart, miközben
  ugyanez az érték a `core/geo/routing.service.ts` profilonkénti `MAX_SNAP_DISTANCE_METERS`
  táblájában is szerepel (`HIKE`) — két helyen kell karbantartani.

Az útvonalkereső algoritmus nincs duplikálva: mindkét út a közös `core/geo/route-graph.ts`
(`RouteGraph`) motort használja, csak a gráf forrása más (viewport `TrailSegment`-ek vs. build-asset
csempék).

## Jelenlegi működés

`RouteSuggestionRepository.suggest()` sorrendje: (1) `suggestRouteOffline` a betöltött viewport /
letöltött régió szakaszain (`pages/menu/tura/offline-route-graph.ts`), (2) backend
`route-suggestion`, (3) `RoutingService.route('HIKE', …)` a build-asset gráfon.

## Elfogadási kritériumok

- [x] Az `offline-route-graph.ts` a `core/geo/`-ba költözik (pl. `core/geo/segment-route-graph.ts`),
      a `pages/menu/tura/` és a `core/data/` onnan importál; `core/` → `pages/` import nem marad
      (grep-pel ellenőrizve).
- [x] Az illesztési küszöb egy helyen él: a `routing.service.ts` profilonkénti táblája (vagy egy
      közös, exportált profil-konstans), és a viewport-gráf is a `HIKE` értéket használja.
- [x] Viselkedés változatlan: a meglévő `offline-route-graph` és `route-suggestion.repository`
      tesztek (áthelyezve) zöldek.
- [x] A szándékos sorrend-változás **nem** része ennek a jegynek (az a
      [[151-tura-backend-offline-first-szabalysertesek]] nyitott pontja).

## Terv / döntési napló

_Tisztán szerkezeti refaktor, funkcionális változás nélkül._

### Megvalósítás (2026-10-19)

- `pages/menu/tura/offline-route-graph.ts` (+ spec) → `core/geo/segment-route-graph.ts` (`git mv`, a
  `suggestRouteOffline` API változatlan); a `core/data/route-suggestion.repository.ts` innen importál.
- `routing.service.ts`: a profilonkénti `MAX_SNAP_DISTANCE_METERS` exportálva; a viewport-gráf a
  `HIKE` értékét használja, a saját 2000 m-es konstans megszűnt.
- Tesztek áthelyezve, változtatás nélkül zöldek (frontend `test:ci` 2173).
- **Hatókörön kívül, megfigyelés:** a `core/data/trail-segment.repository.ts` a
  `pages/menu/tura/offline-region.repository.ts`-t importálja (repository a képernyő mappájában);
  és a kódbázisban más, nem geo `core` → `pages` importok is vannak (pl. `core/data/activity-kcal.ts`
  a `*-metrics.ts` kalória-függvényekre, `climbing-live-session.service.ts`, `meal.repository.ts`).
  Ezek nem a közös geo-réteg ügyei → [[178-frontend-core-pages-retegserto-importok]].

## Lezáráskor (on-done)

- Frissített specek: nincs viselkedés-változás; ha a [[Frontend]] `core/geo` leírása fájlokat sorol, ott frissítendő
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #177 túra viewport-gráf a core/geo-ban
- Kód: `core/geo/`, `core/data/route-suggestion.repository.ts`, `pages/menu/tura/`
