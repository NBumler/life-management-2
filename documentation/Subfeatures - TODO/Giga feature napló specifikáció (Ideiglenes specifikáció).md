# Giga feature napló specifikáció (Ideiglenes specifikáció)

## Business

| | |
|---|---|
| **Státusz** | `Ideiglenes` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]], [[Indoor boulder napló]], [[Indoor köteles napló]], [[Outdoor boulder napló]], [[Outdoor köteles napló]], [[Tápérték kalkulátor]], [[Backend-offline first]] |

### Célállapot

**Archív pointer.** Az összevont Mászónapló + nehézség-parser tartalom **szétválasztva**. Új spechek a kanonikus források; ez a fájl nem bővítendő.

### Funkcionális leírás

Hova került a tartalom:

| Téma | Cél spec |
|---|---|
| Hub, session/attempt, kalória, dashboard 4 csempe, API | [[Mászónapló]] |
| Grade parser UI | [[Nehézségi szint skálája]] |
| \(I_{\text{grade}}\) mátrix, volumen | [[Nehézségi szint skálája (konverziós mátrix)]] |
| Indoor boulder admin / napló (reference) | [[Indoor boulder admin]], [[Indoor boulder napló]] |
| Indoor kötél | [[Indoor köteles admin]], [[Indoor köteles napló]] |
| Outdoor boulder | [[Outdoor boulder admin]], [[Outdoor boulder napló]] |
| Outdoor kötél | [[Outdoor köteles admin]], [[Outdoor köteles napló]] |
| Tápérték mászás MET | [[Tápérték kalkulátor]] + [[Mászónapló]] |

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

A korábbi JPA `IDENTITY` / `Long` példák **elavultak** — UUID + soft delete: [[Backend-offline first]], [[Mászónapló]].

### Nyitott kérdések

Nincs nyitott kérdés. (Archiválható, ha a vault housekeeping kéri.)

## Architektúra

### Frontend

_Nincs frontend érintettség._

#### Backend-offline

_Nincs frontend érintettség; offline elvárások: [[Backend-offline first]]._

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
