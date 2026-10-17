---
id: 160
type: change-request
status: done
title: Initial bundle 2 MB budget-túllépés (+3 kB) — vizsgálat és döntés
specs:
  - "[[Frontend]]"
flag:
created: 2026-10-17
closed: 2026-10-17
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

- [x] `ng build --stats-json` + bundle-elemzés (esbuild metafile / source-map-explorer):
      mi került eagerly az initialba, ami lazy lehetne (root/tabs szinten eagerly importált
      Ionic komponensek, nehéz függőségű eager service-ek stb.).
- [x] Döntés rögzítve a „Terv” szakaszban: vagy (a) az initial 2 MB alá csökkentve, vagy
      (b) a budget tudatosan, indoklással emelve (natív appnál a letöltési méret kevésbé
      kritikus, a web build viszont online-only).
- [x] `npm run build` budget-warning nélkül.

## Terv / döntési napló

Elemzés (`ng build --stats-json`, esbuild metafile, initial ~1.86 MB a main+polyfills statikus
import-zárta): `@ionic/core` ~764 kB, `@angular/*` ~280 kB, `@ionic/angular` ~84 kB, app core
(`local-rows` 109 kB, `sqlite-storage-backend` 74 kB, `local-database` 39 kB, `sync-engine` 32 kB, ~30
generált API service ~150 kB). Az `@ionic/angular/standalone` statikusan behúzza az ion-input / textarea
/ select / toggle / searchbar komponenseket (nem a mi importunk). **Nincs eager page/feature-komponens**
— minden route lazy. A core a natív bootstrapkor kell (SyncEngine). **Döntés: (b)** — warning `2mb` →
`2.5mb`, error marad `5mb`.

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]] — Stack: „Bundle budget” bekezdés (2.5mb warning, indoklás)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — initial budget tudatosan emelve
- Kód: `frontend/angular.json`
