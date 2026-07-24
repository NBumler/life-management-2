# Kaja statisztika

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Recept]], [[Backend-offline first]] |

### Célállapot

Az [[Élelmiszerek]] és [[Recept]] részeknél megadott adatok alapján rangsorolni / listázni a „legjobb” ételeket kiválasztott aránymutatók szerint.

### Funkcionális leírás

Megjeleníthető statisztikák (sorrendezett lista):

- fehérje / kalória
- fehérje / szénhidrát

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- További mutatók (pl. ár / fehérje)?
- Szűrés recept vs nyers élelmiszer

## Architektúra

### Frontend

Statisztika nézet / lista a [[Kaja]] alatt; számítás lehet kliensoldali a katalógus adatokból.

#### Backend-offline

Olvasás a helyi store-ból (Backend-offline / Full-offline). Nincs saját módosító API → nincs outbox ebben a spechen. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (ha szerveroldali aggregáció kell, később)

### Nyitott kérdések

Nincs nyitott kérdés.
