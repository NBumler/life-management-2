---
id: 211
type: change-request
status: backlog
title: Túra — mentéskor nincs visszajelzés
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 211 — Túra — mentéskor nincs visszajelzés

## Motiváció / probléma

Mentés után a piszkozat és a statisztika eltűnik, az útvonal kék lesz — a felhasználó nem tudja, sikerült-e a mentés, és hol találja az útvonalat.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `saveDraft()` után nincs toast / üzenet.

## Elfogadási kritériumok

- [ ] Mentés után rövid visszajelzés (pl. toast „Mentve az Útvonalaim közé”, esetleg „Megnyitás” akcióval), hu + en.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #211
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `assets/i18n/{hu,en}.json`
