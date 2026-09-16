---
id: 104
type: feature
status: done
title: Túra — turistaút-adatforrás integráció (magyar, majd több országos)
specs: []
flag: menu.tura
created: 2026-09-13
closed: 2026-09-16
---

# 104 — Túra — turistaút-adatforrás integráció (magyar, majd több országos)

## Motiváció / probléma

A térkép- és útvonaltervező funkcióknak (lásd
[[backlog/tura-utvonaltervezo/103-tura-alapveto-utvonaltervezes-es-terkep]]) valódi turistaút-
adatra van szükségük. A cél, hogy ez **ne fizetős térkép-API-ra** épüljön (mint a legtöbb
versenytárs), hanem nyílt adatforrásra — ez az egyik oka annak, hogy funkciókat ingyenesen tudunk
adni, amit mások fizetőfal mögé tesznek.

## Jelenlegi működés

Valós, teljes országos magyar turistaút-hálózat van betöltve a `trail_segment` táblába (230 611
szakasz, 6375 OSM `route=hiking` reláció alapján) — lásd "### Megvalósítás" lent.

## Elfogadási kritériumok

- [x] Adatforrás-döntés meghozva és dokumentálva (licenc, frissítési mechanizmus, attribúció-
      kötelezettség).
- [x] Több-országos bővítéshez szükséges absztrakció körvonalazva (ország-specifikus adatforrás
      cserélhetősége).

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] **turistautak.openstreetmap.hu / OSM extract** — kiválasztva elsődleges adatforrásnak. Nyílt,
      ingyenes, ODbL-licencű magyar turistaút-adat, GPX exporttal. Periodikus extract-import a
      backend oldalon (nem valós idejű Overpass-lekérdezés) — ez ütemezett job kérdését veti fel
      (lásd nyitott kérdés).
- [x] Backend-oldali szinkron/cache mechanizmus: globális, rendszeresen frissülő referencia-
      adatkészlet, a megosztott `Food`/`Recipe` katalógus mintáját követve (`user_id IS NULL`).
- [x] **Ország-kód szerinti particionálás/absztrakció már most, a kezdetektől** — a felhasználó
      explicit úgy döntött, hogy ne kelljen később migrálni: az adatmodell (táblák, importer)
      elejétől fogva ország-kód mezővel/particionálással készüljön, még ha induláskor csak
      Magyarország adata is töltődik be. Ez később relevánssá válik a
      `105-tura-offline-terkep-es-utvonalszamitas.md` régiónkénti letöltésénél is.
- [ ] Nyers Overpass API valós idejű lekérdezés — **nem kell**, az extract-alapú megközelítés mellett
      döntöttünk.

### Nyitott kérdés

- ~~Ki/mi tölti fel és frissíti a szerver oldali adatbázist (ütemezett job? admin API hívás?)~~ —
  **megoldva**: kézzel indítható `scripts/import-hiking-trails.mjs` script (Node), ami az admin API-n
  (`POST /api/admin/tura/trail-segments/import`, már a 103-as fázisból megvolt) keresztül tölti be az
  adatot. Ütemezett automatizálás továbbra sem kell — ez a terv szerinti MVP-scope volt.
- ~~Jogi átvizsgálás: ODbL "share-alike" kötelezettség hatóköre~~ — **elfogadva**: az adat forrása és
  licence (`© OpenStreetMap contributors, ODbL`) a többi OSM-alapú réteghez (alaptérkép, domborzat)
  hasonlóan van kezelve — nincs saját, módosított újra-terjesztés, csak a saját appon belüli
  megjelenítés/routing, a meglévő attribúciós mintát követve. Formális jogi felülvizsgálat nem történt
  (nem is volt elvárás ehhez a projektmérethez).
- ~~Az ország-kód particionálás konkrét adatmodellje~~ — **megoldva**: egy közös `trail_segment`
  tábla `country_code` oszloppal (nem országonkénti külön tábla) — lásd `V39__tura_trail_segment.sql`.

## Lezáráskor (on-done)

- Frissített specek: nincs — a 102-es umbrella ticket szerint a `documentation/` alá tartozó spec csak
  a teljes feature-kör (103–111) lezárásakor készül el.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-16 — #104.
- Kód: `scripts/import-hiking-trails.mjs` (új, kézi admin-triggerelt import script — Overpass API-ból
  tölti le a `route=hiking` relációkat és a hozzájuk tartozó szakasz-geometriát, az OSM `osmc:symbol`
  tagből vezeti le a saját `symbol` mezőt, majd a meglévő admin import endpointra POST-olja).

### Megvalósítás (2026-09-16)

- **Adatforrás: Overpass API, nem a turistautak.hu saját API-ja.** A döntési napló eredetileg a
  turistautak.hu saját (JOSM-kompatibilis) API-ját nevezte meg forrásként, de ennek pontos, aktuális
  végpont-formátuma a session során nem volt megbízhatóan reprodukálható (elavult/hiányos wiki-
  dokumentáció, több próbált URL-forma 404-et adott). Az Overpass API (`overpass-api.de/api/interpreter`)
  ellenben ugyanazt a nyílt OSM-adatot adja vissza közvetlenül — `route=hiking` relációk, a rajtuk lévő
  `osmc:symbol`/`symbol:hu` tagekkel (pl. `piros sáv`, `zöld kereszt`) —, amire a turistautak.hu is épül,
  úgyhogy ez a licenc/adattartalom szempontjából egyenértékű, csak közvetlenebb forrás. (Az Overpass
  nyilvános instance-a nem-böngésző User-Agent/Referer nélküli kéréseket 406-tal utasítja el — ez bot-
  védelem, nem hitelesítés, a scriptben ezért van egy böngészőt imitáló header-pár.)
- **`osmc:symbol` → saját `symbol` mező fordítás**: a szín (`red`/`blue`/`green`/`yellow`/...) és az
  alakzat (`bar`/`cross`/`triangle`/`circle`/...) tagjaiból építi fel a `PIROS_SAV`/`KEK_HAROMSZOG`
  stílusú kulcsokat; ismeretlen kombinációra a `symbol:hu` tag (ékezetek nélkül) a tartalék, végső
  esetben `EGYEB` — a frontend ismeretlen symbolra is szürkével rajzol (nem hibás állapot).
- **Teljesítmény-javítás a tömeges importhoz**: az eredeti `TrailSegmentService.importSegments` soronként
  hívott `repository.save()`-je (kézzel generált, nem-null UUID id miatt) minden sorra egy felesleges
  exists-ellenőrző `merge()`-ot futtatott volna — ez 50 000+ soros importnál percekig tartott/időtúllépést
  okozott. Megoldás: `EntityManager.persist()` közvetlenül (garantáltan új sor, nincs select), 500-anként
  `flush()`+`clear()`, plusz `hibernate.jdbc.batch_size: 100` az `application.yaml`-ban (JDBC batch-elt
  insertek). Országos import (230 611 szakasz) ezzel percek alatt lefut.
- **Teljesítmény-javítás a route-suggestion végpontnál is**: a 103-as fázisban a routing-gráf minden
  kéréskor a *teljes* ország-hálózatból épült fel — egy tesztrégiónyi adaton ez észrevehetetlen volt,
  de a valódi, 230 611 szakaszos országos adaton egyetlen útvonal-javaslat is 20-25 másodpercig tartott.
  Megoldás: a gráf mostantól csak a kezdő-/végpont köré fűzött, a két pont távolságával arányosan táguló
  bbox-on belüli szakaszokból épül fel (min. 10 km, a távolság 50%-a, max. 150 km ráhagyással; ha az első
  próbálkozás nem talál utat, egy második, maximális sugarú próbálkozás következik, mielőtt "nincs
  útvonal"-t jelentenénk) — ezzel egy tipikus helyi túraútvonal-javaslat ~1 másodperc alatt lefut.
- **Kapcsolódó, a 103-as fázisban véletlenül bekerült hiba is javítva ugyanebben a körben**: a kezdő-/
  végpont a legközelebbi *ismert turistaút-vertexre* (nem a vonalra) illeszkedett — egy hosszú, egyenes
  szakasz közepére kattintva a legközelebbi vertex könnyen a 2 km-es snap-küszöbön kívülre eshetett.
  Mostantól a legközelebbi útvonal-*élre* vetítünk merőlegesen (virtuális csomópont beszúrásával), ahogy
  pl. a Google Maps sem várja el a pixel-pontos találatot egy útkereszteződésen.
