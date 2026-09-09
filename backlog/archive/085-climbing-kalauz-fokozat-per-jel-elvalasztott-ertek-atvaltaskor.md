---
id: 85
type: change-request
status: done
title: Mászás — a kalauz-fokozat „/"-elválasztott értékének (pl. VIII/VIII+) kezelése átváltáskor
specs:
  - "[[Nehézségi szint skálája]]"
  - "[[Nehézségi szint skálája (konverziós mátrix)]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 85 — Mászás — a kalauz-fokozat „/"-elválasztott értékének (pl. VIII/VIII+) kezelése átváltáskor

## Motiváció / probléma

A kalauz (topó / felmászókönyv) fokozat gyakran tartomány-jelöléssel érkezik: `VIII/VIII+`,
`6c/6c+`, `7a/+`. A `guidebookGrade` **szándékosan validálás nélküli szabad string** — és ez így
is marad. A kérdés csak az: amikor a fokozatot **átváltjuk** a belső indexre, mit kezdjünk a `/`
karakterrel.

## Jelenlegi működés

[[Nehézségi szint skálája]]: a parser (`shared/climbing/grade-scale.ts`) egy skála pontos regex-ét
várta; a `/`-et tartalmazó string `UNKNOWN`-ba esett (`?` badge), és **nem** volt
`absoluteDifficultyIndex`. Egy `Route` / `BoulderProblem` kiválasztásakor a `userRawInput` a
topó-fokozattal töltődik — ha az `VIII/VIII+`, a mező érvénytelen maradt, amíg a user kézzel át nem
írja.

## Elfogadási kritériumok

- [x] `guidebookGrade` marad validálatlan szabad string — nincs bevitel-oldali kényszer.
- [x] Döntés: **(c)** a két végpont mátrix-indexének **átlaga / közepe `floor`-ral** — konzisztens a
      szín-sáv `colorBandMidIndex` mintával. Egy szabály (jelenleg csak kliens; `backlog/024`-ig
      nincs backend grade-parser, amivel paritásba kellene hozni).
- [x] A parser felismeri a `<grade>/<grade>` és a rövidített `<grade>/<+/->` (`7a/+`, `VIII/+`),
      illetve `<grade>/<al-betű>` (`6a/b`) alakokat **ugyanabban a skálában**; kevert skála / hiányos
      / több `/` → marad `UNKNOWN`.
- [x] Az út-pickerből előtöltött `userRawInput` nem esik `INVALID`-ba `/`-es topó-fokozatnál — a
      levezetett index a fenti szabály szerint áll elő, a nyers szöveg megmarad.
- [x] Teszt-lefedettség: `grade-scale.spec.ts` új `describe` blokk edge-esetekkel (azonos skála,
      rövidítés-kibontás, tér a `/` körül, kevert/hiányos → `UNKNOWN`, off-matrix végpont fallback).
- [x] A [[Nehézségi szint skálája (konverziós mátrix)]] dokumentálja a `/`-feloldás szabályát.

## Terv / döntési napló

- `grade-scale.ts` új `parseSlashRange(normalized, discipline)` — a `parseGrade` az `EMPTY` check
  után, ha a `normalized` `/`-et tartalmaz, ezt hívja. Mindkét végpontnak egy skálában kell
  értelmezhetőnek lennie (bal oldal dönt, rövidített jobb oldal örökli); `Math.floor((a+b)/2)`; ha
  csak az egyik végpont van a mátrixban, az az index; egyik sem → `UNKNOWN`.
- **Nincs shared fixture / Java oldal:** a `climbing-grade-matrix.ts` a kód saját, dokumentált
  döntése szerint client-only (nincs Java fogyasztó, amíg `backlog/024` nem landol). A `/`-szabály a
  mátrix-táblával együtt kerül át a megosztott fixture-be, ha `024` elkészül — ez a mátrix-spec
  `### Backend` szakaszában rögzítve.

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája]] (`#### „/"-elválasztott kalauz-tartomány`),
  [[Nehézségi szint skálája (konverziós mátrix)]] (feloldás szabály + `024` átemelési megjegyzés),
  [[Mászónapló]] (`userRawInput` előtöltés). Stamp: `verifikalva: 2026-09-09`,
  `verifikalt_commit: b03e284`.
- `IMPLEMENTATION_STATUS.md`: `2026-09-09 — #85` sor.
- Kód: `frontend/src/app/shared/climbing/grade-scale.ts` (`parseSlashRange`) + `grade-scale.spec.ts`
  (6 új eset).
- Green gate: lint ✓ · `test:ci` ✓ · build ✓ · `verify:outbox` ✓.
