---
id: 209
type: change-request
status: done
title: Túra — a Napok panel elvont: nincs napi táv / szint, a térkép nem látszik közben
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 209 — Túra — a Napok panel elvont: nincs napi táv / szint, a térkép nem látszik közben

## Motiváció / probléma

A panel csak annyit mond, hogy „1. nap vége: 2. pont” — a felhasználó nem tudja, hol van a 2. pont, mennyit megy aznap, és miért nem adhat hozzá újabb napot.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Teljes képernyős `ion-modal`, ami a térképet eltakarja.
- Soronként: „N. nap vége” + pont-sorszám választó + éjszakázó-hely mező + kuka.
- Napi táv / szint / idő nem látszik, pedig a #188 óta kiszámolható (`computeWithDays`).
- A „Töréspont hozzáadása” indoklás nélkül tiltott, ha nincs több kijelölt belső pont.
- Átvett katalógus-túránál az éjszakázó hely neve üres.

## Elfogadási kritériumok

- [x] Minden nap mellett látszik a napi táv, ↑ / ↓ és becsült idő.
- [x] A napváltó pont a térképen is azonosítható (lásd [[203-tura-kezdo-veg-es-napvalto-pont-egyforma]]), és a panel nem takarja el teljesen a térképet (pl. félmagas sheet).
- [x] Ha nem adható hozzá napváltó, a panel megmondja, miért (pl. „Tegyél le még egy pontot az útvonalon”).
- [x] Megvizsgálva, hogy az OSM-relációból kinyerhető-e az éjszakázó hely neve a katalógus-túráknál (különben marad üresen).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — megvalósítva: a teljes képernyős Napok ablak helyett a piszkozat „Részletek” gombja a #212 félmagas lapját nyitja (a térkép mellette látszik): statisztika, profil a napváltó-jelölőkkel, és alatta a napok szerkesztése. Minden napnál a napi táv, idő, ↑, ↓ (`computeWithDays`, a napváltók változása után 400 ms-mal újraszámolva, csak nyitott lapnál); az utolsó nap „N. nap — a célig”.
- 2026-10-20 — a napváltó-választóban a pont sorszáma mellett a helye is: „3. pont · 5,2 km”; a térképen a #203 sorszámos hold-jelölője. Ha nem adható hozzá napváltó, a gomb alatt az ok: nincs kijelölt köztes pont, vagy már mindegyik napváltó — „tegyél le még egy pontot az útvonalon”. A „Töréspont” szó helyett mindenhol „Napváltó”.
- 2026-10-20 — döntés (éjszakázó hely neve az OSM-ből): **nem nyerjük ki, üres marad.** A katalógus-import (#193) a hosszú túrákat egyenlő hosszú napokra bontja, a napváltó tehát nem egy OSM-szakaszhatár (a `from` / `to` tag ott nem segít), és egy „legközelebbi település / szállás” keresés csak találgatás lenne, plusz Overpass-lekérdezés napváltónként. A természetes forrás a #108 POI-adatbázis (szállások), ha elkészül.
- 2026-10-20 — emulátoron: „Teszt Pilis kor” szerkesztésekor 1. nap 0,9 km / 16 p / ↑49 / ↓63, 2. nap 1,1 km / 14 p / ↑8 / ↓30, a hozzáadás tiltva az indoklással. hu + en.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #212, #218, #219, #209, #201
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `route-details.component.*`, `elevation-profile.component.*`, `elevation-profile-svg.ts` (+ spec), `assets/i18n/{hu,en}.json`
