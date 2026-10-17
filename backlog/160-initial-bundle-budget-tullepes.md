---
id: 160
type: change-request
status: backlog
title: Initial bundle 2 MB budget-túllépés (+3 kB) — vizsgálat és döntés
specs:
  - "[[Frontend]]"
flag:
created: 2026-10-17
closed:
---

# 160 — Initial bundle 2 MB budget-túllépés (+3 kB) — vizsgálat és döntés

## Motiváció / probléma

`npm run build` (production) warning:

```
▲ [WARNING] bundle initial exceeded maximum budget. Budget 2.00 MB was not met by 3.06 kB with a total of 2.00 MB.
```

Az `angular.json` budget (`maximumWarning: 2mb`, `maximumError: 5mb`) a scaffold óta
változatlan; az initial méret most lépte át a küszöböt, tehát minden további feature-rel
nőni fog a túllépés, és a warning „megszokottá” válik.

## Jelenlegi működés

Initial total 2.00 MB raw / ~344 kB transfer. Legnagyobb initial chunkok (2026-10-17):

- ~1.14 MB — túlnyomórészt `@ionic/core` / Stencil komponensek (+ ngx-translate),
- ~393 kB — Capacitor plugin-proxyk (SecureStorage stb.) és app core,
- `main` 149 kB, `styles` 112 kB.

A MapLibre (`tura-page`, 859 kB) már lazy chunk, nem az initialban van.

## Elfogadási kritériumok

- [ ] `ng build --stats-json` + bundle-elemzés (esbuild metafile / source-map-explorer):
      mi került eagerly az initialba, ami lazy lehetne (root/tabs szinten eagerly importált
      Ionic komponensek, nehéz függőségű eager service-ek stb.).
- [ ] Döntés rögzítve a „Terv” szakaszban: vagy (a) az initial 2 MB alá csökkentve, vagy
      (b) a budget tudatosan, indoklással emelve (natív appnál a letöltési méret kevésbé
      kritikus, a web build viszont online-only).
- [ ] `npm run build` budget-warning nélkül.

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]] — build/bundle szakasz, ha a budget-szabály változik
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: `frontend/angular.json` / érintett lazy route-ok
