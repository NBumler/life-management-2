---
id: 229
type: bug
status: done
title: Bicikli élő edzés — elutasított helyengedélynél az indítás soha nem fejeződik be
specs:
  - "[[Biciklizés napló]]"
flag:
created: 2026-10-20
closed: 2026-10-20
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

- [x] Elutasított (és tartósan elutasított) helyengedélynél a bicikli élő edzés indítása néhány
      másodpercen belül a meglévő `permission-denied` magyarázattal tér vissza, és nem fut a háttérben
      engedélykérő ciklus.
- [x] Megadott engedélynél az indítás és az értesítés-engedély kérése változatlan.
- [x] Unit teszt a beragadó / elutasító plugin-válaszra; emulátoron kipróbálva (Pontos és Becsült mód).

## Terv / döntési napló

- 2026-10-20 — felvéve a #215 emulátoros próbája alapján. Javaslat: a `requestPermission()` ne hívja a
  plugin `requestPermissions()`-ét, amíg a `location` nincs megadva — az engedélyt a `start()` kérje
  (mint a `locateOnce()`-nál), az értesítés-engedélyt pedig csak megadott `location` mellett. Alternatíva:
  a plugin javítása (patch vagy upstream hibajegy) — döntés a megvalósításkor.
- 2026-10-20 — kész, a javaslat szerint (plugin-patch nélkül). `LocationTrackingService.requestPermission(title, message)`:
  először `checkPermissions()`; ha a `location` megvan, csak az értesítés-engedélyt kéri
  (`LocationTrackingGateway.requestNotificationPermission()`, `permissions: ['notification']` — ez az ág nem
  ismétel). Ha nincs meg, egy rövid `start()`-tal kéri (a plugin ezt egyszer kérdezi meg, elutasításkor
  `NOT_AUTHORIZED` hibát ad); a megadást a plugin senkinek nem jelzi, ezért közben
  `PERMISSION_POLL_INTERVAL_MS` (500 ms) időközönként újra-ellenőriz, weben az első fix számít megadásnak.
  Válasz nélkül `PERMISSION_PROMPT_TIMEOUT_SECONDS` (60 s) után elutasítottnak veszi; utána mindig `stop()`.
  A gateway `requestPermissions()`-e megszűnt, így a ciklust kiváltó hívás sehol nincs.
  Unit tesztek: megadott / párbeszédben elutasított / párbeszédben megadott (újra-ellenőrzés) / web megadás és
  elutasítás / időtúllépés / induló plugin-hiba; a bicikli-szolgáltatás elutasító tesztje a valódi plugin-választ adja.
  Emulátoron (LM2_Phone, Android 15, en): Becsült módban „Don't allow” → azonnal a „No location access” ablak, 15 s
  alatt egyetlen új engedélykérő Activity sem indult; Pontos módban a második elutasítás után `USER_FIXED` (tartós)
  állapot, az újabb indítás 1,5 s-on belül ugyanazt az ablakot adja; a flagek törlése után „While using the app” →
  a Pontos edzés elindul (újra-ellenőrzés ága); megadott engedéllyel a Becsült edzés párbeszéd nélkül indul.
  Mindkét próba-edzés elvetve.

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] (élő edzés indítása: elutasított / megválaszolatlan engedély; GPS-kódhivatkozás)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #229, #227, #194, #228, #226
- Kód: `frontend/src/app/core/geo/location-tracking.service.ts`, `location-tracking.gateway.ts`,
  `core/data/bike-live-session.service.ts`
