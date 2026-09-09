---
id: 90
type: bug
status: done
title: Mászás — a szektorok listájában a tájolás (aspect) felirata nincs lefordítva
specs:
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-09
closed: 2026-09-09
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

A `crag-edit.page.html` szektor-sora a nyers `sector.defaultAspect` tokent írta ki
(`<p>{{ sector.defaultAspect }}</p>`). Javítás: `{{ 'SHARED.ASPECT_PICKER.FULL.' + sector.defaultAspect | translate }}`
— a már meglévő `app-aspect-picker` fordítási kulcsokat használja (nincs új i18n kulcs).
A `V34` migráció óta a `defaultAspect` mindig valid `N..NW` token vagy `null`, a `@if` guard a
`null`-t kiszűri.

- Frissített specek: [[Outdoor boulder admin]] / [[Outdoor köteles admin]] — szektor-lista a
  lokalizált égtáj-nevet mutatja
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-09 — #90 szektor-lista aspect i18n
- Kód: `frontend/src/app/pages/workout/climbing/admin/crag-edit.page.html`. Zöld gate ✓.
