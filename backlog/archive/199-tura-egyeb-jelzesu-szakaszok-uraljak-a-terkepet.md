---
id: 199
type: change-request
status: done
title: Túra — az „egyéb” jelzésű szakaszok vastag szürke vonala uralja a térképet
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 199 — Túra — az „egyéb” jelzésű szakaszok vastag szürke vonala uralja a térképet

## Motiváció / probléma

A szakaszok kb. 40%-a `EGYEB` (90 774 / ~230 000). Ezek ugyanolyan vastag (3 px) vonalak, mint a jelzett utak, lakóutcákon is átmennek (pl. Makkosmária, Budakeszi), és eltakarják az alaptérkép feliratait — a térkép zsúfolt, a fontos jelzett utak elvesznek.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `tura.page.ts` `trail-segments` réteg: `line-width: 3` minden szakaszra, szín a jelzésből, ismeretlen → `#757575`.
- Az `EGYEB` az importban (`scripts/import-hiking-trails.mjs` `symbolFromTags`) minden olyan reláció, amelynek nincs értelmezhető `osmc:symbol` / `symbol:hu` tagje.

## Elfogadási kritériumok

- [x] Az `EGYEB` szakaszok vékonyabb és / vagy halványabb vonalat kapnak, vagy külön kapcsolóval elrejthetők (Rétegek panel).
- [x] A turistaút-réteg a feliratok alatt rajzolódik, vagy átlátszósággal nem takarja őket (amennyire a raszteres alaptérképpel megoldható — döntés a naplóban).
- [x] Megvizsgálva, hogy az `EGYEB` kategória tényleg turistaút-e (pl. mely relációk adják a lakóutcás szakaszokat); ha nem, az import szűrje ki őket.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — mérés (Overpass, Budapest–Pilis bbox 47,40–47,85 / 18,70–19,15): 436 `route=hiking` relációból 90 lett `EGYEB` (országosan a 230 ezer szakasz 39%-a). Ezek nagyrészt **jelzett** utak voltak, amelyeket az import nem ismert fel: barlang (Ω, `arch`), rom (L), kilátó (`turned_T`), templom / kápolna, emlékmű, menedékház alakzat, illetve betűjeles jelzés (T tanösvény, M Mária út, P Pálos út, MZ Magyar Zarándokút). A maradék ~30-nak nincs se `osmc:symbol`, se `symbol:hu` tagje (E4 / Mária út `iwn` reláció jelzés nélkül, jelöletlen helyi tanösvények), de valódi túrautak.
- 2026-10-20 — döntés (a mérés alapján eltér a tervtől): **nem szűrjük ki** őket. Az import (`symbolFromTags`) az előtér-token színét veszi (az útszín gyakran csak általános `black`), felismeri a helyi alakzatokat, a `symbol:hu`-t, végül a szöveg-mező betűjelét / `<SZÍN>_JEL`-t — a Pilis-mintán az `EGYEB` 90 → 30. A maradék jelzés nélküli út vékony (1,5 px), halvány szürke vonal a jelzett utak alatt, a Rétegek panelen kikapcsolható („Jelzés nélküli utak”, a választás megmarad).
- 2026-10-20 — a raszteres alaptérkép feliratai alá a turistaút-réteg nem kerülhet (a felirat a csempe része); tudatos korlát — a jelzés nélküli réteg ezért félig átlátszó, a jelzett vonalak 3 px-esek.
- 2026-10-20 — újraimport a felhasználó engedélyével (a futó backenden át, bootRun-újraindítás nélkül; a gráf-asset nem tárol jelzést, nem kellett újragenerálni): két futás. Az első (13 perc 43 mp) után az országos eloszlásban a fehér 2,7 ezerről 30,7 ezer szakaszra nőtt: a bbox a határon túli osztrák / szlovén utakat is tartalmazza, amelyek piros-fehér-piros jelzése `red:red:white_bar` — a fehér előtér nem a vonal színe. Javítás: fehér előtérnél az útszín, majd a háttér dönt. A második futás (11 perc 27 mp, 6437 reláció, 232 561 szakasz, hiba nélkül) után: PIROS 61 601, KEK 55 997, ZOLD 34 978, SARGA 34 072, **EGYEB 31 434** (korábban 90 774, 39% → 13,5%), LILA 7017, FEKETE 3067, NARANCS 2864, FEHER 1501, BARNA 30. Emulátoron a Pilis 12,6-es zoomon alig mutat szürke vonalat.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #196, #197, #198, #199, #200, #202, #203
- Kód: `scripts/import-hiking-trails.mjs`, `frontend/src/app/pages/menu/tura/tura.page.ts|html`, `core/data/tura-local-state.service.ts` (+ spec)
