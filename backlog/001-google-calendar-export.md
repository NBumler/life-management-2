---
id: 1
type: feature
status: deferred
title: Google Calendar export
specs:
  - "[[Google Calendar szinkronizálása]]"
  - "[[Események]]"
flag: feladatok.googleExport
created: 2026-09-02
closed:
---

# 1 — Google Calendar export

## Motiváció / probléma

A `documentation/Subfeatures/Google Calendar szinkronizálása.md` spec kész (egyirányú
export: LM2 → Google Calendar), de az MVP-ből tudatosan kimaradt, és nincs hozzá kód
— csak a `feladatok.googleExport` feature flag létezik (alapból `false`). Ez az
egyetlen `documentation/` feature, aminek nincs implementációja.

A felhasználó döntése (2026-09-02): **egyelőre nem tervezett, később újranyitható.**

## Jelenlegi működés

- `feladatok.googleExport` flag `frontend/src/app/core/config/feature-flags.service.ts`
  + `frontend/src/assets/config/features.json` → `false`.
- Nincs `GoogleCalendarExportService`, nincs `/tabs/tasks/events/google` route/oldal,
  nincs OAuth/PKCE, nincs egyeztető kör, nincs device-local export-állapot tábla.
- `[[Események]]` UI: a „Google export” fejléc-belépő csak akkor látszana, ha a flag be.

## Elfogadási kritériumok

- [ ] Scoping a `Google Calendar szinkronizálása` spec alapján (OAuth-áramlás, egyeztető
      kör, determinisztikus esemény-ID leképezés, device-local export-állapot).
- [ ] `feladatok.googleExport` bekapcsolható, és a teljes áramlás működik natív buildon.
- [ ] A spec `### Jelenlegi működés` szakasza átírva a leszállított viselkedésre.

## Terv / döntési napló

_Elhalasztva. Ha újranyílik: első kérdés, hogy OAuth + backend proxy vagy natív
calendar API — a spec „nem érinti a saját backendet” irányt rögzít._

## Lezáráskor (on-done)

- Frissített specek: [[Google Calendar szinkronizálása]], [[Események]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
