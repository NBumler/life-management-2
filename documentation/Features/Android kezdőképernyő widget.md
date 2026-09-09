---
verifikalva: 2026-09-09
verifikalt_commit: 914302f
---

# Android kezdőképernyő widget

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Kezdőlap]], [[Étkezés]], [[Tápérték kalkulátor]], [[Lépésszám követés]], [[Lépésszám átszinkronizálása a Samsung Health-ből]], [[Értesítések]], [[Backend-offline first]] |

### Jelenlegi működés

Négy **Android kezdőképernyő-widget** (launcher `AppWidgetProvider`), amelyek a napi állapotot és a
leggyakoribb létrehozó flow-kat mutatják a helyi adatból, és koppintásra deep-linkelnek az appba:

| Widget | Launcher-név | Tartalom |
|---|---|---|
| **Mai étkezés állása** | „Mai étkezés állása" | Mai bevitt kalória + fehérje / szénhidrát / zsír a mai célhoz képest (haladás-sáv + „bevitt / cél" + hátralévő). Ugyanaz a szám, mint az [[Étkezés]] dashboard / a [[Kezdőlap]] „Mai étkezés állása" widget (`TodayNutritionService`). |
| **Lépésszám** | „Lépésszám" | Mai lépésszám nagy számmal + haladás-sáv a `stepsLowThreshold`-hoz (default 2000) mint viszonyítási cél. |
| **Gyorsgombok** | „Gyorsgombok" | „Új étkezés" → `/tabs/food/meal/new`, „Új mászás" → `/tabs/workout/climbing`. |
| **Kombinált összegző** | „Napi összegző" | Kalória + lépés egy kártyán + a két gyorsgomb. Ez az egyetlen átméretezhető widget. |

**Platform:** csak Android. iOS (WidgetKit) külön jegy — lásd `backlog/`.

### Funkcionális leírás

- **Adat-pillanatkép:** a widget-folyamat nem futtat JS-t, ezért az app egy kis JSON pillanatképet ír
  a `@capacitor/preferences` (`CapacitorStorage`) `lm2_widgetSnapshot` kulcsára — ugyanaz a híd, amit
  az [[Értesítések]] háttér-worker `lm2_notifBgPlan`-je használ. A pillanatkép tartalma: mai kalória
  / makró bevitt+cél, mai lépésszám+cél, `loggedIn` jelző, aktív nyelv, és **minden megjelenő szöveg
  előre lefordítva** (a natív oldal csak számot formáz és „bevitt / cél" sorokat állít össze).
- **Frissítés:**
  - *Azonnali:* az app minden releváns forrásadat-változáskor (étkezés mentése/törlése, lépés-sync,
    profil-, nyelv-, session-váltás) újraszámol (debounce), a `resume` eseményre, és login után —
    majd a natív `Lm2Widget.refresh()`-en át újrarajzoltatja a widgeteket.
  - *Periodikus háttér-fallback:* `WidgetUpdateWorker` (`androidx.work` `PeriodicWorkRequest`, ~30
    perc). Ez háttérben **csak a mai lépésszámot** olvassa újra Health Connectből (a
    `ReminderWorker` mintája, max-wins patch a pillanatképbe) és újrarajzol. A kalória / makró
    háttérben nem frissül (l. Tudatos korlát).
  - Az OS `updatePeriodMillis` (~30 perc) is újrarajzol az **utolsó** pillanatképből (adat nélküli
    redraw) — így repülő üzemmódban is olvasható a widget.
- **Tap / deep link:** a widget `PendingIntent`-je a `MainActivity`-t indítja az
  `hu.bumler.lm2.notificationRoute` extrával; a `MainActivity.stashNotificationRoute` ezt a
  `lm2_notifPendingRoute` kulcsra írja, és a `NotificationSchedulerService.drainPendingRoute()`
  (cold start / resume) navigál rá. A widget-tapek ezt a meglévő mechanizmust használják — a
  `MainActivity` nem változott.
- **Állapotok:**
  - *Nincs pillanatkép* (friss telepítés, app még sose futott): a data-widgetek a natív
    `widget_placeholder` szöveget (`Nyisd meg az appot` / `Open the app`) mutatják, tap → `/tabs/home`.
  - *Kijelentkezve:* a data-widgetek a lefordított „Nyisd meg az appot" szövegre váltanak, tap →
    `/tabs/home`.
  - *Hiányos profil* (nincs elég TDEE-bemenet): a „Mai étkezés állása" és a „Kombinált összegző"
    kalória-része „Állítsd be a profilod" szöveget mutat, tap → `/tabs/menu/profile`. A lépés-rész és
    a gyorsgombok ilyenkor is működnek.
  - A „Gyorsgombok" gombjai bejelentkezéstől függetlenül aktívak (a megnyíló app kezeli az autentikációt).

### UI/UX elvárások

- A widgetek egyszerű, lekerekített **világos kártyák** (`@drawable/widget_background`), fejléc-címmel
  és haladás-sávokkal.
- A haladás-sávok 0–100%-ra vannak vágva; a „bevitt / cél" számok ezres-tagolással
  (`String.format("%,d")`, eszköz-locale).
- A launcher widget-választóban a négy widget külön néven jelenik meg (`values` = magyar,
  `values-en` = angol).
- A „Kombinált összegző" átméretezhető (`resizeMode="horizontal|vertical"`), a másik három rögzített
  méretű (a „Gyorsgombok" vízszintesen nyújtható).

### Megjegyzések

#### Tudatos korlát

- **Háttérben csak a lépésszám frissül.** A mai kalória / makró adathoz az app SQLite-ja és a JS-réteg
  kell — a `WidgetUpdateWorker` háttérben csak Health Connect lépés-olvasást végez. A kalória-adat így
  csak addig friss, ameddig az app legutóbb előtérben járt.
- **Nincs sötét-mód-érzékeny widget-felület** az első körben — a kártya fix világos, a szöveg sötét.
  A téma-érzékeny widget külön jegy tárgya.
- **Nincs user által testre szabható widget-tartalom / -sorrend.** A négy widget készlete fix.
- **Csak Android.** Az iOS WidgetKit-widget külön jegy, az iOS build (`backlog/004`) után.
- A „lépés-cél" nem dedikált beállítás — az [[Értesítések]] `stepsLowThreshold` hangolási értékét
  (default 2000) használja viszonyításként.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `core/widget/widget-snapshot.ts` — **pure**: `WIDGET_SNAPSHOT_KEY` (`lm2_widgetSnapshot`),
  `WIDGET_ROUTES`, `WIDGET_LABEL_KEYS`, `WidgetSnapshot` típus, `buildWidgetSnapshot(inputs)` (a
  `TodayNutritionSummary` + lépés count/goal + `loggedIn` + nyelv + label-map → pillanatkép; kerekít,
  negatív/nem-véges → 0; `!loggedIn || !computable` → `nutrition: null`).
- `core/widget/widget-snapshot.service.ts` — `providedIn: 'root'` `WidgetSnapshotService`. `init()`
  (natív guard; `App.addListener('resume')`; első kiírás; `Lm2Widget.ensureBackgroundRefresh()`),
  fire-and-forget a `main.ts` `provideAppInitializer`-ből és login után a `LoginPage`-ből (a
  `ActivityStepSyncService` / `NotificationSchedulerService` mintája). Egy debounce-olt (`600 ms`)
  `effect()` a `TodayNutritionService.summary()` + `DailyStepLogRepository.items()` +
  `LanguageService.activeLanguage()` + `AuthSessionService.isAuthenticated()` +
  `NotificationTuningService.tuning()` + `DataChangeNotifier.tick()` felett; `tick` változáskor
  `await todayNutrition.load()` + `stepLog.load()` a kiírás előtt (delta pull után a nem-cache-elt
  jelek elavulnak). `writeAndRefresh` → `Preferences.set(lm2_widgetSnapshot, …)` +
  `Lm2Widget.refresh()`.
- `core/widget/lm2-widget.plugin.ts` — `registerPlugin<Lm2WidgetPlugin>('Lm2Widget')`
  (`refresh()`, `ensureBackgroundRefresh()`). Nincs web-impl; a hívó elnyeli a rejectet.
- i18n `WIDGET.*` (`hu.json` / `en.json`).
- Natív (`android/app/src/main/java/hu/bumler/lm2/widget/`): `Lm2WidgetPlugin.kt` (app-local
  Capacitor plugin, `MainActivity`-ben regisztrálva), `WidgetSnapshot.kt` (a `CapacitorStorage` JSON
  parse-olása), `WidgetViews.kt` (`RemoteViews` builderek + `updateAll` broadcast + `PendingIntent`),
  `BaseLm2Widget.kt` + `NutritionWidget` / `StepsWidget` / `QuickActionsWidget` / `SummaryWidget`,
  `WidgetUpdateWorker.kt` (periodikus Health Connect lépés-patch), `WidgetRefreshScheduler.kt`
  (`PeriodicWorkRequest`, `KEEP`, 30 perc). Erőforrások: `res/layout/widget_*.xml`,
  `res/xml/widget_*_info.xml`, `res/drawable/widget_background.xml`, `res/values{,-en}/strings.xml`
  (launcher-nevek + placeholder). `AndroidManifest.xml`: 4 `<receiver>` `APPWIDGET_UPDATE`
  intent-filterrel + `android.appwidget.provider` meta-datával.

#### Backend-offline

A widget **kizárólag** a helyi store-ból / statikus pillanatképből renderel — nincs saját hálózati
hívása. A pillanatképet a `WidgetSnapshotService` a helyi repository-jelekből számolja, így delta
pull után élőben frissül, és **Full-offline is teljes értékű** (az utolsó ismert állapotot mutatja).
A `WidgetUpdateWorker` Health Connectet olvas, ami eszközön belüli (nem a backend). Lásd
[[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
