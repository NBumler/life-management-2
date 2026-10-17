---
id: 157
type: bug
status: ready
title: Két ikon hiányzik az ikon-registryből (élő mászás banner, pakolás időjárás)
specs:
  - "[[Mászónapló]]"
  - "[[Pakolás]]"
  - "[[Frontend]]"
flag:
created: 2026-10-17
closed:
---

# 157 — Két ikon hiányzik az ikon-registryből (élő mászás banner, pakolás időjárás)

## Motiváció / probléma

A `test:ci` futás Ionicons-warningjainak átnézésekor derült ki (ld. [[158-karma-tesztek-ionicons-warning-zaj]]):
az app csak a `core/config/icons.ts` `registerIcons()`-ban felsorolt ikonokat tudja
megjeleníteni (`addIcons`, nincs CDN/asset fallback). Két, sablonban literálként használt
ikon nincs a listában, így a készüléken **üres helyként** renderelődik, konzolon
`[Ionicons Warning]: Could not load icon with name "…"` mellett.

## Jelenlegi működés

- `radio-button-on-outline` — `pages/workout/climbing/climbing-live-banner.component.ts:20`
  (élő mászás banner piros „felvétel” pöttye) — nincs regisztrálva.
- `partly-sunny-outline` — `pages/menu/gear/sessions/packing-session-detail.page.html:23`
  (pakolás session időjárás sor) — nincs regisztrálva.

A többi literál ikonnév (`name="…"`, `icon: '…'`, `'…-outline'`) mind szerepel a registryben
(2026-10-17-i grep-összevetés).

## Elfogadási kritériumok

- [ ] `radioButtonOnOutline` és `partlySunnyOutline` import + regisztráció a `core/config/icons.ts`-ben.
- [ ] Regressziós védelem: egy spec, ami a `src/app` alatti literál ikonneveket összeveti a
      registryvel, **vagy** a [[158-karma-tesztek-ionicons-warning-zaj]] szerinti
      „ismeretlen ikon → teszthiba” mechanizmus.
- [ ] Mindkét képernyőn látható az ikon (böngésző / készülék).

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: [[…]] — …
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: `frontend/src/app/core/config/icons.ts`
