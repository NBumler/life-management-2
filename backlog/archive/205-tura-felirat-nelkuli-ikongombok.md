---
id: 205
type: change-request
status: done
title: Túra — a visszavonás, kuka, rétegek és offline gombnak nincs felirata
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 205 — Túra — a visszavonás, kuka, rétegek és offline gombnak nincs felirata

## Motiváció / probléma

Négy gomb csak ikonként jelenik meg. A felhő ikonról nem derül ki, hogy offline letöltés; a kukáról, hogy a teljes piszkozatot törli; a rétegek ikon sem egyértelmű.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `arrow-undo-outline`, `trash-outline`, `layers-outline`, `cloud-download-outline` — `slot="icon-only"`, csak `aria-label`.

## Elfogadási kritériumok

- [x] Minden gomb funkciója felirattal vagy legalább hosszú nyomásra / első használatkor megjelenő magyarázattal kiderül (hu + en).
- [x] A [[204-tura-fejlec-tul-magas-gombsorok-kilognak]] átrendezésével összehangolva.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés: a felhasználó két ASCII-vázlat (alapállapot nyitott „Továbbiak” menüvel; Kézi mód piszkozattal) alapján jóváhagyta az elrendezést, a „Kézi” / „Turistaúton” elnevezést és hogy mindkét mód bekapcsolva marad.
- 2026-10-20 — a Visszavonás és a Törlés a mód-sávban ikonnal és felirattal; a Rétegek lebegő, feliratos gomb; az offline letöltés a „Továbbiak” menü feliratos eleme („Offline területek”). Ikon-only gomb csak az előnézet ✕ maradt, `aria-label`-lel. hu + en emulátoron ellenőrizve.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #204, #205, #206, #210
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `auto-route-hint.component.ts` (+ spec), `route-draft.ts` (+ spec), `src/global.scss`, `core/config/icons.ts`, `assets/i18n/{hu,en}.json`
