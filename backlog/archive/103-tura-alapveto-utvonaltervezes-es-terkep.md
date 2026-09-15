---
id: 103
type: feature
status: ready
title: Túra — alapvető útvonaltervezés és turistajelzés-térkép
specs: []
flag:
created: 2026-09-13
closed:
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

- Térkép-alap technológia választás (pl. Leaflet/MapLibre + OSM csempék vs. natív Capacitor
  térkép-plugin) — ez erősen összefügg a `105-tura-offline-terkep-es-utvonalszamitas.md` offline-
  letöltési megoldásával, azzal együtt döntendő.
- Ez a ticket csak a **megjelenítést és tervezést** fedi; az élő GPS-navigáció a
  `106-tura-gps-navigacio-elo-helymegosztas.md` alá tartozik.

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs — lásd 102-es ticket)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` új `pages/` alá térkép-komponens, `core/data/` új repository
