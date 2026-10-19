---
id: 179
type: bug
status: backlog
title: DEM-alapú szintemelkedés városban felülbecsül (felszínmodell épületekkel)
specs:
  - "[[Biciklizés napló]]"
flag:
created: 2026-10-19
closed:
---

# 179 — DEM-alapú szintemelkedés városban felülbecsül (felszínmodell épületekkel)

## Motiváció / probléma

A [[150-biciklizes-elo-gps-tracker]] emulátoros tesztjén (2026-10-19) egy jórészt sík, Dunán átkelő
budapesti szakaszra (Clark Ádám tér környéke → északkelet, ~1 km) a Pontos mód **32 m**
szintemelkedést adott; a Becsült mód Clark Ádám tér → Oktogon (2,44 km) útvonalára **51 m**-t. A
valós érték ennek töredéke lehet.

Valószínű ok: a geo build asset DEM-je a **Copernicus GLO-90**, ami felszínmodell (DSM) — az
épületek és a fák magasságát is tartalmazza. Sűrű beépítésben a 50 m-es mintavétel (#176) háztetőket
és utcákat felváltva mintáz, a 2 m-es zajküszöb ezt nem szűri. A túra útvonal-metrika ugyanezt a
DEM-et és mintavevőt használja (#176), tehát lakott területen átmenő túraszakaszokon ugyanígy hat.

## Jelenlegi működés

- [[Biciklizés napló]] „Élő edzés”: szintemelkedés DEM-ből, 50 m-enként, 2 m zajküszöbbel
  (`core/geo/route-metrics.ts`).
- A szimulált track egyenes vonal volt, nem utcakövető — a valós eltérés mértéke **valódi eszközön,
  valódi úton** még nem ismert.

## Elfogadási kritériumok

- [ ] Valódi telefonon, ismert szintkülönbségű városi és külterületi útvonalon mért összevetés
      (pl. egy sík pesti kör és egy budai emelkedő) — az eltérés számszerűen a jegyben.
- [ ] Ha a városi eltérés érdemi: döntés a javításról, pl. (a) simítás a mintasoron (mozgóátlag /
      medián) a zajküszöb előtt, (b) nagyobb, terepfüggő zajküszöb, (c) DTM-forrás (talajmodell, pl.
      Copernicus DTM / EU-DEM / országos DTM) a build assetben — a méret-kapu ([[150-biciklizes-elo-gps-tracker]]
      „Alkalmazásméret”) szerint felhasználói jóváhagyással.
- [ ] A választott megoldás a túra és a bicikli közös mintavevőjén (#176) hat, mindkettőre egyformán;
      unit teszt egy „háztető-zajos” sík mintasorra.
- [ ] A külterületi (valódi emelkedős) értékek nem romlanak érdemben.

## Terv / döntési napló

- Előfeltétel: valódi eszközös teszt ([[150-biciklizes-elo-gps-tracker]] még nyitott pontja).

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] — szintemelkedés-számítás; túra spec (ha addigra van)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #179 városi DEM-felülbecslés
- Kód: `core/geo/route-metrics.ts` (és / vagy `scripts/build-geo-assets.mjs`, ha a forrás változik)
