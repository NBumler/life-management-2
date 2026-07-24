# Kaja

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Élelmiszerek]], [[Kalóriakalkulátor]], [[Mennyiség mező]], [[Backend-offline first]] |

### Célállapot

Élelmiszer, tárolás, recept, étkezés és kapcsolódó statisztikák / energiaegyenleg kezelése egy feature alatt. Alsó tab: **Kaja** (lásd [[Frontend]]). A [[Bevásárlás]] domainben kapcsolódik (katalógus / tárolás), de navigációja a **Menü** tabon van.

### Funkcionális leírás

Subfeature lista:

- [[Élelmiszerek]] (`Kész`)
- [[Élelmiszer tárolás]] (`Kész`)
- [[Recept]] (`Kész`)
- [[Étkezés]] (`Kész`)
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

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

Közös Kaja OpenAPI scope később összevonható itt. Az [[Élelmiszerek]] katalógus entitás / CRUD a gyerek spechen (`Food`); a többi subfeature (tárolás, recept, étkezés) oda hivatkozik.

### Nyitott kérdések

- Közös Kaja backend / OpenAPI scope a szülőben vs csak a gyerekekben (Élelmiszerek már a gyerekben)
