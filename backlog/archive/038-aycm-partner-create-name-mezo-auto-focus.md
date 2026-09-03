---
id: 38
type: chore
status: done
title: AYCM partner create: name mezo auto-focus
specs:
  - "[[AYCM elfogadóhely hozzáadása]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 38 — AYCM partner create: name mezo auto-focus

## Motiváció / probléma

A spec name auto-focust ir; a aycm-partner-edit.page ion-input-en nincs autofocus / setFocus. Kozmetikai.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

A partner-szerkesztő `name` `ion-input`-ja `[autofocus]="!isEdit"` — create-módban
(`/tabs/menu/aycm/partners/new`, azaz `partnerId() === null`) automatikusan fókuszt kap, meglévő
partner szerkesztésekor nem. Ez a codebase bevett mintája ugyanerre a „create-nél fókusz" igényre
(`food-edit`, `event-edit`, `household-task-edit`, `life-plan-edit`, `recurring-expense-edit`,
`packing-template-editor`, `gear-items`, …).

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
      (`[[AYCM elfogadóhely hozzáadása]]` — `#### CRUD — partner` + UI/UX „Create / edit".)
- [x] Ha „Nem scope” blokkból jött: n/a — a „(auto-focus nincs bekötve — tervezett)" zárójeles
      mondat helyére a megvalósult működés került.

## Terv / döntési napló

- **`[autofocus]` binding**, nem `@ViewChild(IonInput)` + `setFocus()` az `ionViewDidEnter`-ben —
  a projektben nincs egyetlen `setFocus` sem, minden „create-fókusz" képernyő az `[autofocus]`
  attribútum-bindinget használja. Konzisztencia > mikro-optimalizálás egy kozmetikai jegynél.
- **`!isEdit`** a `partnerId() === null` helyett — a `recurring-expense-edit` pontosan ezt az
  `isEdit` gettert használja ugyanígy; a page-en már megvan.
- Új teszt: 2 eset a meglévő `aycm-partner-edit.page.spec.ts`-ben — `debugElement …
  .properties['autofocus']` `true` create-módban, `false` edit-módban.

## Lezáráskor (on-done)

- Frissített specek: [[AYCM elfogadóhely hozzáadása]] (`#### CRUD — partner`, UI/UX „Create / edit")
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #038 AYCM partner-create név-mező auto-focus
- Kód: `frontend` `pages/menu/aycm/aycm-partner-edit.page.html` (+ `.page.spec.ts`)
