---
id: 199
type: change-request
status: backlog
title: Túra — az „egyéb” jelzésű szakaszok vastag szürke vonala uralja a térképet
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 199 — Túra — az „egyéb” jelzésű szakaszok vastag szürke vonala uralja a térképet

## Motiváció / probléma

A szakaszok kb. 40%-a `EGYEB` (90 774 / ~230 000). Ezek ugyanolyan vastag (3 px) vonalak, mint a jelzett utak, lakóutcákon is átmennek (pl. Makkosmária, Budakeszi), és eltakarják az alaptérkép feliratait — a térkép zsúfolt, a fontos jelzett utak elvesznek.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `tura.page.ts` `trail-segments` réteg: `line-width: 3` minden szakaszra, szín a jelzésből, ismeretlen → `#757575`.
- Az `EGYEB` az importban (`scripts/import-hiking-trails.mjs` `symbolFromTags`) minden olyan reláció, amelynek nincs értelmezhető `osmc:symbol` / `symbol:hu` tagje.

## Elfogadási kritériumok

- [ ] Az `EGYEB` szakaszok vékonyabb és / vagy halványabb vonalat kapnak, vagy külön kapcsolóval elrejthetők (Rétegek panel).
- [ ] A turistaút-réteg a feliratok alatt rajzolódik, vagy átlátszósággal nem takarja őket (amennyire a raszteres alaptérképpel megoldható — döntés a naplóban).
- [ ] Megvizsgálva, hogy az `EGYEB` kategória tényleg turistaút-e (pl. mely relációk adják a lakóutcás szakaszokat); ha nem, az import szűrje ki őket.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #199
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, esetleg `scripts/import-hiking-trails.mjs`
