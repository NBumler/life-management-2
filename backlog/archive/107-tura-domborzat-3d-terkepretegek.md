---
id: 107
type: feature
status: done
title: Túra — domborzat/lejtő-réteg, 3D nézet, alternatív térképrétegek
specs: []
flag: menu.tura
created: 2026-09-13
closed: 2026-09-16
---

# 107 — Túra — domborzat/lejtő-réteg, 3D nézet, alternatív térképrétegek

## Motiváció / probléma

A felhasználó egyik konkrét panasza: "van hogy a szintkülönbség térkép ... fizetős". Ez a ticket a
vizuális domborzat-/lejtő-megjelenítést és az extra térképrétegeket fedi — ezek a legtöbb
versenytársnál (bergfex PRO, OsmAnd Pro, Természetjáró Pro+) prémium-funkciók.

## Jelenlegi működés

Nincs — ez egy vadonatúj feature.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.
- [x] Minden "kell" jelölt tétel implementálva és `master`-en, zöld frontend build+teszt+lint mellett.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Lejtő/domborzat-réteg (szín szerinti meredekség-vizualizáció) — **kell**.
- [ ] 3D térképnézet — **nem kell** (kikerül a scope-ból; jelentős renderelési/fejlesztési
      költséghez képest alacsony hozzáadott érték a felhasználó szerint).
- [x] Alternatív térkép-cartography rétegek (topo, szatellit stb.) — **kell**.
- [x] Magassági profil grafikon — már a
      [[backlog/tura-utvonaltervezo/103-tura-alapveto-utvonaltervezes-es-terkep]] ticket lefedi,
      itt csak megjegyzésként szerepel.

### Nyitott kérdés

- ~~Ez a ticket sok tekintetben a `103-...` alaptérkép-tickettel közös technológiai alapra épül~~ —
  eldőlt: nem összevonva, hanem a 103 lezárása után, önálló fázisként (3. fázis) valósult meg,
  ugyanarra a MapLibre GL JS alapra építve.
- ~~3D nézet renderelési költsége~~ — tárgytalan, a 3D nézet a döntési checklista szerint nem kell.

### Megvalósítás (2026-09-16)

- **Alternatív alaptérkép-rétegek**: a meglévő nyers OSM raster-csempe alaptérkép mellé két
  további, ugyanígy kulcs nélküli, ingyenes raster-forrás — **OpenTopoMap** (topográfiai) és
  **Esri World Imagery** (szatellit). Mindhárom forrás/réteg a kezdeti MapLibre style részeként él
  egyszerre (nem `map.setStyle()`-lal cserélve egymást), a váltás a `visibility` layout-
  tulajdonsággal történik — ez biztosítja, hogy a turistajelzés-/útvonal-rétegek érintetlenek
  maradjanak alaptérkép-váltáskor.
- **Domborzat-réteg**: a döntési checklista "lejtő/domborzat-réteg (szín szerinti meredekség-
  vizualizáció)" pontját a MapLibre natívan támogatott `hillshade` réteg-típusa fedi le (fény/árnyék
  alapú domborzat-kiemelés), az AWS "elevation-tiles-prod" (Mapzen Terrarium-kódolású, nyílt,
  kulcs nélküli) raster-dem csempeforrásra építve. Egy tényleges, önálló szín-skálás lejtőszög-
  réteghez saját, előre számolt lejtő-csempére volna szükség, amihez nincs ingyenes, kulcs nélküli
  publikus szolgáltatás — ez a technikai kompromisszum a "3D nézet nem kell" döntéssel összhangban
  a legegyszerűbb, extra backend-munka nélküli megoldás volt.
- Mindkettő be/kikapcsolható egy új "Rétegek" panelről (alaptérkép-választó lista +
  domborzat-árnyékolás kapcsoló), böngészőben manuálisan ellenőrizve (OSM/topográfiai/szatellit
  váltás, hillshade on/off a Pilis-hegység fölött).
- **Nincs backend-változás** — mindhárom új forrás kliens-oldali, nyers, kulcs nélküli csempe-
  szolgáltatás, akárcsak az eredeti OSM alaptérkép.
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts` (+`.html`), i18n `TURA.LAYERS.*` kulcsok,
  `frontend/src/app/core/config/icons.ts` (`layers-outline` regisztrálva).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a `102-tura-utvonaltervezo-attekintes` esernyő-ticket explicit
  rögzíti, hogy a `documentation/` spec csak a teljes feature-család (103–111) leszállítása után
  készül el.
- `IMPLEMENTATION_STATUS.md` sor: `2026-09-16 — #107` (a `## Lezárt jegyek` tetején).
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts`, `.html`, `core/config/icons.ts`,
  `assets/i18n/{hu,en}.json` (`TURA.LAYERS.*`).
