---
id: 216
type: change-request
status: backlog
title: Túra — a katalógus nevei rejtélyesek, a lista rendezetlen, nincs keresés
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 216 — Túra — a katalógus nevei rejtélyesek, a lista rendezetlen, nincs keresés

## Motiváció / probléma

A 87 elemes listában a nevek az OSM-reláció nevei („P (Dömös – Budaörs)”, „S (Tettye – Abaligeti cseppkőbarlang)”) — a „P” / „S” a jelzés rövidítése, ezt a felhasználó nem tudja. A lista nincs rendezve (Kőszeg az első), és nem lehet régióra vagy névre keresni.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `curated_route.name` = az OSM-reláció `name` tagje (#193 import).
- Szűrők: nehézség, aktivitás, táv; nincs szöveges keresés, régió, rendezés.

## Elfogadási kritériumok

- [ ] A jelzés-rövidítés érthetően jelenik meg (pl. a jelzés színes ikonja + „Piros sáv: Dömös – Budaörs”), az import vagy a megjelenítés átalakításával.
- [ ] A lista rendezett (pl. név vagy táv szerint, választhatóan).
- [ ] Szöveges keresés a névre (a meglévő shared szöveges kereső komponenssel), és megfontolva régió-szűrő / „közelemben” rendezés (ez utóbbi a [[215-tura-sajat-helyzet-es-helykereses]]-től függ).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #216
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, esetleg `scripts/import-curated-routes.mjs`
