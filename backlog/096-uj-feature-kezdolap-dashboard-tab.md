---
id: 96
type: feature
status: backlog
title: Új feature — Kezdőlap / dashboard tab (a menüsor első eleme)
specs:
  - "[[Frontend]]"
flag: tab.kezdolap
created: 2026-09-09
closed:
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

- [ ] Új tab a registry **első** helyén: `Kezdőlap`, route `/tabs/home`, flag `tab.kezdolap`.
- [ ] A tab-bar így 5 gombos lehet (Ionic 1–5 gombot elbír — [[Frontend]]); a flag-el
      kikapcsolható, a `Menü` marad a végső mentsvár.
- [ ] `featureFlagGuard('tab.kezdolap')` a route-fa tetején; deep link kikapcsolt flagnél →
      következő engedélyezett tab.
- [ ] Login utáni default tab: Kezdőlap, ha a `tab.kezdolap` engedélyezett; különben a registry
      első engedélyezett tabja (a jelenlegi fallback-lánc kiterjesztve).
- [ ] A `SyncStatusButton` a Kezdőlap `ion-toolbar` `end` slotjában is ([[Frontend]] app-shell
      chrome minden tabon).
- [ ] `#### Backend-offline`: a kezdőlap kizárólag helyi store-ból renderel, Full-offline is
      teljes értékű. Lásd [[Backend-offline first]].
- [ ] [[Frontend]] tab-térkép + route-térkép + flag registry frissítve.

## Terv / döntési napló

_A widget-tartalom külön jegy ([[095-kezdokepernyo-widgetek-gyorsgombok]]) — ez a jegy a
tab / route / flag / default-tab vázat szállítja, minimális kezdő tartalommal. Nyitott: a
flag neve (`tab.kezdolap` vs. `tab.dashboard`) — a magyar konvenció (`tab.kaja`, `tab.edzes`,
`tab.feladatok`) szerint `tab.kezdolap`._

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]] (tab registry, route-térkép, flag registry, login utáni
  default tab), új spec fájl `documentation/Features/Kezdőlap.md`
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `pages/home/*`, tab-registry config, route-ok + guard, `assets/config/features.json`
