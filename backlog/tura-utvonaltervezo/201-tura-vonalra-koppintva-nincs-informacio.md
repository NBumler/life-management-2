---
id: 201
type: feature
status: backlog
title: Túra — egy vonalra koppintva nem derül ki, melyik turistaút vagy útvonal az
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 201 — Túra — egy vonalra koppintva nem derül ki, melyik turistaút vagy útvonal az

## Motiváció / probléma

A térképen nem lehet megtudni egy vonalról, hogy milyen jelzés, melyik túraútvonal része, vagy hogy az egy saját mentett útvonal-e.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `map.on('click')` csak Rajzolás / Automatikus módban csinál valamit; alapállapotban a koppintás hatástalan.
- A `TrailSegment` csak `symbol`-t hordoz (név / reláció nélkül).

## Elfogadási kritériumok

- [ ] Alapállapotban egy turistaút-szakaszra koppintva kártya / popup jelenik meg a jelzés nevével (pl. „Kék sáv”), és ha elérhető, a túraútvonal nevével.
- [ ] Saját mentett útvonalra koppintva a [[212-tura-mentett-utvonal-megnyitasa-csak-odarepul]] részletnézete nyílik.
- [ ] Rajzolás / Automatikus módban a koppintás továbbra is pontot tesz le (nincs ütközés).
- [ ] Ha a reláció neve kell: az import és a `TrailSegment` séma bővítése (Flyway + OpenAPI + build asset) — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #201
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, esetleg `scripts/import-hiking-trails.mjs`, `TrailSegment` séma
