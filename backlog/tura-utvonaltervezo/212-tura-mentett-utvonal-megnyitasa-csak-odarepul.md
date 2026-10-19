---
id: 212
type: feature
status: backlog
title: Túra — egy mentett útvonal megnyitása csak odarepíti a térképet: nincs részlet, szerkesztés, átnevezés
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 212 — Túra — egy mentett útvonal megnyitása csak odarepíti a térképet: nincs részlet, szerkesztés, átnevezés

## Motiváció / probléma

A mentett útvonalakról az appban semmi nem derül ki a vonalon kívül, és utólag nem lehet őket módosítani.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Az Útvonalaim listában csak név (+ többnaposnál „N nap”) látszik; nincs táv, szint, dátum; a sorrend a tárolás sorrendje (az új a lista alján).
- Elemre koppintva `flyToRoute()`: `fitBounds`, a panel bezárul — nincs név, statisztika, profil, napbontás.
- Nincs szerkesztés (vonal, napok) és átnevezés; csak törlés.

## Elfogadási kritériumok

- [ ] Az Útvonalaim lista elemein látszik a táv, ↑ és a létrehozás dátuma; a lista rendezett (pl. legújabb elöl).
- [ ] Mentett útvonal megnyitásakor a név, a statisztika, a magasságprofil és a napbontás megjelenik.
- [ ] A mentett útvonal szerkeszthető (betöltés a piszkozatba, mentés ugyanarra az id-re) és átnevezhető.
- [ ] Offline-first: a módosítás a meglévő `HikeRoute` outbox-úton megy (új DTO-mező esetén `verify:outbox`).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #212
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `core/data/hike-route.repository.ts`
