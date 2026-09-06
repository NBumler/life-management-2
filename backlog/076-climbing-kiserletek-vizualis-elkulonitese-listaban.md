---
id: 76
type: change-request
status: backlog
title: Kísérletek vizuális elkülönítése a session-listában (elválasztó / háttér / border)
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed:
---

# 76 — Kísérletek vizuális elkülönítése a session-listában (elválasztó / háttér / border)

## Motiváció / probléma

A session-szerkesztőben / részletnézetben a kísérletek (`AscentAttempt` sorok) egymásba folynak —
nehéz ránézésre látni, hol végződik az egyik és kezdődik a másik, főleg ha egy kísérletnek több
mezője (grade, stílus, jegyzet, failurePoint) is ki van töltve. Kell valami erősebb tagolás:
elválasztó vonal, kártya-háttér, border, vagy térköz — a legjobb formát scoping alatt kell
eldönteni.

## Jelenlegi működés

[[Mászónapló]] / [[Indoor boulder napló]] `### UI/UX elvárások`: „Lista: közös Mászónapló lista,
szűrő … Thumb-zone: új kísérlet / siker toggle / session vége.” A kísérlet-sorok konkrét vizuális
tagolása nincs kikötve.

## Elfogadási kritériumok

- [ ] Minden kísérlet önálló, ránézésre elkülönülő blokk (kártya vagy erős elválasztó + térköz).
- [ ] Siker / sikertelen állapot azonnal olvasható (szín / ikon a blokk szélén).
- [ ] Konzisztens mind a 4 kontextus napló-formban és a session-részlet nézetben.
- [ ] Tisztán UI; nincs adatmodell-változás. OnPush kompatibilis.

## Terv / döntési napló

_A [[status-cycle card]] / meglévő shared kártya-minta újrahasznosítható lehet. A
[[077-climbing-sikertelen-kiserlet-hol-akadt-el-tobbsoros-textbox]] jeggyel együtt érdemes
csinálni (ugyanaz a blokk-layout)._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] / [[Indoor boulder napló]] (`### UI/UX elvárások`)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` climbing session edit / detail komponensek + esetleg shared attempt-card
