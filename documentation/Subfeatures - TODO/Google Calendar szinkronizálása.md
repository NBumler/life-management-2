# Google Calendar szinkronizálása

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Események]] |
| **Kapcsolódó** | [[Naptár]], [[Új esemény hozzáadása]] |

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

### Backend

_Nincs backend érintettség._ (helyi esemény entitás sync után)

### Nyitott kérdések

Nincs nyitott kérdés.
