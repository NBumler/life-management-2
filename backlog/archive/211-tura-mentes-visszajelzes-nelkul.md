---
id: 211
type: change-request
status: done
title: Túra — mentéskor nincs visszajelzés
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 211 — Túra — mentéskor nincs visszajelzés

## Motiváció / probléma

Mentés után a piszkozat és a statisztika eltűnik, az útvonal kék lesz — a felhasználó nem tudja, sikerült-e a mentés, és hol találja az útvonalat.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `saveDraft()` után nincs toast / üzenet.

## Elfogadási kritériumok

- [x] Mentés után rövid visszajelzés (pl. toast „Mentve az Útvonalaim közé”, esetleg „Megnyitás” akcióval), hu + en.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — mentés után toast: „Mentve az Útvonalaim közé” / „Saved to My routes”, „Megnyitás” / „Open” akcióval, 5 mp-ig, a fülsáv fölött (a #208 kuka-toastjával közös `showActionToast`, egyszerre egy látszik). A „Megnyitás” most a térképen az útvonalra ugrik (`flyToRoute`); a #212 részletkártyája után azt nyitja majd.
- 2026-10-19 — emulátoron: mentés → a toast megjelent, a „Megnyitás” a mentett útvonalra közelített.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #207, #211, #220, #224, #225
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts`, `assets/i18n/{hu,en}.json` (`TURA.SAVED`, `TURA.SAVED_OPEN`)
