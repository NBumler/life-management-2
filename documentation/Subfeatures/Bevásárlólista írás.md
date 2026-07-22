# Bevásárlólista írás

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Bevásárlás]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Bevásárlás teljesítve]] |

### Célállapot

Bevásárlólista összeállítása vásárlás előtt / közben.

### Funkcionális leírás

Lehet bevásárló listát írni. Egy bevásárló listának az elemei lehetnek [[Élelmiszerek]] vagy nem élelmiszerek. Az elemeknek van mennyiségük, és nevük (ha nem élelmiszer).

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Nem-élelmiszer tételek pontos modellje
- Lista szerkesztése folyamatban lévő vásárlás közben

## Architektúra

### Frontend

Lista / tétel UI; élelmiszer kiválasztás az [[Élelmiszerek]] katalógusból.

### Backend

_Nincs backend érintettség._ (várhatóan lista + tétel CRUD a [[Bevásárlás]] szülőben)

### Nyitott kérdések

Nincs nyitott kérdés.
