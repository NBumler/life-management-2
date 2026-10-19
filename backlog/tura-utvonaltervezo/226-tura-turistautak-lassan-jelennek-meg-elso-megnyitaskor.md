---
id: 226
type: bug
status: backlog
title: Túra — első megnyitáskor a turistautak csak kb. 15 mp múlva jelennek meg
specs: []
flag: menu.tura
created: 2026-10-20
closed:
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

- [ ] Mérés emulátoron hidegindítás után, a megjegyzett Pilis-nézettel: mikor indul a szakasz-kérés
      az oldal megnyitásához képest, mennyi ideig tart (méret, szerveridő), és mennyi a feldolgozás +
      kirajzolás. Összehasonlításként egy második (meleg) megnyitás.
- [ ] A mért ok alapján javítás; a cél (mérés után rögzítve) a meleg megnyitás nagyságrendje.
- [ ] Amíg a szakaszok töltődnek, a felhasználó látja, hogy töltés folyik (nem üres térkép).
- [ ] A mérés előtte / utána a jegyben.
- [ ] Offline (letöltött régió-cache) viselkedés változatlan.

## Terv / döntési napló

- Lehetséges irányok a mérés után (nem eldöntve): HTTP-tömörítés a backenden (globális beállítás,
  külön döntés), a kérés korábbi indítása (a `load` esemény megvárása nélkül), a szakaszok
  eszköz-lokális cache-e az utolsó nézetre, töltésjelző a térképen.
- Backend-beállítás változásánál a futó `bootRun` újraindítását előtte meg kell kérdezni.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #226
- Kód: <fő package-ek / fájlok>
