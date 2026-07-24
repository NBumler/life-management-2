# Outdoor boulder napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Outdoor - boulder]] |
| **Kapcsolódó** | [[Outdoor boulder admin]], [[Nehézségi szint skálája]], [[Kalóriakalkulátor]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]], [[Backend-offline first]] |

### Célállapot

Kültéri boulder kísérletek naplózása. Részletek a giga-specben; ide kell majd szétválasztani.

### Funkcionális leírás

Dashboard kontextus: **Outdoor Boulder**.

Várható mezők (váz):

- Dátum, helyszín / szektor
- Nehézség (Font / V-skála — [[Nehézségi szint skálája]])
- Időjárás (`WeatherCondition`)
- Sikeres / sikertelen kísérlet, `ascentStyle`
- `pumpRating`, `headspaceRating`, megjegyzés, partnerek
- Számított kalória → [[Kalóriakalkulátor]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Mezőlista véglegesítése a giga-specből

## Architektúra

### Frontend

Napló UI; [[Nehézségi szint skálája]].

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
