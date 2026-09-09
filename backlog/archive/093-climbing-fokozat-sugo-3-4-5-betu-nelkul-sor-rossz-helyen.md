---
id: 93
type: bug
status: done
title: Mászás — a fokozat-súgóban a „3, 4, 5 betű nélkül is jó; 6-tól kötelező a betű" sor rossz kontextusban van
specs:
  - "[[Nehézségi szint skálája]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 93 — Mászás — a fokozat-súgóban a „3, 4, 5 betű nélkül is jó; 6-tól kötelező a betű" sor rossz kontextusban van

## Motiváció / probléma

A fokozat-beviteli súgó (`AlertController` modal) **legvégén** ott van egy sor:
„A 3, 4, 5 betű nélkül is jó; 6-tól kötelező a betű". A közvetlenül előtte lévő szöveg az
**UIAA** skáláról szól — így úgy néz ki, mintha az UIAA-hoz tartozna, pedig valójában a
**francia / Font** jelölés szabálya (`3`/`4`/`5` betű nélkül is érvényes grade, `6a`-tól
kötelező a betű). Rossz helyen / rossz szakaszhoz rendelve jelenik meg.

## Jelenlegi működés

[[Nehézségi szint skálája]] → `### UI/UX elvárások` 2. pont: „Fallback: `3`/`4`/`5` VALID
Francia default … `6`-tól felfelé minden csupasz szám … INVALID amíg nincs chip-választás —
francia/Font jelölésben 6-tól kötelező a betű". A súgó modal a skálákat + példákat sorolja
(`SHARED.GRADE_INPUT.HELP_*`); a záró sor a francia/Font betű-szabály, de a modalban az UIAA
blokk után áll, elkülönítés nélkül.

## Elfogadási kritériumok

- [ ] A „3, 4, 5 betű nélkül is jó; 6-tól kötelező a betű" sor a súgóban egyértelműen a
      **francia (és Font)** skálához van rendelve — vagy a francia blokk alá kerül, vagy külön
      „Csupasz szám" alcím alá, nem az UIAA után lógva.
- [ ] hu + en szöveg is javítva; a `SHARED.GRADE_INPUT.HELP_*` kulcsok rendezése egyértelmű.
- [ ] A modal tartalma egyébként változatlan (skálák, példák).

## Terv / döntési napló

_Tisztán szöveg / sorrend a súgó modalban; nincs logikai változás. Scoping: a
`grade-input` komponens `HELP_*` kulcs-összeállítása._

## Lezáráskor (on-done)

Csak i18n szöveg: a `SHARED.GRADE_INPUT.HELP_ROPE` / `HELP_BOULDER` kulcsokban a „3, 4, 5 betű
nélkül is érvényes; 6-tól kötelező a betű" mondat a **francia / Font** példamondat mögé került
(kötőjellel), nem a string végére az UIAA rész után. hu + en. A `HELP_TITLE` és a többi rész
változatlan; a `grade-input` komponens kódja nem változott.

- Frissített specek: [[Nehézségi szint skálája]] `## Architektúra > Frontend` — súgó modal
  mondatrend jegyzet
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-09 — #93 fokozat-súgó mondatrend (i18n)
- Kód: `frontend/src/assets/i18n/{hu,en}.json`. Zöld gate ✓.
