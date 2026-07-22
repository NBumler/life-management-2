# Recept forrású étkezés

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Étkezés]] |
| **Kapcsolódó** | [[Recept]], [[Élelmiszer tárolás]], [[Kalóriakalkulátor]] |

### Célállapot

Étkezés rögzítése egy meglévő [[Recept]] alapján. A recepthez tartozó alapanyagok a tárolt készletből ([[Élelmiszer tárolás]]) levonásra kerülnek, ha onnan származtak.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Részadag / hányad kezelése az étkezésnél (a [[Recept]]-en nincs adagszám; pl. „fél recept”)
- Hiányzó alapanyag a tárolóban — UX (készletlevonás szabály: [[Élelmiszer tárolás]], nincs error)
- Kalória: receptösszeg × hányad vs manuális felülírás

## Architektúra

### Frontend

Étkezés flow recept választással; készlet-levonás visszajelzés.

### Backend

_Nincs backend érintettség._ (közös étkezés API: [[Étkezés]] / [[Kaja]])

### Nyitott kérdések

Nincs nyitott kérdés.
