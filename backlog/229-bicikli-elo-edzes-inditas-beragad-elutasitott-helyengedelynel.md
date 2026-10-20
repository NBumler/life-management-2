---
id: 229
type: bug
status: backlog
title: Bicikli élő edzés — elutasított helyengedélynél az indítás soha nem fejeződik be
specs:
  - "[[Biciklizés napló]]"
flag:
created: 2026-10-20
closed:
---

# 229 — Bicikli élő edzés — elutasított helyengedélynél az indítás soha nem fejeződik be

## Motiváció / probléma

A `@capgo/background-geolocation` (8.4.14, a legújabb kiadás) `requestPermissions()` hívása Androidon
**elutasítás után soha nem tér vissza**: a plugin `continuePermissionRequest` ága az elutasító
visszahívás után újra kéri a `location` engedélyt, és ezt addig ismétli, amíg az nem adott — két
elutasítás után az Android már ablak nélkül utasít el, így a ciklus a háttérben végtelen
(a logban percenként tucatnyi `REQUEST_PERMISSIONS` indítás). A JS oldali ígéret függőben marad.

A bicikli élő edzés indítása (`BikeLiveSessionService.start()`) a `LocationTrackingService.requestPermission()`
→ `requestPermissions()` úton kér engedélyt, ezért ha a felhasználó az ablakban a „Nem engedélyezem”-et
választja, az indítás beragad: nem indul el az edzés, és a `permission-denied` magyarázat sem jelenik meg.

Forrás: a #215 („Saját helyzetem” gomb) emulátoros próbája 2026-10-20-án (LM2_Phone, Android 15) —
ott ugyanez a gomb örökre „dolgozott”; a #215 a plugin `start()`-ján át kér engedélyt (az
elutasításkor `NOT_AUTHORIZED` hibát ad, ciklus nélkül), ld. `LocationTrackingService.locateOnce()`.

## Jelenlegi működés

- `core/geo/location-tracking.service.ts` `requestPermission()` → `LocationTrackingGateway.requestPermissions()`
  (`['location', 'notification']`); csak a hibát kezeli, a soha meg nem érkező választ nem.
- `core/data/bike-live-session.service.ts` `start()` erre vár az edzés indítása előtt.
- Megadott engedélynél nincs gond (a `location` ág nem ismétel), csak elutasításnál.

## Elfogadási kritériumok

- [ ] Elutasított (és tartósan elutasított) helyengedélynél a bicikli élő edzés indítása néhány
      másodpercen belül a meglévő `permission-denied` magyarázattal tér vissza, és nem fut a háttérben
      engedélykérő ciklus.
- [ ] Megadott engedélynél az indítás és az értesítés-engedély kérése változatlan.
- [ ] Unit teszt a beragadó / elutasító plugin-válaszra; emulátoron kipróbálva (Pontos és Becsült mód).

## Terv / döntési napló

- 2026-10-20 — felvéve a #215 emulátoros próbája alapján. Javaslat: a `requestPermission()` ne hívja a
  plugin `requestPermissions()`-ét, amíg a `location` nincs megadva — az engedélyt a `start()` kérje
  (mint a `locateOnce()`-nál), az értesítés-engedélyt pedig csak megadott `location` mellett. Alternatíva:
  a plugin javítása (patch vagy upstream hibajegy) — döntés a megvalósításkor.

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] (Backend-offline / engedély rész, ha a viselkedés-leírás változik)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #229
- Kód: `frontend/src/app/core/geo/location-tracking.service.ts`, `location-tracking.gateway.ts`,
  `core/data/bike-live-session.service.ts`
