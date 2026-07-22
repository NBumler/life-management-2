# Bevásárlás teljesítve

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Bevásárlás]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer tárolás]], [[Bevásárlás előzmény]] |

### Célállapot

Bevásárlás lezárása: a lista archiválása, és az élelmiszer tételek felvétele az [[Élelmiszer tárolás]]ba lejárati dátumokkal.

### Funkcionális leírás

Ha végeztünk egy bevásárlással, végig leszünk vezetve egy flow-n, ahol az alkalmazás végigkérdezi, hogy az [[Élelmiszerek]]nek — amiket az [[Élelmiszer tárolás]] funkcióba kell tenni — mi a lejárati ideje. A bevásárlólistát archiváljuk.

### UI/UX elvárások

- Végigvezető flow a lejárati dátumok megadására
- Dátum mező előtöltése: lásd [[Élelmiszer tárolás]] szabályai

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Nem-élelmiszer tételek sorsa a teljesítéskor (csak archívum?)
- Részleges teljesítés (nem vettünk meg mindent)

## Architektúra

### Frontend

Completion wizard / flow; navigáció az [[Élelmiszer tárolás]] felé.

### Backend

_Nincs backend érintettség._ (lista archiválás + storage create — várhatóan [[Bevásárlás]] / [[Élelmiszer tárolás]] API)

### Nyitott kérdések

Nincs nyitott kérdés.
