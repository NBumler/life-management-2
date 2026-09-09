---
id: 90
type: bug
status: backlog
title: Mászás — a szektorok listájában a tájolás (aspect) felirata nincs lefordítva
specs:
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles admin]]"
  - "[[Nyelv választás]]"
flag:
created: 2026-09-09
closed:
---

# 90 — Mászás — a szektorok listájában a tájolás (aspect) felirata nincs lefordítva

## Motiváció / probléma

A szektorok admin listájában az egyes sorok alatt megjelenik a tájolás (`aspect` / fekvés),
de az érték **nyers enum-kódként** (`N`, `NE`, … vagy angol szó) látszik, nincs átvezetve a
[[Nyelv választás]] fordításokon — a lista többi része le van fordítva.

## Jelenlegi működés

[[Outdoor boulder admin]] (`backlog/068` nyomán): `aspect` = 8 irányú égtáj-enum (`N`..`NW`),
a `Sector` szerkesztőn `app-aspect-picker` választja. A picker maga használ i18n kulcsokat
(`SHARED.ASPECT_PICKER.*`), de a **szektor-lista sor** feltehetően a nyers token-értéket írja
ki fordítás nélkül.

## Elfogadási kritériumok

- [ ] A szektor-lista sorban a tájolás a lokalizált égtáj-névvel / rövidítéssel jelenik meg
      (hu + en), a `SHARED.ASPECT_PICKER.*` (vagy dedikált) kulcsokból.
- [ ] Üres / `null` aspect → nincs kilógó „—" vagy nyers `null`; a sor tájolás nélkül rendben.
- [ ] Ellenőrzés minden helyen, ahol az `aspect` sorként megjelenik (outdoor boulder + outdoor
      köteles szektor-lista, és ahol a Route/napló mutatja).
- [ ] Nincs hiányzó fordítási kulcs — `npm run` i18n ellenőrzés zöld
      ([[015-nyelv-valasztas-missingtranslationhandler-hianyzo-kulcs-dev-warn]] mintája).

## Terv / döntési napló

_Scoping: a szektor-lista template-jében a `sector.defaultAspect` interpoláció helyett
`{{ ('SHARED.ASPECT_PICKER.' + sector.defaultAspect) | translate }}` (vagy egy label-map pipe)._

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor boulder admin]] / [[Outdoor köteles admin]] `### UI/UX elvárások`
  (ha pontosítást igényel)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `pages/workout/climbing/admin/*sector*` template + `assets/i18n/{hu,en}.json`
