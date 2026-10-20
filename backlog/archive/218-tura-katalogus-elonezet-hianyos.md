---
id: 218
type: change-request
status: done
title: Túra — a katalógus-előnézet csak a vonalat mutatja: nincs statisztika, profil, napbontás, kezdő- és végpont
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 218 — Túra — a katalógus-előnézet csak a vonalat mutatja: nincs statisztika, profil, napbontás, kezdő- és végpont

## Motiváció / probléma

Az előnézet alapján nem lehet eldönteni, hogy érdemes-e átvenni a túrát: nem látszik a táv, a szint, a profil, a napok és az irány.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Előnézetkor a térképen ciánkék vonal + a fejlécben a név, „Átvétel” és bezáró gomb; a statisztika-sáv csak piszkozatnál jelenik meg.

## Elfogadási kritériumok

- [x] Előnézetkor látszik a táv, ↑ / ↓, idő, a magasságprofil és (többnaposnál) a napbontás.
- [x] A kezdő- és végpont, valamint a napváltók jelölve ([[203-tura-kezdo-veg-es-napvalto-pont-egyforma]]).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — megvalósítva: az előnézet lebegő kártyáján a név (mellette ✕), a táv, idő, ↑, ↓ a katalógus értékeivel, és „Részletek” + „Szerkesztés sajátként”. A „Részletek” ugyanazt a félmagas lapot nyitja, mint a #212: nehézség · aktivitás, a leírás, a statisztika, a profil és a napbontás napi értékekkel.
- 2026-10-20 — a katalógus nem hordoz magasságprofilt, ezért a lap megnyitásakor az eszköz számolja (`RouteMetricsRepository.compute`, ugyanaz, mint a piszkozatnál); internet nélkül „Nincs magassági adat”. A lap statisztikája a katalógus értéke — a kettő eltérését a #217 kezeli.
- 2026-10-20 — a kezdő- és végpont, valamint a napváltók jelölése a #203 óta megvan; a profilon a napváltók is látszanak (#219).
- 2026-10-20 — emulátoron: az S (64,5 km, 3 nap) kártyája 360 dp-n az első változatban kilógott (három gomb egy sorban) — a ✕ a név mellé került, így hu és en felületen is elfér. A lapon a profil két napváltó-jelölővel.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #212, #218, #219, #209, #201
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `route-details.component.*`, `elevation-profile.component.*`, `elevation-profile-svg.ts` (+ spec), `assets/i18n/{hu,en}.json`
