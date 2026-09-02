---
id: 11
type: bug
status: backlog
title: Auth: sikertelen csendes refresh utan nincs aktiv atiranyitas a login kepernyore
specs:
  - "[[Bejelentkezés]]"
flag:
created: 2026-09-02
closed:
---

# 11 — Auth: sikertelen csendes refresh utan nincs aktiv atiranyitas a login kepernyore

## Motiváció / probléma

Sikertelen csendes refresh utan a session torlodik, de a user csak a kovetkezo guardolt navigacional kerul /login-ra.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Bejelentkezés]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
