# Élelmiszer tárolás

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Élelmiszerek]], [[Étkezés]], [[Értesítések]], [[Recept forrású étkezés]], [[Élelmiszer forrású étkezés]] |

### Célállapot

A megvásárolt / tárolt élelmiszerek készletének vezetése lejárati dátummal; romlás esetén értesítés; étkezéskor levonás a készletből.

### Funkcionális leírás

Ha végeztünk a [[Bevásárlás]]-sal ([[Bevásárlás teljesítve]]), a **pipált** élelmiszer tételek hozzáadódnak az élelmiszer tároláshoz.

- Ha a felhasználó nem ad meg lejárati dátumot, akkor az [[Élelmiszerek]] résznél megadott lejárati idő alapján számolunk.
- Ha a felhasználó megad lejárati dátumot, akkor azzal számolunk. A megjelenő dátum input mezőt előtöltjük az [[Élelmiszerek]] résznél megadott lejárati idő alapján.
- Tárolási hely: ha a katalógusban több engedélyezett mód van, a teljesítés flow megkérdezi; ha csak egy, azzal megy — részletek: [[Bevásárlás teljesítve]].

Lejárati dátum alapján tudható, hogy az élelmiszer megromlott-e. Ha igen, küldjünk [[Értesítések]]-et.

[[Étkezés]]-kor az elfogyasztott élelmiszert el kell távolítani / csökkenteni a tárolt készletből, ha forrása:

- [[Recept forrású étkezés]]
- [[Élelmiszer forrású étkezés]]

([[Ismeretlen forrású étkezés]] nem módosítja a tárolást.)

### UI/UX elvárások

- Lejárati dátum input előtöltése a katalógus alapértelmezett lejárati ideje alapján (bevásárlás teljesítés flow — [[Bevásárlás teljesítve]])

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Tárolási helyek (Hűtő / Fagyasztó / Kamra) részletes modellje
- Részleges mennyiség fogyasztása

## Architektúra

### Frontend

Készlet lista; lejárat jelzés; kapcsolat az [[Értesítések]] triggerével.

### Backend

_Nincs backend érintettség._ (tárolt tétel entitás / lejárat — TBD a [[Kaja]] vagy itt)

### Nyitott kérdések

Nincs nyitott kérdés.
