---
id: 176
type: change-request
status: ready
title: Közös, távolság alapú DEM-mintavétel a túra- és a bicikli-szintemelkedéshez
specs:
  - "[[Biciklizés napló]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-10-19
closed:
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

- [ ] Egyetlen közös mintavevő a `core/geo/`-ban (a `route-metrics.ts` mellett): távolság alapú
      (`ELEVATION_SAMPLE_SPACING_METERS`), legalább 2 mintával, és felső mintaszám-korláttal
      (konstans, kommentezve), hogy egy nagyon hosszú útvonal ne kérjen korlátlan DEM-lekérdezést.
- [ ] A konstans egy helyen él (a két feature közös), nem a GPS-specifikus `tracking-config.ts`-ben
      — vagy ha ott marad, a túra is onnan olvassa; duplikált konstans nincs.
- [ ] A túra (`RouteMetricsRepository`) és a bicikli (`BikeLiveSessionService`) is ezt a mintavevőt
      hívja; a bicikli saját `elevationGain()` mintavétele megszűnik (szakaszonkénti összegzés marad).
- [ ] A túra magassági profil-grafikonja nem lesz zsúfoltabb: legfeljebb `PROFILE_SAMPLE_COUNT`
      pontot kap (a sűrű mintákból ritkítva), a szintemelkedés viszont a sűrű mintákból számol.
- [ ] Ugyanarra a vonalra a túra és a bicikli ugyanazt a szintemelkedést adja — unit teszt.
- [ ] A meglévő `route-metrics.spec.ts` (backend-paritás) esetek zöldek maradnak, vagy a változás
      a tesztben indokolva van; új teszt: hosszú, hullámzó útvonalon a sűrű mintavétel több
      emelkedést lát, mint a fix 50.
- [ ] A Becsült / Pontos összegző és a túra metrika-panel viselkedése (`~`, `null` ág) változatlan.

## Terv / döntési napló

- A DEM városban felszínmodell-hatás (épületek) miatt felülbecsülhet (#150 emulátoros megfigyelés:
  sík budapesti szakasz 1 km-en 32 m) — ezt ez a jegy **nem** javítja, csak egységesíti a
  mintavételt. Ha valódi eszközön is zavaró, külön jegy (pl. erősebb simítás / zajküszöb városban,
  vagy DTM-forrás).
- A backend `RouteMetricsService` (csak az admin katalógus-upsert használja) a fix 50 mintás
  algoritmust tartja; ha a katalógus-sor metrikája és a kliens-oldali érték eltérése zavaró, a
  backend is átállítandó (a konstansok paritása a [[Backend-offline first]] §14 szerint).

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] — szintemelkedés-számítás; túra spec (ha addigra van)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #176 közös DEM-mintavétel
- Kód: `core/geo/route-metrics.ts`, `core/data/route-metrics.repository.ts`,
  `core/data/bike-live-session.service.ts`
