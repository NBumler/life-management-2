---
id: 226
type: bug
status: done
title: Túra — első megnyitáskor a turistautak csak kb. 15 mp múlva jelennek meg
specs: []
flag: menu.tura
created: 2026-10-20
closed: 2026-10-20
---

# 226 — Túra — első megnyitáskor a turistautak csak kb. 15 mp múlva jelennek meg

## Motiváció / probléma

Forrás: a 2026-10-20-i emulátoros ellenőrzés (3. UX-szelet, `ccc9672`; LM2_Phone, Android 15, 360 dp).
Az alkalmazás hidegindítása után a Túra oldalt megnyitva a térkép a megjegyzett nézetben (Pilis,
12,6-os zoom) azonnal megjelenik, de a turistautak csak **kb. 15 mp** múlva rajzolódnak ki. Addig
a térkép üres, mintha nem lennének turistautak a környéken.

A [[180-tura-turistaut-szakaszok-korlatlan-betoltese]] (lezárva) ugyanezen a környéken 12-es zoomon
0,6–1,4 MB / 0,8–1,5 s kérésidőt mért — de akkor az oldal ország-nézetben nyílt, így megnyitáskor
nem ment kérés. A [[214-tura-terkep-mindig-orszagnezetre-all-vissza]] óta a térkép az utolsó nézetben
nyílik, tehát a megnyitáskori első szakasz-kérés most a tipikus eset. A 15 mp oka nincs mérve.

## Jelenlegi működés

- `tura.page.ts`: a térkép `load` / első `moveend` után a `loadCurrentViewport()` kéri a látható bbox
  szakaszait (`MIN_TRAIL_SEGMENT_ZOOM = 12` felett), a `TrailSegmentRepository.loadBbox()`-on át
  (`GET /api/tura/trail-segments`; hiba esetén az offline régió-cache).
- A backend nem tömörít (`server.compression` nincs bekapcsolva) — a #180 naplója javaslatként jelezte.
- A mérés csak egyszeri megfigyelés; hogy a kérés indul későn, a válasz lassú (hideg backend /
  adatbázis), az indulási szinkron versenyez vele, vagy a feldolgozás és a `setData` tart sokáig,
  nem tudjuk.

## Elfogadási kritériumok

- [x] Mérés emulátoron hidegindítás után, a megjegyzett Pilis-nézettel: mikor indul a szakasz-kérés
      az oldal megnyitásához képest, mennyi ideig tart (méret, szerveridő), és mennyi a feldolgozás +
      kirajzolás. Összehasonlításként egy második (meleg) megnyitás.
- [x] A mért ok alapján javítás; a cél (mérés után rögzítve) a meleg megnyitás nagyságrendje.
- [x] Amíg a szakaszok töltődnek, a felhasználó látja, hogy töltés folyik (nem üres térkép).
- [x] A mérés előtte / utána a jegyben.
- [x] Offline (letöltött régió-cache) viselkedés változatlan.

## Terv / döntési napló

- Lehetséges irányok a mérés után (nem eldöntve): HTTP-tömörítés a backenden (globális beállítás,
  külön döntés), a kérés korábbi indítása (a `load` esemény megvárása nélkül), a szakaszok
  eszköz-lokális cache-e az utolsó nézetre, töltésjelző a térképen.
- Backend-beállítás változásánál a futó `bootRun` újraindítását előtte meg kell kérdezni.
- 2026-10-20 — mérés (LM2_Phone, hidegindítás után a Túra oldal megnyitása a megjegyzett nézettel; WebView
  Resource Timing a navigációhoz képest):
  - **Előtte:** a szakasz-kérés **10,6 s**-nál indult, maga 0,5 s; ugyanarra a nézetre 16,2 s-nál egy második
    kérés is ment. Az alaptérkép 11 csempéje 2,9 s és 14,9 s között jött. A szerver nem a szűk keresztmetszet:
    egy Pilis-bbox (12-es zoom, 1,5 MB nyers / 0,4 MB gzip — a `server.compression` közben már be van kapcsolva)
    hidegen 2,9 s, melegen 0,8–1,2 s.
  - **Ok:** a turistaút-réteg és az első kérés a MapLibre `load` eseményére várt, ami csak akkor jön, amikor az
    első nézet **összes alaptérkép-csempéje** megérkezett. Emellett a konténer első mérete néha még a régi (kicsi),
    és a `ResizeObserver` utáni méretre nem ment új kérés.
  - **Javítás:** a rétegek a stílus beolvasásakor (`style.load`, vagy azonnal, ha már kész) kerülnek fel, a
    forrás a már betöltött szakaszokkal indul; az első kérés a térkép létrehozásakor indul, és a `ResizeObserver`
    / `ionViewDidEnter` is újrakéri a nézetet. A `TrailSegmentRepository` ugyanarra a bbox-ra nem kér újra
    (sem futó, sem a szerver által már megválaszolt kérésnél; offline tartalék után igen), és `loading` signalt ad.
    Amíg az első turistautak töltődnek, a lebegő jelzés „Turistautak betöltése…” / „Loading hiking trails…”
    töltésjelzővel; a térkép létrejötte előtt már nem villan fel a „Közelíts rá”.
  - **Utána:** a kérés 3,0–5,6 s-nál indul (a térkép létrejöttekor), egyetlen kérés, 0,2–1,0 s; a turistautak
    hidegindítás után 4,1–8,2 s alatt látszanak (a legnagyobb érték közvetlenül a friss telepítés után),
    melegen 0,5 s. A maradék a Túra oldal (900 kB-os lazy chunk) és a MapLibre létrehozása a hideg WebView-ban,
    nem a turistautak: a turistaút a térkép megjelenése után kb. 1 s-mal rajzolódik ki. A cél (a meleg megnyitás
    nagyságrendje) a turistaút-részre teljesült; a hideg oldal-indítás külön téma.
  - Offline (régió-cache) ág változatlan: hálózati hiba → `OfflineRegionRepository.getCachedSegmentsInBbox`, és
    ilyenkor a bbox nem számít megválaszoltnak, így a hálózat visszatérte után újra kéri (unit teszt).
  Unit tesztek: `trail-segment.repository.spec.ts` (loading, ismételt / futó bbox kihagyása, offline után újrakérés).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #229, #227, #194, #228, #226
- Kód: `pages/menu/tura/tura.page.*`, `pages/menu/tura/map-hint.component.*`, `core/data/trail-segment.repository.ts`
