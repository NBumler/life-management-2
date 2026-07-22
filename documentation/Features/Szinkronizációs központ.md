A [[Backend-offline first]] architektúra miatt, ha a Backend-offline (vagy Full-offline) állapotból kilépünk — azaz elérhetővé válik a backend —, akkor a Queue-ba rakott hívásokat le kell futtatni.

# Szinkronizációs Központ (Sync Center)

## 1. Célállapot
Egy dedikált kezelőfelület a hálózati hibák vagy térerőhiány miatt az SQLite Outbox Queue-ban ragadt offline kérések vizuális menedzselésére.

## 2. Navigáció
* **Útvonal:** `/tabs/dashboard/sync`
* **Megnyitás:** A Dashboard felső státuszbárjában lévő offline/szinkronizációs ikonra kattintva.

## 3. UI/UX Elvárások
* **Időrendi Lista:** Mutatja a sorban lévő összes kérést. A `PENDING` elemek mellett szürke óra ikon, az `ERROR` státuszúak mellett piros figyelmeztetés és a pontos szerveroldali hibaüzenet látható.
* **Adatmentő Modal (Payload View):** Minden sor mellett elhelyezett ikon, ami egy felugró ablakban megmutatja a küldeni kívánt raw JSON adatokat, így a begépelt információk hiba esetén sem vesznek el.

## 4. Manuális Akciók (Gombok a sorok mellett)
1. **Szerkesztés és Újraküldés (Fix):** Megnyitja a tétel adatait egy szerkesztő űrlapon, majd a javítás után újra `PENDING` állapotba rakja a sorban.
2. **Átugrás (Skip):** Ideiglenesen inaktiválja a hibás tételt, feloldva az adott ID-hoz tartozó függőségi láncot, hogy a motor megpróbálhassa a rákövetkező, független elemeket szinkronizálni.
3. **Törlés (Drop):** Véglegesen törli a hibás kérést a sorból.
