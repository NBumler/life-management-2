# Nyelv választás

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend-offline first]] |

### Célállapot

Az alkalmazás többnyelvű (i18n). Egyelőre magyar és angol; alapértelmezés: magyar.

### Funkcionális leírás

A felhasználó választhat nyelvet. Alapértelmezetten magyar van használatban.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

ngx-translate; `hu.json` és `en.json` fordítófájlok. Belépés: Menü (lásd [[Frontend]]).

#### Backend-offline

Preferencia elsődlegesen helyi tárolás (Backend-offline / Full-offline is azonnal érvényes). Ha később profilba szinkronizálódik, a mentés outboxolható. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (UI szövegek kliensoldalon)

### Nyitott kérdések

- Nyelvpreferencia tárolása (lokális / szinkronizált)
