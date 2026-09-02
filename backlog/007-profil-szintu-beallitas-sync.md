---
id: 7
type: feature
status: backlog
title: Profil-szintű beállítás-sync
specs:
  - "[[Bejelentkezés]]"
  - "[[Nyelv választás]]"
  - "[[Dark&Light mode]]"
flag:
created: 2026-09-02
closed:
---

# 7 — Profil-szintű beállítás-sync

## Motiváció / probléma

A `Life Management 2.0.md` §„Első kör (MVP) hatókör” vágása: a nyelv, a téma és az
értesítés-kapcsolók **device-localak**. Ha ezek több eszköz közt követni akarják a
felhasználót, profil-szintű (szerver-oldali) beállítás-sync kell.

## Jelenlegi működés

Nyelv (`core/config/language.service.ts`), téma (`core/config/theme.service.ts`) és az
értesítés-kapcsolók device-local tárolásban élnek; a bejelentkezés nem hozza át őket
másik eszközre.

## Elfogadási kritériumok

- [ ] Beállítás-entitás(ok) a szerveren, user-owned, a sync-contract szerint.
- [ ] Kliens: első bejelentkezéskor pull, változáskor push; offline-kompatibilis.
- [ ] Döntés a device-local vs. profil-sync ütközés feloldásáról.
- [ ] A `[[Bejelentkezés]]`, `[[Nyelv választás]]`, `[[Dark&Light mode]]` specek frissítve.

## Terv / döntési napló

_Nincs elkötelezettség; rögzítés az MVP-hatókör táblából._

## Lezáráskor (on-done)

- Frissített specek: [[Bejelentkezés]], [[Nyelv választás]], [[Dark&Light mode]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
