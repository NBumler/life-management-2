# Outdoor köteles napló

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Outdoor - köteles]] |
| **Kapcsolódó** | [[Outdoor köteles admin]], [[Nehézségi szint skálája]], [[Kalóriakalkulátor]], [[Giga feature napló specifikáció (Ideiglenes specifikáció)]] |

### Célállapot

Kültéri köteles kísérletek naplózása. Részletek a giga-specben; ide kell majd szétválasztani.

### Funkcionális leírás

Dashboard kontextus: **Outdoor Kötél**.

Várható mezők (váz):

- Dátum, helyszín / szektor / út
- Nehézség (FRA / YDS / UIAA — [[Nehézségi szint skálája]])
- `safetyStyle`: TOPROPE / LEAD / TRAD
- Több kötélhossz: `PitchLog` lista
- Időjárás, `pumpRating`, `headspaceRating`
- Trad esetén +6 kg hardver-súly a kalóriaszámításban (giga specifikáció)
- Számított kalória → [[Kalóriakalkulátor]]

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Mezőlista véglegesítése a giga-specből

## Architektúra

### Frontend

Napló UI; több pitch; [[Nehézségi szint skálája]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
