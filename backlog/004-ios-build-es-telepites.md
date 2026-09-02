---
id: 4
type: feature
status: backlog
title: iOS build és eszközre telepítés
specs:
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-09-02
closed:
---

# 4 — iOS build és eszközre telepítés

## Motiváció / probléma

A `Life Management 2.0.md` §„Első kör (MVP) hatókör” és a `[[Fejlesztői környezet]]`
nyitott kérdése: a natív Android célra megy először, az iOS build és eszközre telepítés
kimarad. A [[002-ios-health-lepes-forras]] előfeltétele.

## Jelenlegi működés

Csak Android: `scripts/install-android.ps1`, `npx cap sync android`, debug APK + `adb`.
iOS Capacitor platform / build / telepítési folyamat nincs dokumentálva vagy tesztelve.

## Elfogadási kritériumok

- [ ] Capacitor iOS platform hozzáadva, build zöld.
- [ ] Eszközre telepítési folyamat dokumentálva a `[[Fejlesztői környezet]]`-ben.
- [ ] A `[[Fejlesztői környezet]]` nyitott kérdése (iOS build) lezárva.

## Terv / döntési napló

_Nincs elkötelezettség; rögzítés az MVP-hatókör táblából._

## Lezáráskor (on-done)

- Frissített specek: [[Fejlesztői környezet]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
