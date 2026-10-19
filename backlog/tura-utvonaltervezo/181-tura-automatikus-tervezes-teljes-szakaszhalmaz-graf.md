---
id: 181
type: bug
status: backlog
title: Túra — az automatikus tervezés minden kérésnél a teljes betöltött szakaszhalmazból épít gráfot
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 181 — Túra — az automatikus tervezés minden kérésnél a teljes betöltött szakaszhalmazból épít gráfot

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Egy ~4 km-es automatikus útvonal repülőgép módban **~29–40 s** alatt jelent
meg. CPU-profil (CDP) a tervezés alatt: 38 s-ból **23 s szemétgyűjtés**, a fő szálon alig fut
JavaScript. Mintavételes heap-profil: egy tervezés **358 MB** foglalás, ebből a
`segment-route-graph` gráfépítője (`suggestRouteOffline` → a minified `ug`) egymaga **130 MB**,
a `RouteGraph.indexEdge` 58 MB. Tétlen állapotban nincs GC; a geo-asset csempék és a
build-asset gráf cache-ből jönnek (nincs fájlbetöltés).

## Jelenlegi működés

`core/data/route-suggestion.repository.ts` `suggest()` 1. szintje:
`suggestRouteOffline(this.trailSegments.segments(), start, end)` (`core/geo/segment-route-graph.ts`)
— a `TrailSegmentRepository` **összes** memóriában lévő szakaszából épít `RouteGraph`-ot, minden
kérésnél újra, a kezdő- és végponttól függetlenül. A halmaz a
[[180-tura-turistaut-szakaszok-korlatlan-betoltese]] miatt akár országos méretű.

## Elfogadási kritériumok

- [ ] Az 1. szint csak a kezdő- és végpont körüli bbox (+ margó) szakaszaiból épít gráfot.
- [ ] Mérés a jegyben (emulátor, ugyanaz az útvonal): a tervezés ideje és a GC-idő előtte / utána.
- [ ] A tervezés sorrendje és eredménye változatlan (viewport-gráf → backend → build-asset `HIKE`); a meglévő `route-suggestion.repository.spec.ts` / `segment-route-graph.spec.ts` zöld.
- [ ] Unit teszt: távoli szakaszok nem kerülnek a gráfba.

## Terv / döntési napló

- Független a [[180-tura-turistaut-szakaszok-korlatlan-betoltese]]-tól, de együtt adják a teljes javulást; a sorrendjük szabad.

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #181
- Kód: <fő fájlok>
