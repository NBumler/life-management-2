---
id: 157
type: bug
status: done
title: Két ikon hiányzik az ikon-registryből (élő mászás banner, pakolás időjárás)
specs:
  - "[[Mászónapló]]"
  - "[[Pakolás]]"
  - "[[Frontend]]"
flag:
created: 2026-10-17
closed: 2026-10-17
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

- [x] `radioButtonOnOutline` és `partlySunnyOutline` import + regisztráció a `core/config/icons.ts`-ben.
- [x] Regressziós védelem: egy spec, ami a `src/app` alatti literál ikonneveket összeveti a
      registryvel, **vagy** a [[158-karma-tesztek-ionicons-warning-zaj]] szerinti
      „ismeretlen ikon → teszthiba” mechanizmus.
- [x] Mindkét képernyőn látható az ikon (böngésző / készülék).

## Terv / döntési napló

A regressziós védelem a #158 „ismeretlen ikon → teszthiba” őre lett (nem statikus grep-spec). Ellenőrizve:
az `add-outline` ideiglenes kivételével 104 spec bukott. Korlát: csak spec-lefedett sablont véd — a
`climbing-live-banner` komponensnek nincs specje.

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]] — „Kötelező elvek”: új szabály, minden ion-icon szerepel a registryben (+ teszt-őr). [[Mászónapló]] / [[Pakolás]] viselkedés-leírása nem változott (vizuális hiba volt).
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — két hiányzó ikon regisztrálva
- Kód: `frontend/src/app/core/config/icons.ts`
