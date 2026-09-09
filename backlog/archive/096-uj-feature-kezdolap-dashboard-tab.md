---
id: 96
type: feature
status: done
title: Új feature — Kezdőlap / dashboard tab (a menüsor első eleme)
specs:
  - "[[Frontend]]"
flag: tab.kezdolap
created: 2026-09-09
closed: 2026-09-09
---

# 96 — Új feature — Kezdőlap / dashboard tab (a menüsor első eleme)

## Motiváció / probléma

Legyen egy **Kezdőlap / dashboard** képernyő, ami az alsó tab-sorban az **első** helyre kerül,
és a login utáni alapértelmezett nézet lesz. Ide kerülnek a gyorsgombok / widgetek
([[095-kezdokepernyo-widgetek-gyorsgombok]]) és az áttekintő információk.

## Jelenlegi működés

[[Frontend]] → „Navigáció — tab registry": jelenleg **4 gomb** (Kaja · Edzés · Feladatok · Menü),
config-vezérelt registry-ből. Kifejezetten szerepel: „nincs Dashboard tab" — a
[[Szinkronizációs központ]] régi `/tabs/dashboard/sync` útvonala **elavult**. A login utáni
default tab: Kaja → Étkezés dashboard (`/tabs/food/meals`).

## Elfogadási kritériumok

- [x] Új tab a registry **első** helyén: `Kezdőlap`, route `/tabs/home`, flag `tab.kezdolap`.
- [x] A tab-bar így 5 gombos lehet (Ionic 1–5 gombot elbír — [[Frontend]]); a flag-el
      kikapcsolható, a `Menü` marad a végső mentsvár.
- [x] `featureFlagGuard('tab.kezdolap')` a route-fa tetején; deep link kikapcsolt flagnél →
      következő engedélyezett tab (`firstEnabledTabRoute`).
- [x] Login utáni default tab: Kezdőlap, ha a `tab.kezdolap` engedélyezett; különben a registry
      első engedélyezett tabja (a `''` redirect függvény alakú, `firstEnabledTabRoute`-ot hív;
      a `featureFlagGuard` is erre irányít fix `/tabs/menu` helyett).
- [x] A `SyncStatusButton` a Kezdőlap `ion-toolbar` `end` slotjában is ([[Frontend]] app-shell
      chrome minden tabon).
- [x] `#### Backend-offline`: a kezdőlap kizárólag helyi store-ból / statikus configból renderel,
      Full-offline is teljes értékű. Lásd [[Backend-offline first]].
- [x] [[Frontend]] tab-térkép + route-térkép + flag registry frissítve; új spec [[Kezdőlap]].

## Terv / döntési napló

_A widget-tartalom külön jegy ([[095-kezdokepernyo-widgetek-gyorsgombok]]) — ez a jegy a
tab / route / flag / default-tab vázat szállítja, minimális kezdő tartalommal. Nyitott: a
flag neve (`tab.kezdolap` vs. `tab.dashboard`) — a magyar konvenció (`tab.kaja`, `tab.edzes`,
`tab.feladatok`) szerint `tab.kezdolap`._

## Lezáráskor (on-done)

Commit: (ld. `IMPLEMENTATION_STATUS.md` 2026-09-09 — #96)

- **Flag:** `assets/config/features.json` `tab.kezdolap: true` (első kulcs); `FeatureFlagKey` union
  + `FEATURE_FLAG_KEYS` lista (első). Nincs függősége (tab-flag, mint a `tab.kaja`).
- **Tab registry:** `core/config/tab-registry.ts` — `Kezdőlap` `TabDef` a lista élén
  (`/tabs/home`, `home-outline`, `TABS.KEZDOLAP`); új `firstEnabledTabRoute(featureFlags)` helper
  (első engedélyezett tab route-ja; a `Menü` mindig matchel).
- **Route:** `app.routes.ts` — `tabs` gyerek `home` route `featureFlagGuard('tab.kezdolap')`-pal;
  a `''` redirect **függvény alakú** `redirectTo`, ami `firstEnabledTabRoute(inject(FeatureFlagsService))`-ot ad vissza.
- **Guard:** `core/config/feature-flag.guard.ts` — a letiltott flag átirányítása `firstEnabledTabRoute`
  (nem fix `/tabs/menu`).
- **Oldal:** `pages/home/home.page.ts` + `.html` (standalone, OnPush) — toolbar cím + `SyncStatusButton`
  a `end` slotban; `quickLinks` = a `home`-on kívüli engedélyezett tabok, `ion-item[button]` + routerLink.
- **i18n:** `TABS.KEZDOLAP` + `HOME.TITLE` / `HOME.INTRO` (hu + en).
- **Teszt:** `tab-registry.spec.ts` (új), `home.page.spec.ts` (új), `feature-flag.guard.spec.ts`
  (első engedélyezett tab eset), `app.routes.spec.ts` (redirect target + `tabs/home` guard),
  `feature-flags.service.spec.ts` (`ALL_KEYS` + `tab.kezdolap`). Zöld kapu: FE lint ✓,
  `test:ci` 1635 ✓, build ✓, `verify:outbox` v6/36 ✓ (nincs outbox-érintés), backend `./gradlew test` ✓.
- **Spec:** új `documentation/Features/Kezdőlap.md`; `documentation/Architektúra/Frontend.md`
  (tab registry tábla, route-térkép, „Login utáni default tab", flag registry, „Tab-flag kikapcsolva",
  Kapcsolódó lista) — stamp `verifikalt_commit: 24ae531`.
- **Nincs backend érintés** (frontend-only feature).
