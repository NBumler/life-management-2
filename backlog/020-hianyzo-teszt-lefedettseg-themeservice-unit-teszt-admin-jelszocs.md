---
id: 20
type: chore
status: backlog
title: Hianyzo teszt-lefedettseg: ThemeService unit teszt + admin-jelszocsere token-revoke teszt
specs:
  - "[[Dark&Light mode]]"
  - "[[Bejelentkezés]]"
flag:
created: 2026-09-02
closed:
---

# 20 — Hianyzo teszt-lefedettseg: ThemeService unit teszt + admin-jelszocsere token-revoke teszt

## Motiváció / probléma

Nincs theme.service.spec.ts core statusz mellett; AdminUserService.setPassword revokalja az osszes refresh tokent, de nincs ra teszt. (A LanguageService fallback-tesztje a 2c09d70 commitban elkeszult.)

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Dark&Light mode]], [[Bejelentkezés]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
