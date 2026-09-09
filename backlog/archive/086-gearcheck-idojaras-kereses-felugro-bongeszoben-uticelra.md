---
id: 86
type: feature
status: done
title: GearCheck — időjárás keresése felugró böngészőablakban az úticélra
specs:
  - "[[GearCheck]]"
  - "[[Pakolás]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 86 — GearCheck — időjárás keresése felugró böngészőablakban az úticélra

## Motiváció / probléma

Pakoláskor / gear check közben hasznos lenne gyorsan megnézni a célállomás időjárását. Ha a
felhasználó megadja az úticélt (pl. „Magas-Tátra"), egy gombbal nyíljon **felugró
böngészőablak** egy Google-kereséssel: `<úticél> időjárás` (pl. „Magas-Tátra időjárás").

Ez a kiindulás — **nincs** app- vagy speciális honlap-integráció, csak egy egyszerű
web-keresés külső böngészőben / in-app browserben.

## Jelenlegi működés

[[Pakolás]] / [[GearCheck]]: a pakolási sessionnek jelenleg nincs „úticél" mezője és nincs
időjárás-belépő. A `@capacitor/browser` plugin nincs a natív felület listájában
([[Frontend]] → Capacitor plugin lista).

## Elfogadási kritériumok

- [x] A pakolási sessionön opcionális `destination` (úticél) szabad szöveg mező. _(Már létezett a
      `#86` előtt — `PackingSession.destination`, session képernyő úticél-szerkesztő.)_
- [x] „Időjárás" gomb: megnyit egy böngészőt a
      `https://www.google.com/search?q=<encodeURIComponent(destination + ' időjárás')>` URL-lel.
      (`weather-search.ts` → `weatherSearchUrl`.)
- [x] Natív: `@capacitor/browser` (in-app / rendszer-böngésző); web: új tab.
      (`ExternalBrowserService.open` — `Capacitor.isNativePlatform()` ág.)
- [x] Üres úticél → a gomb rejtett. (`@if (canSearchWeather())`, a `destination` input élő
      tükör-signaljából.)
- [x] Nincs külső API-hívás, nincs kulcs, nincs adattárolás az időjárásról.
- [x] `#### Backend-offline`: a mező + a gomb offline is látszik; a böngésző-megnyitás értelemszerűen
      hálózatot igényel, de a feature többi része (pakolás) offline változatlan. Lásd
      [[Backend-offline first]]. ([[Pakolás]] + [[GearCheck]] Backend-offline szakaszok.)

## Terv / döntési napló

_A nyelv / lokalizáció a keresőszóban: egyelőre fix magyar „időjárás". Később a
[[Nyelv választás]] aktuális nyelvéből is jöhet. Az úticél tárolása a `PackingSession`-ön
(OpenAPI + `SCHEMA_Vn`) vs. tisztán kliens-lokális draft — döntés a scopingban; a perzisztált
mező a jobb, mert több eszközön is látszik._

**Lezáráskori döntések:**

- A `PackingSession.destination` mező + a session képernyő úticél-szerkesztője **már készen volt**
  egy korábbi körből (a `Pakolás.md` spec is dokumentálta) — a `#86` scope tisztán az „Időjárás"
  belépőre szűkült: nincs backend / migráció / OpenAPI / `SCHEMA_Vn` változás.
- A böngésző-megnyitás egy általános `core/config/ExternalBrowserService`-be került (nem a
  pakolás-oldal privát metódusaként), hogy a jövőbeli külső-URL igények is ezt használják.
- A keresőszó fix magyar „időjárás" (a ticket szerint); a lokalizált változat külön jegy tárgya.
- `@capacitor/browser` `8.0.4`-re **pontos verzióra** pinelve (a `@capacitor/haptics` / `keyboard`
  / `status-bar` mintájára); `npx cap sync android` frissítette a generált
  `capacitor.settings.gradle` / `capacitor.build.gradle` fájlokat.

## Lezáráskor (on-done)

- Frissített specek:
  - [[Pakolás]] — új `#### Időjárás belépő` szakasz, UI/UX + Architektúra/Frontend +
    `#### Backend-offline` jegyzet; stamp `efbf7ae`.
  - [[GearCheck]] — `#### Backend-offline` böngésző-megnyitás jegyzet; stamp `efbf7ae`.
  - [[Frontend]] — Capacitor plugin tábla: `@capacitor/browser` sor; stamp `efbf7ae`.
- `IMPLEMENTATION_STATUS.md` sor: `2026-09-09 — #86` (a `## Lezárt jegyek` tetején).
- Kód:
  - `frontend/src/app/core/config/external-browser.service.ts` (+ `.spec.ts`) — `ExternalBrowserService.open(url)`.
  - `frontend/src/app/pages/menu/gear/sessions/weather-search.ts` (+ `.spec.ts`) — `weatherSearchUrl(destination)`.
  - `frontend/src/app/pages/menu/gear/sessions/packing-session-detail.page.{ts,html}` — „Időjárás" gomb,
    `destinationValue` tükör-signal, `canSearchWeather`, `openWeatherSearch`; `.spec.ts` +3 eset.
  - `frontend/src/assets/i18n/{hu,en}.json` — `GEAR.PACKING.WEATHER_BUTTON`.
  - `frontend/package.json` + `package-lock.json` — `@capacitor/browser@8.0.4`;
    `frontend/android/capacitor.settings.gradle` + `android/app/capacitor.build.gradle` (`npx cap sync`).
- Zöld kapu: FE lint ✓ · `test:ci` **1654 SUCCESS** ✓ · build ✓ (csak a meglévő NG8113 TabsPage warning) ·
  `verify:outbox` **v6 / 36 entity** változatlan ✓ · backend `./gradlew test` ✓ (nincs backend változás).
