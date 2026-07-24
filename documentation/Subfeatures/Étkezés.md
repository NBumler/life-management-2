# Étkezés

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszer tárolás]], [[Kalóriakalkulátor]], [[Energiaegyenleg napló]], [[Recept forrású étkezés]], [[Élelmiszer forrású étkezés]], [[Egyéni forrású étkezés]], [[Recept]], [[Élelmiszerek]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Napi étkezés-dashboard és étkezések CRUD-ja három tételtípussal (recept / élelmiszer / egyéni). Bevitt makrók és ár az aznapi tételekből (élő katalógus-számítás ahol van ID); kalória cél és aktivitás extra a [[Kalóriakalkulátor]] SSOT-jából. Készletlevonás recept- és élelmiszer-tételeknél ([[Élelmiszer tárolás]]).

Az [[Energiaegyenleg napló]] külön, hosszabb időtávú / trend nézet — nem másolja az étkezés CRUD-ot; ugyanazokból az SSOT-okból olvas.

### Funkcionális leírás

#### Forrás gyerekek

- [[Recept forrású étkezés]]
- [[Élelmiszer forrású étkezés]]
- [[Egyéni forrású étkezés]]

#### Dashboard

- **Dátumválasztó:** alapértelmezés = mai nap (kliens TZ szerinti naptári nap).
- **Bal / jobb nyíl:** ±1 nap.
- **Mai nap** gomb: ugrás ma-ra.
- A kiválasztott naphoz tartozó összesítés (aznapi étkezések tételeiből, szorzó utáni effektív értékek összege):
  - kalória, fehérje, szénhidrát, zsír, ár
- Ugyaninnen (read-only, [[Kalóriakalkulátor]]):
  - **Aktivitás extra kcal** — edzésnapló, mászónapló, és minden kalóriát égető napló összege az adott napra
  - **Kalória cél + aktivitás** — `cél_mozgás_nélkül + aktivitás_extra` (a cél **nem** tartalmazza az edzést; az külön jön hozzá)
- **Nem** jelenik meg a „még bevihető” keret ezen a dashboardon.
- Alatta: az aznapi **étkezések listája** (idő szerint).

Fejléc: **Étkezés rögzítése** → új étkezés űrlap.

#### Étkezés entitás

| Mező | Szabály |
|---|---|
| **Időpont** | Kötelező; default = most (készülék / böngésző TZ). Lásd Időzóna. |
| **Megjegyzés** | Opcionális. |
| **Tételek** | ≥1 kötelező; vegyes forrástípusok megengedettek (pl. 1 recept + 1 élelmiszer). |

- Szerkeszthető, hard delete, megerősítéssel.
- Üres tételekkel **nem** menthető.
- Teljes feature backend-offline.

#### Tétel — közös

- **Forrás típusa:** `RECIPE` \| `FOOD` \| `CUSTOM` — részletek a gyerek specekben.
- **Adagszorzó (`servings`):** pozitív szám (`> 0`); lehet `< 1` és `> 1` (pl. `0.8`, `2`, `4.5`). **`0` tilos** — téves tételt törölni kell.
- Tétel törölhető az űrlapon (létrehozás / szerkesztés).
- Napi / étkezés összeg: minden tétel **effektív** kalória / makró / ára (szorzó után), majd összegzés.

#### Élő hivatkozás (recept / élelmiszer)

Recept- és élelmiszer-tételek **ID + mennyiség/szorzó** alapon tárolódnak; a megjelenített / összegzett tápanyag és ár a **aktuális** [[Recept]] / [[Élelmiszerek]] katalógusból számolódik. Katalógusjavítás visszamenőleg is változtatja a múltbeli napok számait.

- [[Recept]] törlés: warning + cascade az érintett étkezésekre / tételekre (lásd [[Recept]]).
- [[Élelmiszerek]] törlés: ugyanez — hivatkozó étkezés-tételek / étkezések felsorolása + cascade.

Egyéni tételnek nincs katalógus-ID-ja; az ott begépelt értékek a forrásigazság.

#### Készlet

- **Létrehozáskor** (mentés): recept- és élelmiszer-tételek effektív mennyisége levonódik az [[Élelmiszer tárolás]]ból (szabályok ott; hiánynál nincs error). Egyéni: **nem** von le.
- **Szerkesztés / törlés:** készlet **nincs** visszapótolva és nincs újra-diffelve (egyszerű modell).

#### Időzóna (kötelezően robosztus)

1. Új / szerkesztett időpont: a **kliens (böngésző / mobil) időzónája**.
2. Tárolás: `eatenAt` = UTC `timestamptz` + `timeZoneId` (IANA, pl. `Europe/Budapest`) a rögzítéskori kliens TZ.
3. Dashboard nap szűrés: a **megjelenítő kliens aktuális TZ**-jában számolt naptári napra eső `eatenAt` értékek.
4. Ne tároljunk TZ nélküli („naive”) local datetime-ot egyedüli igazságként; a szerver TZ-ját ne feltételezzük.

Implementáció: **újrafelhasználható**, feature-független dátum/idő segédkomponens + utility (konfigurálható: TZ forrás, nap-határ, formázás); az Étkezés ezt hívja. **Körültekintő unit / integrációs tesztek** (UTC szerver, DST váltás, TZ váltás eszközön, „melyik naphoz tartozik” edge case-ek).

### UI/UX elvárások

- Kaja tab: Étkezés dashboard.
- Dátumválasztó + nyilak + Mai nap; összesítők; étkezéslista; fejléc Rögzítés.
- Űrlap: időpont, megjegyzés, tételek (típusonként gyerek UX); tétel törlés; mentés footer.
- Tizedes: `.` és `,` az adagszorzónál.
- iOS: input min. `16px`.

### Megjegyzések

„Még bevihető” más felületen (pl. [[Kalóriakalkulátor]] / [[Energiaegyenleg napló]]) megjelenhet; az Étkezés dashboardon szándékosan nincs.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Dashboard + étkezés form; tételek polymorphic UI.
- Élő összegzés: pure TS (recept / food kalkuláció a katalógus store-ból × servings).
- Cél / aktivitás: [[Kalóriakalkulátor]] API / utility hívás az adott local date-re.
- Megosztott **DateTime / time zone** modul (tesztelt); Étkezés csak konfigurálja.

#### Backend-offline

Backend-offline és Full-offline: dashboard és CRUD helyi store-on; mutációk outboxba, kliens UUID. Élő kalkuláció helyi katalógusból. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

| Entitás | Fő mezők |
|---|---|
| `Meal` | `id` (UUID, kliens); `eatenAt` (timestamptz UTC); `timeZoneId` (IANA); `note`; `createdAt`, `updatedAt` |
| `MealItem` | `id`; `mealId`; `type` (`RECIPE` \| `FOOD` \| `CUSTOM`); `servings` (`> 0`); típus-specifikus mezők (gyerek specek); `sortOrder` |

- Lista szűrés napra: szerver kaphat `date` + `timeZoneId` query-t, vagy a kliens szűr localisan offline.
- Cascade: `Food` / `Recipe` delete → érintett `MealItem` / üresen maradó `Meal` kezelés (étel törlése, ha nem marad tétel — vagy tiltás amíg van tétel; **ajánlott:** cascade a hivatkozó itemekre, majd üres meal törlése).

### Nyitott kérdések

Nincs nyitott kérdés.
