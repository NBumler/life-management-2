---
id: 195
type: feature
status: done
title: Túra — az ajánlott túrák katalógusának teljes feltöltése (447 túra)
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 195 — Túra — az ajánlott túrák katalógusának teljes feltöltése (447 túra)

## Motiváció / probléma

A [[193-tura-ajanlott-turak-katalogus-tartalomforras]] elkészítette a katalógus forrását
(`scripts/import-curated-routes.mjs`, OSM országos / regionális `route=hiking` relációk). A szkript
447 túrát állít elő, de a 2026-10-19-i első futás a helyi adatbázisba csak **87**-et töltött fel,
mielőtt leállítottuk. Ok: az admin upsert túránként egy Open-Meteo magasság-lekérést indít
(`RouteMetricsService`, 50 pont, ami az Open-Meteo kvótájában 5 hívásnak számít). Pár tucat túra után
a kvóta (percenkénti / óránkénti korlát) kimerült: a szerver `502 ELEVATION_UNAVAILABLE`-t adott,
a szkript egy percet várt és újrapróbált, így a futás órákig tartott volna, egyre több végleges hibával.

## Jelenlegi működés

- A helyi `curated_route` táblában 87 OSM-túra van (ebből 25 többnapos); a két „TESZT …” sor törölve.
- A szkript idempotens (a túra id-je a reláció id-jéből képzett UUID v5), tehát az újrafuttatás a már
  feltöltötteket is újra lekéri és felülírja — ez a kvótát feleslegesen tovább fogyasztja.

## Elfogadási kritériumok

- [x] A szkript által előállított mind a 447 túra (vagy az aktuális OSM-adatból előálló teljes készlet)
      a helyi adatbázisban van; a futás végén a „hiba” szám 0.
- [x] Az újrafuttatás ne fogyassza feleslegesen a kvótát: pl. egy `--skip-existing` kapcsoló, ami a
      már meglévő id-ket kihagyja (admin listázással vagy egy `GET` admin végponttal), vagy ütemezés
      több részletben (`--offset` / `--limit`).
- [x] A futtatás módja (mennyi idő, kvóta, újrafuttatás) a szkript fejkommentjében rögzítve.

## Terv / döntési napló

- 2026-10-19 — felvéve a #193 lezárásakor, a felhasználó kérésére: a félbehagyott import befejezése.
- Lehetséges egyszerűbb út: a futtatás egy kvóta-ablakba nem fér bele, de két-három, órákkal
- 2026-10-20 — lezárva a #217-tel: az import nem hív magasság-API-t (a metrika a DEM-ből jön), így a kvóta nem fogy; a `--skip-existing` / részletekben futtatás feleslegessé vált. Futás: Overpass 620 reláció → 447 túra (94 többnapos, 439 jelzéssel), a metrika mind a 447-re a DEM-ből, feltöltés **447 / 0 hiba**, összesen 1 perc 12 s. Az újrafuttatás ugyanennyi, kvóta nélkül. A futtatás módja és ideje a szkript fejkommentjében.
- 2026-10-20 — megfigyelés: a katalógus-lista válasza 87 → 447 túrával ~0,2 → 1,1 MB (tömörítés nélkül); emulátoron a kérés ~3,7 s, hidegindítás után az első megnyitás több mint 10 s. A töltésjelző a [[227-tura-katalogus-toltes-kozben-ures-szoveg]], a HTTP-tömörítés a [[226-tura-turistautak-lassan-jelennek-meg-elso-megnyitaskor]] mérése után eldöntendő.
  egymás utáni futtatással (a meglévők kihagyásával) igen. Alternatíva a szerveroldali magasság
  kiváltása a build-asset DEM-mel ([[176-kozos-dem-mintavetel-tura-bicikli]]) — ez nagyobb munka,
  csak akkor, ha a kvóta tartósan gond.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #216, #217, #221, #195
- Kód: `scripts/import-curated-routes.mjs`, `scripts/import-hiking-trails.mjs` (`symbolFromTags` export), `scripts/build-geo-assets.mjs` (DEM-geometria 12 tizedesre)
