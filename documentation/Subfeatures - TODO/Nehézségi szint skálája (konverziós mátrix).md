# Nehézségi szint skálája (konverziós mátrix)

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Mászónapló]] |
| **Kapcsolódó** | [[Nehézségi szint skálája]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]], [[Kalóriakalkulátor]], [[Backend-offline first]] |

### Célállapot

A különböző mászóstílusok (Indoor/Outdoor és Boulder/Köteles) nehézségi skáláinak egységes kezelése, hogy a statisztikákban az edzésvolumen megfelelően súlyozható legyen.

### Funkcionális leírás

Az alkalmazás az alábbi skálákat kezeli, amelyeket a háttérben egy egységes belső numerikus indexre ($I_{grade}$) képez le:

| Belső Index ($I_{grade}$) | Francia (Köteles) | UIAA (Outdoor) | Font (Boulder) | V-Scale (USA) |
|---|---|---|---|---|
| 10 | 5a | V | 4 | V0 |
| 14 | 6a | VI | 5 | V2 |
| 16 | 6b | VII- | 6a | V3 |
| 18 | 6c | VII | 6b | V4 |
| 20 | 7a | VIII- | 6c | V5 |

Edzésvolumen: $Vol = \text{Mászott méter} \times I_{grade}$.

### UI/UX elvárások

* Új mászónapló rögzítésekor (pl. `Indoor - boulder`) a nehézségi szint dropdown **csak az adott stílushoz releváns** skálát mutatja (pl. Font vagy színkód).
* Gördülő szelektor (`ion-select`) a gyors, mobilbarát kiválasztáshoz (alternatíva / kiegészítés a szöveges parserhez — [[Nehézségi szint skálája]]).

### Megjegyzések

A tábla részleges példa; a teljes mátrix a JSON erőforrásban él.

### Nyitott kérdések

- Teljes index tábla minden fokozatra
- Kapcsolat a szöveges parser vs `ion-select` UX között

## Architektúra

### Frontend

Skálák statikus JSON erőforrásként; offline illesztés és volumen számítás.

#### Backend-offline

Skálák statikus JSON; illesztés / volumen számítás Full-offline is. Nincs outbox. Lásd [[Backend-offline first]].

### Backend

Ugyanaz a JSON / `absolute_difficulty_index` mapping startup betöltéssel (lásd giga-spec Grade Mapping Matrix). Paritás a frontendel.

### Nyitott kérdések

Nincs nyitott kérdés.
