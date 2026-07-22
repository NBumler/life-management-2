# Élelmiszer hozzáadása

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Élelmiszerek]] |
| **Kapcsolódó** | [[Vonalkódos élelmiszer beolvasás]], [[Élelmiszer manuális bevitele]], [[Élelmiszer importálása clipboard-ról]] |

### Célállapot

Új [[Élelmiszerek]] tétel felvétele több bemeneti csatornán keresztül.

### Funkcionális leírás

Csatornák:

- [[Vonalkódos élelmiszer beolvasás]]
- [[Élelmiszer manuális bevitele]]
- [[Élelmiszer importálása clipboard-ról]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Belépő / választó a három hozzáadási módhoz; közös cél űrlap: [[Élelmiszer manuális bevitele]].

### Backend

_Nincs backend érintettség._ (create a manuális / import flow végén)

### Nyitott kérdések

Nincs nyitott kérdés.
