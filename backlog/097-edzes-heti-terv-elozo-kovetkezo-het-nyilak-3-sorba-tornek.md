---
id: 97
type: bug
status: backlog
title: Edzés / Heti terv — az előző/következő hét nyilak és a hét-felirat 3 külön sorba törnek (UI bug)
specs:
  - "[[Heti terv]]"
flag:
created: 2026-09-09
closed:
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

- Frissített specek: [[Heti terv]] `### UI/UX elvárások` (ha a navigátor elrendezését rögzítjük)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `pages/workout/weekly-plan/*.{html,scss}`
