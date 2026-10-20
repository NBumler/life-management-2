---
verifikalva: 2026-10-20
verifikalt_commit: a6e6e64
---

# Fejlesztői környezet

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend]], [[Backend-offline first]], [[Bejelentkezés]] |

### Jelenlegi működés

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet: a tartalom az `## Architektúra` alatt van. Ez a fájl a **monorepo elrendezés, a fejlesztői futtatás, a saját (házi) hálózaton történő Android telepítés a gépen futó Android emulátor és a git-ignored geo build asset gépenkénti előállításának SSOT-ja**. A repóban lévő `claude-hobby-starter-kit` konvencióira épül (`backend/` + `frontend/`, Gradle, `npm run gen:api`, dev proxy).

Prod üzemeltetés / hosting: nyitott — [[Backend]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

#### Monorepo elrendezés

```
backend/               # Spring Boot (Gradle) — [[Backend]]
frontend/              # Ionic Angular (Capacitor) — [[Frontend]]
documentation/         # Obsidian vault: a specifikáció SSOT-ja
shared/fixtures/       # kliens + szerver közös teszt fixture-ök (névnormalizálás)
scripts/               # fejlesztői szkriptek (Android telepítés, emulátor)
docker-compose.yml     # dev Postgres
.env.example           # a szükséges env változók listája (a .env git-ignorált)
```

A `frontend/` belső szervezése (`pages/`, `shared/`, `core/`, `api/`) és a rétegzés: [[Frontend]]. A `backend/` csomagszerkezete: [[Backend]].

#### Dev futtatás

| Mit | Hogyan |
|---|---|
| Adatbázis | `docker compose up -d db` — Postgres named volume-mal, a `docker-compose.yml`-ben pinelt image tag |
| Backend | `cd backend && ./gradlew bootRun` (`local` profil) — `http://localhost:8080` |
| Web frontend | `cd frontend && npm start` — a `/api` hívások a `proxy.conf.json`-on át mennek a 8080-ra |
| API kliens generálás | `cd frontend && npm run gen:api` (a spec: `backend/src/main/resources/openapi.yaml`) |
| App-ikonok / splash generálás | `cd frontend && npm run gen:assets` — a forrás SVG-k a `frontend/assets/`-ben (`icon-foreground.svg`, `icon-background.svg`, `icon-only.svg`, `splash.svg`, `splash-dark.svg`, `notification-icon.svg`); `@capacitor/assets` rendereli a launcher-adaptív ikont + splash-t, a `scripts/gen-notification-icons.mjs` a `ic_stat_notify` státuszsor-ikont és a web favicont. A kimenetek verziókövetettek. |
| Tesztek | `./gradlew test` · `npm test` (interaktív, `ChromeHeadlessCI` helyett `Chrome`-mal, watch módban) · `npm run test:ci` (nem-interaktív, egyszeri futás — CI és agent-munkamenetek ezt használják) |
| Geo build asset | `cd frontend && npm run build:geo-assets` — git-ignored, gépenként előállítandó; lépések: „Geo-csomag másik gépen” lent |
| Statikus ellenőrzések | `npm run verify:outbox` — outbox payload séma-drift ([[Backend-offline first]] „Payload-verziózás”) · `npm run verify:i18n` — hu/en kulcs- és placeholder-paritás + a kódban szó szerint használt kulcsok léteznek, és figyelmeztet az azonos hu / en értékekre ([[Nyelv választás]], `backlog/015`, `backlog/224`). Mindkettő sima `node`, build nélkül; a zöld kapu (teszt + lint + build + ez a kettő) része. |

- A **web** kliens **relatív** `/api` útvonalat hív (dev: proxy, prod: reverse proxy) — így nincs CORS a böngészős fejlesztésben.
- `npm run test:ci` (`frontend/`) a `karma.conf.js`-ben definiált `ChromeHeadlessCI` launcher-t használja (`ChromeHeadless` + `--no-sandbox --disable-gpu`, valamint `backlog/147` óta `--disable-background-timer-throttling --disable-renderer-backgrounding --disable-backgrounding-occluded-windows --mute-audio`, hogy egy hosszú futás időzítői ne lassuljanak be és egy spec se nyúljon valódi hangeszközhöz), és `--watch=false`-szal egyszer fut le. A specek véletlen sorrendben futnak: a futás elején a log kiírja a seedet (`[jasmine] random order seed: <n>`), egy bukott sorrend pedig visszajátszható: `JASMINE_SEED=<n> npm run test:ci`. Az 1 s-nál lassabb specek `[jasmine] slow spec (<ms> ms): <név>` figyelmeztetést kapnak (`src/test.ts`) — egy véletlen 5 s-os timeout gyanúsítottja általában ezek között van. A `src/test.ts` az app ikon-registryjét is betölti (`registerIcons()`), és egy `[Ionicons Warning] Could not load icon` figyelmeztetés bukja a specet (`backlog/158`): a hiányzó ikon a `core/config/icons.ts`-be veendő fel ([[Frontend]] „Kötelező elvek”). Az ikon lazy töltődik, így a hiba ritkán a renderelő spec utáni specen jelenik meg. Ezen a gépen a `karma-chrome-launcher` nem találja meg automatikusan a Chrome-ot: a `CHROME_BIN` env változót explicit be kell állítani a tényleges elérési útra (`C:\Program Files\Google\Chrome\Application\chrome.exe`). Bash toolból: `CHROME_BIN="/c/Program Files/Google/Chrome/Application/chrome.exe" npm run test:ci`.
- Env változók: `POSTGRES_*`, `LM2_JWT_SECRET`, `LM2_ADMIN_API_KEY`. A `.env.example` verziókövetett, a `.env` és a `backend/src/main/resources/application-local.yml` nem — [[Backend]].
- Új user létrehozása fejlesztéshez: admin `curl` — [[Bejelentkezés]].

#### API base URL a kliensen

| Build | `apiBaseUrl` |
|---|---|
| Web (dev / prod) | relatív `/api` — proxy, illetve reverse proxy mögött |
| Natív (Android) | **futásidejű config**: `frontend/src/assets/config/app-config.json` → `{ "apiBaseUrl": "http://<host>:8080/api" }` |

A natív buildben nincs proxy, ezért az abszolút URL kell. Azért **futásidejű asset** és nem `environment.ts`, mert így a telepítő szkript egyetlen JSON mező átírásával célozhat másik hosztot, TS-szerkesztés és külön build-konfiguráció nélkül. Az `environment.ts` csak build-time konstansokat tart (`production`); a feature flag config szintén asset — [[Frontend]].

#### Android telepítés a házi hálózaton

Cél: a telefonra kerülő **debug** APK a fejlesztői gépen futó backendet lássa, a saját Wi-Fi hálózaton.

`scripts/install-android.ps1` (PowerShell — a fejlesztői gép Windows), lépések:

1. **Cél hoszt meghatározása:** a default gateway-jel rendelkező interfész IPv4 címe; `-ApiHost <ip|hostname>` paraméterrel felülírható, `-Usb` módban `localhost`.
2. **Config írása:** `frontend/src/assets/config/app-config.json` → `apiBaseUrl` az 1. pont szerint.
3. **Build:** `npm run build`, majd `npx cap sync android`.
4. **APK:** `cd frontend/android && ./gradlew assembleDebug`.
5. **Telepítés:** `adb devices` ellenőrzés, majd `adb install -r app/build/outputs/apk/debug/app-debug.apk`.
6. **Visszajelzés:** a szkript kiírja a beállított `apiBaseUrl`-t, és próbát tesz a `GET /api/health`-re, hogy a hálózati út a telepítés **előtt** kiderüljön.

#### Távoli telepítés — `-Deliver`

Ha a session-t nem a dev LAN-ról vezérled (pl. telefonról), nincs `adb`-vel elérhető eszköz. Ilyenkor
a `-Deliver` kapcsoló az 5–6. lépés helyett a **`dev-apk`** nevű GitHub **prerelease**-re tölti fel az
APK-t, és kiírja a letöltő URL-t:

```
scripts/install-android.ps1 -Deliver
```

- A `dev-apk` prerelease az első futáskor jön létre; minden további futás `--clobber`-rel **felülírja**
  rajta az `app-debug.apk` asset-et — nem szaporodnak a release-ek, és `prerelease: true` miatt nem
  lesz „Latest release" a repo főoldalán.
- A repó **publikus**, így a letöltő URL bejelentkezés nélkül él a telefon böngészőjében:
  `https://github.com/<owner>/<repo>/releases/download/dev-apk/app-debug.apk`. A telefonon egyszer
  engedélyezni kell az „ismeretlen appok telepítése"-t annak az appnak, amelyikből letöltöd.
- **Csak offline-first tesztelésre.** Az `apiBaseUrl` a dev gép aktuális LAN IP-jét kapja (vagy
  `-ApiHost`-ot), ami távolról nem elérhető — a szinkron nem megy, a `Backend-offline` / `Full-offline`
  funkciók viszont igen. A debug APK a **debug** keystore-ral van aláírva (nem a production kulcs).
- Igényli a **GitHub CLI**-t (`gh`) egyszer beléptetve (`winget install --id GitHub.cli`, majd
  `gh auth login`). `-Usb`-vel együtt nem használható. A release asset-ek nem terhelik a repo
  Git-tárhelyét és az LFS-sávszélt; fájlonkénti limit 2 GB.

Kapcsolódási módok:

| Mód | Beállítás |
|---|---|
| **Wi-Fi**, ugyanaz a háló | `apiBaseUrl` = a gép LAN IP-je. Windows tűzfal engedély a **privát** profilon: `New-NetFirewallRule -DisplayName "lm2-backend" -Direction Inbound -Protocol TCP -LocalPort 8080 -Profile Private -Action Allow` |
| **USB kábel** | `adb reverse tcp:8080 tcp:8080`, `apiBaseUrl` = `http://localhost:8080/api` — nincs IP- és tűzfal-kérdés, viszont csak kábellel él |
| **Wireless debugging** (Android 11+) | a telefon fejlesztői menüjéből `adb pair <telefon-ip>:<pair-port>`, majd `adb connect <telefon-ip>:5555`; utána ugyanaz, mint Wi-Fin |

#### Android emulátor a fejlesztői gépen

Telefon nélküli, „rendes Android” út: a projekt saját emulátora, amire ugyanaz a debug APK megy fel, és
ami a gépen futó backendet látja. Wi-Fi, párosítás és tűzfalszabály nem kell.

```
scripts/install-android.ps1 -Emulator          # build + (ha kell) emulátor indítás + telepítés
scripts/android-emulator.ps1                   # csak az emulátor indítása, megvárja a bootot
scripts/android-emulator.ps1 -Headless         # ablak nélkül (agent-munkamenet, képernyőkép adb-vel)
```

- **AVD:** `LM2_Phone` — Android 15 (API 35), `google_apis_playstore` x86_64 image, 1080×2340 @ 480 dpi
  (= **360 dp** széles nézet, a fejlesztői telefonhoz igazítva), 3 GB RAM, GPS-szel. Az
  `android-emulator.ps1` első futáskor **maga hozza létre** (`%USERPROFILE%\.android\avd\LM2_Phone.ini` +
  `LM2_Phone.avd\config.ini`) a legújabb telepített x86_64 system image-ből — `avdmanager` /
  `cmdline-tools` nem kell hozzá. Másik, már létező AVD: `-Avd <név>` (mindkét szkriptben).
  Újralétrehozás: az AVD törlése az Android Studio Device Managerben, majd a szkript újra.
- **Előfeltétel:** Android Studio SDK-ból az *Android Emulator* és legalább egy x86_64 system image
  (SDK Manager), valamint hardveres gyorsítás — ezen a gépen WHPX (Hyper-V), ellenőrzés:
  `emulator-check.exe accel` (az SDK `emulator\` mappájában).
- **Indítás:** a szkript leválasztott folyamatként indítja az emulátort (a shell bezárása után is fut,
  log: `%TEMP%\lm2-emulator-LM2_Phone.log`), majd `sys.boot_completed`-ig vár (alapból max. 300 s,
  `-TimeoutSec`), végül felébreszti a képernyőt és elengedi a zárképernyőt. Ha az AVD már fut, csak
  visszaadja a serialját (`emulator-5554`). A quick-boot snapshot miatt a második indítás pár mp;
  `-ColdBoot` ezt kihagyja. Leállítás: az emulátor ablakának bezárása, vagy `adb -s emulator-5554 emu kill`.
- **`-Emulator` telepítés:** az emulátort a build **előtt** indítja (`-NoWait`), így a boot a builddel
  párhuzamosan fut; az `apiBaseUrl` = **`http://10.0.2.2:8080/api`** — a `10.0.2.2` az emulátor
  NAT-jából a fejlesztői gép `127.0.0.1`-e. A `-ApiHost` felülírja; a `-Usb` / `-Deliver` kapcsolóval nem
  kombinálható. A `GET /api/health` próba a gépről `localhost`-ra megy.
- **Telefon + emulátor egyszerre:** `-Emulator` nélkül a szkript az `emulator-NNNN` serialokat kiszűri,
  tehát mindig a fizikai eszközre telepít; ha csak emulátor csatlakozik, `-Emulator`-t kér.
- Az app az emulátorban ugyanaz a debug build, mint a telefonon (cleartext + `androidScheme: 'http'`,
  CORS: `http://localhost` origin) — semmi emulátor-specifikus kód vagy config nincs.

Hasznos `adb` parancsok az emulátorhoz (`adb -s emulator-5554 …`, ha a telefon is csatlakozik):

| Mit | Parancs |
|---|---|
| Képernyőkép | `adb exec-out screencap -p > screen.png` |
| App indítása | `adb shell monkey -p hu.bumler.lm2 -c android.intent.category.LAUNCHER 1` |
| Repülőgép mód be / ki | `adb shell cmd connectivity airplane-mode enable` / `disable` |
| GPS pozíció | `adb emu geo fix <hosszúság> <szélesség>` (pl. `19.0402 47.4979`); útvonal-lejátszás: emulátor ablak → *Extended controls → Location → Routes* (GPX/KML import) |
| WebView debug | Chrome: `chrome://inspect` → a `hu.bumler.lm2` WebView (debug build) |
| App log | `adb logcat -s Capacitor:* Capacitor/Console:*` |
| Adatok törlése (első indítás újra) | `adb shell pm clear hu.bumler.lm2` |

Két Android-oldali beállítás, amit a projektnek **egyszer** el kell végeznie, különben a fenti út csendben nem működik:

- **Cleartext HTTP:** az Android 9+ tiltja a titkosítatlan forgalmat, tehát egy `http://192.168.x.y:8080` hívás alapból elhasal. Kell egy `network_security_config.xml`, amely a fejlesztői hosztokra engedi a cleartextet, és **kizárólag a `debug` varianthoz** van kötve — a release build maradjon HTTPS-only.
- **CORS:** a natív Capacitor WebView origin nem `null`, hanem az `androidScheme` szerinti (`https://localhost`), tehát a backend `local` profilja engedélyezze ezt az origint. A böngészős fejlesztés a proxy miatt nem igényel CORS-t.

A szkript (`scripts/install-android.ps1`), a debug-only cleartext network-security-config (`frontend/android/app/src/debug/res/xml/network_security_config.xml`) és a `local` profil `https://localhost` CORS-engedélye (`SecurityConfig`) mind a repóban van.

#### Geo-csomag másik gépen

A geo build asset ([[Backend-offline first]] §15: DEM, bicikli- és turistaút-úthálózat csempénként) a
`frontend/src/assets/geo/` alatt él, **git-ignored**: a repóban nincs, minden fejlesztői gépen elő kell
állítani. Előállítja: `scripts/build-geo-assets.mjs` (`cd frontend && npm run build:geo-assets`).
A forrásokat a `%TEMP%\lm2-geo-cache\` alá tölti le, így az újrafuttatás a cache-ből gyors.

Friss klónon, sorrendben:

1. `cd frontend && npm install` — a `geotiff` build-only függőség is innen jön.
2. Postgres és backend fut (`docker compose up -d db`, `cd backend && ./gradlew bootRun`), és a
   turistaút-hálózat be van importálva: `node scripts/import-hiking-trails.mjs` (`LM2_ADMIN_API_KEY` a
   `.env`-ből). A turistaút-csempék forrása ugyanis nem az OSM PBF, hanem a helyi `trail_segment`
   tábla — a builder közvetlenül a `.env` Postgres-adataival olvassa.
3. `cd frontend && npm run build:geo-assets` — első futáskor kb. 1 óra: letölti a 28 Copernicus
   GLO-90 DEM-GeoTIFF-et (~140 MB) és a Geofabrik `hungary-latest.osm.pbf`-et (~326 MB). Egy máshol
   meglévő PBF a `--pbf <fájl>` kapcsolóval adható meg. Részleges újragenerálás: `--skip-dem`,
   `--skip-bike`, `--skip-hike` (a kihagyott rész a meglévő manifestből marad); `--force` a cache-t
   is újratölti.
4. Ellenőrzés: `frontend/src/assets/geo/manifest.json` létezik; `dem/` 28, `bike/` 336, `hike/` 336
   fájl; a `dem` bejegyzések `stepLon` / `stepLat` értéke `0.000833333333` (1/1200 fok).
5. Az APK-build (`scripts/install-android.ps1`, vagy `npm run build` + `npx cap sync android`) a
   csomagot beviszi az APK-ba.

**2026-10-20 előtt generált csomag:** a régi builder a DEM rács-geometriáját (origó, lépés) 6
tizedesre kerekítette (`0.000833`). Ettől a minta ~40 m-rel elcsúszott, és minden egész fokos
csempehatáron egy ~90 m-es sávban nem volt magasság. Ilyen csomagon csak a DEM-et kell újragenerálni
(a cache-ből ~40 s), utána az APK-t újraépíteni:

```
cd frontend && npm run build:geo-assets -- --skip-bike --skip-hike
```

**Ki használja még:** a katalógus-import (`scripts/import-curated-routes.mjs`) a szint- és
időértéket ebből a DEM-ből számolja, az app kódjával (`backlog/217`). Hiányzó vagy
régi (kerekített) manifesttel hibaüzenettel megáll, és kiírja a teendőt.

Csomag nélkül az app és a tesztek futnak, de a DEM- és az úthálózat-adat hiányzik: a túra-magasság
az Open-Meteo-tól jön (online), offline `~`. A
csomag verziója a `manifest.json` `generatedAt` mezője; a forrás-PBF dátumát a manifest nem rögzíti.

#### Backend-offline

A fejlesztői környezet nem futásidejű feature, de az offline állapotok **kézi teszteléséhez** ez a jegyzet adja az utat (elfogadási kritériumok: [[Backend-offline first]] §18):

| Állapot | Hogyan állítható elő |
|---|---|
| `BACKEND_OFFLINE` | A backend leállítása (`docker compose stop` / `bootRun` megszakítása), miközben a telefonon / emulátoron van internet — a külső API-k (Open Food Facts) továbbra is működnek |
| `FULL_OFFLINE` | Repülőgép mód a telefonon; emulátoron `adb shell cmd connectivity airplane-mode enable` |
| Cold start offline | Repülőgép mód **majd** app indítás — a lista olvasható és a mentés sikeres kell legyen |
| `410 CURSOR_TOO_OLD` | A `sync_meta.tombstone_horizon` előre állítása a dev DB-ben |

### Backend

- A `docker-compose.yml`-ben pinelt Postgres image tag **ugyanaz**, amit a Testcontainers használ a tesztekben — különben a teszt nem azon fut, amin a fejlesztés ([[Backend]]).
- A dev DB named volume-on él, tehát `docker compose down` nem törli az adatot; teljes újraindulás: a volume explicit törlése + Flyway a nulláról.
- `application-local.yml` és `.env`: git-ignorált, titkot verziókövetésbe nem teszünk.

### Nyitott kérdések

- iOS build és eszközre telepítés: `> Tervezett: backlog/004-ios-build-es-telepites.md` (az iOS Health lépés-forrás: `backlog/002-ios-health-lepes-forras.md`).
- Prod üzemeltetés / hosting és TLS: `> Tervezett: backlog/006-prod-hosting-tls.md`.
