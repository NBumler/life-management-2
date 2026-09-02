---
verifikalva: 2026-09-02
verifikalt_commit: 9a41447
---

# Szinkronizációs központ

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Backend-offline first]], [[Frontend]], [[Névegyediség]] |

### Jelenlegi működés

Dedikált kezelőfelület a hálózati hibák vagy térerőhiány miatt az SQLite Outbox Queue-ban ragadt offline kérések vizuális menedzselésére.

A [[Backend-offline first]] miatt, ha a Backend-offline (vagy Full-offline) állapotból kilépünk — azaz elérhetővé válik a backend —, a Queue-ba rakott hívásokat le kell futtatni; ez a felület ezt is segíti / felügyeli.

**A felület a motor kezelőszerve, nem maga a motor.** Minden mechanika (outbox adatmodell, státuszok, FIFO, függőségi zár, a Fix / Skip / Unskip / Drop hatása) SSOT-ja: [[Backend-offline first]]. Itt az van leírva, hogy ebből mit lát és mit indíthat a user.

### Funkcionális leírás

#### Globális akciók

- **Szinkronizálás most:** kézi drain indítás (majd pull) — [[Backend-offline first]]. Ha nincs backend, a felület ezt jelzi, és a sor változatlan marad.

#### Tétel-szintű akciók

Melyik művelet melyik státusznál érhető el:

| Státusz | Elérhető akciók |
|---|---|
| `PENDING` / `BLOCKED` | Payload megtekintése |
| `SENDING` | Payload megtekintése (a tétel épp fut, nem módosítható) |
| `ERROR` | **Fix**, **Skip**, **Drop**, payload megtekintése |
| `SKIPPED` | **Unskip**, **Drop**, payload megtekintése |

1. **Szerkesztés és Újraküldés (Fix):** a tétel adatai szerkesztő űrlapon nyílnak meg; mentés után a tétel visszakerül a sorba (`PENDING`). Tipikus eset: egyediségi ütközés (`409 UNIQUE_VIOLATION`) — átnevezés után újraküldés. A javítás **a helyi entitássort is** módosítja, tehát a user a listákban is a javított nevet látja, nem csak a queue-ban.
2. **Átugrás (Skip):** a tétel `SKIPPED` státuszba kerül. Kimarad a feldolgozásból, de **nem törlődik** (a payload megőrződik), és feloldja az adott ID-hoz tartozó függőségi zárat, hogy a motor a rákövetkező, független elemeket szinkronizálhassa.
3. **Vissza a sorba (Unskip):** az átugrott tétel újra `PENDING` lesz. A felküldendő adat a **jelenlegi** helyi állapotból származik, tehát időközben szerkesztett entitásnál nem a régi, elavult verzió megy fel.
4. **Törlés (Drop):** véglegesen törli a kérést a sorból. A helyi sor sorsa a [[Backend-offline first]] szabálya szerint alakul: soha nem szinkronizált létrehozásnál a helyi sor is eltűnik, egyébként a sor **visszaáll a szerver szerinti állapotra**. Ezt a megerősítő párbeszéd kimondja, mert a user szemszögéből ez adatvesztés.

#### Fix szerkesztő

- **Generikus, payload-vezérelt űrlap** — nem entitásonként külön képernyő. A tétel payloadjának **egyszerű mezőit** (szöveg, szám, logikai, dátum, felsorolás) sorolja fel beviteli mezőként.
- A szerver által megjelölt hibás mező (`field`) **kiemelve és fókuszban** nyílik, felette a szerver hibaüzenetével — így az `UNIQUE_VIOLATION` javítása egy átnevezés, nem keresgélés.
- Névmező javításánál ugyanaz az ütközés-ellenőrzés fut, mint a rendes űrlapokon ([[Névegyediség]]): a user már mentés előtt lássa, ha a beírt új név szintén foglalt.
- **Összetett (beágyazott) payload** — minden nested aggregate entitás, amit a [[Backend-offline first]] §11 egy body-ban ment: [[Edzésnapló]] (`WorkoutSession` + entries + sets), [[Mászónapló]] (`ClimbingSession` + `AscentAttempt`), [[Recept]] (hozzávalókkal), [[Sablonok]] (`PackingTemplate` + tételek) — **egyikük sem** szerkeszthető ezen az űrlapon: ilyenkor a Fix nem elérhető, a tétel csak átugorható vagy eldobható, a payload pedig megtekinthető. **Tudatos korlát**, ami **egységesen** vonatkozik minden nested aggregate típusra, nem csak az edzésnaplóra: a valós hibák túlnyomó része felső szintű skalár mezőn keletkezik.

### UI/UX elvárások

* **Útvonal:** `/tabs/menu/sync` (nincs Dashboard tab — az app-shell SSOT-ja: [[Frontend]])
* **Megnyitás:** A minden tab fejlécében megjelenő offline/szinkronizációs státuszjelzőre kattintva ([[Frontend]] — globális chrome), a Menü listából, illetve egy hibásan jelölt listaelemre tapolva.
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
* **Adatmentő modal (Payload View):** Minden sor mellett ikon; felugró ablakban a küldeni kívánt raw JSON, hogy a begépelt információk hiba esetén se vesszenek el. Ez a nézet **csak olvasható** — a szerkesztés a Fix űrlapon történik, mert az a helyi sort is karbantartja.
* **Drop megerősítés:** kötelező, és kimondja a következményt („a módosítás elvész, a tétel visszaáll a szerveren tárolt állapotra”). Ha a tételre más tételek épülnek, a párbeszéd megmutatja, **hány további tétel** dobódik el vele együtt.
* **Üres állapot:** „Minden szinkronizálva” + az utolsó sikeres sync ideje.
* A felület **nem** takarja el a hibát: amíg van `ERROR` tétel, a tabok fejlécében lévő státuszjelző is jelzi ([[Frontend]]).

### Megjegyzések

A Fix szándékosan **nem** a rendes entitás-szerkesztő űrlapot nyitja meg. A [[Backend-offline first]] coalescing szabálya szerint `ERROR` tételt nem módosítunk: a normál úton történő szerkesztés **új** outbox tételt hozna létre, amely a függőségi zár miatt azonnal `BLOCKED` lenne a hibás tétel mögött — vagyis a javítás sosem menne fel. Ezért a Fix a tételen dolgozik közvetlenül, a helyi sorral együtt, egy tranzakcióban.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `OfflineQueueService` + SQLite outbox megjelenítése és manuális vezérlése. Az outbox adatmodellje, a státuszok (`PENDING` / `SENDING` / `BLOCKED` / `ERROR` / `SKIPPED`), a FIFO, a függőségi zár és a Fix / Skip / Unskip / Drop pontos hatása: [[Backend-offline first]].
- Ez a felület **nem** tartalmaz saját sync logikát: a `SyncEngine` műveleteit (drain, pull) és az `OfflineQueueService` tétel-műveleteit hívja, majd megjeleníti az eredményt.
- A lista a helyi outbox tábla **reaktív** olvasása: drain közben a státuszváltások (`PENDING` → `SENDING` → eltűnik / `ERROR`) élőben látszanak, külön frissítés nélkül.
- A Fix űrlap a payload egyszerű mezőiből generálódik; a mentés a payloadot és a helyi entitássort **egy** helyi tranzakcióban írja.
- Csak natív platformon jelenik meg: a web build online-only, nincs outbox — a `offlineCapable` képesség-flag alapján ([[Frontend]], [[Backend-offline first]]). Nem külön feature flag mögött van.
- **Entitás-lefedettség SSOT:** a Fix/Skip/Unskip/Drop pontos hatása entitásonként (melyik SQLite tábla, szerkeszthető-e Fix-ben, van-e név-egyediség ellenőrzés) az `OutboxEntityRegistryService`-ben (`core/sync/outbox-entity-registry.ts`) él, egy `Record<OutboxEntityType, ...>` alakban. Ez fordítási hiba, ha egy új feature új outbox entitástípust vezet be (`OutboxEntityType` bővítése) anélkül, hogy ezt a registry-t is bővítené — enélkül a GearCheck bevezetésekor pont ez történt: a felület hónapokig csak a `UserProfile`/`WeightHistoryEntry` típusokat ismerte, a GearCheck entitásokon a Fix/Drop csendben hibázott vagy rossz táblát írt. Új entitástípusnál mindig itt kell bővíteni, nem a lap saját kódjában.

#### Backend-offline

Ez a felület **maga is teljesen offline működik**, és jellemzően pont akkor használják, amikor nincs backend: a teljes tartalma (queue tételek, státuszok, payloadok, hibaüzenetek) a helyi SQLite-ból jön, nincs hozzá hálózati hívás. Saját entitása és saját outbox tétele nincs — a queue-t olvassa és vezérli.

A tétel-műveletek offline is végrehajthatók: a Fix / Skip / Unskip / Drop kizárólag helyi állapotot ír, a hatásuk a következő elérhető backendnél realizálódik. Egyedüli kivétel a „Szinkronizálás most”, ami backend nélkül csak visszajelez, hogy nincs kapcsolat. A Drop utáni szerver-újraolvasás (`_needs_refetch`) szintén a következő online állapotban fut le. Mechanizmus: [[Backend-offline first]].

### Backend

- A queue elemei a saját backend **normál** REST végpontjaira mennek (`POST` / `PUT` / `DELETE`) — külön „write sync API” nincs.
- Az egyetlen dedikált sync végpont az olvasási delta (`GET /api/sync/changes`) és az elérhetőség-próba (`GET /api/health`) — szerződés: [[Backend]], SSOT: [[Backend-offline first]].
- A hibasorokhoz a szerver egységes hibaformátumot ad (`code` + `message` + `field`), ez jelenik meg a listában — [[Backend-offline first]]. A `field` nélküli hibáknál a Fix űrlap nem tud mezőt fókuszálni, de a szerkesztés attól még működik.
- A Drop utáni helyreállításhoz az entitás **egyedi lekérdezése** (`GET /api/{entitás}/{id}`) kell — ez a normál CRUD szerződés része, nem igényel új végpontot.

### Nyitott kérdések

Nincs nyitott kérdés.
