---
verifikalva: 2026-09-03
verifikalt_commit: 2f99631
---

# Bejelentkezés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Backend]], [[Frontend]], [[Profile]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

Felhasználói autentikáció és authorizáció: a személyes (user-owned) adatok felhasználónként elkülönítve tárolódnak; a közös katalógusok minden bejelentkezett user számára elérhetők. **Nincs** in-app regisztráció — új usert üzemeltető `curl` (admin API) hoz létre. A session **tartós**: app verziófrissítés / újratelepítés nélküli frissítés **nem** jelentkezteti ki a usert; idle timeout / forced re-login **nincs**. Egy tervezett Google login ugyanarra a token-modellre köthető.

### Funkcionális leírás

#### User entitás (`User`)

| Mező | Szabály |
|---|---|
| `id` | UUID (szerver generálhatja user létrehozáskor — ez **nem** offline entitás) |
| `username` | Kötelező; **case-sensitive** (szándékos kivétel a [[Névegyediség]] szabálya alól: `alice` ≠ `Alice`); egyedi; hossz **3–32**; engedélyezett karakterek: `a-z`, `A-Z`, `0-9`, `.`, `_`, `-` (regex: `^[a-zA-Z0-9._-]{3,32}$`) |
| `passwordHash` | Csak szerveren; soha nem kerül API válaszba / OpenAPI kliens modellbe |
| `role` | Mindig `USER` (egyetlen alkalmazás-szerep) |
| `createdAt` / `updatedAt` | Audit |

**Nincs** email, display name, avatar, telefon ([[Profile]] a személyes / cél mezők helye).

#### Regisztráció — nincs UI

- In-app regisztráció / meghívó link / self-service signup: **nem** scope.
- Új user és jelszócsere / reset: **csak** admin API `curl`-lel (lásd Architektúra → Backend → Admin curl).
- „Elfelejtett jelszó” flow: **nincs**.

#### Bejelentkezés (UI)

- Nem autentikált állapotban: login képernyő (`username` + `password` + Bejelentkezés).
- Sikeres login → access + refresh token tárolása → app főfelület (tabok).
- Hibás credential: általános hibaüzenet (ne árulja el, hogy username vagy jelszó rossz).

#### Kijelentkezés (UI)

- Belépés: **Menü → Kijelentkezés** (megerősítő dialógus ajánlott).
- Hatás: az adott eszköz refresh tokenje revoke-olódik a szerveren (ha elérhető); helyi auth tokenek törlődnek; a user a login képernyőre kerül.
- Backend-offline / Full-offline kijelentkezés: helyi tokenek azonnal törlődnek; a szerveroldali revoke outboxba kerülhet **vagy** legközelebbi online login/refresh kísérletkor a régi refresh már érvénytelen — implementációs részlet, a UI szempontból a user ki van jelentkezve.

#### Session / „soha ne jelentkeztessen ki”

- Nincs idle timeout, nincs periodikus forced re-login, nincs „session lejárt, jelentkezz be újra” a mindennapi használatban.
- **Új alkalmazásverzió telepítése / frissítése** (Capacitor / store update): a biztonságos token-tároló **megmarad** → a user bejelentkezve marad.
- Access token lejárat: a `401` válasz után az interceptor **átlátszóan** frissít refresh tokennel és újrapróbálja a kérést (single-flight koordinátor). A frissítés jelenleg **reaktív** (nincs proaktív, lejárat előtti megújítás) — tervezett: `backlog/018-auth-proaktiv-csendes-access-token-frissites-lejarat-elott.md`. Sikertelen refresh után a session törlődik (`AuthSessionService.clear()`), és az app-shell (`AppComponent`) egy `isAuthenticated()` effect-tel **azonnal** a `/login` képernyőre navigál — nem várja meg a következő guardolt navigációt. A navigáció csak az autentikált → nem-autentikált átmenetre lép, és nem fut le, ha a user már a `/login`-on van.
- Explicit kijelentkezés, admin általi user törlés / jelszócsere utáni összes token revoke, vagy refresh token érvénytelenítése: ezek **szándékos** kiléptetések.

#### Több eszköz

- Ugyanaz a `User` telefonon és gépen (Ionic hibrid) párhuzamosan használható.
- Eszközönként külön refresh token (session); az egyik eszköz kijelentkezése **nem** dobja ki a többit.
- User-owned adatok syncelődnek a saját backend felé ([[Backend-offline first]], [[Szinkronizációs központ]]); shared katalógusok minden user / eszköz között közösek.

#### Elfelejtett / új jelszó

- Nincs self-service. Üzemeltető `curl`-lel új jelszót állít (admin API).
- Jelszócsere után: az adott user **összes** refresh tokenje revoke (minden eszköz újra bejelentkezik) — biztonsági minimum.

### UI/UX elvárások

- Login: egyszerű űrlap; username mező auto-focus; jelszó alapból maszkolt, de a mezőben lévő szem-ikon togglelehetővé teszi a megjelenítést (elgépelés kizárása) — nincs külön állapot-mentés, minden képernyő-belépéskor újra maszkolt.
- Menü: **Kijelentkezés** tétel (auth feature flag / mindig, ha a Bejelentkezés feature be van kapcsolva).
- Nincs regisztráció link a login képernyőn.

### Megjegyzések

- Google (és egyéb OAuth) login: nincs implementálva, tervezett; ugyanaz a `User` + JWT access/refresh kibocsátás a sikeres OAuth után. Username+password megmaradhat párhuzamosan.
- [[Pénzügyek]] **user-owned** (hubnak nincs saját entitása; `RecurringExpense` a [[Rendszeres kiadások]]ban). A mátrix és a `userId` szűrés kötelező.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Login page; auth guard / interceptor: védett route-ok csak bejelentkezve.
- Generált OpenAPI kliens: `Authorization: Bearer <accessToken>`; 401 → refresh → retry (single-flight `token-refresh-coordinator`); refresh fail → session `clear()`, majd az `AppComponent` `isAuthenticated()` effect **azonnal** `/login`-ra navigál (nem a következő guardolt navigációkor).
- Token tárolás: **platform secure storage** — `@aparajita/capacitor-secure-storage` (natív: Keychain / EncryptedSharedPreferences; web: a plugin web-fallbackja, nem httpOnly cookie — a web build amúgy is online-only). App update után megmarad.
- Helyi SQLite / store: **userId-hoz kötött**. Más user bejelentkezése előtt az előző user helyi adatai ne keveredjenek (izolált DB / kulcstér, vagy wipe + full pull).
- Menü → Kijelentkezés: [[Frontend]] navigáció.

#### Backend-offline

- **Új login** (credential küldés): saját backend kell (Backend-offline / Full-offline → hiba / „nincs kapcsolat”).
- **Már bejelentkezett user:** helyi user-owned és shared (már lehúzott) adatok olvasása / írása Backend-offline és Full-offline esetén is megy; mutációk outbox ([[Szinkronizációs központ]]).
- Lejárt access token + van érvényes refresh: net mellett csendes refresh; Full-offline-ban a helyi munka folytatódik, sync a kapcsolat visszajöttével.
- Auth tokenek **nem** részei az entitás-outboxnak (külön auth session store).
- Lásd [[Backend-offline first]].

### Backend

#### Stack / mechanizmus

- Spring Security + JWT.
- **Access token:** rövid élettartam (ajánlott: 15–60 perc); payload: `sub` = userId, `username`, `role=USER`.
- **Refresh token:** TTL **fix 180 nap**, és minden `refresh` rotál (a régi sor `revoke()`) — így egy aktívan használt eszköz gyakorlatilag nem jár le, de revoke / jelszócsere azonnal érvényteleníti. Szerveren **hashelve** tárolva (SHA-256 base64); eszközönként külön sor (`userId`, `tokenHash`, `createdAt`, `expiresAt`, `revokedAt`, opcionális `deviceLabel` — utóbbi jelenleg nincs kitöltve).
- OpenAPI: `securitySchemes` (HTTP Bearer JWT); publikus: `POST /auth/login`, `POST /auth/refresh`; védett: minden üzleti API; admin: külön API-key header.
- Jelszó: erős hash (pl. BCrypt / Argon2); plaintext soha nem naplózandó.

#### Authorizáció

- Szerep: csak `USER`. Nincs `ADMIN` role az alkalmazásban.
- Végpont-védelem: `SecurityConfig` `authorizeHttpRequests().anyRequest().authenticated()` (nincs `@PreAuthorize` annotáció); a `permitAll` lista: `/api/health`, `/api/auth/login`, `/api/auth/refresh`.
- **User-owned** entitások: minden query / mutáció a `SecurityContext` `userId`-jára szűr; idegen `id` → 404 (ne 403 enumeration).
- **Shared** entitások (`Food`, `Recipe`, …): bármely autentikált `USER` CRUD; nincs `userId` oszlop ownershipra.
- Admin user-kezelés: **nem** JWT role, hanem `X-Admin-Api-Key` (env / secret) a `/api/admin/**` alatt.

#### Auth végpontok (elvárás)

| Metódus | Útvonal | Auth | Leírás |
|---|---|---|---|
| `POST` | `/api/auth/login` | publikus | body: `{ username, password }` → `{ accessToken, refreshToken, expiresIn }` |
| `POST` | `/api/auth/refresh` | refresh token | új access (+ opcionális refresh rotáció) |
| `POST` | `/api/auth/logout` | Bearer | aktuális refresh revoke |
| `POST` | `/api/admin/users` | `X-Admin-Api-Key` | új user (`username`, `password`) |
| `PUT` | `/api/admin/users/{username}/password` | `X-Admin-Api-Key` | jelszó csere + **összes** refresh revoke |

#### Admin curl — új user

```bash
curl -sS -X POST "$API_BASE/api/admin/users" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: $ADMIN_API_KEY" \
  -d '{"username":"alice","password":"choose-a-strong-password"}'
```

Siker: `201` + user DTO **jelszó nélkül** (`id`, `username`, `role`, …). Ütköző username: `409`.

#### Admin curl — jelszó csere / reset

```bash
curl -sS -X PUT "$API_BASE/api/admin/users/alice/password" \
  -H "Content-Type: application/json" \
  -H "X-Admin-Api-Key: $ADMIN_API_KEY" \
  -d '{"password":"new-strong-password"}'
```

Siker: `204` (vagy `200`); az `alice` user minden eszközön újra be kell jelentkezzen. Ezt a
teljes-session-revoke viselkedést a `AuthAndProfileFlowTests
.adminPasswordChange_revokesEverySession_thenNewPasswordWorks` integrációs teszt fedi (két eszköz
refresh tokene is `401`-et kap a csere után).

#### Login curl (opcionális ellenőrzés)

```bash
curl -sS -X POST "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","password":"choose-a-strong-password"}'
```

#### Ownership mátrix (SSOT)

A DB / API réteg ownership döntései. Új feature specifikálásakor ezt a táblát kell követni / bővíteni.

##### Shared (globális, nincs user ownership oszlop)

| Adat | Spec | Megjegyzés |
|---|---|---|
| `Food` élelmiszer-katalógus | [[Élelmiszerek]] | Bármely autentikált user CRUD. Törlés cascade: **minden** user hivatkozó adatára (tárolás, étkezés tétel, recept hozzávaló, bevásárlás tétel, …) — a megerősítő UI jelezze, hogy közös katalógus. |
| `Recipe` + hozzávalók | [[Recept]] | Ugyanígy shared; cascade étkezés-hivatkozásokra minden usernél. |
| Nehézségi konverziós mátrix JSON | [[Nehézségi szint skálája (konverziós mátrix)]] | Repo / build asset, nem user tábla. |
| MET / BMR / PAL / adó% konstansok | [[Tápérték kalkulátor]], [[Nettó fizetés kalkulátor]] | Kód / utility. |
| Open Food Facts | [[Vonalkódos élelmiszer beolvasás]] | Külső API; a mentett `Food` shared. |
| i18n, enumok, feature flag-ek | [[Nyelv választás]], [[Life Management 2.0]] | App asset / config. |
| Gyakorlat **seed fájl** | [[Gyakorlat]] | A belőle másolt sorok user-owned. |

##### User-owned (`userId` / SecurityContext szűrés)

| Adat | Spec |
|---|---|
| `UserProfile`, `WeightHistoryEntry` | [[Profile]] |
| `DailyStepLog` | [[Lépésszám követés]] |
| Edzés sessionök, `Exercise` katalógus (seed másolatok) | [[Edzésnapló]], [[Gyakorlat]], [[Heti terv]] |
| Indoor `Gym` / sávok / beltéri utak | [[Indoor boulder admin]], [[Indoor köteles admin]] |
| Outdoor `Crag` / `Sector` / `Route` / `BoulderProblem` | [[Outdoor boulder admin]], [[Outdoor köteles admin]] |
| Mászó / úszás / bicikli naplók | [[Mászónapló]], [[Úszás napló]], [[Biciklizés napló]] |
| `StoredFood`, `Meal` / tételek, bevásárlólisták | [[Élelmiszer tárolás]], [[Étkezés]], [[Bevásárlás]] |
| AYCM: `AycmSettings`, partnerek, árszabály, check-in | [[AYCM tracker]] |
| GearCheck: eszközök, sablonok, pakolás futás | [[Eszközök]], [[Sablonok]], [[Pakolás]] |
| Háztartási feladatok, élet tervek (`LifePlan`), események (`CalendarEvent`), tennivalók | [[Háztartási feladatok]], [[Élet tervek]], [[Események]], [[Tennivalók]] |
| Rendszeres kiadások (`RecurringExpense`) | [[Rendszeres kiadások]], [[Pénzügyek]] |
| Outbox queue | eszköz + user kontextus — [[Szinkronizációs központ]] |

##### Device-local (nem sync a saját profilba)

Profil-szintű (több-eszközös) sync tervezett: `backlog/007-profil-szintu-beallitas-sync.md`.

| Adat | Spec |
|---|---|
| Nyelvpreferencia | [[Nyelv választás]] |
| Dark / Light téma | [[Dark&Light mode]] |
| Értesítés típus-kapcsolók + dedupe napló | [[Értesítések]] |

### Nyitott kérdések

Nincs nyitott kérdés.
