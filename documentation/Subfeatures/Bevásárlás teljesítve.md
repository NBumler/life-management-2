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
     - Lejárati dátum megadása / megerősítése — szabályok: [[Élelmiszer tárolás]] (előtöltés a választott / egyetlen tárolási hely katalógusbeli romlási ideje alapján; üresen hagyva abból számolunk).
     - **Tárolási hely:** az [[Élelmiszerek]] katalógusban **engedélyezett** mód = kitöltött romlási idő (kamra / hűtő / fagyasztó); üres idő = nem engedélyezett.
       - Több engedélyezett → a flow megkérdezi, hol tárolja.
       - Pontosan egy → nem kérdez, azzal megy.
       - Null engedélyezett → a user választ helyet és ad lejáratot (nincs katalógus-alapértelmezés).
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
- Üres aktív lista: a „Bevásárlás vége” **nem** elérhető / nem indítható; az üres listát hard delete-tel kell törölni ([[Bevásárlólista írás]]).
- Ha van legalább egy tétel, de mind pipálatlan: teljesítéskor nincs tárolás-lépés; az eredeti lista archiválódik, és új aktív lista jön létre a pipálatlan tételekkel (üres pipákkal).
- Ha van pipált élelmiszer: lejárat (+ szükség szerint tárolási hely) wizard.

### Megjegyzések

Az engedélyezett tárolási módok és a felbontás utáni fogyaszthatóság az [[Élelmiszerek]] / [[Élelmiszer manuális bevitele]] spechéz tartoznak; a Bevásárlás azokat olvassa. Null engedélyezett mód esetén a user választ a teljesítéskor — a Bevásárlás spechen belül ne találjunk ki hallgatólagos alapértelmezett helyet.

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
