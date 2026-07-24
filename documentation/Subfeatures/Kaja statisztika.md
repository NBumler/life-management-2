# Kaja statisztika

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Kaja]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Recept]], [[Étkezés]], [[Szöveges keresés]], [[Backend-offline first]] |

### Célállapot

Katalógus-alapú rangsorok: külön listák [[Élelmiszerek]]re és [[Recept]]ekre, aránymutatók szerint. Read-only; számítás a helyi katalógusból. A UI **bővíthető** későbbi statisztika-típusokra (pl. „mit ettem legtöbbet” az [[Étkezés]]ből) — ezek **nem** ebben a körben készülnek el, de az információarchitektúra hagy helyet nekik.

### Funkcionális leírás

#### Statisztika-típusok (extenzibilitás)

| Típus | Scope most | Adatforrás |
|---|---|---|
| **Katalógus arányok** | `Kész` / implementálandó | [[Élelmiszerek]], [[Recept]] |
| Egyéb (pl. fogyasztás / „legtöbbet evett”, idősoros, …) | Későbbi specek | pl. [[Étkezés]] |

UI: típusválasztó / szegmens (vagy későbbi tab). Az első és egyetlen kidolgozott típus: **Katalógus arányok**. Új típus hozzáadása ne törje a meglévő képernyőt.

#### Katalógus arányok — két külön lista

- **Élelmiszerek** lista (önálló)
- **Receptek** lista (önálló)

Nincs közös összevont rangsor.

#### Mutatók (választható, egy aktív)

| Mutató | Számítás | „Jobb” irány (csökkenő = legjobb elöl) |
|---|---|---|
| Fehérje / kalória | `fehérje_g / kcal` | magasabb jobb |
| Fehérje / szénhidrát | `fehérje_g / szénhidrát_g` | magasabb jobb |
| Fehérje / ár | `fehérje_g / ár_Ft` | magasabb jobb |

#### Bázis mennyiség

- **Élelmiszer:** tápanyagok és a belőlük számolt arányok **100 g / 100 ml** alapon (katalógusmezők közvetlenül). Ár a fehérje/ár mutatóhoz: a csomagárat hozd **100 g/ml**-re, ha van nettó tartalom:  
  `ár_per_100 = priceHuf × (100 / nettó_baseAmount)`  
  (nettó egység dimenziója egyezzen; ha nettó / ár hiányzik → hiányos).
- **Recept:** a recept **teljes összegzett** tápanyagai és ára ([[Recept]] kalkuláció). Mivel a recepten nincs adagszám mező, ez az összeg = **egy adag** a rangsor szempontjából.

#### Hiányos adat

Ha a mutató **nem számolható** (üres / 0 nevező, pl. `kcal = 0`, `szénhidrát = 0`, `ár = 0`, hiányzó fehérje, élelmiszernél hiányzó nettó a fehérje/ár-hoz):

- a tétel **nem** kap érvényes arányszámot;
- a listában a **hiányos** jelzésű csoportban jelenik meg, az érvényes rangsor **után** (végén);
- hiányosokon belül: név szerint ABC (vagy stabil id-sorrend).

Érvényes tételek: a választott mutató szerint rendezve.

#### Rendezés és keresés

- Rendezés: **csökkenő** és **növekvő** (a mutató értéke szerint). Hiányos blokk mindig a lista végén marad (nem keveredik az érvényes közé).
- Keresés: [[Szöveges keresés]] a listán (név / releváns szöveg).
- **Helyezés oszlop:** az első oszlopban a tétel **helyezése** a *teljes* (keresés nélküli) érvényes rangsorban a jelenlegi mutató + irány szerint (1, 2, 3, …). Kereséskor is ez a helyezés látszik — pl. „csirke” szűrésnél látszik, hogy a találat hányadik a teljes listán. Hiányos tételeknél: nincs helyezésszám (vagy „—” / hiányos jelölés).

#### Navigáció

Lista tétel koppintás → [[Élelmiszerek]] vagy [[Recept]] részletek.

### UI/UX elvárások

- Kaja tab: Statisztika belépő.
- Típus: Katalógus arányok (hely a jövőbeli típusoknak).
- Élelmiszer / Recept váltó (két külön lista).
- Mutató választó; rendezés irány (↓ / ↑); kereső.
- Táblázat / lista oszlopok: **helyezés**, név, mutatóérték (+ hiányos badge).
- Read-only; nincs szerkesztés innen.

### Megjegyzések

Fogyasztás-alapú statisztikák külön specekben / ugyanitt új típusként jönnek; adatmodelljük az [[Étkezés]]re épül, nem a katalógus-arány logikára.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Statisztika shell: `statType` discriminator (most: `CATALOG_RATIOS`; később pl. `CONSUMPTION_TOP`).
- `CATALOG_RATIOS`: két adatforrás (food / recipe store) → pure TS ranking utility (mutató, irány, incomplete partition, search filter, rank index a teljes érvényes listából).
- Keresés: [[Szöveges keresés]].
- Navigáció: router a katalógus részletekre.

#### Backend-offline

Olvasás a helyi store-ból (Backend-offline / Full-offline). Nincs saját módosító API → nincs outbox ebben a spechen. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (opcionális későbbi aggregáció fogyasztás-statokhoz; katalógus-arány kliensoldalon elég)

### Nyitott kérdések

Nincs nyitott kérdés.
