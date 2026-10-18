---
id: 151
type: bug
status: in-progress
title: Túra — Backend-offline first szabálysértések (backend-függő metrika és routing)
specs:
  - "[[Backend-offline first]]"
  - "[[Frontend]]"
flag: menu.tura
created: 2026-10-02
closed:
---

# 151 — Túra — Backend-offline first szabálysértések (backend-függő metrika és routing)

> **Jelentős rész kész (2026-10-18):** a FULL_OFFLINE magasság és a turistaút-alapú **automatikus
> útvonaltervezés** build assetből megy (lásd "Megvalósítás — 2. kör" lent) — ez volt a két
> konkrét szabálysértés. **Nyitva maradt egy pont**, amit a motivációs szöveg is külön nevez meg:
> a turistaút-**réteg megjelenítése** a térképen build assetből (soha nem letöltött eszközön) —
> ez még a `TrailSegmentRepository`-n (backend/letöltött régió) megy, nem a build assetről. Lásd
> az elfogadási kritériumok közt külön kiemelve.

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
3. ~~**Platform-ágazás** az `offlineCapable` flag helyett~~ — **visszavonva, nem szabálysértés.**
   A tiltás a platform-*stringre* (`Capacitor.getPlatform() === 'android'`) vonatkozik; az
   `offlineCapable` képességet a kódbázis mindenhol `Capacitor.isNativePlatform()`-mal valósítja meg
   (60+ helyen, a `StorageBackend` DI-választásban is — nincs külön `offlineCapable` szolgáltatás),
   és a túra is így tesz (`tura.page.ts`: `offlineCapable = Capacitor.isNativePlatform()`).
   `getPlatform()` sehol nincs a kódban.

Nem szabálysértés (tudatos korlát marad): a topo / szatellit / hillshade réteg online-only, és az
offline alaptérkép-csempék letöltése internetet igényel — ezek közvetlenül a külső csempe-
szolgáltatótól jönnek (nem a backendről), és megjelenítést, nem számítást érintenek.

## Elfogadási kritériumok

- [x] **Metrikák az eszközön (számítás):** táv, szintemelkedés/-csökkenés, időbecslés, magassági
      profil a kliensen (`core/geo/route-metrics.ts`, a Naismith- és zajküszöb-konstansokkal együtt),
      a kézi és az automatikus útvonalra és a napi szakaszokra is. A táv **mindig** (FULL_OFFLINE-ban
      is) megjelenik.
- [x] **Magasság FULL_OFFLINE-ban:** a magasság-forrás a build-asset DEM (#150 1. fázis) —
      repülőgép módban, soha nem elért backenddel is megy, a DEM-lefedettségen (HU) belül
      (`core/geo/elevation.service.ts`: DEM elsőként, Open-Meteo csak a lefedettségen kívüli
      pontokra, ha van net). A lefedettségen kívüli, net nélküli pontokon a magasság-függő mezők `~`.
- [x] **Turistaút-gráf build assetként, automatikus útvonaltervezéshez:** a magyar
      turistaút-hálózat a geo asset-csomag része (#150 `build-geo-assets.mjs` — a már importált
      `trail_segment` táblából, nem újra a PBF-ből, mert az OSM `route=hiking` reláció-feldolgozás
      a bicikli-gráfnál használt PBF-olvasóban nem volt kész; a forrás ugyanaz, mint a
      `scripts/import-hiking-trails.mjs`-é). A `RouteSuggestionRepository` harmadik (mindig
      elérhető) tartalékaként a `core/geo/routing.service` `HIKE` profilja ad útvonalat, ha a
      betöltött viewport-adat és a backend sem tud — ettől soha nem letöltött, internetet soha nem
      elért eszközön is van automatikus útvonaltervezés (lásd
      [[105-tura-offline-terkep-es-utvonalszamitas]]).
- [ ] **Turistaút-réteg megjelenítése build assetből** (soha nem letöltött eszközön): a térképen
      látható turistajelzés-vonalak (a `TrailSegmentRepository`-n, azaz backend-hívás vagy letöltött
      régió manifestje) változatlanul csak backenddel/letöltéssel jelennek meg — a build asset
      csak a routinghoz kötve van be, a réteg-megjelenítéshez nem. Alacsonyabb prioritás: az
      alaptérkép-csempék maguk is csak letöltéssel offline-ok (105 "Tudatos korlát" (1)), így egy
      soha nem letöltött eszközön a réteg önmagában, térkép-alap nélkül amúgy is korlátozott
      hasznú. Újranyitandó, ha ez zavaró.
- [x] Az útvonaltervezés elsődlegesen eszközön fut (helyi A* először; a backend `route-suggestion`
      csak gyorsító tartalék, ha a betöltött adatban nincs összeköttetés). A backend
      `route-metrics` végpontja megszűnt; a `RouteMetricsService` + `OpenMeteoElevationClient`
      csak az admin katalógus-upserthez marad (lásd terv).
- [x] Az online magasság-forrást a kliens **közvetlenül** hívja (§13), 8 s timeouttal; a backend
      nem proxyz.
- [x] A meglévő túra-funkciók nem regresszálnak; az eszközön futó metrika-számítás tesztjei
      (`core/geo/route-metrics.spec.ts`) a backend `RouteMetricsServiceTest` eseteit lefedik, plusz
      a „nincs magassági adat” ágat. _(A sűrűbb, távolság alapú DEM-mintavétel a DEM-mel együtt jön.)_
- [ ] [[Backend-offline first]] §13 táblázata (✅ Open-Meteo sor felvéve) és §15 build-asset listája frissítve; a túra spec
      (ha addigra elkészül) `#### Backend-offline` szakasza ezt írja le.

## Terv / döntési napló

- **Függőség:** a [[150-biciklizes-elo-gps-tracker]] 1. fázisa (geo asset pipeline + `core/geo/`
  DEM / routing réteg). Ez a jegy annak a túra-oldali bekötése, nem önálló újraimplementálás.
- **Alkalmazásméret:** a turistaút-gráf is növeli a geo asset-csomagot — a méretét a #150 0. fázisa
  méri, és a felhasználó **jóváhagyása nélkül nem kerül a buildbe** (ugyanaz a kapu, mint a #150
  „Alkalmazásméret” kritériuma).
- **Backend-végpontok sorsa (eldöntve, 2026-10-02):**
  - `POST /api/tura/route-metrics` **törölve** (OpenAPI path + `RouteMetrics` / `RouteMetricsRequest`
    séma + controller-metódus + generált kliens).
  - A `RouteMetricsService` és az `OpenMeteoElevationClient` **marad**, de csak az admin
    katalógus-upsert (`CuratedRouteService`) használja: a katalógus-sor denormalizált metrikáit
    számolja szerveroldali adat-előkészítésként, nem a kliens-flow része. Ugyanazok a konstansok,
    mint a kliensen.
  - `GET /api/tura/route-suggestion` **marad** gyorsító tartaléknak (a szerver a két pont köré
    táguló bbox-ban, a viewporton túl is keres); a kliens csak akkor hívja, ha a helyi A* nem talál
    utat, és hibájára a helyi eredmény marad.
  - A `trail_segment` tábla és az admin import katalógus-forrásként megmarad; a build asset
    ugyanabból a forrásból készül.
- **Nyitott:** a `CuratedRoute` (ajánlott túrák) globális katalógus a pull-on át érkezik, így soha
  nem csatlakozott eszközön üres — ugyanaz a helyzet, mint a megosztott `Food` katalógusnál.
  Elfogadható-e így (precedens), vagy legyen a katalógus is build-asset seed? Implementáláskor
  egyeztetendő.
- **Sűrűbb DEM-mintavétel:** a mai fix 50 minta / útvonal hosszú túránál elsimítja a
  szintemelkedést; az eszközön futó változat távolság alapú (`ELEVATION_SAMPLE_SPACING_METERS`).
  A profil-grafikon ettől független, ritkított pontsort kap.

### Megvalósítás — 1. kör (2026-10-02, `8acd87a`)

- `frontend/src/app/core/geo/` (új, a #150 közös geo-rétegének első darabja):
  `geo-math.ts` (haversine, polyline-hossz, pont távolságra, egyenletes resample),
  `route-metrics.ts` (a backend `RouteMetricsService` 1:1 portja; magassági adat nélkül a
  magasság-függő mezők `null`), `open-meteo-elevation.service.ts` (közvetlen kliens-hívás, 8 s
  timeout, 100-as kötegek; CORS: `access-control-allow-origin: *`, ellenőrizve).
- `RouteMetricsRepository`: eszközön számol; ha a magasság-lekérés hibázik, a táv akkor is megvan.
- `RouteSuggestionRepository`: helyi A* elsőbbség, backend csak tartalék.
- `offline-route-graph.ts`: a saját haversine-duplikátum helyett a `core/geo/geo-math`.
- `tura.page`: `~` a nem számolható értékeknél (§14), a profil-grafikon csak magassági adattal;
  a `HikeRoute` / napi szakasz mentése a `null` mezőkkel is működik.
- Backend: a kliensnek szóló `route-metrics` végpont törölve (lásd fent).
- **Szándékosan nem változott:** a `HikeRoute.yaml` / `HikeRouteDay.yaml` leírásai még a régi
  `/api/tura/route-metrics`-et említik — a leírás módosítása az outbox-payload hash-ét is
  megváltoztatná (`verify:outbox` → verzió-emelés + no-op migrátor-lépés), ezért a következő
  érdemi `HikeRoute`-séma-változással együtt javítandó.
- Zöld: backend `test`, frontend `test:ci` (1926), `lint`, `build`, `verify:outbox`.

### Megvalósítás — 2. kör (2026-10-18)

A #150 geo asset-csomag méret-jóváhagyása után (DEM + bicikli-gráf, lásd #150) a maradék két pont:

- `core/geo/elevation.service.ts`: pontonként a build-asset DEM-ből (`GeoAssetService.elevationAt`),
  csak a lefedettségen (HU) kívüli pontokra esik vissza az Open-Meteo-ra (ha van net). A
  `RouteMetricsRepository` ezt használja a közvetlen `OpenMeteoElevationService`-hívás helyett.
- Turistaút-gráf build asset: a bicikli-gráfnál használt PBF-olvasó nem dolgoz fel relációkat
  (`route=hiking`), ezért a turistaút-adat forrása a már importált `trail_segment` tábla (közvetlen
  Postgres-kapcsolat a build-scriptből, `.env`-ből olvasott kapcsolati adatokkal — lásd
  [[150-biciklizes-elo-gps-tracker]] "Geo-csomag másik gépen"). Mért méret: 230 611 szakasz →
  198 103 szakasz-darab 336 csempében, 10,6 MB nyersen (~6,1 MB deflate).
- A bicikli-csempe-formátum és -kód általánosítva mindkét profilra: `bike-tile-codec.ts` →
  `way-tile-codec.ts` (`BikeWay` → `WayFeature`, `decodeBikeTile` → `decodeWayTile`), új
  `hike-routing-profile.ts` (egységes súly, nincs úttípus-kedvezmény — megegyezik a mai
  `offline-route-graph.ts` viselkedésével), `GeoAssetService.hikeWaysIntersecting`,
  `RoutingService` `HIKE` profillal (2000 m-es illesztési küszöb, mint az eddigi
  `offline-route-graph.ts`-ben; profilonkénti külön gráf-cache).
- `RouteSuggestionRepository.suggest()`: harmadik szint — ha a betöltött viewport-adaton **és** a
  backenden sem talál utat (hálózati hiba *vagy* a backend "nincs összeköttetés" válasza), a
  build-asset `HIKE` routing a végső tartalék, csak `countryCode === 'HU'`-ra.
- `geo-math.ts`: közös `withExactEndpoints` (a snap-elt útvonal elejét/végét a pontos kért pontra
  cseréli) — ezt eddig csak az `offline-route-graph.ts` tartalmazta duplikálva, most mindkét hívó
  (`offline-route-graph.ts`, `route-suggestion.repository.ts`) ezt használja.
- Valódi adaton mérve (asztali gép): 12–50 km-es turistaút-útvonalak 46–490 ms alatt — gyorsabb,
  mint a bicikli routing, mert kisebb a csomag (10,6 MB vs. 40,1 MB).
- **Nyitva maradt** (lásd az elfogadási kritériumok közt): a turistaút-réteg (a térképen látható
  turistajelzés-vonalak) megjelenítése build assetből, soha nem letöltött eszközön — ez külön
  munka (a `tura.page.ts` map-réteg kódja, nem a routing), alacsonyabb prioritással, mert az
  alaptérkép-csempe maga is csak letöltve offline.
- Zöld: frontend `test:ci` (2098), `lint`, `build`, `verify:outbox`, `verify:i18n`.

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]] — §13 / §15; túra spec (ha van) — Backend-offline
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #151 túra backend-offline first javítás
- Kód: `pages/menu/tura/`, `core/data/route-metrics.repository.ts`,
  `core/data/route-suggestion.repository.ts`, `core/data/trail-segment.repository.ts`,
  `backend/.../tura/` (metrika / suggestion / elevation eltávolítása)
