---
id: 101
type: feature
status: done
title: Android kezdőképernyő-widget (launcher AppWidget)
specs:
  - "[[Android kezdőképernyő widget]]"
  - "[[Frontend]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 101 — Android kezdőképernyő-widget (launcher AppWidget)

## Motiváció / probléma

A felhasználó megpróbált widgetet kirakni az Android telefon kezdőképernyőjére, de az app
egyetlen widgetet sem kínált a launcher widget-listájában. A `backlog/095`-ben készült „widgetek"
az appon **belüli** Ionic kártyák a Kezdőlap tabon — nem natív launcher-widgetek.

## Jelenlegi működés

Nincs `AppWidgetProvider` / `res/xml/appwidget-provider` / manifest-bejegyzés a projektben (grep:
`RemoteViews` / `AppWidgetManager` / `appwidget` → 0 találat). A natív felület (`documentation/
Architektúra/Frontend.md` Capacitor plugin lista) nem tartalmaz widget-hidat.

## Elfogadási kritériumok

- [x] 4 kezdőképernyő-widget a launcher listájában: **Mai étkezés állása**, **Lépésszám**,
      **Gyorsgombok**, **Kombinált összegző** (Napi összegző). 4 `<receiver>` a manifestben,
      `res/xml/widget_*_info.xml`.
- [x] „Mai étkezés állása": mai bevitt kcal + fehérje / szénhidrát / zsír a mai célhoz képest
      (`buildWidgetSnapshot` a `TodayNutritionService.summary()`-ből — ugyanaz a szám).
- [x] „Lépésszám": mai lépésszám + a `stepsLowThreshold` (default 2000) mint viszonyítási cél.
- [x] „Gyorsgombok": „Új étkezés" → `/tabs/food/meal/new`, „Új mászás" → `/tabs/workout/climbing`
      (`WIDGET_ROUTES`).
- [x] „Kombinált összegző": kcal + lépés + a két gyorsgomb egy kártyán;
      `resizeMode="horizontal|vertical"`.
- [x] A widget csak a helyi store-ból / statikus snapshotból renderel — nincs hálózati hívás;
      Full-offline is renderel az utolsó snapshotból (OS `updatePeriodMillis` redraw).
- [x] Tap → deep link (`WidgetViews.tap` → `EXTRA_ROUTE` → `MainActivity.stashNotificationRoute` →
      `lm2_notifPendingRoute` → `NotificationSchedulerService.drainPendingRoute()`). A `MainActivity`
      nem változott.
- [x] `loggedIn=false` → „Nyisd meg az appot"; `nutrition==null` (hiányos profil) → „Állítsd be a
      profilod" + tap a `/tabs/menu/profile`-ra; snapshot nélkül (app még sose futott) → natív
      `widget_placeholder`.
- [x] Frissesség: azonnali (`WidgetSnapshotService` debounce-olt `effect` + `resume` + login-hook) +
      `WidgetUpdateWorker` (`PeriodicWorkRequest`, ~30 perc, Health Connect max-wins lépés-patch).
- [x] `#### Backend-offline`: dokumentálva az új specben; nincs backend érintettség.
- [x] Csak Android (a spec Tudatos korlát rögzíti az iOS-t külön jegyként).

## Terv / döntési napló

_A teljes terv: a jóváhagyott plan fájl (`.claude/plans/radiant-roaming-gadget.md`)._

- A widget-folyamat nem futtat JS-t → JS root service (`WidgetSnapshotService`) egy JSON
  pillanatképet ír a `CapacitorStorage` `lm2_widgetSnapshot` kulcsra (a
  `NotificationSchedulerService.writeBackgroundPlan()` mintája), a natív `AppWidgetProvider`-ek ezt
  olvassák. Minden dinamikus szöveg előre-lokalizálva megy a snapshotba (`TranslateService.instant`).
- Trigger: app-local Capacitor plugin `Lm2Widget.refresh()` (mint `BackgroundReminders.ensureScheduled()`).
- Háttér-friss: `WidgetUpdateWorker` + `PeriodicWorkRequest` (~30 perc) — csak a lépésszám frissül
  háttérben (Health Connect); a mai kcal-hoz JS + SQLite kell → **tudatos korlát**.
- Deep-link: a widget `PendingIntent` a meglévő `EXTRA_ROUTE` (`hu.bumler.lm2.notificationRoute`)
  extrát használja → `MainActivity.stashNotificationRoute` → `lm2_notifPendingRoute` →
  `NotificationSchedulerService.drainPendingRoute()`. A `MainActivity` nem változik.
- 4 külön provider, közös `BaseLm2Widget` + `WidgetViews` `object`. A „Kombinált" az egyetlen
  `resizeMode`-os.
- Nincs új gradle-függőség: `androidx.work` + health-connect már a `app/build.gradle`-ben.
- A natív réteg a JS zöld kapuban nem fordul; a session `assembleDebug`-ot kísérel meg, az
  eszközön tesztelés a felhasználóé.

## Lezáráskor (on-done)

- Frissített specek:
  - **Új**: [[Android kezdőképernyő widget]] (Feature spec, stamp `914302f`).
  - [[Frontend]] — Capacitor plugin tábla: „Saját widget-plugin" sor + a `lm2_widgetSnapshot` kulcs;
    stamp `914302f`.
  - [[Kezdőlap]] + [[Lépésszám követés]] — additív `[[Android kezdőképernyő widget]]` kereszthivatkozás
    (stamp **nem** bumpolva).
- `IMPLEMENTATION_STATUS.md` sor: `2026-09-09 — #101` (a `## Lezárt jegyek` tetején).
- Kód:
  - Natív (`frontend/android/app/src/main/java/hu/bumler/lm2/widget/`): `Lm2WidgetPlugin.kt`,
    `WidgetSnapshot.kt`, `WidgetViews.kt`, `BaseLm2Widget.kt`, `NutritionWidget.kt`, `StepsWidget.kt`,
    `QuickActionsWidget.kt`, `SummaryWidget.kt`, `WidgetUpdateWorker.kt`, `WidgetRefreshScheduler.kt`.
  - Natív erőforrás: `res/layout/widget_{nutrition,steps,quick_actions,summary}.xml`,
    `res/xml/widget_{nutrition,steps,quick_actions,summary}_info.xml`,
    `res/drawable/widget_background.xml`, `res/values/strings.xml` + `res/values-en/strings.xml`.
  - Natív edit: `MainActivity.java` (`registerPlugin`), `AndroidManifest.xml` (4 `<receiver>`).
  - Frontend: `core/widget/lm2-widget.plugin.ts`, `core/widget/widget-snapshot.ts` (+ `.spec.ts`),
    `core/widget/widget-snapshot.service.ts` (+ `.spec.ts`), `main.ts` + `pages/login/login.page.ts`
    init-hook (+ `login.page.spec.ts` stub), `assets/i18n/{hu,en}.json` `WIDGET.*`.
- Zöld kapu: FE lint ✓ · `test:ci` **1662 SUCCESS** (+8) ✓ · build ✓ (csak a meglévő NG8113 warning) ·
  `verify:outbox` **v6 / 36 entity** változatlan ✓ · backend `./gradlew test` ✓ (nincs backend változás).
- Android: `npx cap sync android` + `./gradlew :app:assembleDebug` → **BUILD SUCCESSFUL** (a Kotlin +
  manifest + layout + xml lefordul; APK összeáll). Eszközön tesztelés (widget kirakása, deep-linkek,
  háttér-friss) a felhasználóé.
