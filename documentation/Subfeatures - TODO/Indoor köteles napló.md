# Indoor köteles napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Indoor - köteles]] |
| **Kapcsolódó** | [[Indoor köteles admin]], [[Nehézségi szint skálája]], [[Kalóriakalkulátor]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]], [[Backend-offline first]] |

### Célállapot

Beltéri köteles kísérletek naplózása. Részletek a giga-specben; ide kell majd szétválasztani.

### Funkcionális leírás

Dashboard kontextus: **Indoor Kötél**.

Várható mezők (váz):

- Dátum, helyszín (terem)
- Nehézség ([[Nehézségi szint skálája]])
- `safetyStyle`: TOPROPE / LEAD (Trad beltérben ritka)
- Sikeres / sikertelen; `ascentStyle` vagy `failurePoint`
- Út hossza (m) — aktív mászóidő / kalória becsléshez
- `pumpRating`, megjegyzés, partnerek
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
