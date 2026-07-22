# Élelmiszer hozzáadása

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Élelmiszerek]] |
| **Kapcsolódó** | [[Vonalkódos élelmiszer beolvasás]], [[Élelmiszer manuális bevitele]], [[Élelmiszer importálása clipboard-ról]] |

### Célállapot

Új [[Élelmiszerek]] tétel felvétele több bemeneti csatornán keresztül; a végleges adatbevitel / mentés az [[Élelmiszer manuális bevitele]] űrlapon történik (előtöltve vagy üresen).

### Funkcionális leírás

Csatornák:

- [[Élelmiszer manuális bevitele]] — üres űrlap
- [[Vonalkódos élelmiszer beolvasás]] — scan → OFF előtöltés → űrlap
- [[Élelmiszer importálása clipboard-ról]] — clipboard → parse → űrlap (spec részben külön)

Mindhárom (ahol van adat) ugyanarra az űrlapra vezet. Mentési szabályok, kötelező mezők, duplikáció: [[Élelmiszer manuális bevitele]] / [[Élelmiszerek]].

Backend-offline: a csatornák és a mentés is támogatott (OFF híváshoz net kell; teljes offline: manuális / késleltetett OFF — lásd [[Vonalkódos élelmiszer beolvasás]]).

### UI/UX elvárások

Belépő / választó a három módhoz (vagy közvetlen FAB a vonalkódra + „új” a manuálishoz); közös célűrlap: [[Élelmiszer manuális bevitele]].

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Router / action sheet / FAB a csatornákhoz; navigáció az [[Élelmiszer manuális bevitele]] formra query/state előtöltéssel.

### Backend

_Nincs backend érintettség._ (create az [[Élelmiszerek]] / [[Élelmiszer manuális bevitele]] API-ján)

### Nyitott kérdések

Nincs nyitott kérdés.
