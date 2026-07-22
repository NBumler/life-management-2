Ha az eszköz nem éri el a backend szervert, DE van internet-elérése, azt hívjuk **Backend-offline** állapotnak. FONTOS megkülönböztetni a **Full-offline** állapottól, amikor se a backend szervert nem éri el, sem internet-elérése nincs.
A különbség például a [[Vonalkódos élelmiszer beolvasás]] feature esetén fontos, mert ott egy külső API-t használunk fel, amit a hibrid frontend-en keresztül attól még, hogy a backend nem elérhető, meg tudjuk tenni. [[Frontend]] oldalon a [[Szinkronizációs központ]] segít majd ezt elvégezni.

# Backend & Frontend Offline-First Architektúra

## 1. Alapelvek
* **Kliensoldali UUID:** Minden adatbázis entitás ID-ját a kliens generálja a létrehozás pillanatában (UUID v4), így az offline műveletek láncolhatóak (Létrehozás -> Módosítás -> Használat).
* **Pragmatikus Duplikáció:** A kritikus alapértékeket (pl. kalóriabevitel, lépés-szorzók) pure TypeScript utility osztályként leduplikáljuk a frontenden is az azonnali optimista UI frissítéshez.
* **Vizuális Bizonytalanság:** A csak online kiszámolható adatok mellett offline állapotban egy homokóra ikon (~) jelzi, hogy az adat csak becsült.

## 2. SQLite Outbox Queue
Minden olyan módosító HTTP kérés (POST, PUT, DELETE), ami offline állapotban (status === 0 vagy 5xx hiba) fut le, az `OfflineQueueService` segítségével az SQLite-ba mentődik:

| Mező | Típus | Leírás |
|---|---|---|
| `id` | UUID | Kliensoldali egyedi azonosító |
| `timestamp` | Long | Létrehozás ideje (Unix timestamp) |
| `method` | String | POST, PUT, DELETE |
| `url` | String | API végpont |
| `payload` | JSON | Küldendő adatok |
| `targetEntityId` | UUID | Érintett entitás egyedi kliens-UUID azonosítója |
| `status` | Enum | PENDING, ERROR |
| `errorMessage` | String | Szerveroldali hibaüzenet hiba esetén |

## 3. Szinkronizációs és Függőségi Logika
1. **FIFO feldolgozás:** Online állapotba lépéskor a sor szekvenciálisan hajtódik végre.
2. **Függőségi zár:** Ha egy kérés elhasal a szerveren, a tétel `ERROR` státuszt kap, és a rendszer felfüggeszti az összes olyan további `PENDING` kérés végrehajtását a sorban, amelynek a `targetEntityId`-ja megegyezik a hibás elem ID-jával.
3. **Független ágak:** Minden olyan kérést, ami nem kötődik a hibás entitáshoz, a motorcsónak elv alapján tovább kell szinkronizálni a szerverre.
