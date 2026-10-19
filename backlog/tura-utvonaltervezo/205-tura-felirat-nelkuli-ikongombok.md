---
id: 205
type: change-request
status: backlog
title: Túra — a visszavonás, kuka, rétegek és offline gombnak nincs felirata
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 205 — Túra — a visszavonás, kuka, rétegek és offline gombnak nincs felirata

## Motiváció / probléma

Négy gomb csak ikonként jelenik meg. A felhő ikonról nem derül ki, hogy offline letöltés; a kukáról, hogy a teljes piszkozatot törli; a rétegek ikon sem egyértelmű.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `arrow-undo-outline`, `trash-outline`, `layers-outline`, `cloud-download-outline` — `slot="icon-only"`, csak `aria-label`.

## Elfogadási kritériumok

- [ ] Minden gomb funkciója felirattal vagy legalább hosszú nyomásra / első használatkor megjelenő magyarázattal kiderül (hu + en).
- [ ] A [[204-tura-fejlec-tul-magas-gombsorok-kilognak]] átrendezésével összehangolva.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #205
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`
