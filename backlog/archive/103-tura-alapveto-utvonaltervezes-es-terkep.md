---
id: 103
type: feature
status: done
title: Túra — alapvető útvonaltervezés és turistajelzés-térkép
specs: []
flag: menu.tura
created: 2026-09-13
closed: 2026-09-16
---

# 103 — Túra — alapvető útvonaltervezés és turistajelzés-térkép

## Motiváció / probléma

A túraútvonal-tervező feature (lásd [[backlog/tura-utvonaltervezo/102-tura-utvonaltervezo-attekintes]])
alapja egy térképnézet, amin a magyar turistajelzések (piros/kék/zöld/sárga sáv, kereszt,
háromszög stb. — MTSZ-szimbólumrendszer) látszanak, és amin a felhasználó útvonalat tud
tervezni/kijelölni, táv/idő/szintkülönbség-becsléssel.

## Jelenlegi működés

Nincs — ez egy vadonatúj feature, jelenleg semmilyen térkép- vagy útvonaltervező funkció nincs
az appban.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve, a ticket scope-ja körvonalazva és `ready`-re állítva.
- [x] Minden "kell" jelölt tétel implementálva és `master`-en, zöld backend/frontend build+teszt+lint
      mellett (fázisbontás és commitok a "Terv / döntési napló" alján).

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Interaktív, nagyítható alaptérkép turistajelzés-réteggel — **kell**
- [x] Táv/idő/szintkülönbség automatikus becslés egy megtervezett útvonalhoz — **kell**
- [x] Magassági profil (elevation profile) megjelenítés — **kell**
- [x] Manuális útvonal-rajzolás térképen (waypointok kijelölése, útvonal-szerkesztés) — **kell**
- [x] Automatikus útvonal-generálás jelzett ösvények mentén (két pont közt "vezess a turistaúton") — **kell**
- [x] Kész/ajánlott túrák katalógusa — **kell**. A `110-tura-kozossegi-funkciok.md` ticket
      dropped lett (nincs közösségi réteg), tehát a katalógus **kizárólag saját/admin-szerkesztett
      vagy a `104-tura-adatforras-integracio.md` alatt beszerzett nyílt (OSM-alapú) adatból** épül,
      nem közösségi feltöltésből.
- [ ] Via ferrata / speciális nehézségi profilok — **nem kell** (niche, kikerül a scope-ból)
- [x] Többnapos túra tervezés szakaszokkal/éjszakázó pontokkal — **kell**
- [x] Szűrés nehézség/táv/aktivitás-típus szerint — **kell**

### Nyitott kérdés

- ~~Térkép-alap technológia választás~~ — eldőlt: **MapLibre GL JS** (raster OSM csempével), lásd a
  fázisbontási terv "Kulcs technikai döntések" szakaszát. Nem natív Capacitor térkép-plugin.
- Ez a ticket csak a **megjelenítést és tervezést** fedi; az élő GPS-navigáció a
  `106-tura-gps-navigacio-elo-helymegosztas.md` alá tartozik.

### Megvalósítás — fázisbontás és commitok

A ticket a jóváhagyott implementációs terv szerint fázisokra bontva készült el, minden fázis után
felhasználói jóváhagyással:

| Fázis | Tartalom | Commit |
|---|---|---|
| 0. | Menü → Túra tab-váz, `menu.tura` flag | `61d1d11` |
| 1. | Alaptérkép (MapLibre GL JS) + magyar turistajelzés-réteg (`TrailSegment`, admin import) | `ec1cb2d` |
| 2.1 | Kézi útvonal-rajzolás, `HikeRoute` user-owned entitás | `0854c54` |
| 2.2 | Automatikus útvonal-generálás jelzett ösvényeken (saját Dijkstra/A*) | `f1c92f2` |
| 2.3 | Táv/idő/szintkülönbség-becslés + magassági profil (Open-Meteo elevation API) | `05d8a5d` |
| 2.4 | Többnapos túra tervezés (szakaszokra bontás, éjszakázó pontok) | `a26cae4` |
| 2.5 | Kész/ajánlott túrák katalógusa + szűrés (nehézség/aktivitás-típus/táv) | `894d7c2` |

Via ferrata / speciális nehézségi profilok szándékosan nem készültek el (ld. a döntési checklista
"nem kell" pontja).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a `102-tura-utvonaltervezo-attekintes` esernyő-ticket explicit
  rögzíti, hogy a `documentation/` spec csak a teljes feature-család (103–111) leszállítása után
  készül el, nem az egyes ticketek lezárásakor. A jelenlegi állapot eddig a `backlog/
  tura-utvonaltervezo/` jegyekben és a fenti fázisbontásban dokumentált.
- `IMPLEMENTATION_STATUS.md` sor: `2026-09-16 — #103` (a `## Lezárt jegyek` tetején).
- Kód: `backend/src/main/java/hu/bumler/lm2/tura/` (teljes új package: `HikeRoute*`,
  `TrailSegment*`, `CuratedRoute*`, `RouteMetricsService`, `RouteSuggestionService`,
  `ElevationClient` + `OpenMeteoElevationClient`, `GeoUtils`, `HikeRouteDayJson`,
  `HikeRouteDayValidation`), migrációk `V39`–`V43`; `frontend/src/app/pages/menu/tura/` (új oldal),
  `core/data/{hike-route,trail-segment,route-metrics,route-suggestion,curated-route}.repository.ts`.
