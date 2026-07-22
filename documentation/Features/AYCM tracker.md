# AYCM tracker

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Rendszeres kiadások]], [[Pénzügyek]] |

### Célállapot

AYCM elfogadóhelyek, check-in-ek és megtakarítás / használat statisztikák követése. Belépés: Menü.

### Funkcionális leírás

Subfeature lista:

- [[AYCM elfogadóhely hozzáadása]]
- [[AYCM Check-In]]
- [[AYCM Statisztikák]]

A bérlet / előfizetés költségét **nem** itt kell külön tárolni: a [[Rendszeres kiadások]] a közös Single Source of Truth (SSOT). Az AYCM setup és a [[AYCM Statisztikák]] „megéri-e” kalkulációja innen olvassa az `amountHuf` + `frequency` értékeket.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Menü alatti AYCM belépő; subfeature képernyők; SSOT olvasás a [[Rendszeres kiadások]]ból.

### Backend

_Nincs backend érintettség._ (partner / check-in / szabály API — gyerekekben vagy itt később)

### Nyitott kérdések

Nincs nyitott kérdés.
