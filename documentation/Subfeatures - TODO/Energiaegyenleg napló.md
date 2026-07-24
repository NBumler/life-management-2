# Energiaegyenleg napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Kalóriakalkulátor]], [[Étkezés]], [[Profile]], [[Backend-offline first]] |

### Célállapot

Napi / idősoros napló az energiaegyenlegről: bevitt kalória ([[Étkezés]]) vs elégetett / megengedett keret ([[Kalóriakalkulátor]], [[Profile]]).

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Megjelenítési formák (lista, diagram, napi kártya)
- Időablakok (nap / hét / hónap)
- Offline becsült értékek jelölése (homokóra / `~` — lásd [[Backend-offline first]])

## Architektúra

### Frontend

Napló / diagram nézet; offline bizonytalanság jelölés.

#### Backend-offline

Olvasás/aggregáció helyi store-ból; becsült értékek jelölése (~ / homokóra). Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (aggregáció lehet szerveroldali később; számítási SSOT: [[Kalóriakalkulátor]])

### Nyitott kérdések

Nincs nyitott kérdés.
