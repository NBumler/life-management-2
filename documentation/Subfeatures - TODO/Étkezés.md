# Étkezés

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszer tárolás]], [[Kalóriakalkulátor]], [[Energiaegyenleg napló]], [[Recept forrású étkezés]], [[Élelmiszer forrású étkezés]], [[Ismeretlen forrású étkezés]] |

### Célállapot

Elfogyasztott étkezések rögzítése három forrástípus szerint; kalória / energiaegyenleg frissítése; készlet csökkentése ahol releváns.

### Funkcionális leírás

3 fajta étkezés lehetséges:

- [[Recept forrású étkezés]]
- [[Élelmiszer forrású étkezés]]
- [[Ismeretlen forrású étkezés]]

A recept- és élelmiszer-forrású étkezés csökkenti / eltávolítja a megfelelő tételeket az [[Élelmiszer tárolás]]ból. Az ismeretlen forrású nem.

Készletlevonás szabályai (SSOT: [[Élelmiszer tárolás]]): először felbontott tételek; majd zártak automatikus felbontással; ≤ 0 → tétel törlése; hiányzó készletnél nincs hiba.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Étkezés rögzítő flow; forrástípus választó a három gyerekhez.

### Backend

_Nincs backend érintettség._ (közös étkezés API scope később itt vagy a gyerekekben / [[Kaja]] szülőben)

### Nyitott kérdések

Nincs nyitott kérdés.
