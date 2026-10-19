---
id: 223
type: bug
status: backlog
title: Túra — az offline letöltés tömegesen tölt csempét a tile.openstreetmap.org-ról, amit az OSM szabálya tilt
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 223 — Túra — az offline letöltés tömegesen tölt csempét a tile.openstreetmap.org-ról, amit az OSM szabálya tilt

## Motiváció / probléma

Az OSM Foundation csempeszerverének felhasználási szabálya (Tile Usage Policy) tiltja a tömeges / offline előletöltést. Egy régió-letöltés akár 2500 csempét kér le egyszerre; ez a szerver oldaláról letiltást (blokkolt User-Agent / IP) is eredményezhet.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `core/data/offline-region.repository.ts`: `OSM_TILE_URL_ROOT = 'https://tile.openstreetmap.org'`, z12–15, max. 2500 csempe régiónként.
- UX-szempontból nem érintett; a 2026-10-19-i UX-teszt kódáttekintése közben derült ki.

## Elfogadási kritériumok

- [ ] Az offline csempék olyan forrásból jönnek, amelynek a felhasználási feltételei megengedik az offline előletöltést (pl. saját / bérelt csempeszolgáltatás, vagy saját előállítású csomag) — döntés a naplóban.
- [ ] A forrás és a feltételei a [[105-tura-offline-terkep-es-utvonalszamitas]] jegyben és a [[Backend-offline first]] §13 külső-szolgáltatás listájában rögzítve.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #223
- Kód: `frontend/src/app/core/data/offline-region.repository.ts`
