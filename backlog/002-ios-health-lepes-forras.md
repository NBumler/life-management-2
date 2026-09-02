---
id: 2
type: feature
status: deferred
title: iOS Health lépés-forrás
specs:
  - "[[Lépésszám követés]]"
  - "[[Lépésszám átszinkronizálása a Samsung Health-ből]]"
flag: menu.lepesszam
created: 2026-09-02
closed:
---

# 2 — iOS Health lépés-forrás

## Motiváció / probléma

A `[[Lépésszám követés]]` és a `[[Lépésszám átszinkronizálása a Samsung Health-ből]]`
spec az iOS Health (HealthKit) lépés-forrást „későbbi scope”-ként jelöli. Az Android
Health Connect ág le van szállítva; iOS-en semmi.

A felhasználó döntése (2026-09-02): **egyelőre nem tervezett, később újranyitható.**
Előfeltétel: [[004-ios-build-es-telepites]].

## Jelenlegi működés

- `core/health/` kizárólag Android: `registerPlugin('HealthConnectSteps')`, Kotlin
  `HealthConnectStepsPlugin.kt` (`androidx.health.connect:connect-client`).
- Manuális bevitel (L1) és Android Health Connect sync (L2) kész; `maxWinsUpsert`.
- iOS-en nincs natív modul, nincs HealthKit olvasás.

## Elfogadási kritériumok

- [ ] HealthKit step-source natív modul iOS-re, a Health Connect ág mintájára.
- [ ] `maxWins` konfliktus-szabály iOS-en is (csak nagyobb érték írja felül a mentettet).
- [ ] A spec `### Jelenlegi működés` átírva; a „későbbi scope” megjegyzés törölve.

## Terv / döntési napló

_Elhalasztva. Nagy: iOS build + natív modul; a [[004-ios-build-es-telepites]] jegy
nélkül nem indítható._

## Lezáráskor (on-done)

- Frissített specek: [[Lépésszám követés]], [[Lépésszám átszinkronizálása a Samsung Health-ből]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
