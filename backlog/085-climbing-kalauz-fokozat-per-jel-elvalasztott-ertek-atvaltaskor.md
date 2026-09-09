---
id: 85
type: change-request
status: backlog
title: Mászás — a kalauz-fokozat „/"-elválasztott értékének (pl. VIII/VIII+) kezelése átváltáskor
specs:
  - "[[Nehézségi szint skálája]]"
  - "[[Nehézségi szint skálája (konverziós mátrix)]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-09
closed:
---

# 85 — Mászás — a kalauz-fokozat „/"-elválasztott értékének (pl. VIII/VIII+) kezelése átváltáskor

## Motiváció / probléma

A kalauz (topó / felmászókönyv) fokozat gyakran tartomány-jelöléssel érkezik: `VIII/VIII+`,
`6c/6c+`, `7a/+`. A `guidebookGrade` **szándékosan validálás nélküli szabad string** — és ez így
is marad, mert nem tudhatjuk, melyik topó mit ír le. A kérdés csak az: amikor a fokozatot
**átváltjuk** a belső indexre / a normalizált skálára, mit kezdjünk a `/` karakterrel.

A felhasználó a kísérletnél magától a megfelelő konkrét fokozatra írja át — tehát nem sürgős, és
nem kötelező automatizmus. De az átváltásnál akár lehetne is kezdeni valamit a `/`-elválasztott
alakkal (pl. a magasabb / alacsonyabb végét venni, vagy a kettő közti indexet).

## Jelenlegi működés

[[Nehézségi szint skálája]]: a parser (`shared/climbing/grade-scale.ts`) egy skála pontos regex-ét
várja; a `/`-et tartalmazó string `UNKNOWN` állapotba esik (`?` badge + súgó), és **nincs**
`absoluteDifficultyIndex`. A `guidebookGrade` verbatim tárolódik ([[Nehézségi szint skálája]] →
`### Backend`). Egy `Route` / `BoulderProblem` kiválasztásakor a `userRawInput` a topó-fokozattal
töltődik — ha az `VIII/VIII+`, a mező érvénytelen, amíg a user kézzel át nem írja.

## Elfogadási kritériumok

- [ ] `guidebookGrade` marad validálatlan szabad string — nincs bevitel-oldali kényszer.
- [ ] Döntés: a `/`-elválasztott alak parse-olásakor (a) a **magasabb** végét vesszük, (b) az
      **alacsonyabb** végét, vagy (c) a két index **átlagát / közepét** (`floor`) — egy szabály,
      kliens + backend paritással.
- [ ] A parser felismeri a `<grade>/<grade>` és `<grade>/<postfix>` (`7a/+`, `VIII/+`) alakokat
      ugyanabban a skálában; kevert skála → marad `UNKNOWN`.
- [ ] Az út-pickerből előtöltött `userRawInput` ne dobja a mezőt `INVALID`-ba, ha a topó-fokozat
      `/`-es — a levezetett index a fenti szabály szerint áll elő, a nyers szöveg megmarad.
- [ ] Parity fixture (`shared/fixtures/…` + Java oldal), edge-esetekkel.
- [ ] A [[Nehézségi szint skálája (konverziós mátrix)]] dokumentálja a `/`-feloldás szabályát.

## Terv / döntési napló

_Javaslat: (c) a két végpont indexének közepe `floor`-ral — konzisztens a szín-sáv
`colorBandMidIndex` mintával. A nyers `guidebookGrade` / `userRawInput` érintetlen; csak a
levezetett `absoluteDifficultyIndex` használja a feloldást._

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája]] (parser: `/`-alak), [[Nehézségi szint skálája
  (konverziós mátrix)]] (feloldás szabály + fixture), [[Mászónapló]] (`userRawInput` előtöltés)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend/src/app/shared/climbing/grade-scale.ts` (+ `.spec.ts` + fixture), backend
  `hu.bumler.lm2.climbing` grade-parity (ha `backlog/024` addigra landolt)
