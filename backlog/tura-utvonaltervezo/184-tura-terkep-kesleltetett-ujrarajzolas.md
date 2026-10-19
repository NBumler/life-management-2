---
id: 184
type: bug
status: blocked
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

- [x] A [[180-tura-turistaut-szakaszok-korlatlan-betoltese]] és a [[181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf]] után újramérve emulátoron.
- [ ] Valódi telefonon ellenőrizve: rajzolás és automatikus tervezés után a vonal érintés nélkül, < 1 s alatt megjelenik.
- [x] Ha továbbra is fennáll: ok feltárva és javítva (pl. `triggerRepaint` a `setData` után), vagy emulátor-specifikusnak minősítve és a jegy lezárva a mérésekkel.

## Terv / döntési napló

- Előfeltétel: valódi eszközös teszt.
- 2026-10-19 — újramérés a #180/#181 után (emulátor, repülőgép mód): az automatikus útvonal
  vonala ~2–3 s-on belül, érintés nélkül kirajzolódott. A metrika-sáv megjelenésekor a térkép
  egy képkockára üres volt (a vászon átméreteződik) — valószínűleg a
  [[192-tura-terkep-megnyitaskor-alulmeretezett]] rokona. A valódi telefonos kritérium nyitott.
- 2026-10-19 — újramérés a teljes emulátoros kör (#180–#193) után, mérőeszközzel: a WebView
  `drawElements` / `drawArrays` hívásait időbélyegezve (CDP), a koppintást CDP touch-eseménnyel küldve.
  - Kézi rajzolás, 6 pont: a `click` után a térkép **30–100 ms** alatt újrarajzol (az első pontnál egyszer
    ~0,8 s). Minden pont érintés nélkül megjelent.
  - Automatikus tervezés (Jánoshegy → Zugliget, 2,5 km, online): a tervezés ~4 s (töltésjelzővel, #182),
    utána azonnal újrarajzol; a vonal érintés nélkül megjelent.
  - Következtetés: a térkép nem késik — a `setData` utáni újrarajzolás azonnali, `triggerRepaint` nem kell,
    kód nem változott. Az eredeti 3–9 s jórészt a mérésből jött: az emulátoron egy `adb screencap`
    1,5–6 s-ig tart, így a képernyőkép-sorozat időzítése nem a rajzolást mérte; a 40 s-os esetet pedig a
    #180 előtti óriási `trail-segments` `setData` okozhatta.
  - Mellékmegfigyelés, nem ennek a jegynek a tárgya: telepítés utáni első hidegindításnál az emulátoron
    ~40 s splash és egy „nem válaszol” dialógus (`Choreographer: Skipped 245 frames`); a második indítás
    normális volt.
- Nyitva marad: a valódi telefonos kritérium. A jegy `blocked` — ok: jelenleg nincs telefon a teszthez;
  feloldás: egy rajzolás + egy automatikus tervezés valódi eszközön, és ha < 1 s, a jegy lezárható.

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #184
- Kód: <fő fájlok>
