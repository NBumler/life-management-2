---
id: 184
type: bug
status: backlog
title: Túra — a térkép késve (vagy csak érintésre) rajzolja ki az új útvonalat
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 184 — Túra — a térkép késve (vagy csak érintésre) rajzolja ki az új útvonalat

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). Kézi rajzolásnál a pontok 3–9 s késéssel jelentek meg; egy online automatikus
tervezésnél a táv / profil megjött, de a vonal 40 s után sem rajzolódott ki — egy apró
térkép-mozdítás után azonnal megjelent. A `requestAnimationFrame` tétlen állapotban 60 fps-sel fut
(CDP-vel mérve), a `setData` hívás szabványos. Az emulátor WebGL-je egy régi GPU-n futó
fordítóréteg („Android Emulator OpenGL ES Translator (NVIDIA GeForce 930M)”), ami önmagában is
okozhatja; és a [[180-tura-turistaut-szakaszok-korlatlan-betoltese]] miatti óriási
`trail-segments` `setData` a MapLibre workerét is terheli.

## Jelenlegi működés

`tura.page.ts` konstruktor-effektjei `GeoJSONSource.setData`-val frissítik a draft-vonal,
draft-pontok, auto-start és előnézet forrásait; kifejezett `triggerRepaint` nincs.

## Elfogadási kritériumok

- [ ] A [[180-tura-turistaut-szakaszok-korlatlan-betoltese]] és a [[181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf]] után újramérve emulátoron.
- [ ] Valódi telefonon ellenőrizve: rajzolás és automatikus tervezés után a vonal érintés nélkül, < 1 s alatt megjelenik.
- [ ] Ha továbbra is fennáll: ok feltárva és javítva (pl. `triggerRepaint` a `setData` után), vagy emulátor-specifikusnak minősítve és a jegy lezárva a mérésekkel.

## Terv / döntési napló

- Előfeltétel: valódi eszközös teszt.
- 2026-10-19 — újramérés a #180/#181 után (emulátor, repülőgép mód): az automatikus útvonal
  vonala ~2–3 s-on belül, érintés nélkül kirajzolódott. A metrika-sáv megjelenésekor a térkép
  egy képkockára üres volt (a vászon átméreteződik) — valószínűleg a
  [[192-tura-terkep-megnyitaskor-alulmeretezett]] rokona. A valódi telefonos kritérium nyitott.

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #184
- Kód: <fő fájlok>
