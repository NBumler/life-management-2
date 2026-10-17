---
id: 166
type: feature
status: backlog
title: Indoor köteles élő session — gyors-rögzítő felület fokozatskála-választóval
specs:
  - "[[Indoor köteles napló]]"
  - "[[Mászónapló]]"
  - "[[Nehézségi szint skálája]]"
flag:
created: 2026-10-17
closed:
---

# 166 — Indoor köteles élő session — gyors-rögzítő felület fokozatskála-választóval

## Motiváció / probléma

Az indoor boulder élő session gyors-rögzítő rácsa (`backlog/122`) nagyon jól bevált: egy koppintás =
egy sikeres kísérlet, mászás közben szinte nulla gépeléssel. Indoor köteles mászásnál ugyanez
hiányzik — ott minden utat a teljes kísérletkártyán kell felvenni (út / fokozat / biztosítás / stílus),
ami élő session közben lassú.

A boulderrel ellentétben itt **nem** akarunk előre, az admin felületen utakat felvinni
([[Indoor köteles admin]] `IndoorRoute`). A gyors-rögzítő felületen egy **fokozatskála-választóból**
(rádiógomb / segment) kiválasztott skála fokozatai jelennek meg, és egy fokozat koppintása rögzít egy
kísérletet.

## Jelenlegi működés

- [[Indoor köteles napló]] `### UI/UX elvárások`: élő módban (`<ctx>/live`) a form + a meglévő
  „Új kísérlet" felvevő érhető el, **gyors-rögzítő nincs**.
- [[Indoor boulder napló]] `### UI/UX elvárások`: élő session gyors-rögzítő rács — a terem élő
  színsávjai soronként `−` / sáv (sessionbeli darabszámmal) / `+`; egy koppintás = egy **sikeres**
  kísérlet, stílus üres, rövid haptika; a kísérletek alatta kártyaként szerkeszthetők
  (`indoor-boulder-session-edit.page.html`, `quick-grid`).
- Köteles kísérlet mezői (`indoor-rope-session-edit.page.ts`): `indoorRouteId` (opcionális),
  `routeName` (szabad szöveg), `userRawInput` (fokozat — a [[Nehézségi szint skálája]] parser
  bármely köteles skálát elfogad: Francia / UIAA / YDS), `lengthInMeters` (default terem
  `defaultWallHeightMeters`), `safetyStyle` (`TOPROPE` | `LEAD`, kísérletenként; default `LEAD`),
  `isSuccess`, `ascentStyle`, `attemptCount`, `notes`.
- Fokozatlisták forrása: `shared/climbing/climbing-grade-matrix.ts` (`FRENCH` / `UIAA` / `YDS` sorok).

## Elfogadási kritériumok

- [ ] Az [[Indoor köteles napló]] **élő** módjában (csak ott, ahogy bouldernél) megjelenik egy
      gyors-rögzítő blokk a kísérletkártyák fölött.
- [ ] **Skálaválasztó** rádió-segment: Francia / UIAA / YDS. Sessionön belül bármikor átváltható; a
      váltás csak a következő koppintásokat érinti, a már rögzített kísérletek fokozata változatlan
      (egy sessionben vegyesen lehet UIAA és francia fokozatú út).
- [ ] **Biztosítás** rádió-segment: Toprope / Lead. Sessionön belül bármikor átváltható, csak a
      következő koppintásokat érinti.
- [ ] A kiválasztott skála fokozatai kompakt, áttekinthető rácsban (pl. egy sor = egy fő fok:
      `6a 6a+ 6b 6b+ 6c 6c+`, ill. `VI- VI VI+`), növekvő nehézség szerint; minden fokozat-gombon a
      sessionbeli darabszám (mint a boulder sávoknál), ha > 0.
- [ ] Egy fokozat koppintása = egy új kísérlet, rövid haptikával:
  - `userRawInput` = a koppintott fokozat (a meglévő grade-mező / parser tölti ki az indexet, ahogy
    kézi bevitelnél),
  - `routeName` = `<terem neve> <n>`, ahol `n` 0-tól induló, a sessionben folyamatosan növekvő sorszám
    (pl. `Mászóház 0`, `Mászóház 1`, …),
  - `isSuccess` = `true`, `ascentStyle` üres (mint bouldernél),
  - `safetyStyle` = a választott biztosítás,
  - `lengthInMeters` = a meglévő default (terem falmagasság), `indoorRouteId` = `null`.
- [ ] Terem nélkül figyelmeztetés (mint bouldernél `QUICK_NEEDS_GYM`); a rögzítés tiltott, amíg nincs
      terem.
- [ ] A gyorsan rögzített kísérletek alatta a megszokott kártyaként teljesen szerkeszthetők (pl.
      sikertelenre állítás, név / fokozat / biztosítás javítása, törlés).
- [ ] A skála- és biztosítás-választás az élő draft része (`ClimbingLiveDraft` form-pillanatkép), így
      app-kill / újraindítás után helyreáll; minden gyors-koppintás után autosave, mint bouldernél.
- [ ] Nincs új szinkronizált mező / backend / outbox-séma változás (minden a meglévő kísérlet-mezőkre
      képeződik le); `verify:outbox` zöld.
- [ ] Tesztek: koppintás → helyes kísérlet (név-index, fokozat, biztosítás, siker); skála- és
      biztosításváltás csak az új kísérleteket érinti; terem nélküli tiltás; draft-helyreállítás.
- [ ] Spec frissítés: [[Indoor köteles napló]] `### UI/UX elvárások` + [[Mászónapló]] élő session
      bekezdés („Beltéri bouldernél gyors-rögzítő rács" → kötélre is).

## Terv / döntési napló

- **Best effort kiindulás** — a pontos elrendezést használat közben finomítjuk; a cél a legkényelmesebb,
  legkompaktabb, legátláthatóbb első változat. A boulder `quick-grid` mintáját (stílus, haptika,
  darabszám, autosave-hook) érdemes újrahasznosítani, nem újat kitalálni.
- **Nincs `IndoorRoute` kötés** — a gyors-rögzítés szándékosan ad-hoc nevű kísérletet hoz létre; az
  admin útlista továbbra is a teljes kártyán választható. Emiatt a [[Mászónapló]] `ascentStyle`
  korábbi-megmászás figyelmeztetés itt nem releváns (nincs útazonosító).
- **Név-index** — javasolt: `n` = a sessionben addig gyors-rögzítéssel létrehozott kísérletek száma
  (törlés után nem számozunk újra, a név csak előtöltés). Implementáláskor eldöntendő, hogy az összes
  sessionbeli kísérletből vagy csak a gyors-rögzítésekből számoljunk.
- **Alapértékek** — skála: Francia, biztosítás: Lead (a köteles form meglévő defaultja). Lehetséges
  finomítás később: az utoljára használt skála / biztosítás megjegyzése sessionök között.
- **Fokozat-tartomány** — első körben a mátrix teljes köteles listája az adott skálán; ha túl hosszú,
  később szűkíthető (pl. a user szintje körüli sávra, vagy a szélső sorok összecsukására).
- **Fokozat-skála kanonikus alakja** — a gombok a mátrix kanonikus jelölését használják (pl. UIAA
  `VI-`), hogy a parser egyértelműen, `VALID`-ként ismerje fel.

## Lezáráskor (on-done)

- Frissített specek: [[…]] — melyik szakasz, egy sor mit változott
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
