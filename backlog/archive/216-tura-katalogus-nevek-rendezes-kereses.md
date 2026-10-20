---
id: 216
type: change-request
status: done
title: Túra — a katalógus nevei rejtélyesek, a lista rendezetlen, nincs keresés
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 216 — Túra — a katalógus nevei rejtélyesek, a lista rendezetlen, nincs keresés

## Motiváció / probléma

A 87 elemes listában a nevek az OSM-reláció nevei („P (Dömös – Budaörs)”, „S (Tettye – Abaligeti cseppkőbarlang)”) — a „P” / „S” a jelzés rövidítése, ezt a felhasználó nem tudja. A lista nincs rendezve (Kőszeg az első), és nem lehet régióra vagy névre keresni.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `curated_route.name` = az OSM-reláció `name` tagje (#193 import).
- Szűrők: nehézség, aktivitás, táv; nincs szöveges keresés, régió, rendezés.

## Elfogadási kritériumok

- [x] A jelzés-rövidítés érthetően jelenik meg (pl. a jelzés színes ikonja + „Piros sáv: Dömös – Budaörs”), az import vagy a megjelenítés átalakításával.
- [x] A lista rendezett (pl. név vagy táv szerint, választhatóan).
- [x] Szöveges keresés a névre (a meglévő shared szöveges kereső komponenssel), és megfontolva régió-szűrő / „közelemben” rendezés (ez utóbbi a [[215-tura-sajat-helyzet-es-helykereses]]-től függ).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés: a jelzés megbízható forrása az OSM-reláció `osmc:symbol` tagje, nem a név → új `curated_route.symbol` (nullable, Flyway `V63`, OpenAPI `CuratedRoute.symbol` / upsert `symbol`), ugyanabban a `<SZÍN>_<ALAKZAT>` formában, mint a `trail_segment.symbol` — az import a `scripts/import-hiking-trails.mjs` `symbolFromTags`-ét használja. 447-ből 439 túra kapott jelzést (ZOLD_SAV 118, SARGA_SAV 96, PIROS_SAV 88, KEK_SAV 86, LILA_M 9, …).
- 2026-10-20 — megjelenítés: a sor elején jelzés-ikon (`app-marking-badge`: fehér alapon a szín csíkja, vagy az alakzat / betű — „+”, „▲”, „M”), a cím a név eleji rövidítés nélkül („P (Dömös – Budaörs)” → „Dömös – Budaörs”, „K, OKT 16. (…)” → „OKT 16. (…)”) — a rövidítés csak akkor esik le, ha a betű a jelzés színével egyezik (P/K/Z/S/L), így egy „K”-val kezdődő helynév nem csonkul; a hiányzó záró zárójel (OSM-hiba) is kezelve. Alatta „Piros sáv · Nehéz · Gyalogos”. Az átvett útvonal neve „Piros sáv: Dömös – Budaörs”. Az előnézet-kártyán és a részletek-lapon is az ikon és a cím.
- 2026-10-20 — rendezés (Név szerint / Táv szerint) és szöveges keresés (`shared/text-search`, ékezet- és kisbetű-független, a teljes OSM-névre — „OKT 16”, „Budaors” is talál) a betöltött listán; a név szerinti rendezés `Intl.Collator`-ral a felület nyelvén, számokat érték szerint. A rendezés és a három szűrő 2×2-es rácsban, hogy 360 dp-n is maradjon hely a listának. „Közelemben” rendezés: a [[215-tura-sajat-helyzet-es-helykereses]] után.
- 2026-10-20 — emulátoron (360 dp, hu + en): ikonok, címek, keresés („Budaors” → „Dömös – Budaörs”), táv szerinti rendezés (4,9 km-es „Kecskeláb-rét – Szarvas-kúti-rét” elöl, sárga kereszt ikonnal). Az első változatban a jelzés nélküli sor címe beljebb kezdődött — az ikon helye most üresen is foglalt.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #216, #217, #221, #195
- Kód: `backend/.../tura/CuratedRoute{Entity,Mapper,Service}.java`, `V63__curated_route_symbol.sql`, `scripts/import-curated-routes.mjs`, `scripts/import-hiking-trails.mjs` (`symbolFromTags` export), `scripts/build-geo-assets.mjs` (DEM-geometria 12 tizedesre), `frontend/.../tura/curated-route-text.ts` (+ spec), `marking-badge.component.*`, `tura.page.ts|html|scss`
