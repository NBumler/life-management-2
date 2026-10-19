---
id: 190
type: change-request
status: done
title: Túra — az automatikus útvonal minden töréspontja külön útpont-markerként jelenik meg
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 190 — Túra — az automatikus útvonal minden töréspontja külön útpont-markerként jelenik meg

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Egy 4 km-es automatikus útvonal több tucat narancs körrel jelenik meg (minden
gráf-csúcs egy útpont), ami zsúfolt, és a visszavonás egyetlen csúcsot vesz el, nem a tervezést.

## Jelenlegi működés

Az automatikus tervezés eredményének koordinátái a `draft`-ba kerülnek, a
`hike-route-draft-points` réteg minden draft-koordinátára kört rajzol.

## Elfogadási kritériumok

- [x] Döntés és megvalósítás: az automatikus szakasz csak a kezdő- és végpontot (és a felhasználó által kijelölt pontokat) mutatja markerként; a visszavonás a teljes automatikus lépést vonja vissza.
- [x] A mentett `HikeRoute` geometria változatlan (a teljes vonal).

## Terv / döntési napló

- 2026-10-19 — döntés (felhasználó): a javasolt (a) változat — körrel csak a felhasználó pontjai, lépésenkénti
  visszavonás, napváltó csak kijelölt pontra.
- Megvalósítva: `pages/menu/tura/route-draft.ts` — `RouteDraft` (teljes vonal + a kijelölt pontok
  koordináta-indexei), tiszta függvények (`withManualPoint`, `routeDraftFromPath`, `waypointCoordinates`,
  `interiorWaypointIndexes`) és `RouteDraftEditor` (lépés-verem: kézi pont, teljes automatikus szakasz vagy
  átvett túra = egy lépés; a visszavonás azt is helyreállítja, amit a lépés lecserélt). A pontréteg csak a
  kijelölt pontokat rajzolja; a napváltó-választó és a „Napok” gomb csak a kijelölt belső pontokat kínálja, a
  lista a pont sorszámát mutatja (nem a koordináta-indexet).
- A mentett geometria és a `HikeRouteDay.endWaypointIndex` jelentése (koordináta-index) változatlan → nincs
  DTO-, outbox- vagy migrációs változás.
- Tesztek: `route-draft.spec.ts` (8). Emulátoron: automatikus útvonal → 2 kör; kézi pont utána → 3 kör, a
  napváltó csak a „2. pont”-ot kínálja; visszavonás → a kézi pont és a rá tett napváltó is eltűnik.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #190
- Kód: `frontend/src/app/pages/menu/tura/route-draft.ts` (+ spec), `tura.page.ts|html`.
