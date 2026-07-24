# AYCM Statisztikák

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM Check-In]], [[Rendszeres kiadások]], [[Backend-offline first]] |

### Célállapot

AYCM használat összesítése: látogatások száma, megtakarítás (Ft), havi bérlet-arányos költség ([[Rendszeres kiadások]] SSOT), helyszín szerinti bontás.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Időablakok és diagramtípusok
- „Megéri-e a bérlet” kalkuláció képlete

## Architektúra

### Frontend

Statisztika / diagram nézet; SSOT olvasás a [[Rendszeres kiadások]]ból.

#### Backend-offline

Olvasás a helyi store-ból (Backend-offline / Full-offline). Nincs saját módosító API → nincs outbox ebben a spechen. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
