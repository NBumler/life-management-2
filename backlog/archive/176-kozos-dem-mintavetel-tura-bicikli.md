---
id: 176
type: change-request
status: done
title: Közös, távolság alapú DEM-mintavétel a túra- és a bicikli-szintemelkedéshez
specs:
  - "[[Biciklizés napló]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-10-19
closed: 2026-10-19
---

# 176 — Közös, távolság alapú DEM-mintavétel a túra- és a bicikli-szintemelkedéshez

## Motiváció / probléma

A #150 emulátoros tesztje utáni architektúra-ellenőrzés (2026-10-19) találata: a túra és a bicikli
ugyanazzal a DEM-mel, ugyanazzal a `computeRouteMetrics`-szel és ugyanazzal a 2 m-es zajküszöbbel
számol szintemelkedést, de **más mintavétellel** — így ugyanarra a vonalra más eredményt adnak.

- Hosszú túraútvonalon a fix 50 minta ritka (20 km-en ~400 m-enként) → a szintemelkedés
  alulbecsült, a kisebb emelkedők elsimulnak.
- A [[151-tura-backend-offline-first-szabalysertesek]] terve ("Sűrűbb DEM-mintavétel") már
  rögzítette, hogy a túra is távolság alapú mintavételre áll át, a profil-grafikon pedig külön,
  ritkított pontsort kap — ez nem valósult meg.

## Jelenlegi működés

| Hívó | Mintavétel | Kód |
|---|---|---|
| Túra (kézi / automatikus útvonal, napi szakaszok) | fix `PROFILE_SAMPLE_COUNT` = 50 minta, hossztól függetlenül | `core/geo/route-metrics.ts` `routeMetricsSamples()` → `core/data/route-metrics.repository.ts` |
| Bicikli élő edzés (Pontos track, Becsült útvonal) | `ELEVATION_SAMPLE_SPACING_METERS` = 50 m-enként | `core/data/bike-live-session.service.ts` `elevationGain()` (saját mintavétel `resampleEvenly`-vel) |

A magassági profil (túra) ugyanabból az 50 mintából készül, mint a szintemelkedés.

## Elfogadási kritériumok

- [x] Egyetlen közös mintavevő a `core/geo/`-ban (a `route-metrics.ts` mellett): távolság alapú
      (`ELEVATION_SAMPLE_SPACING_METERS`), legalább 2 mintával, és felső mintaszám-korláttal
      (konstans, kommentezve), hogy egy nagyon hosszú útvonal ne kérjen korlátlan DEM-lekérdezést.
- [x] A konstans egy helyen él (a két feature közös), nem a GPS-specifikus `tracking-config.ts`-ben
      — vagy ha ott marad, a túra is onnan olvassa; duplikált konstans nincs.
- [x] A túra (`RouteMetricsRepository`) és a bicikli (`BikeLiveSessionService`) is ezt a mintavevőt
      hívja; a bicikli saját `elevationGain()` mintavétele megszűnik (szakaszonkénti összegzés marad).
- [x] A túra magassági profil-grafikonja nem lesz zsúfoltabb: legfeljebb `PROFILE_SAMPLE_COUNT`
      pontot kap (a sűrű mintákból ritkítva), a szintemelkedés viszont a sűrű mintákból számol.
- [x] Ugyanarra a vonalra a túra és a bicikli ugyanazt a szintemelkedést adja — unit teszt.
- [x] A meglévő `route-metrics.spec.ts` (backend-paritás) esetek zöldek maradnak, vagy a változás
      a tesztben indokolva van; új teszt: hosszú, hullámzó útvonalon a sűrű mintavétel több
      emelkedést lát, mint a fix 50.
- [x] A Becsült / Pontos összegző és a túra metrika-panel viselkedése (`~`, `null` ág) változatlan.

## Terv / döntési napló

- A DEM városban felszínmodell-hatás (épületek) miatt felülbecsülhet (#150 emulátoros megfigyelés:
  sík budapesti szakasz 1 km-en 32 m) — ezt ez a jegy **nem** javítja, csak egységesíti a
  mintavételt → [[179-dem-varosi-szintemelkedes-felulbecsles]].
- A backend `RouteMetricsService` (csak az admin katalógus-upsert használja) a fix 50 mintás
  algoritmust tartja; ha a katalógus-sor metrikája és a kliens-oldali érték eltérése zavaró, a
  backend is átállítandó (a konstansok paritása a [[Backend-offline first]] §14 szerint).

### Megvalósítás (2026-10-19)

- `core/geo/route-metrics.ts`: `ELEVATION_SAMPLE_SPACING_METERS` (50 m, a `tracking-config.ts`-ből
  ide költözött — a túra és a bicikli közös konstansa), új `MAX_ELEVATION_SAMPLES` (2000 = 100 km;
  hosszabb vonal ritkábban mintázva), `elevationSamples()` (a `routeMetricsSamples()` helyett: legalább
  a két végpont, legfeljebb a korlát). A `computeRouteMetrics` a szintemelkedést / -csökkenést minden
  mintából számolja, a `profile`-t legfeljebb `PROFILE_SAMPLE_COUNT` (50) pontra ritkítja (első és
  utolsó megmarad).
- `RouteMetricsRepository` (túra) és `BikeLiveSessionService.elevationGain()` (bicikli) is az
  `elevationSamples()`-t hívja; a bicikli saját mintavétele megszűnt.
- Tesztek: lépésköz, 2-es minimum, korlát, profil-ritkítás, hosszú hullámzó útvonal (a sűrű mintavétel
  >700 m-t lát, a fix 50 kevesebb mint a felét), túra = bicikli ugyanarra a vonalra
  (`bike-live-session.service.spec.ts`). A backend-paritás esetek zöldek maradtak.
- Rövid útvonalon (≤ ~2,5 km) a profil mostantól kevesebb, mint 50 pontból áll (minden 50 m-es minta) —
  a grafikon ettől nem változik érdemben.

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] — szintemelkedés-számítás; túra spec (ha addigra van)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #176 közös DEM-mintavétel
- Kód: `core/geo/route-metrics.ts`, `core/data/route-metrics.repository.ts`,
  `core/data/bike-live-session.service.ts`
