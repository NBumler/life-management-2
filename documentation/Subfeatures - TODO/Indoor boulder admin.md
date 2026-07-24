# Indoor boulder admin

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Indoor - boulder]] |
| **Kapcsolódó** | [[Indoor boulder napló]], [[Nehézségi szint skálája]], [[Backend-offline first]] |

### Célállapot

Beltéri falmászó termek CRUD adminisztrációja.

### Funkcionális leírás

Egy falmászóterem paraméterei:

- Név — a mászóterem neve
- Nehézségi szintek (lista)
	- Szín (pl. kék) — az út cetlijeinek színe; egyedi (nem lehet ugyanolyan színből több)
	- Variáns (enum): `+` / `-` / semleges
	- Alsó érték ([[Nehézségi szint skálája]] komponens)
	- Felső érték ([[Nehézségi szint skálája]] komponens)

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Terem / szín-sáv CRUD UI.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (terem master data — [[Mászónapló]] / giga-spec)

### Nyitott kérdések

Nincs nyitott kérdés.
