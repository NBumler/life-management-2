---
id: 214
type: change-request
status: done
title: Túra — a térkép minden megnyitáskor az országnézetre áll vissza
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
---

# 214 — Túra — a térkép minden megnyitáskor az országnézetre áll vissza

## Motiváció / probléma

Minden alkalommal újra rá kell közelíteni arra a területre, ahol a felhasználó legutóbb dolgozott; országnézetben ráadásul turistaút sem látszik ([[200-tura-turistautak-12-es-zoom-alatt-rejtettek]]).

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `HUNGARY_CENTER` / `HUNGARY_ZOOM = 7` minden `TuraPage` létrehozásakor.

## Elfogadási kritériumok

- [x] A térkép az utolsó nézettel (középpont, zoom, alaptérkép) nyílik; első megnyitáskor marad az országnézet.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — a középpont, a zoom, az alaptérkép és a domborzat-kapcsoló minden `moveend`-kor és rétegváltáskor `Preferences`-be kerül (`lm2_tura_map_view`); a térkép ebből indul, első megnyitáskor marad az országnézet. A térkép létrehozása ezért a tárolt nézet beolvasása után történik (`initMap`).
- 2026-10-19 — emulátoron: két nagyítás után vissza a Menübe, majd újra Túra → ugyanott nyílt.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #208, #213, #214
- Kód: `frontend/src/app/core/data/tura-local-state.service.ts` (+ spec), `pages/menu/tura/tura.page.ts`
