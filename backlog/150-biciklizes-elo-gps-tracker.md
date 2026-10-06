---
id: 150
type: feature
status: ready
title: Biciklizés — élő edzés-tracker GPS-szel (pontos / energiatakarékos / becsült mód)
specs:
  - "[[Biciklizés napló]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-10-02
closed:
---

# 150 — Biciklizés — élő edzés-tracker GPS-szel (pontos / energiatakarékos / becsült mód)

## Motiváció / probléma

Felhasználói kérés: a bicikli edzést is legyen könnyű felvenni. A mászáshoz ([[Mászónapló]] élő
session + live banner, backlog/122) és az erősítő edzéshez ([[Edzésnapló]] aktív edzés) már van élő
tracker, a biciklihez nincs — ma utólag, kézzel kell beírni az időtartamot, távot, szintemelkedést.

Az akkumulátorra tekintettel indításkor **3 mód** közül lehet választani:

| Mód | GPS-használat | Táv | Szintemelkedés | Időtartam |
|---|---|---|---|---|
| **Pontos** (`LIVE`) | folyamatos követés végig | a felvett track hossza | DEM a track pontjain | start → stop, szünetek nélkül |
| **Energiatakarékos** (`ECO`) | X másodpercenként egy pozíció | a pontokat összekötő vonal hossza (becsült) | DEM a pontokon | start → stop, szünetek nélkül |
| **Becsült** (`ESTIMATED`) | csak induláskor és befejezéskor | a kettő közé tervezett bicikliút hossza | DEM a tervezett útvonalon | start → stop, szünetek nélkül |

**Mindhárom mód minden számítása az eszközön fut**, akkor is, ha a telefon **soha nem csatlakozott
a backendhez** és nincs internet ([[Backend-offline first]] — ez az app legfontosabb ígérete).
Online szolgáltatás legfeljebb opcionális gyorsítás / pontosítás lehet, soha nem feltétel.

A túraútvonal-tervező (`backlog/tura-utvonaltervezo/`, részben kész) sok közös alapot ad (térkép,
útvonaltervező algoritmus, magassági adat, a még nyitott 106-os GPS-track-felvétel). **A két
feature-t együtt kell tervezni**, hogy semmi ne készüljön el kétszer — ez a jegy ezért egy közös,
eszközön futó geo-alapréteg tervét is tartalmazza.

## Jelenlegi működés

**Biciklizés:** [[Biciklizés napló]] — csak kézi CRUD űrlap (`date`, `durationMinutes`,
`intensity`, opcionális `distanceKm`, `elevationGainMeters`). Start/end időpont nincs; a spec
Megjegyzései: „GPS / külső eszköz sync: nincs implementálva, tervezett.” Kód:
`frontend/src/app/pages/workout/cycling/` (`bike-ride-log-edit.page`, `bike-metrics.ts` — MET +
átlagsebesség-hint).

**Élő tracker minta (mászás, backlog/122):** `core/data/climbing-live-session.service.ts` — egyetlen
folyamatban lévő élő session, **nem outbox-sor**: eszköz-lokális draft `@capacitor/preferences`-ben
(újraindítást túlél), tartós „session folyamatban” értesítés (`LocalNotificationsGateway`), a
„Session vége” után szerkeszthető összegzés, és csak a jóváhagyott összegzés megy a repository-n át
(helyi store + outbox). Banner: `pages/workout/climbing/climbing-live-banner.component.ts`.

**Túratervező — mi használható és mi nem** (103/104/105/107 archiválva; kód: `pages/menu/tura/`,
`backend/.../tura/`):

| Elem | Ma | Bicikliben |
|---|---|---|
| Haversine / távolság | `tura/GeoUtils.java`; TS-ben `offline-route-graph.ts`-ben (privát) | ✅ kiemelve `core/geo/`-ba |
| A* útvonalkereső + él-snap (virtuális csomópont) + min-heap | `offline-route-graph.ts` (a backend `RouteSuggestionService` 1:1 TS-portja), **eszközön fut** | ✅ az algoritmus általánosítva, gráf-forrástól független |
| Útvonal-gráf adat | `trail_segment` (OSM turistautak) — **csak a backendről** tölthető le | ❌ turistaút ≠ bicikliút; és a backend-függés a túrában is szabálysértés (→ [[151-tura-backend-offline-first-szabalysertesek]]) |
| Táv + szintemelkedés + magassági profil | #151 óta **eszközön**: `core/geo/route-metrics.ts` (+ `geo-math.ts`), a magasság közvetlenül a kliensből az Open-Meteótól (internet nélkül `null` / `~`) | ✅ közvetlenül; a magasság-forrás a build-asset DEM-re cserélendő (offline is) |
| DEM (domborzat) | Open-Meteo API (backend hívja); terrarium raster-dem csempék a hillshade-hez (online) | ⚠️ helyette build-asset DEM (lásd lent) |
| Térkép (MapLibre), offline csempe-tár | `tura.page.ts`, `offline-tile-store.ts` | ⚪ az élő képernyőn nem kell az első körben |

**Túratervező — nyitott, közös:** [[backlog/tura-utvonaltervezo/106-tura-gps-navigacio-elo-helymegosztas]]
— élő pozíció, track-felvétel, háttér-GPS. Az ott nyitva hagyott „akkumulátor-kímélő mód” ebben a
jegyben dől el; a 106 ugyanezt a réteget használja.

## Döntések (2026-10-02, felhasználóval egyeztetve)

- **Backend-offline first, szigorúan:** minden táv-, szintemelkedés- és útvonalszámítás az
  eszközön fut, a szükséges adat (DEM, bicikli-úthálózat) **build asset** ([[Backend-offline first]]
  §14–15) — első indítástól, repülőgép módban, backend nélkül is. A saját backend a biciklis
  számításban **egyáltalán nem vesz részt** (csak a `BikeRideLog` szinkronja). Online külső
  szolgáltatás legfeljebb opcionális pontosítás, közvetlenül a kliensből (§13: soha nem a
  backenden át proxyzva).
- **Track tárolása:** csak az **összesített értékek** kerülnek a `BikeRideLog`-ba. A nyers pontok
  csak a felvétel alatt élnek eszköz-lokálisan (újraindítás-védelem), mentés / elvetés után
  törlődnek, nem szinkronizálódnak.
- **Szintemelkedés: DEM-ből**, nem a nyers GPS-magasságból (az ±10–20 m zajos).
- **Energiatakarékos mód X:** 15–30 s; konstansba kiszervezve, kezdőérték **20 s**.
- **Energiatakarékos mód csak akkor készül el, ha a plugin valóban spórol vele.** Ha a választott
  plugin nem tudja ritkábban ébreszteni a GPS-t (csak folyamatos követés + pont-eldobás menne),
  akkor **az ECO mód kimarad**, és 2 mód lesz (Pontos, Becsült). A 0. fázis dönti el.
- **Becsült mód hihetőség-ellenőrzés:** ha a becsült átlagsebesség (becsült táv / aktív idő)
  **< 2 km/h**, az eredmény gyanús — körtúra (start ≈ cél), majdnem-körtúra, vagy nagy kitérő
  (pl. 5 km-re a cél, de 5 óra alatt). Ilyenkor az app jelzi, és a távot kézzel kéri. Konstans.
- **Plugin:** a 0. fázis spike-ja választja ki.
- **Súgó:** a mód-választó és az új mezők hint/label szövegei + súgó ikonjai (`app-help-button`),
  hu + en.
- **Túra szabálysértések** (backend-függő számítás, platform-string ágazás): javítandók, külön
  jegyben → [[151-tura-backend-offline-first-szabalysertesek]]. A közös geo-réteg mindkettőt kiszolgálja.
- **Alkalmazásméret — felhasználói jóváhagyás kötelező:** a geo asset-csomag nem növelheti
  túlzottan az app méretét. Hogy mi számít túl nagynak, **a felhasználó dönti el**: amint a
  0. fázisban kiderül a tényleges méretnövekmény, az implementáció **megáll, és rá kell kérdezni**,
  hogy rendben van-e. Ha nem, más megoldást kell kitalálni (pl. kisebb felbontás, szűkebb
  úthálózat, vagy opcionálisan letölthető csomag — utóbbi a backend-offline szerződéssel
  egyeztetve). Jóváhagyás nélkül a csomag nem kerül a buildbe.

## Elfogadási kritériumok

### Alkalmazásméret (kapu a 0. és az 1. fázis között)
- [ ] A 0. fázis megméri: a geo asset-csomag mérete (DEM és bicikli-úthálózat külön, és a
      #151-hez szükséges turistaút-gráf külön is), valamint a release APK méretének változása
      a jelenlegihez képest (előtte / utána, MB-ban).
- [ ] A mért számokat a felhasználó elé kell tárni, és **kifejezetten rá kell kérdezni**, hogy
      ez a méretnövekmény rendben van-e. A válasz és a dátum ebbe a jegybe kerül
      („Méret-jóváhagyás” alpont).
- [ ] Jóváhagyás nélkül az 1. fázis nem indul. Elutasítás esetén alternatív terv készül, és az is
      újra jóváhagyásra kerül.
- [ ] Ha később (pl. a gráf finomításakor, új ország hozzáadásakor) a csomag mérete érdemben nő a
      jóváhagyotthoz képest, újra rá kell kérdezni.

### Backend-offline (elsőként, mert ez a legfontosabb)
- [ ] Friss telepítés, **soha nem bejelentkezett / soha nem elért backend**, repülőgép mód:
      mindhárom (ill. ECO nélkül kettő) mód végigvihető, és az összegző űrlap a távot,
      szintemelkedést, időtartamot a Magyarország lefedettségen belül **azonnal** kitölti.
- [ ] `BACKEND_OFFLINE` és `FULL_OFFLINE` között a számítások eredménye azonos (külső hívás nélkül
      is teljes értékű).
- [ ] Lefedettségen kívül (nincs DEM / úthálózat adat az adott helyre): a táv a degradált
      módszerrel (lásd lent) számolódik, a nem számolható érték **üres** marad (§14: soha nem `0`),
      és kézzel pótolható.

### Indítás és módok
- [ ] Biciklizés napló lista → „Élő edzés indítása”; mód-választó, mindegyik módnál egy sor leírás
      (pontosság ↔ akkumulátor) + súgó ikon a részletes magyarázattal (a Becsült módnál a
      körtúra-korláttal).
- [ ] A választott mód megjegyzésre kerül alapértelmezésként (eszköz-lokális preferencia).
- [ ] Helymeghatározási engedély kérése magyarázattal; a folyamatos módokhoz háttér-
      helymeghatározás (Androidon foreground service + tartós értesítés). Megtagadás esetén érthető
      üzenet, a kézi napló elérhető marad.

### Élő képernyő
- [ ] Eltelt aktív idő; folyamatos módokban az eddigi táv is; Becsült módban az idő és a kezdőpont
      rögzítettsége.
- [ ] Szünet / folytatás; a szünet nem számít bele a `durationMinutes`-ba, alatta nincs gyűjtés.
- [ ] Gyenge GPS-jel jelzése; a pontatlan / ugró fixek kiszűrve.
- [ ] Túléli az app bezárását / újraindítását; live banner a biciklis listán és az Edzés hubon;
      tartós „edzés folyamatban” értesítés — a mászás mintájára.

### Befejezés és mentés
- [ ] „Befejezés” → szerkeszthető összegző űrlap, előtöltve: `date`, `startedAt`,
      `durationMinutes`, `distanceKm`, `elevationGainMeters`, `trackingMode`; `intensity`-t a
      meglévő átlagsebesség-hint javasolja, a user választja. Mentés a meglévő `BikeRideLog`
      repository-n át (helyi store + outbox) — nincs külön mentési út.
- [ ] Elvetés megerősítéssel; a lokális nyers pontok törlődnek.

### Becsült mód
- [ ] Induláskor és befejezéskor egy-egy fix (várakozás jó pontosságra, timeout után a legjobb).
- [ ] Az eszközön futó bicikli-útvonaltervezés a kettő között → táv; DEM az útvonalon →
      szintemelkedés.
- [ ] Hihetőség: becsült átlagsebesség < `MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH` (2) → figyelmeztetés,
      táv kézi megadása (a becsült érték előtöltve, felülírható, vagy törölhető).

### Általános
- [ ] Minden hangolható érték konstansként kiszervezve, kommentezve (`core/geo/tracking-config.ts`).
- [ ] Web build: `offlineCapable === false` → nincs élő tracker (a kézi napló marad); a döntés az
      `offlineCapable` képességen (a kódbázisban `Capacitor.isNativePlatform()`) történik, **nem**
      platform-stringen (`getPlatform()`).
- [ ] Unit tesztek: geo-matek, DEM-mintavétel + zajküszöb, A* a bicikli-gráfon, degradált becslés,
      hihetőség-ellenőrzés, tracker állapotgép (start / szünet / folytatás / stop / elvetés /
      újraindítás).
- [ ] Spec ([[Biciklizés napló]]) frissítve: élő tracker, módok, új mezők, `#### Backend-offline`;
      súgó szövegek hu + en; [[Backend-offline first]] §15 build-asset listája kiegészítve a geo
      asset-csomaggal.

## Terv / döntési napló

### Áttekintés — rétegek

```
Bicikli élő tracker (pages/workout/cycling/live)      Túra (pages/menu/tura)  — #151, #106
          │                                                     │
          └──────────────┬──────────────────────────────────────┘
                         ▼
             core/geo/  (eszközön, pure TS + plugin-wrapper)
   ┌───────────────┬───────────────┬───────────────────┬──────────────────┐
   │ geo-math      │ location-     │ elevation.service │ routing.service  │
   │ (haversine,   │ tracking +    │ (DEM lookup,      │ (A* profilos     │
   │ resample, DP) │ track-buffer  │ gain/loss, profil)│ gráfon: BIKE/HIKE)│
   └───────────────┴───────────────┴─────────┬─────────┴────────┬─────────┘
                                             ▼                  ▼
                              geo asset-csomag (build asset, verziózott)
                              • DEM-rács (HU)  • bicikli-úthálózat (HU)  • turistaút-gráf (HU, #151)
                                             ▲
                         scripts/build-geo-assets (OSM + nyílt DEM → bináris csomag)
```

A backend nem szerepel a láncban.

### Közös `core/geo/` (frontend)

| Elem | Felelősség | Fogyasztók |
|---|---|---|
| `geo-math.ts` | **#151-gyel elkészült:** haversine, polyline-hossz, pont távolságra, egyenletes resample. Bővítendő: pont–szakasz vetítés, Douglas–Peucker — pure, spec-elt | minden |
| `tracking-config.ts` | **minden hangolható konstans** | tracker, 106 |
| `location-tracking.service.ts` | plugin-wrapper: `start(mode)` / `pause` / `resume` / `stop`; módok `CONTINUOUS`, `INTERVAL`, `ENDPOINTS`; fix-szűrés; engedélyek; jel-állapot signal | bicikli, 106, 111 |
| `track-buffer.ts` | nyers pontok eszköz-lokális append-only tárolása felvétel alatt | bicikli, 106 |
| `dem.ts` + `elevation.service.ts` | magasság egy pontra a DEM-rácsból (bilineáris interpoláció); `metrics(points)` → táv, szintemelkedés, -csökkenés, profil (távolság alapú mintavétel + zajküszöb) — a #151-gyel már eszközre költözött `core/geo/route-metrics.ts` magasság-forrásának cseréje (Open-Meteo → DEM) és távolság alapú mintavétellel bővítése | bicikli, túra (#151) |
| `route-graph.ts` + `routing.service.ts` | a mai `offline-route-graph.ts` A*-jának általánosítása: gráf-forrás interfész (bicikli-csomag / turistaút-csomag), profil szerinti él-súlyok; `route(profile, from, to)` | bicikli Becsült, túra (#151) |
| `geo-asset.service.ts` | a csomag betöltése, csempénkénti lusta olvasás, verzió, lefedettség-ellenőrzés (`covers(point)`) | DEM, routing |

A tracker-állapot feature-szinten marad: `core/data/bike-live-session.service.ts`
(`ClimbingLiveSessionService` minta: Preferences-draft, értesítés, banner).

### Geo asset-csomag (build asset)

A [[Backend-offline first]] §15 szerint a Full-offline szükséges statikus adat **build asset** (mint
a nehézségi mátrix vagy az `Exercise` seed). Az első verzió **Magyarországra** szól (a túratervező
is „kezdetben Magyarországra optimalizált”), ország-kódos szerkezettel, hogy később bővíthető
legyen.

**1. DEM-rács**
- Forrás: nyílt globális DEM (Copernicus GLO-90 vagy SRTM 3″ — licenc: attribúcióval szabadon
  terjeszthető; a spike rögzíti a választást és az attribúciót).
- Formátum: `int16` méter-rács, csempékre bontva (pl. 0,25° × 0,25°), tömörítve; lusta betöltés
  csak az érintett csempékre.
- Felbontás-javaslat: ~3″ (~90 m) vagy ~6″ (~180 m). Becslés HU-ra (16,1–22,9° K, 45,7–48,6° É):
  3″-en ~28 M minta ≈ 57 MB nyersen, 6″-en ~7 M ≈ 14 MB nyersen; a sík terep miatt jól tömöríthető
  (delta + deflate). **Mérendő a spike-ban**; az elfogadható APK-növekményt a felhasználó
  hagyja jóvá (lásd „Alkalmazásméret” elfogadási kritérium).
- A túra (#151) ugyanezt használja → a túra-metrikák is offline-képesek lesznek.

**2. Bicikli-úthálózat**
- Forrás: OSM Magyarország extract (Geofabrik), szűrve biciklivel járható utakra (`highway` =
  `cycleway`, `residential`, `tertiary`, `secondary`, `unclassified`, `track`, `path` +
  `bicycle=yes|designated`, `service`, … — `motorway` / `trunk` és `bicycle=no` kizárva).
- Előfeldolgozás: kereszteződés-gráffá összevonás (csak az elágazások csomópontok), él = hossz +
  úttípus-osztály (+ egyszerűsített geometria, csak amennyi a DEM-mintavételhez kell).
- Formátum: CSR-szerű typed-array gráf, csempékre bontva → a kereső csak a start/cél köré fűzött
  bbox csempéit tölti be (ugyanaz az elv, mint a backend `RouteSuggestionService` bbox-tágítása).
- Méret: **mérendő**; ha a teljes országos csomag túl nagy az APK-hoz, döntési pont (lásd lent).
- Él-súly: hossz × úttípus-szorzó (kerékpárút / csendes út kedvezőbb, forgalmas főút kedvezőtlenebb)
  — konstans tábla `tracking-config.ts` mellett (`bike-routing-profile.ts`).

**3. Előállítás:** `scripts/build-geo-assets.mjs` (Node, a meglévő `scripts/import-hiking-trails.mjs`
mintájára): OSM PBF + DEM forrás → bináris csomag + `manifest.json` (verzió, ország, bbox,
csempelista, forrás-attribúció). Ritkán, kézzel futtatandó (OSM-frissítéskor).

**Nyitott döntés — a csomag hol él a repóban / buildben?**
- (a) commitolva a `frontend/src/assets/geo/` alá — egyszerű, de nagy bináris a git-történetben;
- (b) git-ignored, a build előtt egy `npm run fetch:geo-assets` tölti le egy statikus helyről
  (pl. GitHub release asset, mint a `dev-apk`) — a repó kicsi marad; **az app ettől még offline**,
  mert a csomag a buildbe kerül, a telefonnak futás közben nem kell semmit letöltenie.
- Javaslat: (b). A spike után a méret ismeretében döntünk.

### Degradált becslés (lefedettségen kívül, vagy ha az úthálózat-adat nem talál utat)

A Becsült mód **mindig ad eredményt**, adat nélkül is:
- **Táv:** légvonal × `ROAD_CIRCUITY_FACTOR` (közúthálózatok kitérő-indexe jellemzően 1,2–1,4;
  kezdőérték 1,3, konstans). Az összegzőn „durva becslés” jelöléssel.
- **Szintemelkedés:** ha a DEM lefedi, a légvonal mentén mintavételezve (alsó becslés); ha nem,
  üres (§14).
- A hihetőség-ellenőrzés (< 2 km/h) itt is fut.
- Folyamatos módokban lefedettségen kívül a táv változatlanul pontos (GPS); a szintemelkedés
  üres marad. _(Opcionális későbbi bővítés, nem része ennek a jegynek: erősen simított
  GPS-magasság mint vész-forrás.)_

### Opcionális online pontosítás (nem feltétel, nem része az MVP-nek)

Ha van internet és a helyi adat nem elég (lefedettségen kívül): közvetlen külső hívás a kliensből
(pl. BRouter publikus API bicikli-útvonalra, Open-Meteo / terrarium csempe DEM-re), 8 s timeouttal,
**a backend kihagyásával** (§13). Csak a degradált eredményt javítja; nélküle is teljes értékű a
feature. Külön jegyben, ha igény lesz rá.

### Mérési / számítási módszer módonként

- **Pontos:** szűrt fixek (pontossági küszöb + ugrás-szűrés + távolságszűrő) haversine-összege;
  szintemelkedés: ritkított track → DEM-mintavétel ~50 m-enként → zajküszöbös összegzés.
- **Energiatakarékos:** ugyanaz a ritka pontokon. **Tudatos korlát:** a pontok közti egyenesek
  miatt kanyargós úton a táv néhány %-kal alulbecsült — a súgóban is. _(Későbbi lehetőség: a
  pontpárok közé helyi bicikli-routing → kanyarok visszaadása, offline is.)_
- **Becsült:** helyi `routing(BIKE)` → táv; DEM az útvonalon → szintemelkedés; hihetőség-ellenőrzés.
- **Időtartam:** start → stop, mínusz szünetek, percre kerekítve.

### `tracking-config.ts` — kezdőértékek

```ts
/** Energiatakarékos mód: ennyi másodpercenként egy pozíció (15–30 s jó kompromisszum;
 *  15–25 km/h-nál ≈ 80–140 m pontköz). Csak akkor él, ha a plugin valóban alvást enged. */
export const ECO_INTERVAL_SECONDS = 20;
export const LIVE_MIN_INTERVAL_SECONDS = 1;
/** Álló helyzeti remegés ellen. */
export const LIVE_DISTANCE_FILTER_METERS = 5;
/** Ennél pontatlanabb fix eldobva. */
export const MAX_ACCEPTED_ACCURACY_METERS = 30;
/** GPS-ugrás szűrés: két fix közti irreális sebesség bicikliben. */
export const MAX_PLAUSIBLE_SPEED_KMH = 80;
/** Becsült mód: a kezdő/záró fixnél ennyi ideig várunk jó pontosságra. */
export const ENDPOINT_FIX_TIMEOUT_SECONDS = 20;
/** Becsült mód: ennél kisebb becsült átlagsebesség = gyanús (körtúra, majdnem-körtúra, kitérő). */
export const MIN_PLAUSIBLE_ESTIMATED_SPEED_KMH = 2;
/** Degradált becslés: légvonal × kitérő-index (közúthálózat jellemzően 1,2–1,4). */
export const ROAD_CIRCUITY_FACTOR = 1.3;
/** DEM-mintavétel sűrűsége az útvonal / track mentén. */
export const ELEVATION_SAMPLE_SPACING_METERS = 50;
/** E küszöb alatti magasság-lépések nem számítanak szintemelkedésnek (DEM-zaj). */
export const ELEVATION_NOISE_THRESHOLD_METERS = 2;
```

### Akkumulátor és plugin-spike (0. fázis)

- Kérdések: Android 14/15 foreground service `location` típus, háttér-engedély flow, Doze,
  képernyőzár mellett folytatódik-e a gyűjtés; **valódi intervallum-vezérlés** (fused provider
  hosszabb intervallum / alacsonyabb prioritás → a GPS alhat) — ettől függ az ECO mód léte;
  távolságszűrő; Capacitor 8 kompatibilitás; licenc / ár.
- Jelöltek (nem végleges): `@capacitor-community/background-geolocation` (ingyenes, kevés
  intervallum-vezérlés), `@transistorsoft/capacitor-background-geolocation` (kiváló
  akkumulátor-kezelés, Android release-hez fizetős licenc), `@capacitor/geolocation` (előtérben
  jó, háttérben nem megbízható); ha egyik sem jó, saját vékony Capacitor plugin a fused location
  providerre + foreground service.
- Mérés valódi telefonon: 1 óra Pontos vs. ECO akkumulátor-fogyás.
- **Kimenet:** plugin döntés + „ECO marad / kimarad” döntés ebbe a jegybe.

A 0. fázis másik fele: a geo asset-csomag prototípusa — DEM-felbontás és bicikli-gráf méret
mérése, A* futásidő és memória valódi telefonon (cél: < 2 s egy 50 km-es útra).

### Adatmodell-változások (`BikeRideLog`)

| Mező | Típus | Miért |
|---|---|---|
| `trackingMode` | enum `MANUAL` \| `LIVE` \| `ECO` \| `ESTIMATED`, default `MANUAL` | látszik, mennyire megbízható a táv / szintemelkedés; meglévő sorok `MANUAL` |
| `startedAt` | opcionális `timestamptz` | élő felvételnél ismert; kézi naplónál üres |

- Flyway `V<n>__bike_ride_tracking_mode.sql`; helyi SQLite új `SCHEMA_V<n>`.
- OpenAPI `BikeRideLog` bővül → outbox-payload változás: `OUTBOX_PAYLOAD_SCHEMA_VERSION` emelés +
  migrátor-lépés (régi payload → `trackingMode: MANUAL`), `npm run verify:outbox -- --write`.
- Backend: csak a CRUD / sync bővül, **semmilyen geo-számítás nem kerül a backendre**.

### Backend-offline összefoglaló (a spec `#### Backend-offline` alapja)

- Felvétel, számítás, mentés: mind eszközön; `ONLINE` / `BACKEND_OFFLINE` / `FULL_OFFLINE` /
  `UNKNOWN` alatt azonos viselkedés és azonos eredmény.
- Adat: build asset (DEM + bicikli-úthálózat), első indítástól elérhető.
- Lefedettségen kívül: degradált becslés; nem számolható érték üres, soha nem `0` (§14).
- Mentés: helyi store + outbox; szinkron a szokásos módon, később.
- Web: online-only, élő tracker nélkül.

### Fázisok

| # | Tartalom | Megjegyzés |
|---|---|---|
| 0 | **Spike:** plugin + akkumulátor-mérés (→ ECO marad/kimarad); geo asset prototípus (DEM-felbontás, gráf-méret, A* futásidő telefonon); csomag-tárolási döntés (a/b); **APK-méretváltozás mérése → felhasználói jóváhagyás kérése** | döntések ide; kódot nem merge-elünk; **az 1. fázis csak a méret-jóváhagyás után indul** |
| 1 | **Geo asset pipeline + `core/geo/` alap:** `build-geo-assets.mjs`, `geo-asset.service`, `geo-math`, `dem` + `elevation.service`, `route-graph` (az `offline-route-graph.ts` A*-jának általánosítása), `tracking-config` | a túra jelenlegi viselkedése nem regresszálhat |
| 2 | **GPS-réteg + bicikli Pontos (+ ECO, ha marad):** `location-tracking.service`, `track-buffer`, `bike-live-session.service`, élő képernyő, banner, értesítés, összegző űrlap, `BikeRideLog` séma-bővítés | |
| 3 | **Bicikli Becsült:** bicikli-úthálózat a csomagban, `routing.service` BIKE profil, degradált becslés, hihetőség-ellenőrzés | |
| 4 | **Súgó + spec:** hint/label, súgó szövegek (hu + en), [[Biciklizés napló]] és [[Backend-offline first]] §15 frissítés | lezárás feltétele |

A [[151-tura-backend-offline-first-szabalysertesek]] az 1. fázis után indulhat (a túra-metrikák és
-routing átállása ugyanerre a rétegre), a 106-os track-felvétel a 2. fázis után.

### Plugin döntés

**Spike-eredmény (2026-10-06, részleges — eszköz-mérés még hátravan):**

| Jelölt | Verzió | Licenc | Időalapú intervallum | Távolságszűrő | Háttér / foreground service | Ítélet |
|---|---|---|---|---|---|---|
| `@capacitor-community/background-geolocation` | 1.2.26 | MIT | **nincs** | igen (`distanceFilter`) | igen (`backgroundMessage` = értesítés) | jó alap, de az ECO „20 s-onként" nem valósítható meg vele |
| `@transistorsoft/capacitor-background-geolocation` | 9.6.1 | CUSTOM (fizetős release-licenc) | igen (a dokumentáció szerint) | igen | igen | kiváló, de licencköltség és nem ingyenes csomag |
| `@capacitor/geolocation` | 8.2.3 | MIT | — | — | **nincs háttér** | csak előtérben; a háttér-követelményt nem teljesíti |

**Következtetés:** a közösségi plugin ingyenes és elég a Pontos módhoz, de az **ECO mód időalapú
definíciója nem valósítható meg vele**. Távolságalapú ECO (pl. 200 m-enként) készíthető, viszont
a GPS-hardver ilyenkor is folyamatosan fut — csak a visszahívások és a mentések száma csökken, az
akkumulátor-megtakarítás ezért kicsi. Ha az ECO-t az akkumulátor miatt akarjuk, a Transistorsoft
licenc vagy saját plugin kellene. **Javaslat: ECO kimarad, 2 mód (Pontos, Becsült)**; ez a döntés
a felhasználóé.

### Méret-jóváhagyás

**Mért / becsült méretek (2026-10-06):**

- **Turistaút-gráf (mért, a meglévő adatbázisból):** 230 611 szakasz, 2 810 289 csomópont
  (átlag 12,2 pont/szakasz). A nyers Postgres-szöveges alak ~61 MB; bináris, `Int32` 1e-5 fokos
  kvantálással (~1,1 m) ~22 MB nyersen, deflate-tel becslés szerint ~10–15 MB. **Becslés, nem
  mért fájl.**
- **DEM (becsült, nincs letöltve):** HU ~26,7 M minta 3″-en → ~53 MB nyers `int16`; 6″-en ~13 MB.
  Sima síkságon jól tömörül; a tényleges méret a spike-ban mérendő.
- **Bicikli-úthálózat:** még nem mérve (OSM HU extract nincs letöltve).
- **APK-növekmény:** még nem mérve (release build nem készült).

_Válasz és dátum: (a mért APK-delta és a bicikli-gráf méret után, a felhasználó dönt)._

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] — élő tracker, módok, `trackingMode` / `startedAt`,
  súgó szövegek, Backend-offline; [[Backend-offline first]] §15 — geo asset-csomag
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #150 bicikli élő GPS tracker + közös eszközön futó geo-réteg
- Kód: `frontend/src/app/core/geo/`, `core/data/bike-live-session.service.ts`,
  `pages/workout/cycling/`, `scripts/build-geo-assets.mjs`
- 106-os és 151-es jegy frissítése: a GPS / DEM / routing alapréteg kész, hivatkozás ide
