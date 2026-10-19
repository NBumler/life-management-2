---
id: 202
type: change-request
status: backlog
title: Túra — a mentett útvonalak mindig látszanak a térképen, név nélkül, és nem rejthetők el
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 202 — Túra — a mentett útvonalak mindig látszanak a térképen, név nélkül, és nem rejthetők el

## Motiváció / probléma

Minden mentett saját útvonal állandóan rajta van a térképen egyforma kék vonalként; nem lehet tudni, melyik melyik, és nem lehet őket elrejteni tervezés közben.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `hike-routes` réteg: minden élő `HikeRoute` egyszínű vonalként, felirat nélkül.
- A Rétegek panelen csak alaptérkép + domborzat-árnyékolás kapcsoló van.

## Elfogadási kritériumok

- [ ] A Rétegek panelen kapcsoló: „Saját útvonalak” be / ki (a választás megmarad).
- [ ] A mentett útvonalak a nevükkel feliratozva (vagy a [[201-tura-vonalra-koppintva-nincs-informacio]] szerint koppintásra azonosíthatók).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #202
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
