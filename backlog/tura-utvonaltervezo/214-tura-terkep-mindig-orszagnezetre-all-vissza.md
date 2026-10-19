---
id: 214
type: change-request
status: backlog
title: Túra — a térkép minden megnyitáskor az országnézetre áll vissza
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 214 — Túra — a térkép minden megnyitáskor az országnézetre áll vissza

## Motiváció / probléma

Minden alkalommal újra rá kell közelíteni arra a területre, ahol a felhasználó legutóbb dolgozott; országnézetben ráadásul turistaút sem látszik ([[200-tura-turistautak-12-es-zoom-alatt-rejtettek]]).

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `HUNGARY_CENTER` / `HUNGARY_ZOOM = 7` minden `TuraPage` létrehozásakor.

## Elfogadási kritériumok

- [ ] A térkép az utolsó nézettel (középpont, zoom, alaptérkép) nyílik; első megnyitáskor marad az országnézet.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #214
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
