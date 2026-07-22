# Mászónapló

## Business

| | |
|---|---|
| **Státusz** | `Ideiglenes` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Kalóriakalkulátor]], [[Nehézségi szint skálája]], [[Nehézségi szint skálája (konverziós mátrix)]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]] |

### Célállapot

Mászóedzések / kísérletek naplózása indoor és outdoor, boulder és köteles kontextusokban. Edzés tab környékén (lásd [[Frontend]]).

### Funkcionális leírás

Subfeature lista:

- [[Outdoor mászónapló]]
- [[Indoor mászónapló]]

Ideiglenes / összevont specifikációk (szétválasztandók a megfelelő admin / napló / skála fájlokba):

- [[Giga feature napló specifikáció (Ideiglenes specifikáció)]]
- [[Nehézségi szint skálája]]
- [[Nehézségi szint skálája (konverziós mátrix)]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

A giga-spec összevont; a közös backend (Route / AscentLog) várhatóan ebben a szülőben vagy a giga-spec szétválasztása után itt él majd.

### Nyitott kérdések

- Giga-spec szétválasztásának sorrendje / cél fájlok

## Architektúra

### Frontend

Dashboard 4 kontextus (Indoor/Outdoor × Boulder/Kötél); nehézség input: [[Nehézségi szint skálája]]. Részletek a gyerekekben / giga-specben.

### Backend

Közös ascent / route domain — lásd [[Giga feature napló specifikáció (Ideiglenes specifikáció)]]; UUID egységesítés a [[Backend-offline first]] szerint.

### Nyitott kérdések

- OpenAPI scope: egy közös Mászónapló API vs kontextusonkénti végpontok
