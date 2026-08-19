# Backend-offline first

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend]], [[Szinkronizációs központ]], [[Bejelentkezés]], [[Tápérték kalkulátor]], [[Vonalkódos élelmiszer beolvasás]], [[Lépésszám átszinkronizálása a Samsung Health-ből]], [[Gyakorlat]] |

### Célállapot

_Nincs business érintettség._

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Architektúra jegyzet — ez a fájl az **offline működés SSOT-ja**. Minden feature spec `#### Backend-offline` alfejezete ide hivatkozik, és nem definiálhat ettől eltérő mechanizmust.

#### Felhasználói ígéret (egy mondatban)

A natív alkalmazás **a saját backend nélkül is teljes értékű**: minden adat olvasható, minden rögzítés elvégezhető, minden számítás lefut, és semmi nem veszik el — a szerverre kerülés csak időben csúszik.

#### Fogalmak

| Állapot | Internet | Saját backend | Jelentés |
|---|---|---|---|
| `ONLINE` | van | elérhető | Normál működés. |
| `BACKEND_OFFLINE` | van | **nem** elérhető | A saját szerver nem válaszol (leállás, deploy, tűzfal, VPN). A **külső** API-k viszont működnek. |
| `FULL_OFFLINE` | **nincs** | nem elérhető | Repülőgép mód, térerőhiány. Csak helyi adat és eszközön belüli API-k. |
| `UNKNOWN` | ? | ? | Cold start, az első próba előtt. A UI úgy viselkedik, mint offline (nem várakozik hálózatra). |

A `BACKEND_OFFLINE` / `FULL_OFFLINE` különbség **kizárólag a külső API-knál** számít (pl. [[Vonalkódos élelmiszer beolvasás]] Open Food Facts hívása mehet, ha van internet). A helyi olvasás/írás és az outbox viselkedése a kettőben **azonos**.

#### Fogalmi táblázat a specekhez

| Kifejezés | Jelentés |
|---|---|
| **Helyi store** | A készüléken lévő SQLite adatbázis; a UI **kizárólag** ebből olvas. |
| **Outbox** | A még el nem küldött módosító kérések helyi sora. |
| **Drain** | Az outbox feldolgozása (feltöltés a szerverre). |
| **Pull** | A szerveroldali változások lehúzása a helyi store-ba. |
| **Tombstone** | Soft delete-elt sor (`deleted = true`), ami synchelhető törlésként. |
| **Dirty sor** | Olyan helyi sor, amire van még el nem küldött módosítás. |

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

#### 1. Hatókör és platform

| Platform | Offline támogatás |
|---|---|
| **Natív** (Android / iOS, Capacitor) | **Teljes** — helyi SQLite store + outbox + pull. Ez a spec erre vonatkozik. |
| **Web** (böngészős build) | **Online-only.** Nincs helyi SQLite, nincs outbox, nincs optimista írás. Backend nélkül a web build olvasni és írni sem tud: egyértelmű „nincs kapcsolat” állapot, újrapróbálkozás gombbal. |

- Build-time / runtime képesség-flag: `offlineCapable` (natív = `true`, web = `false`). A feature kód **nem** ágazhat el platform-stringre, csak erre a flagre.
- Weben minden mutáció közvetlen HTTP hívás; hiba esetén a form állapota **megmarad** (nem ürítjük), a user újrapróbálhat.
- Web offline támogatás: nem scope (lásd §17).

#### 2. Alapelvek

1. **Local-first írás:** minden mutáció **először** a helyi store-ba és az outboxba kerül — akkor is, ha van backend. Nincs „próbáld online, hiba esetén queue” ág; egyetlen kódút van, így az offline eset nem külön (és ritkán tesztelt) viselkedés.
2. **A helyi store a UI igazsága:** a képernyők soha nem várnak hálózati válaszra. A szerver a **konvergencia** hatósága, nem a megjelenítés forrása.
3. **Kliensoldali ID:** minden szinkronizált entitás ID-ját a kliens generálja a létrehozás pillanatában (UUID v4), így az offline műveletek láncolhatóak (Létrehozás → Módosítás → Használat). Természetes kulcsú entitásoknál **determinisztikus UUID v5** (§9).
4. **Idempotens írás:** minden módosító kérés újrajátszható következmény nélkül (kliens UUID + `Idempotency-Key` + upsert szemantika).
5. **Pragmatikus duplikáció:** a felhasználónak megjelenő számításokat pure TypeScript utility-ként a frontenden is implementáljuk (kalóriabevitel, MET-ek, lépés-szorzók, nettó bér, `nextDue`, naptár-vetítés), hogy offline is teljes értékűek legyenek.
6. **Soft delete:** a szinkronizált entitások törlése tombstone (`deleted` / `deleted_at`), hogy a törlés multi-device synchelhető legyen (ne `404`). Kivétel: soha nem szinkronizált helyi draft elvetése → helyi **hard remove** + outbox tisztítás.
7. **Cold start offline:** az indulási útvonalon **nincs** blokkoló hálózati hívás. Az app repülőgép módban, első másodpercben is használható.
8. **Nincs csendes adatvesztés:** amit a user begépelt, az nem tűnhet el. A sikertelen tétel a payloadjával együtt látható és javítható a [[Szinkronizációs központ]]ban.
9. **Bizonytalanság ≠ offline:** a `~` / homokóra **nem** a hálózati állapotot jelzi (§14).

#### 3. Helyi tároló

- **Technológia:** SQLite (Capacitor plugin — a végleges választás: [[Frontend]]).
- **User-izoláció:** **külön adatbázisfájl userenként** (`lm2_<userId>.db`). Más user bejelentkezésekor a korábbi user adatai érintetlenül maradnak a saját fájljában, de nem keverednek — [[Bejelentkezés]].
- **Táblák:** entitástípusonként egy tábla, a generált OpenAPI DTO mezőivel, plusz sync-metaadat oszlopok:

| Oszlop | Leírás |
|---|---|
| `deleted` / `deleted_at` | Tombstone (a listák `deleted = false`-ra szűrnek). |
| `created_at` / `updated_at` | A **szerver** által adott audit értékek (pullból). |
| `_dirty` | `1`, ha van erre a sorra még el nem küldött outbox tétel. |
| `_local_only` | `1`, ha a sor még **soha** nem került fel a szerverre. |
| `_sync_error` | `1`, ha a sorhoz tartozó outbox tétel `ERROR` státuszban van (listajelöléshez). |

- **Séma-migráció:** verziózott migrációk (`schema_version` tábla). A migráció **soha nem dobhatja el az outboxot** és a `_dirty` sorokat.
- **Shared katalógus** (`Food`, `Recipe`, `RecipeIngredient` — [[Bejelentkezés]] ownership mátrix) ugyanebben a user-DB-ben él. Ugyanazon eszközön több user esetén a shared katalógus fizikailag duplikálódik — az elsődleges (személyes) használat mellett ez elfogadott.
- **Nincs bináris tartalom** a helyi store-ban az első körben (nincs kép / fájl feltöltés).
- `sync_state` tábla: `cursor`, `last_pull_at`, `last_pull_status`, `first_pull_completed`.
- `seed_state` tábla: melyik seed-verzió futott már le ([[Gyakorlat]], §15).

#### 4. Outbox — adatmodell

Minden módosító művelet (`POST` / `PUT` / `DELETE`) egy `outbox_item` sor:

| Mező | Típus | Leírás |
|---|---|---|
| `id` | UUID | Az **outbox tétel** azonosítója (nem az entitásé). Ez megy az `Idempotency-Key` headerben. |
| `sequence` | Integer | Monoton növekvő helyi számláló — **ez** a FIFO rendezés kulcsa. |
| `createdAt` | Timestamp | Készülék órája; csak megjelenítés / naplózás (a szerver órája az autoritatív). |
| `userId` | UUID | Tulajdonos user; a drain csak az aktuális user tételeit futtatja. |
| `method` | Enum | `POST` / `PUT` / `DELETE` |
| `url` | String | **Relatív** API útvonal (base URL nélkül, hogy környezetváltás ne rontsa el a visszajátszást). |
| `payload` | JSON | Kérés body (`DELETE`-nél `null`). |
| `payloadVersion` | Integer | Az app séma-verziója a beírás pillanatában (§7). |
| `entityType` | String | Pl. `HouseholdTask` — csoportosítás, coalescing, UI címke. |
| `targetEntityId` | UUID | Az érintett entitás kliens-UUID-ja. |
| `dependsOn` | JSON array&lt;UUID&gt; | Azon entitások ID-i, amiknek **előbb** létre kell jönniük a szerveren (szülők). |
| `status` | Enum | `PENDING` / `SENDING` / `BLOCKED` / `ERROR` / `SKIPPED` |
| `attemptCount` | Integer | Próbálkozások száma (backoff / feladás). |
| `lastAttemptAt` | Timestamp | Backoff számításhoz. |
| `httpStatus` | Integer? | Utolsó szerverválasz kód. |
| `errorCode` | String? | Gépi hibakód (`UNIQUE_VIOLATION`, `VALIDATION_ERROR`, …). |
| `errorMessage` | String? | Megjelenítendő szerveroldali hibaüzenet. |

##### Státuszok

| Státusz | Jelentés |
|---|---|
| `PENDING` | Sorban áll, feldolgozásra vár. |
| `SENDING` | Épp fut. App-crash / kill után induláskor visszaállítjuk `PENDING`-re (a művelet idempotens, biztonságos újrapróbálni). |
| `BLOCKED` | Nem hibás, de egy korábbi `ERROR` tételtől függ. **Számított** állapot: a drain minden futás elején újraszámolja. |
| `ERROR` | Végleges, user-beavatkozást igénylő hiba (validáció, egyediségi ütközés, jogosultság, kimerült újrapróbálkozás). |
| `SKIPPED` | A user átugrotta a [[Szinkronizációs központ]]ban. Kimarad a drainből, de **nem törlődik**, és a rá épülő tételek függőségi zárja feloldódik. |

##### Függőségi zár

Egy tétel `BLOCKED`, ha van nála **kisebb `sequence`-ű, `ERROR` státuszú** tétel, amelynek `targetEntityId`-ja szerepel

- ennek a tételnek a `targetEntityId`-jában (ugyanaz az entitás láncban), **vagy**
- ennek a tételnek a `dependsOn` listájában (szülő entitás).

`SKIPPED` tétel **nem** blokkol — pontosan ez a Skip funkció célja. Minden más tétel („független ág”) tovább szinkronizálódik.

#### 5. Írási út (local-first)

Egy user-akció (pl. „Mentés”) lépései:

1. **ID-generálás:** minden új entitásra kliens UUID (v4, vagy v5 természetes kulcs esetén — §9).
2. **Egyetlen helyi SQLite tranzakció:** az entitás sor(ok) írása (`_dirty = 1`, új sornál `_local_only = 1`) **és** az outbox tétel(ek) beszúrása. Ha a tranzakció elhasal, semmi nem történt — nincs félbevágott állapot.
3. **UI azonnal a helyi store-ból renderel.** A user sikeres mentést lát; ez nem „optimista” hazugság, hanem a helyi igazság.
4. `SyncEngine.requestDrain()` — nem blokkoló. Ha nincs backend, a tétel egyszerűen vár.

##### Outbox-összevonás (coalescing)

A beszúrás előtt, **csak `PENDING`** tételekre, ugyanarra a `targetEntityId`-ra:

| Meglévő | Új művelet | Eredmény |
|---|---|---|
| `POST(X)` | `PUT(X)` | A `POST` payloadja frissül. **Nem** jön létre új tétel. |
| `PUT(X)` | `PUT(X)` | A meglévő tétel payloadja felülíródik (a `PUT` teljes body, ezért biztonságos). |
| `POST(X)` | `DELETE(X)` | Mindkettő törlődik az outboxból; az entitás **helyi hard remove** (soha nem syncelt draft elvetése). |
| `PUT(X)` | `DELETE(X)` | A `PENDING` `PUT`-ok eldobandók, csak a `DELETE` marad. |
| `DELETE(X)` | bármi X-re | Tilos — törölt entitás nem szerkeszthető (nincs undelete UI). |
| Természetes kulcsú upsert | ismételt mentés | A meglévő `PENDING` tétel payloadja frissül — pl. napi `DailyStepLog` ugyanarra a `date`-re ([[Lépésszám követés]]). |

`SENDING` / `ERROR` / `SKIPPED` tételt **nem** módosítunk. Ilyenkor új tétel jön létre, amely a függőségi zár miatt automatikusan `BLOCKED` lesz, amíg a korábbi tétel nem rendeződik.

##### Kliensoldali cascade

Ahol a törlés a helyi adatokon is végigfut (pl. [[Eszközök]] `GearItem` törlése a sablon- és pakolás-tételeken), a kliens a helyi sorokat `deleted = true`-ra állítja **ugyanabban a tranzakcióban**, de **külön outbox tétel nem jön létre** a gyerekekre: a szerver a szülő `DELETE`-jére maga cascade-el, és a drain utáni pull igazolja vissza a teljes hatást (§8).

#### 6. Drain (szinkronizációs motor)

**Trigger:** app start (a helyi store készen áll után), `BACKEND_OFFLINE` → `ONLINE` átmenet, app resume, sikeres login / token refresh, minden user-mutáció után (debounce ~1 s), és a manuális „Szinkronizálás most” a [[Szinkronizációs központ]]ból.

**Algoritmus:**

1. Mutex: egyszerre **egy** drain fut.
2. Kilépés, ha nincs autentikált user vagy a backend nem elérhető.
3. `BLOCKED` státuszok újraszámolása.
4. Tételek `sequence` szerint növekvő sorrendben, ahol `status = PENDING`, és a backoff ideje lejárt.
5. **Szekvenciális** végrehajtás (nincs párhuzamosítás) — a FIFO és a függőségek miatt.
6. Fejlécek: `Authorization: Bearer <accessToken>`, `Idempotency-Key: <outbox.id>`.
7. Válasz feldolgozása a hibaosztályozás szerint (lásd lent).
8. **Siker:** a szerverválasz DTO-ja beíródik a helyi store-ba (`_dirty = 0`, `_local_only = 0`, `updated_at` a szerverétől), az outbox tétel **törlődik**.
9. **A drain után kötelezően `pull()`**, ha volt legalább egy sikeres tétel — a szerveroldali cascade-ek (pl. `Food` törlés → hivatkozó sorok minden usernél) csak így kerülnek be a helyi store-ba.

##### Állapotfelismerés

- Internet: Capacitor `Network` plugin (jelzés, nem garancia).
- Backend: `GET /api/health` (publikus, olcsó), timeout **3 s**. Passzív jelzés: bármely kérés `status 0` / timeout válasza is „backend nem elérhető”-re állít.
- Próba időpontjai: app start, resume, `Network` állapotváltozás, drain előtt, és offline állapotban növekvő backoff-fal (15 s → 30 s → 60 s → max 5 min).
- Az állapot egy globális signal / store; a UI **soha nem várakozik** a próbára.

##### Hibaosztályozás (kötelező tábla)

| Válasz | Kategória | Teendő |
|---|---|---|
| `status 0`, timeout, DNS | hálózat | A tétel `PENDING` marad, a drain **leáll**, az állapot `BACKEND_OFFLINE` / `FULL_OFFLINE`, backoff próba. |
| `401` | auth | Token refresh; siker → ugyanaz a tétel újra. Refresh fail → drain leáll, user a login képernyőre ([[Bejelentkezés]]); az outbox **megmarad**. |
| `403` | jogosultság | `ERROR` (kézi rendezés). |
| `404` | hiányzó cél | `DELETE` → **siker** (idempotens). `PUT` / `POST` → `ERROR`. |
| `409` `ENTITY_DELETED` | törölt entitás | A tétel **csendben eldobandó** (nem `ERROR`): a törlés győz, `PUT` nem undo. A helyi sor `deleted = true`. |
| `409` `UNIQUE_VIOLATION` | egyediségi ütközés | `ERROR` + a szerver hibaüzenete a [[Szinkronizációs központ]]ban; kézi javítás vagy eldobás (§9). |
| `400` / `422` | validáció | `ERROR` (kézi javítás vagy eldobás). |
| `408` / `429` / `5xx` | tranziens | `attemptCount++`, exponenciális backoff. **5 próbálkozás** után `ERROR`, hogy a user lássa. |
| `410` `CURSOR_TOO_OLD` | (csak pullnál) | Full re-pull (§8). |
| `2xx` | siker | Lásd a 8. lépést. |

Backoff lépcső (jitterrel): 2 s → 8 s → 30 s → 2 min → 10 min.

#### 7. Payload-verziózás (app frissítés)

Az outbox tételek **túlélik az alkalmazás frissítését** ([[Bejelentkezés]]: a session is megmarad), ezért egy tétel payloadja egy **korábbi** DTO séma szerint készülhetett.

- Minden tétel `payloadVersion`-t kap az app `SCHEMA_VERSION`-jából.
- A drain előtt: ha `payloadVersion < SCHEMA_VERSION`, egy `OutboxMigrator` lépésenként (v1→v2→…) átalakítja a payloadot és az `url`-t.
- Ha az adott lépéshez **nincs** regisztrált migráció, a tétel `ERROR` lesz, egyértelmű üzenettel („az alkalmazás frissült, a tételt kézzel kell újraküldeni”). A begépelt adat nem veszik el: a [[Szinkronizációs központ]] payload-nézete megmutatja a raw JSON-t.
- **Fejlesztői szabály:** minden breaking DTO- vagy útvonal-változáshoz vagy outbox migrációt írunk, vagy tudatosan vállaljuk az `ERROR`-t. Ez a döntés a PR-ban explicit.

#### 8. Olvasási út — pull (delta sync)

A helyi store feltöltése és frissítése egy **dedikált delta-sync végponton** történik: `GET /api/sync/changes?since=<cursor>` (szerződés: [[Backend]]). Egy hívás minden entitástípus változásait adja, **tombstone-okkal együtt**.

- **Cursor:** opaque string (szerveroldali `updated_at` + `id` tiebreaker). **Nem** nyers timestamp — így az azonos milliszekundumban módosult sorok és az óracsúszás nem tüntet el változásokat.
- **Első pull** (friss telepítés vagy első login): `since` nélkül → teljes snapshot lapozva (`hasMore` / `nextCursor`). A UI „első szinkronizálás” progresszt mutat, a részlegesen letöltött adat közben olvasható.
- **Trigger:** app start, resume (ha `last_pull_at` régebbi, mint 5 perc), manuális sync, és **minden sikeres drain után**.
- **Sorrend: először drain, aztán pull.** Így a helyi írásaink már a szerveren vannak, és a pull azokat is visszaigazolja; fordított sorrendben a pull felülírná a `_dirty` sorokat.

##### Apply-szabályok (soronként)

| Helyi állapot | Szerver változás | Eredmény |
|---|---|---|
| Nincs helyi sor | update | Beírás. |
| Nincs helyi sor | `deleted = true` | A tombstone-t **is** beírjuk, hogy a sor később ne „jöjjön vissza”. |
| `_dirty = 0` | update | Felülírás a szerver adatával. |
| `_dirty = 0` | `deleted = true` | Helyi `deleted = true`. |
| `_dirty = 1` | update | **A helyi (pending) érték marad a UI-ban.** A szerver értékét nem írjuk a megjelenített mezőkbe; a drain utáni szerverválasz rendezi el (sor-szintű LWW). |
| `_dirty = 1` | `deleted = true` | **A tombstone győz:** helyi `deleted = true`, a `PENDING` `PUT`-ok eldobandók (nincs resurrect). Ha a user épp szerkeszti a sort, figyelmeztetést kap, hogy a tétel törlődött. |
| `ERROR` outbox tétel az entitásra | bármi | A szerver adata beíródik, de az `ERROR` tétel **megmarad** a [[Szinkronizációs központ]]ban — a user dönt (javít / eldob). |

##### Kötelező garanciák

- A pull **soha nem törli** a `_local_only` sorokat és **soha nem törli** az outboxot. Sikertelen pull / sync **nem** üríthet helyi adatot ([[Profile]]: a helyi profil és súlytörténet nem veszhet el).
- A szerveroldali **cascade** soft delete-ek (`Food` / `Recipe` törlés minden user hivatkozó adatára; `GearItem` → sablon- és pakolás-tételek; helyiség → feladatok) tombstone-ként jönnek a deltában. Ezért kötelező a drain utáni pull.
- **Elavult cursor:** ha a `since` régebbi a szerveroldali tombstone-retenciónál, a szerver `410 Gone` + `CURSOR_TOO_OLD` választ ad → a kliens **full re-pull**-t végez. A `_dirty` sorok és az outbox ilyenkor is megmaradnak.
- A pull mindig **teljes tranzakcióban** commitol egy lapot: félbevágott állapot nincs, a `cursor` csak sikeres apply után lép.

#### 9. Konfliktus- és ütközéskezelés

##### Update vs update

**Sor-szintű last-write-wins:** a szerver a **beérkezés** sorrendjében fogadja az írásokat, a `PUT` teljes body, tehát a később megérkező írás nyer. Nincs mezőszintű merge, nincs ETag / verziószám / optimistic locking az első körben — az adat egyetlen user sajátja, a valós ütközés ritka és a veszteség köre egy sor.

##### Delete vs update

A **tombstone mindig győz.** `PUT` egy törölt entitáson nem undo: a szerver `409` + `ENTITY_DELETED`, a kliens csendben eldobja a tételt (nem user-hiba). Listák `deleted = false`; saját törölt sor `GET` by id → `200` + `deleted = true`.

##### Egyediségi ütközés (`409 UNIQUE_VIOLATION`)

A vault sok helyen definiál **élő sorokra** vonatkozó egyediséget, amit két offline eszköz egyszerre megsérthet:

| Kényszer | Spec |
|---|---|
| `Food` — **minden** mező egyezése tiltott | [[Élelmiszerek]], [[Élelmiszer manuális bevitele]] |
| `Recipe.name` + hozzávaló-halmaz | [[Recept]] |
| `Exercise.name` (user katalógusán belül) | [[Gyakorlat]] |
| `GearItem.name`, `PackingTemplate.name` | [[Eszközök]], [[Sablonok]] |
| `HouseholdRoom.name`, `HouseholdTask.name` (helyiségen belül) | [[Háztartási feladatok]] |
| `AycmPartner.name`, árszabály-intervallum átfedés | [[AYCM elfogadóhely hozzáadása]] |
| `GymColorBand.hexColor` (termen belül) | [[Indoor boulder admin]] |

**Kezelés:** a tétel `ERROR` státuszt kap, és a user a [[Szinkronizációs központ]]ban **kézzel** rendezi (Szerkesztés és Újraküldés → pl. átnevezés, vagy Törlés). Nincs automatikus átnevezés és nincs automatikus összevonás: a katalógus-tartalom a user döntése.

- A szerver hibaválasza megadja a `field`-et és a `code`-ot, hogy a UI érdemi üzenetet mutasson.
- A kliens az érintett helyi soron `_sync_error = 1`-et állít; a lista pirosan jelzi és tap-re a [[Szinkronizációs központ]]ba visz.
- Fontos: ezeket az egyediségeket a kliens **beírás előtt is** ellenőrzi a helyi adaton (a feature specek ezt megkövetelik) — így csak a valódi multi-device verseny okoz `409`-et.

##### Determinisztikus UUID a természetes kulcsú entitásokra

Ahol az entitásnak természetes kulcsa van, a kliens **UUID v5**-öt generál fix projekt-namespace-ből, `name = "<EntityType>:<userId>:<naturalKey>"` alapon. Így **két eszköz ugyanazt az ID-t generálja**, a második írás automatikusan update lesz → nincs `409`, az adat magától konvergál.

| Entitás | `name` összetevő | Megjegyzés |
|---|---|---|
| `UserProfile` | `UserProfile:<userId>` | 1:1 user — [[Profile]] |
| `DailyStepLog` | `DailyStepLog:<userId>:<date>` | Szerver upsert; Health Connect max-wins — [[Lépésszám követés]] |
| `AycmCheckIn` | `AycmCheckIn:<userId>:<checkInDate>` | Napi egyediség — [[AYCM Check-In]] |
| `AycmSettings` | `AycmSettings:<userId>` | 1:1 user — [[AYCM tracker]] |
| `WeeklyPlan` | `WeeklyPlan:<userId>:<weekStartDate>` | Heti kulcs — [[Heti terv]] |
| `Exercise` (seed sorok) | `Exercise:<userId>:<seedKey>` | A seed két eszközön **nem** duplikálja a katalógust — [[Gyakorlat]] |

A determinisztikus ID a **sync konvergenciát** oldja meg; a felhasználói szintű validáció (pl. „második élő Check-In ugyanarra a napra → hiba”) a helyi UX-ben változatlanul megmarad.

Minden más entitás: **UUID v4**.

##### Ismert korlát: számláló-jellegű műveletek

A sor-szintű LWW **nem összegez**: ha két eszköz offline ugyanazt a sort *relatívan* módosítja, csak az utolsó írás marad. Két érintett hely:

| Művelet | Következmény két eszköz offline használatánál |
|---|---|
| Készletlevonás étkezés rögzítésekor ([[Élelmiszer tárolás]], [[Étkezés]]) | Mindkét eszköz a **saját** kiinduló mennyiségéből számol → a felkerülő `StoredFood.quantityAmount` az egyik eszközé lesz, a másik levonása „elveszik” (a készlet a valóságnál nagyobbnak látszik). |
| „Fizetve” a [[Rendszeres kiadások]]nál | A `nextBillingDate` a **tárolt** értékhez ad egy periódust; két eszköz két tapja után is csak **egy** periódus lép. |

Ez az elsődleges (egyszemélyes, jellemzően egy aktív eszköz) használat mellett elfogadott: az adat nem sérül, csak egy relatív lépés veszik el, és a user a felületen látja és javíthatja. **Nem** vezetünk be számláló / delta szemantikát, CRDT-t vagy szerveroldali összegzést az első körben (§17).

Ugyanez a megfontolás magyarázza, miért nem baj a shared katalógus (`Food`, `Recipe`) cascade törlése: destruktív, de nem *relatív* művelet — a tombstone deterministikusan győz, tehát minden eszköz ugyanoda konvergál.

#### 10. Függőségi láncok (a vault konkrét esetei)

Minden gyerek-tétel `dependsOn` listájába bekerül azon **szülők ID-ja, amelyeket ugyanebben a munkamenetben, még nem syncelt állapotban** hoztunk létre. Már szerveren lévő szülőre nem kell függőség.

| Lánc | Spec |
|---|---|
| `Food` → `StoredFood` → `Meal` / `MealItem` | [[Élelmiszerek]], [[Élelmiszer tárolás]], [[Étkezés]] |
| `Food` → `Recipe` + `RecipeIngredient` → `MealItem (RECIPE)` | [[Recept]], [[Recept forrású étkezés]] |
| `HouseholdRoom` → `HouseholdTask` (többhelyiséges create) | [[Háztartási feladatok]] |
| `AycmPartner` → `AycmPriceRule` → `AycmCheckIn` | [[AYCM elfogadóhely hozzáadása]], [[AYCM Check-In]] |
| `GearItem` → `PackingTemplateItem` → `PackingSessionItem` | [[Eszközök]], [[Sablonok]], [[Pakolás]] |
| `Exercise` → `WorkoutPlan` → `WeeklyPlan` slot → `WorkoutSession` | [[Gyakorlat]], [[Heti terv]], [[Edzésnapló]] |
| `Gym` → `GymColorBand` → `ClimbingSession` → `AscentAttempt` | [[Indoor boulder admin]], [[Indoor boulder napló]] |
| `Crag` → `Sector` → `Route` / `BoulderProblem` → session / attempt | [[Outdoor boulder admin]], [[Outdoor köteles admin]] |
| `RecurringExpense` → `AycmSettings.linkedRecurringExpenseId` | [[Rendszeres kiadások]], [[AYCM tracker]] (laza csatolás, nincs DB-FK) |

#### 11. Atomi, többentitásos műveletek

Ha **egy** user-akció több entitást módosít elválaszthatatlanul, akkor dedikált szerver-végpont kell, és a kliens **egyetlen** outbox tételt hoz létre — így nincs részlegesen szinkronizált állapot:

| Művelet | Végpont | Spec |
|---|---|---|
| Bevásárlás befejezése (archiválás + N `StoredFood` + új aktív lista) | `POST /api/shopping-lists/{id}/complete` | [[Bevásárlás teljesítve]] |
| Nested aggregate mentés: `WorkoutSession` + entries + sets | egy `POST` / `PUT` a teljes fával | [[Edzésnapló]] |
| Nested aggregate mentés: `ClimbingSession` + attempts | egy `POST` / `PUT` | [[Mászónapló]] |
| Nested aggregate mentés: `Recipe` + hozzávalók; `PackingTemplate` + tételek | egy `POST` / `PUT` | [[Recept]], [[Sablonok]] |

Ahol a művelet **nem** elválaszthatatlan (pl. `Food` létrehozása, majd később a tárolásba vétele), külön outbox tételek mennek `dependsOn` függőséggel.

#### 12. Auth és offline

Kiegészíti a [[Bejelentkezés]] specet, nem írja felül.

| Helyzet | Viselkedés |
|---|---|
| **Első login** (credential küldés) | Backend kell. `BACKEND_OFFLINE` / `FULL_OFFLINE` → „nincs kapcsolat”. **Offline login nincs.** |
| Bejelentkezett user, nincs backend | Minden helyi olvasás / írás megy; a drain vár. |
| Access token lejárt, van refresh, van net | Csendes refresh, majd a tétel újra. |
| Access token lejárt, `FULL_OFFLINE` | A drain nem fut, a helyi munka folytatódik. **Nincs kiléptetés.** |
| Refresh érvénytelen (jelszócsere / admin revoke) | Login képernyő. Az outbox **megmarad**, és a sikeres újra-bejelentkezés után lefut. |
| Kijelentkezés pending tételekkel | A UI figyelmeztet („N szinkronizálatlan változás”), és felajánlja a kijelentkezést vagy a mégse-t. Kijelentkezésnél az **auth tokenek** törlődnek, a **helyi DB és az outbox nem** — a következő bejelentkezésnél folytatódik. |
| Szerveroldali logout revoke offline | Nem entitás-mutáció → **nem** outbox tétel. A helyi tokenek azonnal törlődnek. |

- Az outbox **user-scope-olt** (`userId`): a drain kizárólag az aktuális user tételeit futtatja; másik user tételei érintetlenül várnak a saját DB-jükben.
- Az auth tokenek **soha** nem részei az entitás-outboxnak (külön secure store — [[Bejelentkezés]]).

#### 13. Külső API-k

Elv: a külső integrációk **soha nincsenek** a saját backenden proxyzva ([[Backend]]) — így `BACKEND_OFFLINE` állapotban is működnek, amíg van internet.

| Külső hívás | `ONLINE` | `BACKEND_OFFLINE` | `FULL_OFFLINE` |
|---|---|---|---|
| Open Food Facts (`world.openfoodfacts.org/api/v2/product/{barcode}.json`) | megy | **megy** | nem — a vonalkód elmenthető, a sync gomb később lefuttatja ([[Vonalkódos élelmiszer beolvasás]]) |
| Vonalkód kamera (`@capacitor-mlkit/barcode-scanning`) | megy | megy | **megy** (eszközön belüli) |
| Android Health Connect / Samsung Health | megy | megy | **megy** (eszközön belüli API — [[Lépésszám átszinkronizálása a Samsung Health-ből]]) |
| Google Calendar OAuth / API | megy | megy | vár ([[Google Calendar szinkronizálása]]) |
| Lokális értesítések ütemezése | megy | megy | **megy** (OS ütemező — [[Értesítések]]) |
| Clipboard import parse | megy | megy | **megy** (helyi parser — [[Élelmiszer importálása clipboard-ról]]) |

- Minden külső hívásra timeout (javaslat: 8 s); a fő flow nem blokkolhat rajta.
- A külső hívás eredményéből született saját entitás a **normál** outbox úton megy fel.

#### 14. Számítás, `~` és bizonytalanság

- **Minden felhasználónak megjelenő számítás kliensoldali pure TS utility**, tehát offline is teljes értékű: BMR / TDEE / makró és MET-ek ([[Tápérték kalkulátor]]), lépéskalória ([[Lépésszám követés]]), nettó bér ([[Nettó fizetés kalkulátor]]), havi ekvivalens és `addPeriod` ([[Rendszeres kiadások]]), `nextDue` és naptár-vetítés ([[Háztartási feladatok]], [[Események]], [[Naptár]]), nehézségi index ([[Nehézségi szint skálája (konverziós mátrix)]]), tápanyag- és ár-összegzés ([[Recept]], [[Étkezés]]), AYCM megéri-e ([[AYCM tracker]]), kereső-rangsor ([[Szöveges keresés]]), mennyiség-parser ([[Mennyiség mező]]).
- **A `~` / homokóra jelentése:** a szám **nem számolható, mert hiányzik egy bemenet** — pl. üres `grossMonthlySalaryHuf` ([[Pénzügyek]]), hiányos [[Profile]], `passCostComputable = false` ([[AYCM tracker]]). **Nem** jelent offline becslést, és **soha nem** a hálózati állapot miatt jelenik meg.
- A hálózati állapotot **kizárólag** a globális offline indikátor és a [[Szinkronizációs központ]] jelzi (§16).
- Nem számolható érték **soha nem menthető 0-ként** a helyi store-ba vagy a szerverre; a `~` megjelenítési állapot, nem adat.
- Szerveroldali paritás: ahol a backend is számol (TDEE validáció / read-model, nehézségi index újraszámolás), ugyanazokat a konstansokat használja. A kanonikus konstanslisták: [[Tápérték kalkulátor]], [[Nehézségi szint skálája (konverziós mátrix)]].

#### 15. Seed és statikus asset

- **Build asset** (Full-offline is elérhető): nehézségi konverziós mátrix JSON, `Exercise` seed fájl, i18n (`hu.json` / `en.json`), enumok, feature flag konfiguráció.
- Az `Exercise` seed sorai **user-owned másolatok determinisztikus v5 ID-vel** (§9) → többeszközös első indulás nem duplikálja a katalógust és nem ütközik a `name` egyediségbe.
- A seed create-ek **normál outbox tételek** (offline első indulásnál is működik).
- `seed_state` tábla tartja, melyik seed-verzió futott le; a seed nem fut újra minden induláskor.

#### 16. UI elvárások offline állapotban

- **Globális állapotjelző** a Dashboard felső sávjában (belépő a [[Szinkronizációs központ]]ba):

| Állapot | Jelzés |
|---|---|
| `ONLINE`, üres outbox | Nincs jelzés (vagy halvány pipa). |
| Szinkronizálás fut | Forgó / progressz ikon. |
| `BACKEND_OFFLINE` / `FULL_OFFLINE` | Offline ikon (a kettő megkülönböztethető). |
| N tétel várakozik | Szürke óra + darabszám badge. |
| N tétel hibás | **Piros** figyelmeztetés + darabszám. |

- **Minden mentés offline is sikeres visszajelzést ad** — a helyi tranzakció maga a siker. Tilos hamis „a mentés nem sikerült” hibaüzenet.
- **Sor-szintű jelzés a listákban:** `_dirty` sor mellett halvány óra ikon; `_sync_error` sor pirosan jelölve, tap-re a [[Szinkronizációs központ]]ba visz.
- **Első pull** alatt progressz; a részleges adat olvasható, de a UI jelzi, hogy még töltünk.
- **Nincs blokkoló modális** „offline vagy” figyelmeztetés — az offline a normál működés.
- **Kizárólag online műveletek** (első login, Google OAuth): a gomb `disabled` + rövid magyarázat, miért.
- **Tilos adatvesztő UI:** sikertelen sync miatt űrlapot, listát, begépelt szöveget nem ürítünk.

#### 17. Nem scope (első kör)

- Realtime / push alapú sync (websocket, FCM adatüzenet) — a pull trigger-alapú.
- Mezőszintű merge, CRDT, ETag / verziószám / optimistic locking.
- **Web offline** (a web build online-only — §1).
- Peer-to-peer / helyi hálózati eszköz-eszköz sync.
- Bináris tartalom (kép, fájl) offline queue-ban.
- Remote push értesítés — [[Értesítések]].
- Konfliktus-előzmény / audit napló a kliensen (a `~`-on és az `ERROR` tételeken túl).

#### 18. Elfogadási kritériumok

Az offline működés akkor kész, ha az alábbiak mind teljesülnek:

1. Repülőgép módban **cold start**: minden lista olvasható, minden mentés sikeres, semmi nem várakozik hálózatra.
2. Offline `Food` create → `StoredFood` create → `Meal` create; online visszatéréskor mindhárom felkerül **helyes hivatkozásokkal** (függőségi lánc).
3. Offline create + offline törlés (soha nem syncelt sor): **semmi** nem megy a szerverre, az outbox üres, a helyi sor eltűnt.
4. Offline 5× szerkesztés ugyanazon a soron: **egy** `PUT` megy fel (coalescing).
5. `BACKEND_OFFLINE`: a vonalkód OFF hívása sikeres, a `Food` mentés outboxba kerül.
6. `FULL_OFFLINE`: Health Connect lépésszám olvasás megy; ugyanarra a napra 3× mentés után **egy** outbox tétel van.
7. Két eszköz offline ugyanazzal a névvel hoz létre helyiséget: az egyik `ERROR` (`409`), a [[Szinkronizációs központ]]ban átnevezve újraküldhető; a másik eszköz adata érintetlen.
8. Két eszköz offline rögzít check-int ugyanarra a napra: a determinisztikus ID miatt **update** lesz, nincs `ERROR`.
9. „A” eszköz törli az entitást, „B” offline szerkeszti: B pullja tombstone-t kap, a pending `PUT` eldobódik, **nincs resurrect**.
10. Egy tétel `ERROR`-ba kerül: a rá épülő tételek `BLOCKED`; **Skip** után a független tételek felmennek.
11. Access token lejár offline: **nincs kiléptetés**; online visszatérésnél csendes refresh + drain.
12. Kijelentkezés pending tételekkel: figyelmeztetés; újra bejelentkezés után a tételek lefutnak.
13. App frissítés pending outboxszal: a tételek lefutnak vagy migrálódnak; **semmi nem veszik el**.
14. `410 CURSOR_TOO_OLD`: full re-pull fut, a helyi pending változások és az outbox megmaradnak.
15. Szerveroldali cascade (`Food` törlés): a drain utáni pull után a hivatkozó helyi sorok is tombstone-osak.
16. Hiányos profil: `~` jelenik meg a kereten, az app nem crashel — és a `~` **nem** az offline állapot miatt van.

### Backend

Kiegészíti a [[Backend]] jegyzetet; a szerződés forrása az OpenAPI spec.

#### Kötelező elvek minden szinkronizált entitáson

- **Kliens UUID elfogadása**; szerveroldali `IDENTITY` / auto-increment ID **tilos**.
- Közös oszlopok: `id` (UUID), `created_at`, `updated_at` (szerver állítja minden íráskor), `deleted`, `deleted_at`; user-owned entitáson `user_id` ([[Bejelentkezés]] ownership mátrix).
- Az `updated_at` a **szerver** órája — ez az autoritatív időrend; a kliens `createdAt`-ja csak megjelenítés.

#### HTTP szemantika (SSOT)

| Művelet | Szabály |
|---|---|
| `POST` létező `id`-val | **Idempotens upsert:** `200` + a szerveren lévő (frissített) sor. Nem `409`. Így a queue-visszajátszás és a hálózati bizonytalanság sosem duplikál. |
| `Idempotency-Key` header | Minden módosító kérésen; a szerver a kulcs alapján felismeri az ismételt kérést. |
| `PUT` | **Teljes body** (nincs PATCH az első körben); sor-szintű last-write-wins. |
| `PUT` törölt entitáson | `409` + `{ "code": "ENTITY_DELETED" }` — nem undo. |
| `DELETE` | **Soft delete** (tombstone), **idempotens**: már törölt ID-re `200`. |
| `GET` by id, saját törölt sor | `200` + `deleted = true` (**ne** `404`). |
| `GET` by id, idegen user sora | `404` (ne `403` — enumeration ellen). |
| Listák | Implicit `deleted = false`. |
| Egyediség | **Partial unique index élő sorokra** (`WHERE deleted = false`); sértés → `409` + `{ "code": "UNIQUE_VIOLATION", "field": "…" }`. |
| Validáció | `400` / `422` + `{ "code": "VALIDATION_ERROR", "field": "…" }`. |

Egységes hibaformátum: `{ "code": "...", "message": "...", "field": "...?", "conflictingId": "...?" }`. A `code` gépi feldolgozásra, a `message` a [[Szinkronizációs központ]] hibasorába.

#### Cascade

- A cascade soft delete **egy tranzakcióban** fut (pl. `Food` törlés → hivatkozó tárolás / recept-hozzávaló / bevásárlás-tétel / étkezés-tétel **minden usernél**; `GearItem` → sablon- és pakolás-tételek; helyiség → feladatok).
- **Kritikus követelmény:** a cascade-elt sorok `updated_at`-ja is frissül, különben nem jelennek meg a delta pullban, és a többi eszköz „szellemsorokat” látna.

#### Sync végpontok (az egyetlen dedikált sync API)

| Metódus | Útvonal | Auth | Leírás |
|---|---|---|---|
| `GET` | `/api/sync/changes` | Bearer | Query: `since` (opaque cursor, opcionális), `limit` (default `500`, max `2000`), `types` (opcionális szűrő). |
| `GET` | `/api/health` | publikus | Elérhetőség-próba. Olcsó, DB-kör nélkül; a kliens ebből dönt `BACKEND_OFFLINE`-ról. |

Válasz:

```json
{
  "serverTime": "2026-08-19T01:00:00Z",
  "nextCursor": "opaque-string",
  "hasMore": false,
  "changes": [
    { "entityType": "HouseholdTask", "id": "…", "deleted": false, "updatedAt": "…", "data": { } },
    { "entityType": "Food", "id": "…", "deleted": true, "updatedAt": "…", "data": null }
  ]
}
```

- **Tartalom:** a hívó user **user-owned** sorai + a **shared** katalógus (`Food`, `Recipe`, `RecipeIngredient`) változásai. Device-local adat (nyelv, téma, értesítés-kapcsolók) **nem** syncelődik ([[Bejelentkezés]]).
- **Rendezés:** `(updated_at, id)` növekvő; a `nextCursor` az utolsó kiadott sor kulcsa. Tombstone-nál a `data` lehet `null`.
- **Elavult cursor:** `410` + `{ "code": "CURSOR_TOO_OLD" }`.
- **Tombstone-retenció:** legalább **180 nap** a `deleted_at`-tól; ennél régebbi tombstone fizikailag is törölhető.
- A queue által visszajátszott `POST` / `PUT` / `DELETE` továbbra is a **normál** üzleti végpontokra megy — külön „write sync API” nincs, csak ez az olvasási delta végpont.

#### Upsert és atomi végpontok

- `DailyStepLog`: upsert `(user_id, date)` szerint ([[Lépésszám követés]]); a szerveroldali max-wins opcionális (a kliens már max-wins-t alkalmaz).
- Nested aggregate `PUT`: a teljes fa cseréje egy body-ban ([[Edzésnapló]], [[Mászónapló]], [[Recept]], [[Sablonok]]).
- `POST /api/shopping-lists/{id}/complete`: archiválás + `StoredFood` create-ek + új aktív lista **egy** tranzakcióban ([[Bevásárlás teljesítve]]).

#### Amit a szerver **nem** tesz

- Nem tart nyilván kliens-oldali offline állapotot, nem sorol, nem ütemez visszafelé.
- Nem auto-rollol dátumokat és nem számol havi ekvivalenst ([[Rendszeres kiadások]]).
- Nem számolja újra a snapshot mezőket (pl. AYCM check-in árszabály-illesztés — a payload a snapshot).
- Nem proxyz külső API-t ([[Vonalkódos élelmiszer beolvasás]], Health Connect, Google).

### Nyitott kérdések

- Helyi SQLite **titkosítás** (SQLCipher vagy ekvivalens): kell-e az első körben? A napló adatok személyesek, de az auth tokenek már platform secure store-ban vannak ([[Bejelentkezés]]).
- A Capacitor SQLite plugin és a séma-migrációs tooling végleges választása — [[Frontend]].
- A `/api/sync/changes` `limit` finomhangolása és az első pull adatmennyisége (mérés után; ha nagy, típusonkénti prioritált első pull kell).
