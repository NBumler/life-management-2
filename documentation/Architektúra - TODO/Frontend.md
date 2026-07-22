# Frontend

> **Státusz:** TODO — váz; részletes app-struktúra / state management specifikáció még hiányzik.

## Stack

- **Framework:** Ionic + Angular (hibrid: web + mobil)
- **API kliens:** OpenAPI (Swagger) specifikációból generált TypeScript / Angular kód (modellek + service-ek) — ugyanaz a szerződés, mint a [[Backend]] Spring Boot interface-einél
- **i18n:** ngx-translate — [[Nyelv választás]] (`hu.json`, `en.json`)
- **Téma:** [[Dark&Light mode]]
- **Lokális tárolás / offline:** SQLite + `OfflineQueueService` — [[Backend-offline first]], [[Szinkronizációs központ]]

## OpenAPI / kódgenerálás

- A backend felé menő HTTP hívások és DTO-k **nem** kézzel íródnak: az OpenAPI spec-ből generálódnak.
- A generált kliens a [[Szinkronizációs központ]] / `OfflineQueueService` alá kerül (online közvetlen hívás; offline esetén a queue a generált endpoint URL + payload alapján dolgozik).
- A generált fájlok ne legyenek kézzel szerkesztve; változás → OpenAPI frissítés → újragenerálás.
- Külső API-k (pl. Open Food Facts) **közvetlenül a kliensről** hívódnak, nem a [[Backend]] proxyján át — [[Backend-offline first]].

## Navigáció (alsó tab bar)

Alul **4 gomb** (Ionic tabs):

1. **Kaja** — [[Kaja]] (és kapcsolódó: [[Bevásárlás]], kalória, stb.)
2. **Edzés** — [[Edzés]] (és kapcsolódó: [[Mászónapló]], [[Úszás napló]], [[Lépésszám követés]], stb.)
3. **Feladatok** — [[Tennivalók]] (és kapcsolódó: [[Naptár]], [[Események]])
4. **Menü** — a többi feature / beállítás belépője ([[Profile]], [[Pénzügyek]], [[GearCheck]], [[AYCM tracker]], [[Nyelv választás]], [[Dark&Light mode]], [[Szinkronizációs központ]], stb.)

A tab lista **konfigurációból** (pl. tömb / feature-flagelt tab registry) jöjjön, ne legyen beégetve a template-be: a jövőben könnyen bővíthető legyen **5 gombosra** tab hozzáadásával / átrendezésével, layout-újraírással.

## Kötelező elvek

- Minden feature **feature flag**-hez kötve (lásd [[Life Management 2.0]]).
- Platformfüggő input kontrollok (web vs mobil kényelem).
- Egyértelmű fókuszmező: ha a user egyértelműen gépelni fog, az input legyen auto-focus.
- Kritikus számítási konstansok (pl. MET értékek) pure TypeScript utility-ként a frontenden is — optimista UI (lásd [[Backend-offline first]], [[Kalóriakalkulátor]]).

## Nyitott kérdések

- State management megoldás (Signals / NgRx / egyéb)
- Capacitor plugin lista (barcode, health sync, push notifications, stb.)
- openapi-generator Angular generator verzió / output mappa konvenció
- Generált kliens illesztése az `OfflineQueueService`-hez (interceptor vs wrapper)
- Tab → feature hozzárendelés részletei (mi pontosan melyik tab alá kerül vs csak a Menüből érhető el)
