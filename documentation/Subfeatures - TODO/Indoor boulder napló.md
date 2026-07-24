# Indoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder admin]], [[Nehézségi szint skálája]], [[Kalóriakalkulátor]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]], [[Backend-offline first]] |

### Célállapot

Beltéri boulder kísérletek naplózása. Részletes specifikáció a giga-specben; ide kell majd szétválasztani.

### Funkcionális leírás

Dashboard kontextus: **Indoor Boulder**.

Várható mezők (váz a giga specifikációból):

- Dátum, helyszín (terem — [[Indoor boulder admin]])
- Nehézség ([[Nehézségi szint skálája]] / szín-sáv a teremből)
- Sikeres / sikertelen kísérlet
- `ascentStyle` (ha sikeres): ONSIGHT / FLASH / REDPOINT
- `pumpRating` (1–5) — kalóriaszámításhoz
- Megjegyzés, partnerek
- Számított kalória → [[Kalóriakalkulátor]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Mezőlista véglegesítése a giga-specből

## Architektúra

### Frontend

Napló UI; nehézség input a [[Nehézségi szint skálája]] komponenssel.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (közös ascent API: [[Mászónapló]] / giga-spec)

### Nyitott kérdések

Nincs nyitott kérdés.
