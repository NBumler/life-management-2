---
id: 105
type: feature
status: done
title: Túra — offline térkép-letöltés és offline útvonalszámítás
specs: []
flag: menu.tura
created: 2026-09-13
closed: 2026-09-16
---

# 105 — Túra — offline térkép-letöltés és offline útvonalszámítás

## Motiváció / probléma

Szinte **minden** versenytárs alkalmazásnál (Mapy.cz, Locus Map, OsmAnd, Komoot, bergfex,
AllTrails, Gaia GPS) az offline térkép-letöltés és/vagy offline útvonalszámítás a legfőbb fizetős
funkció. Ez az app viszont már architekturálisan offline-first (lásd [[Backend-offline first]]) —
ez a természetes differenciátor: amit másoknál elő kell fizetni, az nálunk alapból jár.

## Jelenlegi működés

Nincs — ez egy vadonatúj feature. A meglévő offline-first kontraktus (helyi SQLite + outbox,
delta-sync) más entitásokra épül, térképi csempe-/vektoradat offline tárolására még nincs minta.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.
- [x] Az offline térkép-tárolás módja explicit rákötve a [[Backend-offline first]] kontraktra:
      melyik connectivity-state-ben mi működik (`ONLINE`, `BACKEND_OFFLINE`, `FULL_OFFLINE`) — ld.
      "### Megvalósítás" alább.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Régiónkénti offline térkép-letöltés — **kell**, ez legyen az alapértelmezett, ingyenes élmény.
- [x] Offline útvonalszámítás (új útvonal kiszámítása internet nélkül) — **kell, explicit döntés**:
      a felhasználó a valódi offline routingot választotta a "csak megtervezett útvonal offline
      használata" light-verzió helyett, mert ez a legnagyobb differenciátor a versenytársakhoz
      képest. Ez jelentős extra munka — helyi routing motor kell (pl. beágyazott BRouter-szerű
      megoldás), lásd nyitott kérdés.
- [x] Automatikus/kézi "előretöltés" a tervezett túra környékére — **kell**.
- [x] Tárhely-kezelés UI (mekkora terület van letöltve, törölhető-e) — **kell**.
- [x] Web build explicit **online-only** marad ezen a területen is (nincs SQLite, nincs offline
      térkép a webes buildben) — ez követi a meglévő `offlineCapable` flag mintát, nem volt vitás pont.

### Nyitott kérdés

- ~~Térkép-csempe formátum és tárolás: natív fájlrendszer (Capacitor Filesystem plugin) vagy SQLite
  BLOB-ok?~~ **Eldőlt (2026-09-16): Capacitor Filesystem** (`Directory.Data`), nem SQLite BLOB —
  a csempék bináris kép-fájlok, ehhez a natív fájlrendszer az egyszerűbb, kisebb-overheadű tárolás;
  a régió-metaadat (index + lista) egy-egy JSON fájl ugyanabban a Filesystem-hierarchiában.
- ~~Mekkora egy "régió" — közigazgatási határ, rács alapú csempe-terület, vagy a felhasználó által
  szabadon rajzolt terület?~~ **Eldőlt (2026-09-16): az aktuális térkép-viewport bbox-a a letöltés
  pillanatában** — nincs külön "terület kijelölés" UI, a felhasználó a térképet mozgatja/nagyítja a
  kívánt területre, majd letölti azt, amit lát. Legegyszerűbb, extra UI nélküli megoldás.
- ~~Offline útvonalszámítás motorjának választása (saját implementáció vs. beágyazott nyílt
  forráskódú routing engine).~~ **Eldőlt (2026-09-16): saját implementáció** — a backend
  `RouteSuggestionService` A* gráf-keresésének 1:1 TS-portja (`offline-route-graph.ts`), nem
  beágyazott motor (BRouter/GraphHopper) — ugyanaz az indoklás, mint a backend 2.2 fázisban: a
  turistaút-gráf jóval kisebb, mint egy teljes úthálózat.

### Megvalósítás (2026-09-16)

- **Offline térkép-letöltés**: a "Rétegek" panel melletti új "Offline területek" gombbal (csak
  natív platformon, `Capacitor.isNativePlatform()` — web build ezen a területen is online-only marad)
  a felhasználó letöltheti az aktuális térkép-viewportot. Csempe-tartomány: z12–z15 (túrázási
  léptékhez elég részletes), max. 2500 csempe/régió biztonsági korláttal (túl nagy terület esetén
  elutasítás, kérés a közelítésre). **Csak az alapértelmezett OSM alaptérkép-réteg tölthető le** — a
  topo/szatellit/domborzat-árnyékolás réteg online-only marad; ez tudatos egyszerűsítés, hogy a
  letöltés/tárhely-kezelés ne hármas komplexitású legyen (ugyanaz az irány, mint a 107-es ticket
  hillshade-kompromisszuma).
- **Tárolás**: Capacitor Filesystem, `Directory.Data` — `tura-offline/tiles/osm/{z}/{x}/{y}.png`
  (csempék), `tura-offline/manifests/{regionId}.json` (a régióhoz tartozó pontos csempe-lista +
  a régió bbox-ára lekért `TrailSegment`-ek — ez utóbbi az offline route-graf építéséhez kell),
  `tura-offline/regions.json` (könnyű index a listázó panelhez: id/név/bbox/csempeszám/méret/dátum).
  Régió törlésekor csak azokat a csempéket törli, amiket **egyetlen másik megmaradó régió sem**
  referál (manifest-alapú referencia-számolás) — átfedő régiók biztonságosan törölhetők anélkül,
  hogy egy másik régió csempéi eltűnnének.
- **MapLibre integráció**: egy `tura-offline-tile://` egyedi protokoll (`maplibregl.addProtocol`)
  fűződik az `osm` réteg csempe-kérései elé — natív platformon előbb a Filesystem-cache-ben keres,
  csak cache-miss esetén megy hálózatra; web buildben mindig hálózatra megy. Ez a mechanizmus
  teszi lehetővé, hogy BACKEND_OFFLINE/FULL_OFFLINE alatt a korábban letöltött terület továbbra is
  megjelenjen a térképen.
- **Offline útvonalszámítás**: nincs külön "offline mód" kapcsoló — a `TrailSegmentRepository` és a
  `RouteSuggestionRepository` a hálózati hívás hibájára (catch ág) automatikusan a helyi adatra vált:
  a trail-szegmens lekérdezés a letöltött régiók manifestjéből, az útvonal-javaslat pedig a már
  betöltött (viewportból vagy régióból származó) szegmenseken futtatott on-device A*-ból
  (`offline-route-graph.ts`) szolgál ki választ. A felhasználó szemszögéből ugyanaz az
  "Automatikus" mód működik tovább, csak a backend nélkül.
- **Nincs backend-változás** — a meglévő `GET /api/tura/trail-segments` bbox-endpointot és a
  `suggestRoute` endpointot használja a letöltés, illetve ugyanezeket próbálja meg elsőként online
  módban is.
- **Tesztelés**: `offline-route-graph.spec.ts` (A* algoritmus — talált/nem talált útvonal, snap
  éltávolság, diszjunkt gráf), `offline-region.model.spec.ts` (slippy-map csempe-matematika, bbox-
  metszés), valamint a `TrailSegmentRepository`/`RouteSuggestionRepository` fallback-ágának
  spec-kiegészítése. `npm run lint`, `npm run build`, `npm run test:ci` (1710/1710 zöld),
  `npm run verify:outbox` mind zöld. Böngészőben manuálisan visszaellenőrizve, hogy a meglévő
  (online) alaptérkép/réteg-váltás/automatikus útvonaltervezés funkció nem regresszált.
  **Explicit korlát**: a natív-only letöltés/cache/valódi-offline-routing útvonalat (repülő
  üzemmódban, fizikai Android-eszközön) ez a munkamenet nem tudta böngésző-automatizálással
  végigtesztelni — csak kódszinten és unit teszttel ellenőrzött, ugyanazt a natív-gating mintát
  követve, mint a többi `Capacitor.isNativePlatform()`-ág a kódbázisban (pl. `SqliteStorageBackend`).
  Éles Android-installon (`scripts/install-android.ps1`) érdemes lesz utólag kipróbálni.
- **Tudatos korlátok**: (1) csak az OSM alaptérkép tölthető le, a többi réteg online-only marad;
  (2) egy "régió" a letöltéskori térkép-viewport bbox-a, nincs közigazgatási/szabadon rajzolt
  terület-választás; (3) a letöltés best-effort — egy-egy sikertelen csempe-letöltés csendben
  kimarad, nem hiúsítja meg a teljes régiót.

## Lezáráskor (on-done)

- Frissített specek: nincs — a `documentation/` spec a teljes 103–111 ticket-család befejezése után
  készül el, a 102-es esernyő-ticket döntése szerint.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-16 — #105 (offline térkép-letöltés + offline
  útvonalszámítás, 4. fázis)
- Kód: `frontend/src/app/pages/menu/tura/offline-*.ts` (új), `core/data/trail-segment.repository.ts`
  + `core/data/route-suggestion.repository.ts` (offline fallback), `@capacitor/filesystem` új
  függőség — nincs backend-változás.
