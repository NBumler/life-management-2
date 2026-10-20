---
id: 223
type: bug
status: done
title: Túra — az offline letöltés tömegesen tölt csempét a tile.openstreetmap.org-ról, amit az OSM szabálya tilt
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 223 — Túra — az offline letöltés tömegesen tölt csempét a tile.openstreetmap.org-ról, amit az OSM szabálya tilt

## Motiváció / probléma

Az OSM Foundation csempeszerverének felhasználási szabálya (Tile Usage Policy) tiltja a tömeges / offline előletöltést. Egy régió-letöltés akár 2500 csempét kér le egyszerre; ez a szerver oldaláról letiltást (blokkolt User-Agent / IP) is eredményezhet.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `core/data/offline-region.repository.ts`: `OSM_TILE_URL_ROOT = 'https://tile.openstreetmap.org'`, z12–15, max. 2500 csempe régiónként.
- UX-szempontból nem érintett; a 2026-10-19-i UX-teszt kódáttekintése közben derült ki.

## Elfogadási kritériumok

- [x] Az offline csempék olyan forrásból jönnek, amelynek a felhasználási feltételei megengedik az offline előletöltést (pl. saját / bérelt csempeszolgáltatás, vagy saját előállítású csomag) — döntés a naplóban.
- [x] A forrás és a feltételei a [[105-tura-offline-terkep-es-utvonalszamitas]] jegyben és a [[Backend-offline first]] §13 külső-szolgáltatás listájában rögzítve.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés (a felhasználó elfogadta a terv javaslatát): **az új terület letöltése ideiglenesen kikapcsolva**, amíg nincs olyan csempeforrás, ami megengedi az offline előletöltést. A végleges forrás (kereskedelmi szolgáltató offline-engedéllyel, vagy saját, OSM-adatból előállított csomag a geo build asset mintájára) a [[105-tura-offline-terkep-es-utvonalszamitas]] folytatása. Így az első kritérium úgy teljesül, hogy a tile.openstreetmap.org-ról semmi nem töltődik elő.
- 2026-10-20 — megvalósítva: az `OfflineRegionRepository`-ból kikerült a letöltés (a csempe-fetch, a méretbecslés és a folyamatjelző); a „Továbbiak” menü „Offline területek” eleme csak akkor látszik, ha van korábban letöltött terület. A panel elején magyarázat: az új letöltés átmenetileg nem érhető el, a korábbiak offline is működnek, a turistaút-tervezéshez és a szintadatokhoz Magyarországon nem kell letöltés (geo build asset). A korábbi régiók cache-e és törlése változatlan. A megjelenítéshez használt élő OSM-csempék maradnak (azt a szabály megengedi).
- 2026-10-20 — emulátoron (hu + en, 360 dp): régió nélkül a menüben csak „Ajánlott túrák” és „Útvonalaim”; egy tesztrégióval megjelenik az „Offline területek”, a panel a magyarázatot és a régiót mutatja, a törlés működik, utána a menüpont eltűnik.
- 2026-10-20 — rögzítve: [[105-tura-offline-terkep-es-utvonalszamitas]] döntési napló + új kritérium, [[Backend-offline first]] §13 (OSM alaptérkép-csempe sor).

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]] §13 (külső hívások: OSM-csempe, helymeghatározás); a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #223, #215
- Kód: `frontend/src/app/core/data/offline-region.repository.ts`, `pages/menu/tura/tura.page.ts|html`, i18n `TURA.OFFLINE.*`
