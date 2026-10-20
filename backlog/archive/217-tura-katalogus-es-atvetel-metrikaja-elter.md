---
id: 217
type: bug
status: done
title: Túra — ugyanarra a túrára a katalógus és az átvett piszkozat más szintemelkedést és időt mutat
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 217 — Túra — ugyanarra a túrára a katalógus és az átvett piszkozat más szintemelkedést és időt mutat

## Motiváció / probléma

A „P (Dömös – Budaörs)” a katalógusban 54,2 km, 13 ó 17 p, ↑1459 m; átvétel után a piszkozat 54,2 km, 14 ó 17 p, ↑2062 m / ↓2094 m. A felhasználó nem tudja, melyik az igaz.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Katalógus: a backend számolja az admin upsertkor (`RouteMetricsService`, `PROFILE_SAMPLE_COUNT = 50` Open-Meteo mintapont).
- Piszkozat: az eszköz számolja (`core/geo/route-metrics.ts`, sűrűbb mintavétel + zajküszöb).
- A különbség valószínűleg a mintapontok számából adódik (50 pont egy 54 km-es túrán ~1 km-enként mintáz).

## Elfogadási kritériumok

- [x] A katalógus és az átvett piszkozat ugyanazzal a módszerrel számolt értékeket mutat (pl. a katalógus-import is az eszközös / közös algoritmussal és mintavétellel számol, vagy a katalógus értéke átvételkor megmarad). Döntés a naplóban.
- [x] Teszt / mérés: legalább egy rövid és egy hosszú katalógus-túrán a két érték egyezik (vagy a dokumentált tűrésen belül van).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- Kapcsolódik: [[179-dem-varosi-szintemelkedes-felulbecsles]], [[176-kozos-dem-mintavetel-tura-bicikli]] (közös DEM-mintavétel), [[195-tura-ajanlott-turak-teljes-feltoltese]] (újrafeltöltéskor ugyanaz a számítás fut).
- 2026-10-20 — döntés: a katalógus az app algoritmusával számol (a javasolt út; az „átvételkor a katalógus értéke marad” alternatíva elvetve, mert a szám a szerkesztés első lépésénél ugrana). Az admin upsert (`CuratedRouteUpsertRequest`) opcionálisan kapja az `elevationGainMeters` / `elevationLossMeters` / `estimatedDurationMinutes` hármast (csak együtt — különben `400 VALIDATION_ERROR`); ha jelen van, a szerver nem hív Open-Meteót, a távot továbbra is maga számolja (ugyanaz a haversine, 6 371 km). Ha hiányzik, a régi szerveroldali számítás fut.
- 2026-10-20 — az import (`scripts/import-curated-routes.mjs`) a frontend `core/geo/route-metrics.ts`-ét és `dem.ts`-ét esbuild-del memóriában csomagolja és futtatja (nincs másolt algoritmus), a magasságot a DEM build assetből (`frontend/src/assets/geo/`) olvassa — pontosan úgy, mint az eszköz egy piszkozatra.
- 2026-10-20 — közben talált hiba: a DEM-manifest a csempe-geometriát 6 tizedesre kerekítette (lépés 0,000833 az 1/1200 helyett) — 1200 cellán ~0,0004° (~40 m) elcsúszás, és minden csempehatáron (egész fokokon) egy cellányi sáv, ahol egyik csempe sem adott magasságot: ott az eszköz Open-Meteóra váltott (offline nem számolt). A 447 túrából 95 érintett. Javítva: a `build-geo-assets.mjs` 12 tizedesre ír, a helyi manifest pontos értékekre javítva (a geo asset git-ignored — más gépen a builder újrafuttatása kell), és a `sampleElevation` a szélső cellaközéppontokon túl fél cellát a szélső értékkel lefed (a `demTileContains` ugyanezt a tartományt fogadja el; mindkettő a `dem.ts`-ben, unit teszttel). Ezután mind a 447 túra a DEM-ből kapott metrikát.
- 2026-10-20 — mérés (emulátor, 360 dp): a „P (Dömös – Budaörs)” katalógusban 54,2 km · 14 ó 18 p · ↑2075 m · ↓2110 m, átvétel után a piszkozat ugyanez (korábban katalógus ↑1459 / 13 ó 17 p vs. piszkozat ↑2062 / 14 ó 17 p). Rövid túrán (Ábrahámhegy – Örsi-hegy, 9,1 km) a katalógus ↑279 m. A különbség oka a ritka (50 pontos, ~1 km-es) szerveroldali mintavétel volt. Backend-integrációs teszt: a kliens-metrika változatlanul tárolódik, magasság-lekérés nélkül; részleges hármas → 400.
- 2026-10-20 — másik gépen: egy korábban generált geo-csomag DEM-manifestje még a kerekített; frissítés `cd frontend && npm run build:geo-assets -- --skip-bike --skip-hike` (~40 s a cache-ből, ezen a gépen a kézi javítással bájtra azonos eredmény), utána APK-újraépítés. A katalógus-import a csomagot igényli, hiányzó / régi manifesttel hibaüzenettel megáll. Leírás: [[150-biciklizes-elo-gps-tracker]] „Geo-csomag másik gépen”.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #216, #217, #221, #195
- Kód: `backend/.../tura/CuratedRouteService.java`, `RouteMetricsService.java`, `openapi/components/schemas/CuratedRoute{,UpsertRequest}.yaml`, `scripts/import-curated-routes.mjs`, `scripts/import-hiking-trails.mjs` (`symbolFromTags` export), `scripts/build-geo-assets.mjs` (DEM-geometria 12 tizedesre), `frontend/.../core/geo/dem.ts` (+ spec), `geo-asset.service.ts`
