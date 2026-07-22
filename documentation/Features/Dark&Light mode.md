# Dark&Light mode

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]] |

### Célállapot

Az alkalmazás támogat dark mode-ot és light mode-ot.

### Funkcionális leírás

Mindkét témában megfelelő kontraszt kell: ne legyen sötét háttéren fekete szöveg vagy gomb (olvashatatlanság / láthatatlanság tilos).

### UI/UX elvárások

- Dark és light téma kontrasztellenőrzése minden fő komponensen
- Belépés: Menü (lásd [[Frontend]] navigáció)

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Téma váltás a hibrid appban (Ionic / CSS változók — részletek TBD). Kapcsolódik a [[Frontend]] stack leíráshoz.

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

- Rendszer téma követése vs manuális választás
- Preferencia tárolása (lokális / szinkronizált profil)
