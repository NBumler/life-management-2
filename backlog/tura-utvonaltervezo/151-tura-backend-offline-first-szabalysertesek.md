---
id: 151
type: bug
status: ready
title: Túra — Backend-offline first szabálysértések (backend-függő metrika és routing, platform-ágazás)
specs:
  - "[[Backend-offline first]]"
  - "[[Frontend]]"
flag: menu.tura
created: 2026-10-02
closed:
---

# 151 — Túra — Backend-offline first szabálysértések (backend-függő metrika és routing, platform-ágazás)

## Motiváció / probléma

A [[150-biciklizes-elo-gps-tracker]] tervezésekor derült ki, hogy a túratervező (103/104/105/107)
több ponton megsérti a [[Backend-offline first]] szerződést — az app legfontosabb ígéretét, hogy a
natív app **a saját backend nélkül is teljes értékű**, akkor is, ha a telefon soha nem
csatlakozott hozzá. A felhasználó döntése (2026-10-02): **javítani kell**. A túrának még nincs
`documentation/` specje (102: a spec a feature elkészültekor készül), ezért a `bug` a
szerződés-specekhez ([[Backend-offline first]], [[Frontend]]) képest értendő.

## Jelenlegi működés — a szabálysértések

1. **Útvonal-metrikák a backenden, külső API proxyzásával** (§13 + §14).
   `POST /api/tura/route-metrics` → `tura/RouteMetricsService` → `OpenMeteoElevationClient`.
   - §13: „a külső integrációk **soha nincsenek** a saját backenden proxyzva” — itt az Open-Meteo
     hívás a backenden megy át.
   - §14: „minden felhasználónak megjelenő számítás kliensoldali pure TS” — a táv, a
     szintemelkedés/-csökkenés, a Naismith-időbecslés és a magassági profil a szerveren készül.
   - Következmény: `BACKEND_OFFLINE` / `FULL_OFFLINE` alatt a `tura.page.ts` `refreshMetrics` /
     `computeDaySegmentMetrics` csendben `null`-t ad → **még a táv sem jelenik meg**, pedig az
     helyben triviálisan számolható; a többnapos túra napi metrikái is üresek.
2. **A turistaút-gráf csak a backendről érhető el.** A `TrailSegmentRepository` a
   `GET /api/tura/trail-segments` bbox-végpontból tölt; offline csak egy korábban letöltött régió
   manifestjéből — a régió-letöltés a szegmenseket **szintén a backendről** kéri. Soha nem
   csatlakozott eszközön nincs turistaút-réteg és nincs automatikus útvonaltervezés.
   Az útvonal-javaslat is elsőként a backenden fut (`RouteSuggestionService`), a kliens A* csak
   fallback — §14 szerint a kliensoldali számítás az elsődleges.
3. **Platform-ágazás** az `offlineCapable` flag helyett (CLAUDE.md / [[Frontend]]: „feature-kód
   csak az `offlineCapable`-re ágazhat, platform-stringre soha”):
   `tura.page.ts:230` (`offlineCapable = Capacitor.isNativePlatform()`),
   `offline-region.repository.ts` (több hely), `offline-map-protocol.ts`.

Nem szabálysértés (tudatos korlát marad): a topo / szatellit / hillshade réteg online-only, és az
offline alaptérkép-csempék letöltése internetet igényel — ezek közvetlenül a külső csempe-
szolgáltatótól jönnek (nem a backendről), és megjelenítést, nem számítást érintenek.

## Elfogadási kritériumok

- [ ] **Metrikák az eszközön:** táv, szintemelkedés/-csökkenés, időbecslés, magassági profil a
      közös `core/geo/elevation.service`-ből (#150 1. fázis), a build-asset DEM-ből — repülőgép
      módban, soha nem elért backenddel is, a kézi és az automatikus útvonalra és a napi
      szakaszokra is. A Naismith-konstansok a kliensre költöznek.
- [ ] **Turistaút-gráf build assetként:** a magyar turistaút-hálózat a geo asset-csomag része
      (#150 `build-geo-assets.mjs`, a `scripts/import-hiking-trails.mjs` forrásából) → a réteg
      megjelenítése és az automatikus útvonaltervezés első indítástól offline működik, a közös
      `core/geo/routing.service` HIKE profiljával.
- [ ] Az útvonaltervezés elsődlegesen eszközön fut; a backend `route-suggestion` és
      `route-metrics` végpontja (és az `OpenMeteoElevationClient`) megszűnik, vagy — ha marad
      rá ok — nem lehet a kliens-flow feltétele. Döntés a terv-részben.
- [ ] Ha marad online DEM-forrás (lefedettségen kívüli pontosításra), a kliens **közvetlenül**
      hívja (§13), 8 s timeouttal; a backend nem proxyz.
- [ ] Minden `Capacitor.isNativePlatform()` ágazás a túra kódjában `FeatureFlags` /
      `offlineCapable`-re cserélve.
- [ ] A meglévő túra-funkciók (kézi / automatikus útvonal, többnapos túra, katalógus, offline
      régiók, rétegek) nem regresszálnak; az eszközön futó metrika-számítás tesztjei a backend
      `RouteMetricsService` jelenlegi teszteseteit lefedik (a sűrűbb DEM-mintavétel miatti
      eltérés dokumentálva).
- [ ] [[Backend-offline first]] §13 táblázata és §15 build-asset listája frissítve; a túra spec
      (ha addigra elkészül) `#### Backend-offline` szakasza ezt írja le.

## Terv / döntési napló

- **Függőség:** a [[150-biciklizes-elo-gps-tracker]] 1. fázisa (geo asset pipeline + `core/geo/`
  DEM / routing réteg). Ez a jegy annak a túra-oldali bekötése, nem önálló újraimplementálás.
- **Alkalmazásméret:** a turistaút-gráf is növeli a geo asset-csomagot — a méretét a #150 0. fázisa
  méri, és a felhasználó **jóváhagyása nélkül nem kerül a buildbe** (ugyanaz a kapu, mint a #150
  „Alkalmazásméret” kritériuma).
- **A 3. pont (platform-ágazás) függetlenül, azonnal javítható** — kicsi, különálló commit lehet,
  nem kell megvárnia a 150-et.
- **Backend-végpontok sorsa:** javaslat: törlés (OpenAPI + controller + service + kliens-
  repository), mert a §14 szerint a számítás helye a kliens, és a párhuzamos szerveroldali
  implementáció csak eltérési lehetőség. A `trail_segment` tábla és az admin import
  katalógus-forrásként megmaradhat, de a kliens nem függ tőle (a build asset ugyanabból a
  forrásból készül).
- **Nyitott:** a `CuratedRoute` (ajánlott túrák) globális katalógus a pull-on át érkezik, így soha
  nem csatlakozott eszközön üres — ugyanaz a helyzet, mint a megosztott `Food` katalógusnál.
  Elfogadható-e így (precedens), vagy legyen a katalógus is build-asset seed? Implementáláskor
  egyeztetendő.
- **Sűrűbb DEM-mintavétel:** a mai fix 50 minta / útvonal hosszú túránál elsimítja a
  szintemelkedést; az eszközön futó változat távolság alapú (`ELEVATION_SAMPLE_SPACING_METERS`).
  A profil-grafikon ettől független, ritkított pontsort kap.

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]] — §13 / §15; túra spec (ha van) — Backend-offline
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #151 túra backend-offline first javítás
- Kód: `pages/menu/tura/`, `core/data/route-metrics.repository.ts`,
  `core/data/route-suggestion.repository.ts`, `core/data/trail-segment.repository.ts`,
  `backend/.../tura/` (metrika / suggestion / elevation eltávolítása)
