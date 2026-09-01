# Értesítések

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Élelmiszer tárolás]], [[Lépésszám követés]], [[Tápérték kalkulátor]], [[Étkezés]], [[Háztartási feladatok]], [[Rendszeres kiadások]], [[Tennivalók]], [[Események]], [[Élet tervek]], [[Nyelv választás]], [[Google Calendar szinkronizálása]], [[Frontend]], [[Bejelentkezés]], [[Backend-offline first]] |

### Célállapot

Lokális (készüléken ütemezett) értesítések a fontos küszöbökről. Az első körben **hat** aktív típus; a többi típus később, amíg a forrás-feature specek `Kész` nem lesznek. Remote (szerveroldali) push **nincs** az első körben.

### Funkcionális leírás

#### Csatorna

- **Lokális értesítés** (Capacitor Local Notifications / platform ekvivalens): az app / OS ütemező a készüléken firssít, saját backend nélkül.
- OS értesítési engedély kérése első használatkor / bekapcsoláskor.
- **Remote push** (FCM/APNs, szerver küldi, ha az app zárva van napok óta is): későbbi scope — lásd Megjegyzések.

#### Beállítások UI

- Belépés: **Menü → Értesítések**.
- Típusonként ki/be kapcsoló az alábbi **aktív** típusokra. Nincs lead-time szerkesztő az első körben (a szabályok fixek a specekben).

#### Aktív típusok (első kör)

##### 1. Élelmiszer — hamarosan romlik / még a tárolóban (`FOOD_EXPIRING_DAILY`)

- Forrás: [[Élelmiszer tárolás]].
- Lead time kezdete (mikortól számít „figyelmeztetési ablak”):

| Katalógus tárolhatóság (hely) | Ablak kezdete |
|---|---|
| **> 5 nap** | lejárat előtt **3 nappal** |
| **≤ 5 nap** (vagy nincs katalógus-idő) | lejárat előtt **2 nappal** |

- **Ütemezés:** minden nap **09:00** (kliens TZ), amíg a tétel **még a tárolóban van** (nincs törölve), a lead-time napjától kezdve.
- Cél: ne felejtődjön el a tétel a tárolóban.
- **Ismétlés:** ugyanarra a tételre legfeljebb **1 értesítés / naptári nap** (09:00-ás futás).

##### 2. Élelmiszer — megromlott (`FOOD_SPOILED_ONCE`)

- Amikor a tétel **romlott** lesz (lejárati nap után, [[Élelmiszer tárolás]] szabály), **egyszer** értesítés.
- Ütemezés: a romlottá válás utáni első releváns **09:00** (ha már romlott 09:00-kor), vagy azonnali lokális fire ha a nap közben derül ki és még nem ment ki — de **élettartam alatt max 1** `FOOD_SPOILED_ONCE` / tétel.
- A napi `FOOD_EXPIRING_DAILY` ettől függetlenül mehet, amíg a tétel a tárolóban van (emlékeztető), ha a típus be van kapcsolva.

##### 3. Lépésszám (`STEPS_LOW`)

- Forrás: [[Lépésszám követés]].
- **20:00** (kliens TZ): ha a **mai** `stepCount` &lt; **2000** (hiányzó nap = 0) → **1 értesítés / nap**.
- Már kiküldött értesítést **nem** vonunk vissza, ha később manuális / Samsung sync ≥ 2000-re emeli a mai értéket.

##### 4. Kalória-túllépés sorozat (`CALORIE_STREAK`)

- Forrás: [[Étkezés]] bevitt kcal vs [[Tápérték kalkulátor]] `dailyAllowanceKcal`.
- Feltétel: egymást követő **5 naptári nap**, mindegyiken `bevitt > dailyAllowanceKcal + 750`. Csak túllépés számít (alulmaradás nem).
- **Értékelés / küldés: 09:00** (kliens TZ). Az ablak a **tegnappal záródó** 5 teljes nap (`D-5` … `D-1`), mert a mai nap 09:00-kor még nem lezárt.
- Ha a feltétel igaz → **1 értesítés** aznap; ugyanarra az 5 napos ablakra ne ismételjen (következő nap újraértékelés új ablakkal).

##### 5. Háztartási feladatok (`HOUSEHOLD_TASK_DUE`)

- Forrás: [[Háztartási feladatok]].
- **09:00** (kliens TZ): élő (`deleted = false`) feladatok, ahol `nextDue ≤ ma` (ma + lejárt).
- **Forma:** **1 digest / naptári nap** (nem feladatonként). 1 találat → a feladat neve; 2+ → pl. „3 háztartási feladat esedékes”.
- A naptár 10 előfordulása **nem** értesítés; csak az élő `nextDue` számít.
- Nincs lead time (nem szól előző este / N nappal korábban).
- Pipálás / törlés után a tétel kiesik a **következő** 09:00-ás készletből. A már kiment mai banner **nem** vonódik vissza.
- 09:00 után ma esedékessé tett feladat: nincs második fire aznap (1 / nap); holnap 09:00, ha még `nextDue ≤ ma`.

##### 6. Esemény előfordulás (`EVENT_OCCURRENCE`)

- Forrás: [[Események]].
- Élő (`deleted = false`) sorozat horizonbeli előfordulásaira (vetítés SSOT: [[Események]]).
- **Időzített:** az előfordulás napján a `startTime` (kliens TZ falóra). **Egész napos:** aznap **09:00**.
- **1 értesítés / (`eventId` + előfordulás `date`)**. Cím: az esemény `title` (helyszín ha van, a szövegben).
- Múltbeli előfordulásra **nincs** utólagos fire (app nyitáskor a már elmúlt start/09:00 kihagyva).
- Törlés / sorozat-szerkesztés után a jövőbeli ütemezés újraszámolódik. A már kiment banner **nem** vonódik vissza.
- Nincs eseményenkénti lead time (15 perc / 1 óra előtte nincs).

#### Későbbi típusok (nem implementálandó az első körben)

Hook / placeholder — lead time és szöveg a forrás-spec készültekor:

- [[Rendszeres kiadások]] — közelgő fizetés (a forrás-spec MVP-je **kint hagyta**; lead time / ütemezés akkor, ha a típus aktívvá válik)
- [[Élet tervek]] — céldátum / állapot (a forrás-spec MVP-je **kint hagyta**)

#### Ismétlés-védelem (deduplikáció) — magyarázat

Az OS / app újraindulás vagy többszöri scheduler-futás ne küldjön ugyanarra az eseményre sokszor. Konkrétan:

| Típus | Max ismétlés |
|---|---|
| `FOOD_EXPIRING_DAILY` | 1 / tétel / naptári nap |
| `FOOD_SPOILED_ONCE` | 1 / tétel / élettartam |
| `STEPS_LOW` | 1 / naptári nap |
| `CALORIE_STREAK` | 1 / naptári nap (és ugyanarra az ablakra nem újra) |
| `HOUSEHOLD_TASK_DUE` | 1 digest / naptári nap |
| `EVENT_OCCURRENCE` | 1 / esemény / előfordulás-nap |

Ehhez helyi „már elküldve” napló (pl. `notificationDedupe`: típus + kulcs + nap).

#### Nyelvváltás → újraütemezés

Az ütemezett értesítés szövege az **ütemezés pillanatában** dől el, tehát nyelvváltás után a régi nyelven szólalna meg. Ezért **nyelvváltáskor a scheduler újraértékel és újraütemez** ([[Nyelv választás]]) — ugyanaz a művelet, mint egy típus-kapcsoló átállításakor. A dedupe napló ettől **nem** ürül: ami ma már kiment, ne menjen ki újra más nyelven.

### UI/UX elvárások

- Menü → Értesítések: típus kapcsolók + rövid magyarázat (mikor szól).
- Értesítés tap → releváns képernyő (készlet / lépésszám / étkezés / háztartási lista Lejárt+Ma / esemény szerkesztő), ha az app megnyílik.
- Nincs külön „értesítés előzmények” lista az első körben.

### Megjegyzések

**Remote push mire jó (később):** a szerver küldi az üzenetet (FCM/APNs), akkor is, ha az app hetek óta nem fut, vagy másik eszközön kell ugyanaz. Pl. multi-device, szerveroldali esemény. Az első körben a lokális ütemező elég (élelmiszer / lépés / kalória / háztartási feladat / esemény a helyi store-ból).

Élelmiszer lead time SSOT táblázat: [[Élelmiszer tárolás]] (küldési ritmus: ez a spec).

Az app az értesítések **egyetlen** forrása: a [[Google Calendar szinkronizálása]] által exportált Google események emlékeztető **nélkül** jönnek létre, különben a user duplán kapná ugyanazt az eseményt.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `LocalNotificationService` (vagy ekvivalens): ütemezés, engedély, dedupe store, típus-flag-ek olvasása.
- Trigger források: készlet store, `DailyStepLog`, Étkezés napi összeg + TDEE allowance, háztartási feladat store (`nextDue`), esemény store + vetítés ([[Események]]).
- 09:00 / 20:00 / esemény `startTime`: OS scheduled local notifications és/vagy napi background check + immediate local notification. Az OS-ütemezés **inexact** (a napi emlékeztetők pár perc csúszást elviselnek, és app-nyitáskor úgyis pótlódik a kimaradt) — így nincs szükség Android 12+ pontos-ébresztő engedélyre.
- **08:00 / 20:00 háttér-értesítés worker** (Android, natív): két inexact `AlarmManager.setAndAllowWhileIdle` riasztás (a napló szerint 09:00 és 20:00 helyi idő; a 09:00 a fix értesítés-idő, ide van összevonva a [[Lépésszám átszinkronizálása a Samsung Health-ből]] „08:00-as tegnapi lépés-sync" is), minden tüzeléskor + `BOOT_COMPLETED`-kor + app-cold-startkor újra-fegyverezve. A riasztás egy `BroadcastReceiver` → `WorkManager` `OneTimeWorkRequest` → `ReminderWorker` (`CoroutineWorker`). A worker **nem** duplázza a döntési réteget és **nem** ír az app SQLite-jába / outboxába: a `NotificationScheduler` minden reconcile-kor egy előre renderelt (aktuális nyelvű) **tervet** ír a `@capacitor/preferences` (`CapacitorStorage`) `lm2_notifBgPlan` kulcsába — a következő ~3 nap 09:00-ás fix-idős értesítései (`FOOD_EXPIRING_DAILY`, `FOOD_SPOILED_ONCE`, `HOUSEHOLD_TASK_DUE`, `CALORIE_STREAK` csak mára) + egy `STEPS_LOW` sablon. Az `EVENT_OCCURRENCE` **nincs** a tervben: azt az élő scheduler OS-szinten már 30 napra előre ütemezi, és a késői tüzelés sértené a „múltbeli előfordulásra nincs fire" szabályt. A worker a due (de max 20 órája esedékes), nem dedupált, nem OS-ütemezett bejegyzéseket posztolja (`NotificationManagerCompat`, `lm2-default` csatorna), az esti futáskor pedig a `STEPS_LOW`-t egy **élő Health Connect olvasásból** dönti el (mai lépés < 2000). Amit kiküldött, a `lm2_notifBgDedupe` naplóba írja; az app következő reconcile-ja ezt a közös `NotificationDedupeStore`-ba fésüli, így nincs kettős kézbesítés. A worker által posztolt banner tap-útja a `lm2_notifPendingRoute` kulcson át jut a routerhez (`MainActivity` intent → pref → `drainPendingRoute`).
- A `STEPS_LOW` esti Health Connect olvasásához az `android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND` engedély kell (a Lépésszám képernyőn külön „háttér-hozzáférés" prompt, csak a foreground `READ_STEPS` után kérhető). Megtagadva a `STEPS_LOW` marad app-nyitáskor értékelődő. Az agresszív OEM-akkumulátor-optimalizálás (Samsung/Xiaomi) a riasztást órákkal késleltetheti vagy kilőheti — a végső védőháló továbbra is az app-open reconcile.
- `EVENT_OCCURRENCE` előre-ütemzési horizont: **+30 nap** (a [[Események]] ±1 éves vetítési horizontjánál szűkebb). Egy távolabbi előfordulás az első olyan app-nyitáskor kap értesítést, amikor már 30 napon belülre esik — háttér-worker hiányában ez az elfogadott kompromisszum.
- Beállítások page a Menü alatt; flag-ek **device-local** store ([[Bejelentkezés]] — nincs profil-sync az első körben).
- Újraértékelés kiváltói: app indulás / előtérbe jövés, forrás-entitás mutáció, típus-kapcsoló váltás és **nyelvváltás** ([[Nyelv választás]]). A szövegek i18n kulcsokból készülnek, nem hardcode stringből.

#### Backend-offline

- Teljes első kör **kliensoldali**: Backend-offline és Full-offline is működik (helyi store + helyi ütemező).
- A 08:00 / 20:00 háttér-worker szintén teljesen kliensoldali: `AlarmManager` + `WorkManager` + a `@capacitor/preferences` fájlon átvezetett terv/dedupe híd, saját backend nélkül. A `STEPS_LOW` esti értékeléséhez lokális Health Connect olvasás (nincs backend proxy).
- Nincs értesítés-outbox a saját backend felé.
- Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (remote push később: push token regisztráció, szerver trigger — nem most)

### Nyitott kérdések

Nincs nyitott kérdés.
