---
id: 104
type: feature
status: ready
title: Túra — turistaút-adatforrás integráció (magyar, majd több országos)
specs: []
flag:
created: 2026-09-13
closed:
---

# 104 — Túra — turistaút-adatforrás integráció (magyar, majd több országos)

## Motiváció / probléma

A térkép- és útvonaltervező funkcióknak (lásd
[[backlog/tura-utvonaltervezo/103-tura-alapveto-utvonaltervezes-es-terkep]]) valódi turistaút-
adatra van szükségük. A cél, hogy ez **ne fizetős térkép-API-ra** épüljön (mint a legtöbb
versenytárs), hanem nyílt adatforrásra — ez az egyik oka annak, hogy funkciókat ingyenesen tudunk
adni, amit mások fizetőfal mögé tesznek.

## Jelenlegi működés

Nincs — az appnak jelenleg nincs semmilyen térképi/geo adatforrása.

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

- Ki/mi tölti fel és frissíti a szerver oldali adatbázist (ütemezett job? admin API hívás?) — ehhez
  kapcsolódik az `Admin API (/api/admin/**)` meglévő minta. Frissítési gyakoriság még nyitott
  (heti/havi extract-újratöltés a valószínű).
- Jogi átvizsgálás: ODbL "share-alike" kötelezettség hatóköre, ha az app saját formátumban tárolja
  újra az adatot.
- Az ország-kód particionálás konkrét adatmodellje (külön tábla országonként vs. egy közös táblán
  `country_code` oszlop) — implementációs ticketre tartozó döntés.

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `backend` új `hu.bumler.lm2.<feature>` package, ütemezett adatimport job
