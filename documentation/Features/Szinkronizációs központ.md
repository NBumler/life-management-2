# Szinkronizációs központ

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Backend-offline first]], [[Frontend]] |

### Célállapot

Dedikált kezelőfelület a hálózati hibák vagy térerőhiány miatt az SQLite Outbox Queue-ban ragadt offline kérések vizuális menedzselésére.

A [[Backend-offline first]] miatt, ha a Backend-offline (vagy Full-offline) állapotból kilépünk — azaz elérhetővé válik a backend —, a Queue-ba rakott hívásokat le kell futtatni; ez a felület ezt is segíti / felügyeli.

### Funkcionális leírás

#### Globális akciók

- **Szinkronizálás most:** kézi drain indítás (majd pull) — [[Backend-offline first]]. Ha nincs backend, a felület ezt jelzi, és a sor változatlan marad.

#### Manuális akciók (gombok a sorok mellett)

1. **Szerkesztés és Újraküldés (Fix):** Megnyitja a tétel adatait egy szerkesztő űrlapon, majd a javítás után újra `PENDING` állapotba rakja a sorban. Tipikus eset: egyediségi ütközés (`409 UNIQUE_VIOLATION`) — átnevezés után újraküldés.
2. **Átugrás (Skip):** A tétel `SKIPPED` státuszba kerül. Kimarad a feldolgozásból, de **nem törlődik** (a payload megőrződik), és feloldja az adott ID-hoz tartozó függőségi zárat, hogy a motor a rákövetkező, független elemeket szinkronizálhassa.
3. **Törlés (Drop):** Véglegesen törli a kérést a sorból. Ha a tétel egy soha nem szinkronizált entitás létrehozása volt, a helyi sor is eltűnik (hard remove — [[Backend-offline first]]).

### UI/UX elvárások

* **Útvonal:** `/tabs/dashboard/sync`
* **Megnyitás:** A Dashboard felső státuszbárjában lévő offline/szinkronizációs ikonra kattintva (Menü / státusz — lásd [[Frontend]]), illetve egy hibásan jelölt listaelemre tapolva.
* **Fejléc:** aktuális kapcsolat-állapot (`ONLINE` / `BACKEND_OFFLINE` / `FULL_OFFLINE`), várakozó és hibás tételek száma, utolsó sikeres szinkronizálás ideje.
* **Időrendi lista:** a sorban lévő összes kérést mutatja `sequence` szerint, státusz-jelöléssel:

| Státusz | Jelölés |
|---|---|
| `PENDING` | Szürke óra ikon |
| `SENDING` | Forgó ikon |
| `BLOCKED` | Szürkített sor + „egy korábbi hibás tételre vár” magyarázat |
| `ERROR` | Piros figyelmeztetés + a pontos szerveroldali hibaüzenet (`code` + `message`) |
| `SKIPPED` | Áthúzott / halvány sor + „átugorva” címke |

* Soronként: entitástípus, művelet (`POST` / `PUT` / `DELETE`), létrehozás ideje, próbálkozások száma.
* **Adatmentő modal (Payload View):** Minden sor mellett ikon; felugró ablakban a küldeni kívánt raw JSON, hogy a begépelt információk hiba esetén se vesszenek el.
* **Üres állapot:** „Minden szinkronizálva” + az utolsó sikeres sync ideje.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `OfflineQueueService` + SQLite outbox megjelenítése és manuális vezérlése. Az outbox adatmodellje, a státuszok (`PENDING` / `SENDING` / `BLOCKED` / `ERROR` / `SKIPPED`), a FIFO és a függőségi zár SSOT-ja: [[Backend-offline first]].
- Ez a felület **nem** tartalmaz saját sync logikát: a `SyncEngine` műveleteit (drain, pull) hívja és jeleníti meg.
- Csak natív platformon jelenik meg: a web build online-only, nincs outbox ([[Frontend]], [[Backend-offline first]]).

#### Backend-offline

Ez a felület az outbox vezérlése Backend-offline / Full-offline után. Maga a mechanizmus: [[Backend-offline first]].

### Backend

- A queue elemei a saját backend **normál** REST végpontjaira mennek (`POST` / `PUT` / `DELETE`) — külön „write sync API” nincs.
- Az egyetlen dedikált sync végpont az olvasási delta (`GET /api/sync/changes`) és az elérhetőség-próba (`GET /api/health`) — szerződés: [[Backend]], SSOT: [[Backend-offline first]].
- A hibasorokhoz a szerver egységes hibaformátumot ad (`code` + `message` + `field`), ez jelenik meg a listában — [[Backend-offline first]].

### Nyitott kérdések

Nincs nyitott kérdés.
