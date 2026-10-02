---
id: 152
type: change-request
status: done
title: V-skála — a VB (V-Basic) fokozat elfogadása boulder nehézségként
specs:
  - "[[Nehézségi szint skálája]]"
  - "[[Nehézségi szint skálája (konverziós mátrix)]]"
flag:
created: 2026-10-02
closed: 2026-10-02
---

# 152 — V-skála — a VB (V-Basic) fokozat elfogadása boulder nehézségként

## Motiváció / probléma

Felhasználói észrevétel: boulder nehézség megadásakor a V-skála nem fogadja el a `VB`-t. A `VB`
(„V-Basic”, néha „V-easy”) valós, széles körben használt Hueco-fokozat a `V0` alatt — sok terem és
topó a legkönnyebb bouldereket így jelöli. Az app ma `UNKNOWN`-nak (érvénytelennek) minősíti.

Nem bug a szó szoros értelmében: a spec maga is `V0…V17`-et rögzít, az implementáció ezt követi —
ezért `change-request`.

## Jelenlegi működés

- [[Nehézségi szint skálája]] „V-skála (Hueco): `V` + szám (`V0`…`V17`)”.
- `frontend/src/app/shared/climbing/grade-scale.ts` — a V-skála felismerő regex `/^V\d+$/`, így a
  `VB` nem illeszkedik.
- `frontend/src/app/shared/climbing/climbing-grade-matrix.ts` — `V_SCALE` tábla `V0: 10`-től indul,
  `VB` sor nincs. A [[Nehézségi szint skálája (konverziós mátrix)]] anchor táblájában sincs.

## Elfogadási kritériumok

- [x] `VB` (és kisbetűs `vb`, normalizálva `VB`-re) érvényes V-skála címke boulder diszciplínában
      (`VALID`, egyértelmű — nem ütközik más skálával).
- [x] A konverziós mátrixban `VB` kap `absoluteDifficultyIndex`-et a `V0` alatt (javaslat: `8`, a
      V-skála 2-es lépésközét tartva), így statisztikák / skálák közti átváltás működik.
- [x] ~~Ha a backend is validál / tárol V-skála címkét vagy indexet, paritás (fixture-sor a
      `shared/fixtures/` alatt, ha a grade-normalizálás ott paritás-tesztelt).~~ Tárgytalan: a backend nem ismeri a V-skálát (az `absoluteDifficultyIndex`-et verbatim tárolja), és a grade-mátrix nincs `shared/fixtures/` paritásban (`backlog/024`).
- [x] Range-parse (`VB/V0`) működik a backlog/085 topó-tartomány logikával.
- [x] Minden, a V-skálát felsoroló UI-szöveg frissítve: input hint / placeholder / label, és a
      nehézség-mező súgó ikonja (`app-help-button` / `HelpInputComponent`) szövege is `VB, V0…V17`-et
      mondjon — hu + en i18n.
- [x] Spec frissítve: `VB`, `V0`…`V17`; anchor tábla kiegészítve.
- [x] Unit tesztek: `grade-scale.spec.ts`, `climbing-grade-matrix.spec.ts`.

## Terv / döntési napló

_Megfigyelés a scopinghoz:_ a mátrixban `FONT '3': 10` és `V_SCALE V0: 10` azonos indexen áll,
miközben a spec anchor táblája a 10-es sorban Font `4`-et mutat. Implementáláskor érdemes a Font
alsó tartományát is egyeztetni, hogy a `VB` index ne üssön el a Font párjától (a `VB` jellemzően
~Font 3 körüli).

**Megvalósítás (2026-10-02):** `VB` index = `8` (egy V-lépésköz a `V0` alatt). A Font alsó
tartomány (`FONT '3': 10` = `V0`) egyeztetése nem történt meg — a jegy scope-ján kívül esik, a
`VB` a V-skálán belül szigorúan növekvő marad. A boulder-súgó (`SHARED.GRADE_INPUT.HELP_BOULDER`)
az egyetlen UI-szöveg, ami a V-skála fokozatait felsorolja; más hint / placeholder / label nem
említ konkrét V-fokozatot.

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája]] — Boulder skálák + regex: `VB`;
  [[Nehézségi szint skálája (konverziós mátrix)]] — anchor tábla `8 | VB` sor + megjegyzés
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-02 — #152 V-skála VB fokozat
- Kód: `shared/climbing/grade-scale.ts`, `shared/climbing/climbing-grade-matrix.ts`, i18n `hu.json` / `en.json`
