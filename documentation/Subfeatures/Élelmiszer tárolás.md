# Élelmiszer tárolás

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Bevásárlás teljesítve]], [[Élelmiszerek]], [[Étkezés]], [[Értesítések]], [[Recept forrású étkezés]], [[Élelmiszer forrású étkezés]], [[Mennyiség mező]] |

### Célállapot

A megvásárolt / tárolt élelmiszerek készletének vezetése lejárati dátummal és tárolási hellyel; romlás esetén értesítés; étkezéskor levonás a készletből.

### Funkcionális leírás

Ha végeztünk a [[Bevásárlás]]-sal ([[Bevásárlás teljesítve]]), a **pipált** élelmiszer tételek hozzáadódnak az élelmiszer tároláshoz.

#### Lejárat

- Ha a felhasználó nem ad meg lejárati dátumot, akkor az [[Élelmiszerek]] katalógusban az **adott tárolási helyhez** tartozó romlási idő alapján számolunk (kamra / hűtő / fagyasztó — [[Mennyiség mező]] `duration`).
- Ha megad lejárati dátumot, azzal számolunk. A dátum input előtöltése: a választott (vagy egyetlen) tárolási hely katalógusbeli ideje alapján.

#### Tárolási hely

- Engedélyezett módok = a katalógusban **kitöltött** kamra / hűtő / fagyasztó romlási idők; üres = nem engedélyezett.
- Ha több mód engedélyezett → a teljesítés flow megkérdezi; ha csak egy → azzal megy. Részletek: [[Bevásárlás teljesítve]].
- Ha **egyik sem** van kitöltve a katalógusban → a teljesítéskor a felhasználónak kell választania helyet **és** lejáratot (nincs katalógus-alapértelmezés a helyre).

#### Felbontás után

A katalógus **felbontás után** időtartama ([[Élelmiszer manuális bevitele]]): felbontáskor / részleges fogyasztáskor a készlet lejáratának újraszámolásához (részletes UI flow TBD ebben a spechen).

#### Romlás / értesítés / étkezés

Lejárati dátum alapján tudható, hogy az élelmiszer megromlott-e. Ha igen: [[Értesítések]].

[[Étkezés]]-kor az elfogyasztott mennyiség csökken a készletből, ha forrása:

- [[Recept forrású étkezés]]
- [[Élelmiszer forrású étkezés]]

([[Ismeretlen forrású étkezés]] nem módosítja a tárolást.)

Katalógustétel törlésekor a rá hivatkozó tárolási tételek is törlődnek ([[Élelmiszerek]] cascade).

### UI/UX elvárások

- Készlet lista; lejárat jelzés.
- Lejárati dátum előtöltése bevásárlás teljesítéskor: fentebb + [[Bevásárlás teljesítve]].

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Felbontás utáni lejárat-újraszámolás pontos UI / szabályai
- Részleges mennyiség fogyasztása (készlet csökkenés)

## Architektúra

### Frontend

Készlet lista; lejárat jelzés; kapcsolat az [[Értesítések]] triggerével; teljesítés wizard a [[Bevásárlás teljesítve]] felől.

### Backend

Tárolt tétel entitás (OpenAPI) — várható mezők: hivatkozás `Food` id-re, mennyiség, tárolási hely enum (`ROOM` \| `FRIDGE` \| `FREEZER`), lejárati dátum, felbontva flag / felbontás dátuma (TBD a felbontás flow-val). Cascade delete a `Food` törlésekor.

### Nyitott kérdések

Nincs nyitott kérdés.
