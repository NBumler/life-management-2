---
id: 58
type: chore
status: backlog
title: Backend: Idempotency-Key 30-napos prune job + enforce-everywhere vizsgalat
specs:
  - "[[Backend]]"
flag:
created: 2026-09-02
closed:
---

# 58 — Backend: Idempotency-Key 30-napos prune job + enforce-everywhere vizsgalat

## Motiváció / probléma

Az Idempotency-Key-t a nativ drain minden replay-en kuldi, de a szerver csak a nem-idempotens atomi vegpontokon (POST /complete) kenyszeriti ki + tarolja; a 30-napos prune job hianyzik.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Backend]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
