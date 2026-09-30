---
id: 141
type: feature
status: backlog
title: "Könyök / ín / ujj fájdalom-jelzés a naplóban + „pihentess” figyelmeztetés"
specs:
  - "[[Edzésnapló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-01
closed:
---

# 141 — Fájdalom-jelzés

## Motiváció / probléma

Az edzés-elemzés stop-szabálya (egykezes húzódzkodás, GtG): ha a könyökben vagy az alkarban reggelente tompa,
húzódó fájdalom jelentkezik, azonnal abba kell hagyni a gyakori gyakorlást. A disztális bicepsz-ín
és a pulley sérülése hónapokra kivonhat. Az app ezt ma nem tudja rögzíteni.

## Jelenlegi működés

Nincs fájdalom / sérülés adat; csak szabad szöveges `notes`.

## Elfogadási kritériumok

- [ ] Nyitott: session-szintű mező (edzés + mászás), vagy napi check-in entitás
      (testrész + 0–3 skála). Döntés a scoping során.
- [ ] Ha 2 egymást követő napon ≥ 2 jelzés van ugyanarra a testrészre, a backlog/138
      figyelmeztetései között „pihentetés javasolt” jelenik meg.

## Terv / döntési napló

_Scoping előtt._

## Lezáráskor (on-done)

- Frissített specek: …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
