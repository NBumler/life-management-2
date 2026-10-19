---
id: 208
type: bug
status: backlog
title: Túra — a kuka megerősítés nélkül törli a teljes piszkozatot, és ez nem vonható vissza
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 208 — Túra — a kuka megerősítés nélkül törli a teljes piszkozatot, és ez nem vonható vissza

## Motiváció / probléma

Egyetlen véletlen koppintás elviszi a teljes munkát: a teszten egy átvett 54 km-es, kétnapos útvonal tűnt el, utána a visszavonás gomb tiltva maradt.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `clearDraft()`: `draftEditor.reset()`, név, kezdőpont, napváltók törlése — nincs megerősítés, és a lépés-verem is kiürül.

## Elfogadási kritériumok

- [ ] A kuka megerősítést kér, **vagy** a törlés egy lépésként visszavonható (a visszavonás visszaadja a vonalat, a nevet és a napváltókat). Döntés a naplóban.
- [ ] Unit teszt a `RouteDraftEditor`-ra, ha a visszavonható változat készül.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #208
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `route-draft.ts` (+ spec)
