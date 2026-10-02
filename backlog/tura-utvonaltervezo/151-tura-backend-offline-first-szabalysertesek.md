---
id: 151
type: bug
status: blocked
title: Túra — Backend-offline first szabálysértések (backend-függő metrika és routing)
specs:
  - "[[Backend-offline first]]"
  - "[[Frontend]]"
flag: menu.tura
created: 2026-10-02
closed:
---

# 151 — Túra — Backend-offline first szabálysértések (backend-függő metrika és routing)

> **Blokkolva (2026-10-02):** az 1. pont online / backend-offline része és a 2. pont helyi-elsőbbsége
> kész (`8acd87a`). A maradék — a FULL_OFFLINE magasság (DEM) és a turistaút-gráf build assetként —
> a [[150-biciklizes-elo-gps-tracker]] geo asset-csomagjára és annak **méret-jóváhagyására** vár
> (#150 0. fázis).

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
- [ ] **Magasság FULL_OFFLINE-ban:** a magasság-forrás a build-asset DEM (#150 1. fázis) —
      repülőgép módban, soha nem elért backenddel is. _Addig: közvetlen Open-Meteo hívás a kliensből
      (`core/geo/open-meteo-elevation.service.ts`, §13); internet nélkül a magasság-függő mezők
      `~`._ — **blokkolva a #150 méret-jóváhagyásán.**
- [ ] **Turistaút-gráf build assetként** (**blokkolva a #150 méret-jóváhagyásán**): a magyar turistaút-hálózat a geo asset-csomag része
      (#150 `build-geo-assets.mjs`, a `scripts/import-hiking-trails.mjs` forrásából) → a réteg
      megjelenítése és az automatikus útvonaltervezés első indítástól offline működik, a közös
      `core/geo/routing.service` HIKE profiljával.
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

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]] — §13 / §15; túra spec (ha van) — Backend-offline
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #151 túra backend-offline first javítás
- Kód: `pages/menu/tura/`, `core/data/route-metrics.repository.ts`,
  `core/data/route-suggestion.repository.ts`, `core/data/trail-segment.repository.ts`,
  `backend/.../tura/` (metrika / suggestion / elevation eltávolítása)
