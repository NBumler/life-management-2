# Google Calendar szinkronizálása

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Események]] |
| **Kapcsolódó** | [[Naptár]], [[Új esemény hozzáadása]], [[Backend-offline first]] |

### Célállapot

Kétirányú vagy egyirányú szinkron az alkalmazás [[Események]] adatai és a Google Calendar között.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Irány (import / export / bidirectional)
- Konfliktuskezelés
- OAuth / token tárolás
- Offline: csak helyi események, sync online-ra vár

## Architektúra

### Frontend

Google OAuth a kliensről (külső API, nincs backend proxy — [[Backend]]); sync worker.

#### Backend-offline

Külső synchez net kell (Backend-offline: külső API a kliensről hívható, ha van internet; Full-offline: sync vár). A saját backendre írás outboxba kerülhet. Lásd [[Backend-offline first]], [[Szinkronizációs központ]].

### Backend

_Nincs backend érintettség._ (helyi esemény entitás sync után)

### Nyitott kérdések

Nincs nyitott kérdés.
