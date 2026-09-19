---
id: 115
type: feature
status: done
title: Színsáv szerkesztő — hex szín input mellé színválasztó (color picker) gomb
specs:
  - "[[Indoor boulder admin]]"
flag:
created: 2026-09-19
closed: 2026-09-20
---

# 115 — Színsáv szerkesztő — hex szín input mellé színválasztó (color picker) gomb

## Motiváció / probléma

Színsáv (`GymColorBand`) hozzáadásakor/szerkesztésekor a `hexColor` mező jelenleg csak sima
szöveges `ion-input` — a user fejből kell hogy tudja/beírja a hex kódot. Ergonomikusabb lenne,
ha a kézi beírás mellett egy vizuális színválasztóból is ki lehetne választani a színt.

## Jelenlegi működés

`frontend/src/app/pages/workout/climbing/admin/gym-color-band-edit.page.html` —
`formControlName="hexColor"` egyszerű `ion-input`, validáció + ütközés-ellenőrzés
(`HEX_INVALID` / `HEX_CONFLICT`) a kanonikus hex-normalizáció szerint
([[Indoor boulder admin]] `GymColorBand.hexColor`, [[Névegyediség]]). Nincs semmilyen vizuális
színválasztó.

Az appban már van minta „input végén záró gomb, ami egy külön UI-t nyit meg" mintára: a
súgó-gomb (`shared/help-input/` — `app-help-input`: `ion-input` + záró `slot="end"` ikon-gomb,
ami egy `AlertController` modalt nyit).

## Elfogadási kritériumok

- [x] A `hexColor` `ion-input` `slot="end"` pozíciójában egy gomb nyisson egy natív
      `<input type="color">`-t (vagy azzal ekvivalens vizuális színpalettát); a kiválasztott
      szín visszaírja a `hexColor` form-mezőt a projekt kanonikus hex-formátumában
      (`#rrggbb`, kisbetűs — [[Névegyediség]]).
- [x] A kézi szöveges beírás továbbra is működik, változatlan validációval
      (`HEX_INVALID` / `HEX_CONFLICT`).
- [x] A gomb webes build alatt is működik (nincs Capacitor-plugin függősége — `input[type=color]`
      natívan támogatott böngészőkben/WebView-ban).
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

A natív `input[type=color]`-t választottuk (nem egyéni SVG-paletta komponenst) — nulla új
dependency, offline-safe, és a webes buildet is kiszolgálja Capacitor-plugin nélkül. A rejtett
`input[type=color]`-t egy `slot="end"` `ion-button` `.click()`-eli nyitja (ugyanaz a `slot="end"`
gomb-minta, mint a súgó-gomb `shared/help-input/`-ban). Amíg a szöveges mező nem érvényes
6-jegyű hex, a paletta gomb egy semleges szürke (`#888888`) mintaszínnel nyílik, hogy a natív
picker mindig érvényes kezdőértékkel induljon.

## Lezáráskor (on-done)

- Frissített specek: [[Indoor boulder admin]] — `hexColor` UI-leírás kiegészítve a paletta-gombbal
  (`### UI/UX elvárások`); `verifikalt_commit` bump
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-20 — #115 színsáv hex mező mellé natív színválasztó gomb
- Kód: `frontend/src/app/pages/workout/climbing/admin/gym-color-band-edit.page.{html,ts,spec.ts}`,
  `frontend/src/app/core/config/icons.ts` (`color-palette-outline` regisztrálása); nincs
  outbox/backend hatás
