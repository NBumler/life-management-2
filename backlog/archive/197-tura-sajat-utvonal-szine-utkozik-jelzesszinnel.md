---
id: 197
type: change-request
status: done
title: Túra — a saját útvonal és a piszkozat színe összetéveszthető a turistajelzések színével
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 197 — Túra — a saját útvonal és a piszkozat színe összetéveszthető a turistajelzések színével

## Motiváció / probléma

A mentett saját útvonal ugyanúgy néz ki, mint egy kék jelzésű turistaút, a rajz-piszkozat narancsa pedig alig válik el a sárga jelzéstől — a teszten egy mentett útvonal a mentés után „eltűnt” a kék jelzések között.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Saját útvonal: `#1a73e8`, 4 px tömör vonal — a kék sáv `#1565c0`, 3 px.
- Piszkozat: `#ff6f00` szaggatott, 3 px — a sárga sáv `#f9a825`, 3 px.
- Előnézet: ciánkék `#00bcd4`, ami a kékhez közel áll.

## Elfogadási kritériumok

- [x] A saját útvonal, a piszkozat és az előnézet olyan stílust kap (szín + pl. kontúr / félig átlátszó szegély / vastagság), ami egyik MTSZ jelzésszínnel sem téveszthető össze, OSM, topo és szatellit alaptérképen sem.
- [x] Emulátoron ellenőrizve: egy kék és egy sárga jelzés mentén húzott saját útvonal és piszkozat egyértelműen kiemelkedik.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés (jóváhagyva a képek alapján): saját útvonal magenta `#d81b60` 5 px, fehér 8 px kontúrral; piszkozat ugyanez szaggatottan; katalógus-előnézet fehér 4 px fekete 8 px kontúrral. A lila (Mária út) jelzés sötétebb ibolya `#6a1b9a`, 3 px — a vastagság és a kontúr is megkülönbözteti.
- 2026-10-20 — Emulátoron (360 dp, Dobogókő, piros és kék jelzés mentén) OSM, topo és szatellit alaptérképen lefotózva; a felhasználó a palettát a képek alapján jóváhagyta.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #196, #197, #198, #199, #200, #202, #203
- Kód: `frontend/src/app/pages/menu/tura/map-icons.ts` (színkonstansok), `tura.page.ts`
