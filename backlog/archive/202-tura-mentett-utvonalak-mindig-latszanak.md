---
id: 202
type: change-request
status: done
title: Túra — a mentett útvonalak mindig látszanak a térképen, név nélkül, és nem rejthetők el
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 202 — Túra — a mentett útvonalak mindig látszanak a térképen, név nélkül, és nem rejthetők el

## Motiváció / probléma

Minden mentett saját útvonal állandóan rajta van a térképen egyforma kék vonalként; nem lehet tudni, melyik melyik, és nem lehet őket elrejteni tervezés közben.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `hike-routes` réteg: minden élő `HikeRoute` egyszínű vonalként, felirat nélkül.
- A Rétegek panelen csak alaptérkép + domborzat-árnyékolás kapcsoló van.

## Elfogadási kritériumok

- [x] A Rétegek panelen kapcsoló: „Saját útvonalak” be / ki (a választás megmarad).
- [x] A mentett útvonalak a nevükkel feliratozva (vagy a [[201-tura-vonalra-koppintva-nincs-informacio]] szerint koppintásra azonosíthatók).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — a Rétegek panelen „Saját útvonalak” kapcsoló (a vonal, kontúr, nyilak, felirat és jelölők együtt); a választás a térkép-nézettel együtt `Preferences`-be kerül (`StoredTuraMapView.myRoutes`, a korábban tárolt nézet „be”-ként olvasódik).
- 2026-10-20 — a mentett útvonal neve 13-as zoomtól a vonal mentén, fehér kontúros képként (`icon-keep-upright`). Emulátoron ellenőrizve.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #196, #197, #198, #199, #200, #202, #203
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html`, `hike-routes-geojson.ts`, `map-icons.ts`, `core/data/tura-local-state.service.ts` (+ spec)
