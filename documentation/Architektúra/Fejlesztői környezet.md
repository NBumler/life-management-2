# Fejlesztői környezet

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend]], [[Backend-offline first]], [[Bejelentkezés]] |

### Célállapot

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet: a tartalom az `## Architektúra` alatt van. Ez a fájl a **monorepo elrendezés, a fejlesztői futtatás és a saját (házi) hálózaton történő Android telepítés SSOT-ja**. A repóban lévő `claude-hobby-starter-kit` konvencióira épül (`backend/` + `frontend/`, Gradle, `npm run gen:api`, dev proxy).

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
scripts/               # fejlesztői szkriptek (Android telepítés)
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
| Tesztek | `./gradlew test` · `npm test` (interaktív, `ChromeHeadlessCI` helyett `Chrome`-mal, watch módban) · `npm run test:ci` (nem-interaktív, egyszeri futás — CI és agent-munkamenetek ezt használják) |

- A **web** kliens **relatív** `/api` útvonalat hív (dev: proxy, prod: reverse proxy) — így nincs CORS a böngészős fejlesztésben.
- `npm run test:ci` (`frontend/`) a `karma.conf.js`-ben definiált `ChromeHeadlessCI` launcher-t használja (`ChromeHeadless` + `--no-sandbox --disable-gpu`), és `--watch=false`-szal egyszer fut le. Ezen a gépen a `karma-chrome-launcher` nem találja meg automatikusan a Chrome-ot: a `CHROME_BIN` env változót explicit be kell állítani a tényleges elérési útra (`C:\Program Files\Google\Chrome\Application\chrome.exe`). Bash toolból: `CHROME_BIN="/c/Program Files/Google/Chrome/Application/chrome.exe" npm run test:ci`.
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

Kapcsolódási módok:

| Mód | Beállítás |
|---|---|
| **Wi-Fi**, ugyanaz a háló | `apiBaseUrl` = a gép LAN IP-je. Windows tűzfal engedély a **privát** profilon: `New-NetFirewallRule -DisplayName "lm2-backend" -Direction Inbound -Protocol TCP -LocalPort 8080 -Profile Private -Action Allow` |
| **USB kábel** | `adb reverse tcp:8080 tcp:8080`, `apiBaseUrl` = `http://localhost:8080/api` — nincs IP- és tűzfal-kérdés, viszont csak kábellel él |
| **Wireless debugging** (Android 11+) | a telefon fejlesztői menüjéből `adb pair <telefon-ip>:<pair-port>`, majd `adb connect <telefon-ip>:5555`; utána ugyanaz, mint Wi-Fin |

Két Android-oldali beállítás, amit a projektnek **egyszer** el kell végeznie, különben a fenti út csendben nem működik:

- **Cleartext HTTP:** az Android 9+ tiltja a titkosítatlan forgalmat, tehát egy `http://192.168.x.y:8080` hívás alapból elhasal. Kell egy `network_security_config.xml`, amely a fejlesztői hosztokra engedi a cleartextet, és **kizárólag a `debug` varianthoz** van kötve — a release build maradjon HTTPS-only.
- **CORS:** a natív Capacitor WebView origin nem `null`, hanem az `androidScheme` szerinti (`https://localhost`), tehát a backend `local` profilja engedélyezze ezt az origint. A böngészős fejlesztés a proxy miatt nem igényel CORS-t.

A szkript maga a `frontend/` projekt felállításakor születik meg (ma még nincs kód a repóban); a fenti lépéssor és paraméterezés a szerződése.

#### Backend-offline

A fejlesztői környezet nem futásidejű feature, de az offline állapotok **kézi teszteléséhez** ez a jegyzet adja az utat (elfogadási kritériumok: [[Backend-offline first]] §18):

| Állapot | Hogyan állítható elő |
|---|---|
| `BACKEND_OFFLINE` | A backend leállítása (`docker compose stop` / `bootRun` megszakítása), miközben a telefonon van internet — a külső API-k (Open Food Facts) továbbra is működnek |
| `FULL_OFFLINE` | Repülőgép mód a telefonon |
| Cold start offline | Repülőgép mód **majd** app indítás — a lista olvasható és a mentés sikeres kell legyen |
| `410 CURSOR_TOO_OLD` | A `sync_meta.tombstone_horizon` előre állítása a dev DB-ben |

### Backend

- A `docker-compose.yml`-ben pinelt Postgres image tag **ugyanaz**, amit a Testcontainers használ a tesztekben — különben a teszt nem azon fut, amin a fejlesztés ([[Backend]]).
- A dev DB named volume-on él, tehát `docker compose down` nem törli az adatot; teljes újraindulás: a volume explicit törlése + Flyway a nulláról.
- `application-local.yml` és `.env`: git-ignorált, titkot verziókövetésbe nem teszünk.

### Nyitott kérdések

- Prod üzemeltetés / hosting és TLS — [[Backend]].
- iOS build és eszközre telepítés: nem scope az első körben ([[Lépésszám követés]] iOS Health szintén későbbi).
