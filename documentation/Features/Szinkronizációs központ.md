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

Manuális akciók (gombok a sorok mellett):

1. **Szerkesztés és Újraküldés (Fix):** Megnyitja a tétel adatait egy szerkesztő űrlapon, majd a javítás után újra `PENDING` állapotba rakja a sorban.
2. **Átugrás (Skip):** Ideiglenesen inaktiválja a hibás tételt, feloldva az adott ID-hoz tartozó függőségi láncot, hogy a motor megpróbálhassa a rákövetkező, független elemeket szinkronizálni.
3. **Törlés (Drop):** Véglegesen törli a hibás kérést a sorból.

### UI/UX elvárások

* **Útvonal:** `/tabs/dashboard/sync`
* **Megnyitás:** A Dashboard felső státuszbárjában lévő offline/szinkronizációs ikonra kattintva (Menü / státusz — lásd [[Frontend]]).
* **Időrendi lista:** Mutatja a sorban lévő összes kérést. A `PENDING` elemek mellett szürke óra ikon, az `ERROR` státuszúak mellett piros figyelmeztetés és a pontos szerveroldali hibaüzenet látható.
* **Adatmentő modal (Payload View):** Minden sor mellett ikon; felugró ablakban a küldeni kívánt raw JSON, hogy a begépelt információk hiba esetén se vesszenek el.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

`OfflineQueueService` + SQLite outbox megjelenítése és manuális vezérlése. Illeszkedik a generált OpenAPI klienshez ([[Frontend]]).

### Backend

A queue elemei a saját backend REST végpontjaira mennek (POST/PUT/DELETE); a szerver a meglévő API-t szolgálja — külön „sync API” nincs a jelenlegi leírásban. Függőségi / FIFO logika: [[Backend-offline first]].

### Nyitott kérdések

Nincs nyitott kérdés.
