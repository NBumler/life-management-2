# Bejelentkezés

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Backend]], [[Profile]], [[Frontend]] |

### Célállapot

Felhasználói autentikáció, hogy a személyes adatok biztonságosan, felhasználónként elkülönítve tárolódjanak (multi-user felkészülés).

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Auth módszer (email+jelszó, OAuth, magic link, stb.)
- Session / token kezelés (JWT?)
- Offline: korábban bejelentkezett user helyi adatai elérhetőek-e token lejárat után
- Regisztráció vs meghívás / single-user indulás

## Architektúra

### Frontend

Login / session tárolás; generált OpenAPI kliens auth headerjei.

### Backend

Auth végpontok; OpenAPI `securitySchemes` (lásd [[Backend]] nyitott kérdések).

### Nyitott kérdések

Nincs nyitott kérdés.
