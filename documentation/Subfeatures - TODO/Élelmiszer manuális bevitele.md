# Élelmiszer manuális bevitele

## Célállapot

Új [[Élelmiszerek]] tétel rögzítése kézi adatbevitellel (vonalkód nélküli vagy sikertelen Open Food Facts találat utáni kiegészítés).

Vonalkódos előtöltés: [[Vonalkódos élelmiszer beolvasás]]. Clipboard import: [[Élelmiszer importálása clipboard-ról]].

## UI/UX elvárások

* **Kötelező mezők:** Név, Kalória (kcal / 100 g vagy 100 ml — egység tisztázandó).
* **Opcionális mezők:** Márka, makrotápanyagok (szénhidrát, zsír, fehérje, só), vonalkód, egységár (Ft), alapértelmezett tárolási hely (Hűtő / Fagyasztó / Kamra), tipikus lejárati idő.
* **iOS zoom védelem:** minden beviteli mező betűmérete minimum `16px`.
* **Thumb-zone:** a „Mentés” gomb a fix alsó footerben.

## Offline működés

Offline mentés esetén a kérés az `OfflineQueueService` sorába kerül `PENDING` státusszal ([[Backend-offline first]], [[Szinkronizációs központ]]).

## Nyitott kérdések

- Egység (100 g vs 100 ml vs db) modell
- Kapcsolat az [[Élelmiszer tárolás]] alapértelmezett helyével
- Milyen mezőket kell / lehet megadni
