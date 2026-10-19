---
id: 209
type: change-request
status: backlog
title: Túra — a Napok panel elvont: nincs napi táv / szint, a térkép nem látszik közben
specs: []
flag: menu.tura
created: 2026-10-19
closed:
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

- [ ] Minden nap mellett látszik a napi táv, ↑ / ↓ és becsült idő.
- [ ] A napváltó pont a térképen is azonosítható (lásd [[203-tura-kezdo-veg-es-napvalto-pont-egyforma]]), és a panel nem takarja el teljesen a térképet (pl. félmagas sheet).
- [ ] Ha nem adható hozzá napváltó, a panel megmondja, miért (pl. „Tegyél le még egy pontot az útvonalon”).
- [ ] Megvizsgálva, hogy az OSM-relációból kinyerhető-e az éjszakázó hely neve a katalógus-túráknál (különben marad üresen).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #209
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
