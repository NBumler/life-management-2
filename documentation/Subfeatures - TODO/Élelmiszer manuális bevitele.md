# Élelmiszer manuális bevitele

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Élelmiszer hozzáadása]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Vonalkódos élelmiszer beolvasás]], [[Élelmiszer importálása clipboard-ról]], [[Élelmiszer tárolás]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Új [[Élelmiszerek]] tétel rögzítése kézi adatbevitellel (vonalkód nélküli vagy sikertelen Open Food Facts találat utáni kiegészítés).

### Funkcionális leírás

Vonalkódos előtöltés: [[Vonalkódos élelmiszer beolvasás]]. Clipboard import: [[Élelmiszer importálása clipboard-ról]].

Offline mentés esetén a kérés az `OfflineQueueService` sorába kerül `PENDING` státusszal.

### UI/UX elvárások

* **Kötelező mezők:** Név, Kalória (kcal / 100 g vagy 100 ml — egység tisztázandó).
* **Opcionális mezők:** Márka, makrotápanyagok (szénhidrát, zsír, fehérje, só), vonalkód, egységár (Ft), alapértelmezett tárolási hely (Hűtő / Fagyasztó / Kamra), tipikus lejárati idő.
* **iOS zoom védelem:** minden beviteli mező betűmérete minimum `16px`.
* **Thumb-zone:** a „Mentés” gomb a fix alsó footerben.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Egység (100 g vs 100 ml vs db) modell
- Kapcsolat az [[Élelmiszer tárolás]] alapértelmezett helyével
- Milyen mezőket kell / lehet megadni

## Architektúra

### Frontend

Új élelmiszer űrlap; offline queue mentés ([[Backend-offline first]], [[Szinkronizációs központ]]).

### Backend

Élelmiszer CRUD / create végpont (OpenAPI); kliens UUID.

### Nyitott kérdések

Nincs nyitott kérdés.
