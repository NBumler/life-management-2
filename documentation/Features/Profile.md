# Profile

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Kalóriakalkulátor]], [[Nettó fizetés kalkulátor]], [[Backend-offline first]] |

### Célállapot

A felhasználó a profile felületen megadja a személyes / cél adatait, amikből más feature-ök (kalória, nettó bér, stb.) számolnak.

### Funkcionális leírás

Megadható adatok:

- Születési dátum
- Nem (férfi / nő)
- Magasság (cm)
- Jelenlegi testsúly (kg)
- Aktivitási szint
	- Ülő
	- Enyhe
	- Mérsékelt
	- Aktív
	- Nagyon aktív
- Cél
	- Fogyás
	- Megtartás
	- Tömegnövelés
- Cél súlyváltozás (kg / hét)
- Bruttó havi bér (Ft)

CRUD műveletek kellenek a profiladatokhoz.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Profil űrlap; Menü tab alá kerül (lásd [[Frontend]] navigáció). Offline-képes mentés.

#### Backend-offline

Profil olvasás/írás helyi store + outbox; kliens UUID. Backend-offline / Full-offline mentés támogatott. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

CRUD API a profil entitásra; [[Backend-offline first]] (kliens UUID). OpenAPI szerződés része.

### Nyitott kérdések

Nincs nyitott kérdés.
