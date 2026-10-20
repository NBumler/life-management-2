---
id: 206
type: change-request
status: done
title: Túra — a Rajzolás és az Automatikus mód közti különbség és az aktív mód nem érthető
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 206 — Túra — a Rajzolás és az Automatikus mód közti különbség és az aktív mód nem érthető

## Motiváció / probléma

A felhasználó nem tudja, mi a különbség a két mód között, mikor melyik aktív, és mit vár tőle az app.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- Automatikus módban tippsáv van („Válaszd ki a kezdőpontot / végpontot a térképen.”), Rajzolásnál nincs.
- Az aktív mód sötétszürke kitöltést kap (`fill="solid"`), ami nem a kiemelő szín.
- Az Automatikus mód egy sikeres tervezés után szó nélkül kikapcsol; Rajzolás bekapcsolva marad.
- Rajzolás közben a pontok egyenes vonallal kötődnek, ezt semmi nem mondja.

## Elfogadási kritériumok

- [x] Mindkét módnak van rövid tippje (Rajzolás: „Koppints a térképre pontok lerakásához — egyenes szakaszok”; Automatikus: a mai szöveg) hu + en.
- [x] Az aktív mód egyértelműen kiemelt (szín, és pl. a tippsávban a mód neve).
- [x] A mód kilépése következetes: vagy mindkettő bekapcsolva marad, amíg ki nem kapcsolod, vagy mindkettő jelzi, hogy kilépett — döntés a naplóban.
- [x] Megfontolva a megnevezés (pl. „Kézi” / „Turistaúton”) — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés: a felhasználó két ASCII-vázlat (alapállapot nyitott „Továbbiak” menüvel; Kézi mód piszkozattal) alapján jóváhagyta az elrendezést, a „Kézi” / „Turistaúton” elnevezést és hogy mindkét mód bekapcsolva marad.
- 2026-10-20 — megnevezés: „Kézi” / „Turistaúton” (en: „Manual” / „On trails”). Az aktív mód gombja a kiemelő (primary) színt kapja, és a kártya a mód nevével kezdődik („Kézi mód”, „Turistaúton mód”), utána a tipp: Kézi — „Koppints a térképre pontok lerakásához — egyenes szakaszok.”; Turistaúton — kezdőpont / végpont / „Koppints a következő pontra — az útvonal turistautakon folytatódik odáig.”
- 2026-10-20 — kilépés: mindkét mód bekapcsolva marad, amíg ki nem kapcsolod, nem mentesz, nem veszel át egy ajánlott túrát vagy nem nyitsz meg egy előnézetet. A Turistaúton mód egy meglévő vonalat a végétől folytat (`withPath` a `route-draft.ts`-ben — korábban egy újabb tervezés lecserélte a piszkozatot); sikertelen tervezésnél is bekapcsolva marad (a hibaüzenet javítása a #221). Emulátoron: Kézi rajz után Turistaúton módban egy koppintás a vonal végétől tervezett tovább, a mód aktív maradt.
- Unit teszt: `route-draft.spec.ts` (`withPath`), `auto-route-hint.component.spec.ts` (`next` lépés).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #204, #205, #206, #210
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `auto-route-hint.component.ts` (+ spec), `route-draft.ts` (+ spec), `src/global.scss`, `core/config/icons.ts`, `assets/i18n/{hu,en}.json`
