---
id: 76
type: change-request
status: done
title: Kísérletek vizuális elkülönítése a session-listában (elválasztó / háttér / border)
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
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

Mind a 4 kontextus napló-form (`indoor-boulder`, `indoor-rope`, `outdoor-boulder`, `outdoor-rope`)
minden kísérlet-blokkja (`<ion-list class="attempt-card">`) önálló kártya: `12px 8px` térköz,
`1px` keret + `10px` lekerekítés, a **bal élen 4px színsáv** (`--ion-color-medium` alap,
`--ion-color-success` ha `isSuccess`, `--ion-color-danger` ha nem — `[class.attempt-card--success]`
/ `[class.attempt-card--fail]`), és a kártyafejléc (`ion-item:first-child`, a meglévő „N. kísérlet"
+ siker-toggle) halványan tintázott + félkövér. Tisztán CSS, komponensenkénti `styles:` tömb
(a `shopping-list-editor` #67 mintája), nincs adatmodell-változás, OnPush-kompatibilis. Az
`outdoor-rope` `.pitch-card` is kapott halvány keretet + behúzást a beágyazott olvashatóságért.
Külön session-részlet nézet nincs (a szerkesztő maga a részlet), a session-lista a közös
`ClimbingSessionListPage`.

- Frissített specek: [[Mászónapló]] (`### UI/UX elvárások`), [[Indoor boulder napló]]
  (`### UI/UX elvárások`). `verifikalt_commit` bump.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #76 kísérlet-kártya (keret + siker-színsáv)
- Kód: 4× `frontend/src/app/pages/workout/climbing/naplo/*-session-edit.page.{ts,html}`
