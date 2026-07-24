# Energiaegyenleg napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Kalóriakalkulátor]], [[Étkezés]], [[Profile]], [[Backend-offline first]] |

### Célállapot

Hosszabb időtávú / trend nézet az energiaegyenlegről: bevitt kalória ([[Étkezés]]) vs keret ([[Kalóriakalkulátor]]: `baseDailyCalorieGoal + activityExtraKcal`). **Nem** étkezés-CRUD — az az [[Étkezés]] dashboard feladata.

### Funkcionális leírás

_Nincs business érintettség._ (részletes UI / időablakok később)

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Az [[Étkezés]] dashboard a napi operatív felület; ez a napló aggregátum / történet. Számítási SSOT: [[Kalóriakalkulátor]] + [[Étkezés]] bevitt összegek.

### Nyitott kérdések

- Megjelenítési formák (lista, diagram, napi kártya)
- Időablakok (nap / hét / hónap)
- Offline becsült értékek jelölése (homokóra / `~` — lásd [[Backend-offline first]])

## Architektúra

### Frontend

Napló / diagram nézet; offline bizonytalanság jelölés; read-only az Étkezés / Kalóriakalkulátor store-ból.

#### Backend-offline

Olvasás/aggregáció helyi store-ból; becsült értékek jelölése (~ / homokóra). Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (aggregáció lehet szerveroldali később; számítási SSOT: [[Kalóriakalkulátor]])

### Nyitott kérdések

Nincs nyitott kérdés.
