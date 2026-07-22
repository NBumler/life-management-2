# Nettó fizetés kalkulátor

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Pénzügyek]] |
| **Kapcsolódó** | [[Profile]] |

### Célállapot

A [[Profile]]-ban megadott bruttó fizetés és születési dátum alapján kiszámolja a nettó fizetést.

### Funkcionális leírás

Képlet (egyszerűsített):

- Nettó fizetés = Bruttó fizetés − TB − SZJA
- TB = Bruttó fizetés 18,5%-a
- SZJA = Bruttó fizetés 15%-a

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- 25 év alatt más szabályok + egyéb kedvezmények

## Architektúra

### Frontend

Kalkulátor UI; bemenet a [[Profile]]-ból; pure TypeScript utility (offline is).

### Backend

_Nincs backend érintettség._ (számítás lehet csak kliensoldali)

### Nyitott kérdések

Nincs nyitott kérdés.
