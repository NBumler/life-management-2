---
id: 232
type: change-request
status: done
title: Kezdőlap — a gyorsgombok widget lekerül (az Android widget gyorsgombjai maradnak)
specs:
  - "[[Kezdőlap]]"
  - "[[Frontend]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-21
closed: 2026-10-21
---

# 232 — Kezdőlap — a gyorsgombok widget lekerül (az Android widget gyorsgombjai maradnak)

## Motiváció / probléma

A Kezdőlapon a „Gyorsgombok” kártya (Új étkezés / Új mászás) nem kell, helyet foglal a mai
összesítők felett. A gyorsgomb-funkció viszont **nem szűnik meg**: Androidon a launcher widget
([[Android kezdőképernyő widget]] „Gyorsgombok” és „Napi összegző”) továbbra is használja.

## Jelenlegi működés

[[Kezdőlap]] widget-verem: `quick-actions` (mindig, `HOME_QUICK_ACTIONS`) → `today-nutrition` →
`today-workouts`. Az Android widget gyorsgombjai ettől független úton mennek: `WIDGET_ROUTES.newMeal`
/ `newClimb` + `WIDGET.NEW_MEAL` / `WIDGET.NEW_CLIMB` címkék a `widget-snapshot.ts`-ben, natív
`QuickActionsWidget` / `SummaryWidget` (Kotlin), deep-link a `drainPendingRoute()`-on át.

## Elfogadási kritériumok

- [x] A Kezdőlapon nincs „Gyorsgombok” kártya; a verem: mai étkezés állása → mai edzések.
- [x] Az in-app gyorsgomb-kód (`QuickActionsWidgetComponent`, `HOME_QUICK_ACTIONS`, `HOME.QUICK.*`
      i18n kulcsok) törölve — csak a Kezdőlap használta.
- [x] Az Android widget gyorsgomb-útja érintetlen: `WIDGET_ROUTES`, `WIDGET.NEW_*` kulcsok, natív
      widgetek, `drainPendingRoute()`, valamint a célútvonalak (`/tabs/food/meal/new`,
      `/tabs/workout/climbing`) változatlanok.
- [x] Specek frissítve ([[Kezdőlap]], [[Frontend]] tab/route táblák, [[Mászónapló]] belépési pont).

## Terv / döntési napló

- 2026-10-21 — felvéve. Az Android widget nem a `HOME_QUICK_ACTIONS`-t olvassa, hanem a saját
  `WIDGET_ROUTES` / `WIDGET_LABEL_KEYS` szerződését, így az in-app widget-komponens és a katalógus
  biztonságosan törölhető; a widget-funkció logikája a `core/widget/` + natív oldalon él tovább.

## Lezáráskor (on-done)

- Frissített specek: [[Kezdőlap]] (widget-tábla, UI/UX, Frontend fájllista: nincs `quick-actions`; a gyorsgombok
  az Android widgetre mutatnak), [[Frontend]] (tab- és route-tábla leírása), [[Mászónapló]] (belépési pont:
  az Android widget „Új mászás” gombja)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-21 — #232
- Kód: `frontend/src/app/core/config/home-widget-registry.ts` (+ `.spec.ts`), `pages/home/home.page.{ts,html,spec.ts}`,
  törölve `pages/home/widgets/quick-actions-widget.component.*`, `assets/i18n/{hu,en}.json` (`HOME.QUICK.*`)
