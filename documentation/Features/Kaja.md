# Kaja

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Kalóriakalkulátor]], [[Mennyiség mező]] |

### Célállapot

Élelmiszer, tárolás, recept, étkezés és kapcsolódó statisztikák / energiaegyenleg kezelése egy feature alatt. Alsó tab: **Kaja** (lásd [[Frontend]]). A [[Bevásárlás]] domainben kapcsolódik (katalógus / tárolás), de navigációja a **Menü** tabon van.

### Funkcionális leírás

Subfeature lista:

- [[Élelmiszerek]]
- [[Élelmiszer tárolás]]
- [[Recept]]
- [[Étkezés]]
- [[Kaja statisztika]]
- [[Energiaegyenleg napló]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kaja tab belépő; a subfeature-ök külön képernyők / flow-k.

### Backend

_Nincs backend érintettség._ (a közös domain / OpenAPI végpontok a gyerek specifikációkban vagy később itt kerülnek össze)

### Nyitott kérdések

- Közös Kaja backend / OpenAPI scope a szülőben vs csak a gyerekekben
