# Élelmiszerek

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszer hozzáadása]], [[Élelmiszer tárolás]], [[Bevásárlólista írás]], [[Kaja statisztika]], [[Recept]], [[Mennyiség mező]], [[Szöveges keresés]] |

### Célállapot

Élelmiszer katalógus / master data a Kaja modulban (hozzáadás, listázás, felhasználás bevásárlásban, receptben, étkezésben).

### Funkcionális leírás

Subfeature / belépő:

- [[Élelmiszer hozzáadása]]

Tervezett katalógusmezők (részben a [[Bevásárlás teljesítve]] függ tőlük — részletes spec később):

- Egy vagy több **engedélyezett tárolási mód** (pl. hűtő, fagyasztó, kamra).
- Felbontás utáni fogyaszthatósági idő (terv).
- Alapértelmezett lejárati idő (már használja: [[Élelmiszer tárolás]]).

Mennyiséghez kapcsolódó UI: [[Mennyiség mező]]. Katalógus keresés: [[Szöveges keresés]].

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

A [[Bevásárlás]] élelmiszer tételei **csak** ebből a katalógusból adhatók listára.

### Nyitott kérdések

- Katalógus mezők teljes listája (lásd részben [[Élelmiszer manuális bevitele]])
- Szerkesztés / törlés szabályai
- Tárolási mód enum végleges listája
- Felbontás utáni fogyaszthatóság pontos modellje

## Architektúra

### Frontend

Élelmiszer lista / részletek a [[Kaja]] tab alatt.

### Backend

_Nincs backend érintettség._ (élelmiszer entitás OpenAPI — várhatóan itt vagy a hozzáadás gyerekekben)

### Nyitott kérdések

Nincs nyitott kérdés.
