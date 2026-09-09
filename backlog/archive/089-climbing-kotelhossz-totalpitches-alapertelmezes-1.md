---
id: 89
type: change-request
status: done
title: Mászás — a kötélhossz (totalPitches) alapértelmezett értéke legyen 1
specs:
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 89 — Mászás — a kötélhossz (totalPitches) alapértelmezett értéke legyen 1

## Motiváció / probléma

Egy köteles út túlnyomó része egy kötélhossz. Az út felvételekor a kötélhossz-mező
(`totalPitches`) legyen **alapból 1-re előtöltve**, hogy a gyakori esetben ne kelljen kézzel
beírni; többhosszos útnál a user átállítja.

## Jelenlegi működés

[[Outdoor köteles admin]] `Route`: `totalPitches` mező (a [[070]] / [[079]] jegyekben már
felsorolt Route-mezők közt). Az alapértelmezett érték a specben nincs kikötve — jelenleg
üresen indul.

## Elfogadási kritériumok

- [ ] Új `Route` szerkesztőben a `totalPitches` mező kezdőértéke `1`.
- [ ] Meglévő, `null` / üres `totalPitches`-ű utak megjelenítése: `1`-ként értelmezve (vagy
      egyszeri backfill `V<n>` migrációval — döntés a scopingban; a megjelenítési fallback
      elég is lehet).
- [ ] A `PitchLog` opcionális lista logikája változatlan ([[Outdoor köteles napló]]): 1 hossznál
      nem kötelező pitch-sor.
- [ ] Nem uniqueness / validációs változás, csak default; `≥ 1` szabály marad.

## Terv / döntési napló

_Legegyszerűbb: kliensoldali form-default `1` + megjelenítési fallback `totalPitches ?? 1`.
Adatmigráció csak akkor, ha valahol a nyers `null` megkülönböztethető kell legyen az `1`-től —
jelenleg nem tűnik annak._

## Lezáráskor (on-done)

Tisztán kliensoldali: a `route-edit` form `totalPitches` kontrollja `null` helyett `1`-gyel
indul, és meglévő Route betöltésekor `existing.totalPitches ?? 1` a megjelenítési fallback.
Nincs migráció / séma / backend hatás; a `≥ 1` validáció változatlan.

- Frissített specek: [[Outdoor köteles admin]] (`Route` mezőtábla — `totalPitches` default 1)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-09 — #89 `totalPitches` form-default 1
- Kód: `frontend/src/app/pages/workout/climbing/admin/route-edit.page.ts`. Zöld gate ✓.
