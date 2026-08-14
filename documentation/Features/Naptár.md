# Naptár

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Események]], [[Tennivalók]], [[Háztartási feladatok]], [[Értesítések]], [[Backend-offline first]] |

### Célállapot

Naptár nézet, ami megmutatja az [[Események]]et és [[Tennivalók]]at. Feladatok tab / kapcsolódó navigáció (lásd [[Frontend]]).

### Funkcionális leírás

Aggregált megjelenítés az eseményekből és tennivalókból.

[[Háztartási feladatok]] producer-szerződés (ez a naptár fogyasztja; a vetítés a háztartási spechen): all-day előfordulások, cím = feladatnév, alcím = helyiség; lejárt a `nextDue` eredeti napján; **max 10** előfordulás / feladat, **max 1 év** előre; naptárból pipálás megengedett. Forrás szerinti szűrő: lásd Nyitott kérdések.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Naptár nézet típusok (nap / hét / hónap)
- Forrás szerinti szűrés

## Architektúra

### Frontend

Naptár UI; adat a helyi store / generált API-ból.

#### Backend-offline

Olvasás a helyi store-ból (Backend-offline / Full-offline). Nincs saját módosító API → nincs outbox ebben a spechen. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (az esemény / tennivaló entitások a saját specjeikben)

### Nyitott kérdések

Nincs nyitott kérdés.
