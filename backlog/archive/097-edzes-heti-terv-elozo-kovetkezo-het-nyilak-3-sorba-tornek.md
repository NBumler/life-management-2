---
id: 97
type: bug
status: done
title: Edzés / Heti terv — az előző/következő hét nyilak és a hét-felirat 3 külön sorba törnek (UI bug)
specs:
  - "[[Heti terv]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 97 — Edzés / Heti terv — az előző/következő hét nyilak és a hét-felirat 3 külön sorba törnek (UI bug)

## Motiváció / probléma

A Heti terv komponens tetején az aktuális hét felirata + „előző hét" nyíl + „következő hét"
nyíl **nem egy sorban** jelenik meg, hanem 3 külön sorban (nyíl / hét-szöveg / nyíl egymás
alatt). Hibás layout — egy sorban kellene lennie, a nyilak a szöveg két oldalán.

## Jelenlegi működés

[[Heti terv]]: „**Másolás következő hétre**" + heti dashboard slot szerkesztés; a hét-navigátor
(`weekStartDate` léptetés) a képernyő tetején. A spec a navigátor pontos elrendezését nem
részletezi; az implementáció flex/rács hibából tördel.

## Elfogadási kritériumok

- [ ] A hét-navigátor egy sorban: `[‹]  2026. 37. hét  [›]` — a nyilak a felirat két szélén.
- [ ] Kis kijelzőn se törik; hosszú hét-felirat esetén a szöveg ellipszisezik / zsugorodik,
      a nyilak láthatók maradnak.
- [ ] Tap-célok elég nagyok (≥ 44px), a nyilak `aria-label`-ezettek (előző/következő hét).
- [ ] Mindkét témában rendben (világos/sötét).

## Terv / döntési napló

_Scoping: a `weekly-plan` page template — feltehetően egy `ion-toolbar` / `div` `display:flex`
`justify-content: space-between` helyett blokk-elemek. Tiszta CSS/template javítás._

## Lezáráskor (on-done)

A hét-navigátor `<div>`-je stílus nélküli volt; a benne lévő két `<ion-buttons>` blokk-szintű
flex-hoszt, ezért három sorba tördelt. Javítás: a `div` külön `.week-nav` osztályt kap, hozzá
egy scoped `styles:` blokk (`display: flex; align-items: center`), a középső hét-felirat gomb
`flex: 1`-gyel a nyilak közé feszül. Tiszta template + CSS.

- Frissített specek: [[Heti terv]] `### UI/UX elvárások` — hét-navigátor egy sorban
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-09 — #97 Heti terv hét-navigátor egy sorban
- Kód: `frontend/src/app/pages/workout/weekly-plan/weekly-plan.page.{html,ts}`. Zöld gate ✓.
