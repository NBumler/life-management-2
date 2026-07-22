# Bevásárlás teljesítve

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Bevásárlás]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer tárolás]], [[Bevásárlás előzmény]], [[Bevásárlólista írás]] |

### Célállapot

A felhasználó „Bevásárlás vége” gombjára a pipált / pipálatlan tételek alapján: lista archiválása, megvett élelmiszerek felvétele az [[Élelmiszer tárolás]]ba (lejárat + szükség szerint tárolási hely), pipálatlan tételek új aktív listára másolása.

### Funkcionális leírás

A folyamat **csak** a „Bevásárlás vége” megnyomásakor indul (a pipálás önmagában nem indít semmit).

1. **Pipált tételek = megvett**
   - **Élelmiszer:** végigvezető flow:
     - Lejárati dátum megadása / megerősítése — szabályok: [[Élelmiszer tárolás]] (előtöltés a katalógus alapértelmezett lejárati ideje alapján; üresen hagyva abból számolunk).
     - **Tárolási hely:** ha az [[Élelmiszerek]] katalógusban az adott tételhez **több** engedélyezett tárolási mód van megadva (pl. hús → hűtő és fagyasztó), a flow megkérdezi, hol tárolja. Ha csak **egy** mód van, nem kérdez — azzal megy a tárolásba.
     - Létrejön a megfelelő [[Élelmiszer tárolás]] bejegyzés.
   - **Nem-élelmiszer:** nem kerül tárolásba; csak az archív lista része lesz.
2. **Pipálatlan tételek = meg nem vett**
   - Új **aktív** lista jön létre ugyanezekkel a tételekkel és mennyiségekkel, **üres pipákkal**.
   - Ha nincs pipálatlan tétel, nem jön létre új lista.
3. **Archiválás**
   - Az eredeti lista `ARCHIVED` lesz (előzmény: [[Bevásárlás előzmény]]), a teljesítés időpontjával; a tételek és pipaállapotok megmaradnak az archívumban.

Részleges teljesítés = a fenti szabályok együtt (pipált → archívum + tárolás ahol kell; pipálatlan → új aktív lista).

### UI/UX elvárások

- „Bevásárlás vége” gomb az aktív lista nézetén ([[Bevásárlólista írás]]).
- Wizard / lépésenkénti flow a pipált élelmiszerekre: lejárat, majd (ha kell) tárolási hely.
- Dátum mező előtöltése: [[Élelmiszer tárolás]].
- Üres lista vagy csak pipálatlan tételek esetén a flow legyen egyértelmű (pl. nincs tárolás-lépés; ha van pipálatlan, új lista jön létre; ha semmi pipált és semmi pipálatlan — üres lista — csak archiválás vagy tiltás: üres listát ne lehessen „befejezni”, inkább törlés — **üres aktív lista teljesítése nem támogatott**; a user törölje hard delete-tel).

### Megjegyzések

A „több tárolási mód” és a felbontás utáni fogyaszthatóság mezők az [[Élelmiszerek]] katalógus spechéz tartoznak; a Bevásárlás azokat olvassa. Ha a katalógusban még nincs kitöltve a tárolási mód lista, a teljesítés implementációja addig ne találjon ki alapértelmezést a Bevásárlás spechen belül — a katalógus a forrás.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Completion wizard; navigáció / hívások az [[Élelmiszer tárolás]] create felé; új aktív lista létrehozása a pipálatlanokból; eredeti lista archiválása.

### Backend

_Nincs backend érintettség._ (teljesítés művelet a [[Bevásárlás]] szülő API-jában; tárolás create az [[Élelmiszer tárolás]] / [[Kaja]] API-jában — a teljesítés orchestrálhatja mindkettőt, vagy egy dedikált „complete shopping list” végpont végzi el szerveroldalon)

Ajánlott: egy `POST .../shopping-lists/{id}/complete` (vagy azzal egyenértékű) végpont, ami:

- fogadja a pipált élelmiszerekhez a lejáratot (+ tárolási helyet, ha kell),
- létrehozza a storage tételeket,
- archiválja a listát,
- létrehozza az új aktív listát a pipálatlan tételekből (ha van).

Offline: [[Backend-offline first]] — a complete egy outbox-olható művelet legyen.

### Nyitott kérdések

Nincs nyitott kérdés.
