---
id: 195
type: feature
status: ready
title: Túra — az ajánlott túrák katalógusának teljes feltöltése (447 túra)
specs: []
flag: menu.tura
created: 2026-10-19
closed:
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

- [ ] A szkript által előállított mind a 447 túra (vagy az aktuális OSM-adatból előálló teljes készlet)
      a helyi adatbázisban van; a futás végén a „hiba” szám 0.
- [ ] Az újrafuttatás ne fogyassza feleslegesen a kvótát: pl. egy `--skip-existing` kapcsoló, ami a
      már meglévő id-ket kihagyja (admin listázással vagy egy `GET` admin végponttal), vagy ütemezés
      több részletben (`--offset` / `--limit`).
- [ ] A futtatás módja (mennyi idő, kvóta, újrafuttatás) a szkript fejkommentjében rögzítve.

## Terv / döntési napló

- 2026-10-19 — felvéve a #193 lezárásakor, a felhasználó kérésére: a félbehagyott import befejezése.
- Lehetséges egyszerűbb út: a futtatás egy kvóta-ablakba nem fér bele, de két-három, órákkal
  egymás utáni futtatással (a meglévők kihagyásával) igen. Alternatíva a szerveroldali magasság
  kiváltása a build-asset DEM-mel ([[176-kozos-dem-mintavetel-tura-bicikli]]) — ez nagyobb munka,
  csak akkor, ha a kvóta tartósan gond.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #195
- Kód: `scripts/import-curated-routes.mjs`
