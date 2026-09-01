# Lépésszám átszinkronizálása a Samsung Health-ből

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Lépésszám követés]] |
| **Kapcsolódó** | [[Tápérték kalkulátor]], [[Lépésszám kézzel manuálisan megadása]], [[Értesítések]], [[Szinkronizációs központ]], [[Backend-offline first]] |

### Célállapot

Android **Health Connect** (Samsung Health adatforrás) lépésszámának átvétele, ha a user elfelejti manuálisan frissíteni. Csak **nagyobb** érték írja felül a mentettet. iOS: későbbi scope. Nincs óránkénti sync.

### Funkcionális leírás

#### Mikor kell sync

1. **App megnyitás:** lekéri a **mai** napi lépésszámot Health Connectből, **és** önjavító backfill: megnézi az elmúlt **7 naptári napot** (ma nélkül), és amelyikre **nincs** helyi `DailyStepLog` sor (sem manuális, sem korábbi sync nem írta), arra is lekéri és max-wins upsertolja a Health Connect adatot. Ez a lépés véd az ellen, hogy a 08:00-as háttérfeladat OS-szintű elhalasztása / kilövése (Doze mode, gyártói agresszív akkumulátor-optimalizálás) miatt egy nap véglegesen kimaradjon: legkésőbb a következő app-nyitáskor pótlódik, amíg a Health Connect helyi retenciója fedi (jellemzően jóval 7 napnál hosszabb).
2. **Napi 09:00** (kliens TZ) háttérfeladat: lekéri a **tegnapi** lépésszámot (ha tegnap elfelejtett menteni). A mai napot a futás **nem** érinti. Ez az elsődleges, gyors út; az 1. pont a tartalék, ha ez nem fut le. Az implementáció ezt az [[Értesítések]] 08:00 / 20:00 háttér-workerével közös 09:00-as `AlarmManager` futásba vonja össze (a tegnapi összeg stabil, a percpontosság irreleváns). A háttér-worker Kotlinból csak a `@capacitor/preferences` (`steps.pendingHealthConnect.<dátum>`) kulcsba **stasheli** a tegnapi értéket — nem ír közvetlenül az SQLite-ba / outboxba; a következő app-nyitáskor az `ActivityStepSyncService` olvassa be és `maxWinsUpsert`-eli (a live HC-olvasás előtt, hogy az még feljebb vihesse).

#### Mikor kell felülírni

Összehasonlítás: hiányzó nap = **0**.

- Ha `healthConnectSteps > storedSteps` → mentés / upsert az új értékkel.
- Ha `healthConnectSteps ≤ storedSteps` → **nincs** változtatás.
- Manuális mentés ettől függetlenül mindig engedi a tetszőleges (akár kisebb) értéket; a következő app-nyitáskori sync csak akkor viszi feljebb, ha a Health Connect nagyobb.

#### Kalória

Kanonikus képlet: [[Tápérték kalkulátor]] — \(\max(0,\;steps - 3000) \times m \times 0.00045\). (A korábbi „steps × m × 0.00045” baseline nélkül **nem** érvényes.)

#### Platform

- Android Health Connect; háttér: natív `AlarmManager` + `WorkManager` (`ReminderWorker`, az [[Értesítések]] körrel közös) a 09:00-as tegnapi stashhez. A `@capacitor/background-runner` nem került be.
- Engedélykérés UI; megtagadás esetén csak manuális út marad. A háttér-olvasáshoz (a worker context-jében) az `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND` grant is kell — a Lépésszám képernyőn külön „háttér-hozzáférés" prompt, csak a foreground `READ_STEPS` után kérhető; megtagadva a 09:00-as stash és a `STEPS_LOW` esti értékelése kimarad, a manuális + app-nyitáskori út marad.

### UI/UX elvárások

- Engedély / „utolsó sync” jelzés a [[Lépésszám követés]] képernyőn (rövid státusz).
- Nincs külön **kötelező** sync gomb: az app-nyitás + `resume` automatikus út az elsődleges. A [[Lépésszám követés]] képernyőn (a foreground engedély megadása után) van egy opcionális „Frissítés most” gomb, ami manuálisan ugyanazt a `syncNow()` kört (mai nap + 7 napos hiánypótló backfill) futtatja — kényelmi funkció, nem külön adat-út.

### Megjegyzések

A Health Connect hívás a kliensről megy (nincs backend proxy). Saját backendre írás outboxon keresztül.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Health Connect plugin / Capacitor bridge: app-lokális Capacitor plugin (`HealthConnectStepsPlugin`, Kotlin, `androidx.health.connect:connect-client`), csak olvasás — elérhetőség, READ_STEPS grant, napi lépés-aggregátum (`StepsRecord.COUNT_TOTAL`). `ActivityStepSyncService`: max-wins upsert a helyi `DailyStepLog`-ra (`DailyStepLogRepository.maxWinsUpsert`).
- App lifecycle: cold/warm start → a `steps.pendingHealthConnect.*` háttér-stashek beolvasása → mai sync + 7 napos hiánypótló backfill (csak a `DailyStepLog`-gal nem rendelkező napokra).
- Scheduled 09:00 háttér-worker (natív `AlarmManager` + `WorkManager`, [[Értesítések]]) → tegnapi lépésszám `steps.pendingHealthConnect.<dátum>` prefbe stashelése (nincs közvetlen store-írás).
- TDEE újraszámolás sikeres nagyobb upsert után.

#### Backend-offline

- Health Connect olvasás: Backend-offline és Full-offline is (helyi API). A 09:00-as háttér-worker (natív, DI nélküli JS-mentes kontextus) csak a `@capacitor/preferences` fájlba stashel — a valódi helyi-first írás (max-wins + outbox) a következő app-nyitáskor történik.
- Saját backend írás: outbox; ugyanarra a napra `PENDING` payload frissítése az új (nagyobb) `stepCount`-tal.
- Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]], [[Lépésszám követés]].

### Backend

Ugyanaz a `DailyStepLog` upsert ([[Lépésszám követés]]); szerveroldali max-wins opcionális (kliens már max-wins-t alkalmaz).

### Nyitott kérdések

Nincs nyitott kérdés.
