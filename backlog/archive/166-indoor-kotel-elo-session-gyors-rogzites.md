---
id: 166
type: feature
status: done
title: Indoor köteles élő session — gyors-rögzítő felület fokozatskála-választóval
specs:
  - "[[Indoor köteles napló]]"
  - "[[Mászónapló]]"
  - "[[Nehézségi szint skálája]]"
flag:
created: 2026-10-17
closed: 2026-10-17
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

- [x] Az [[Indoor köteles napló]] **élő** módjában (csak ott, ahogy bouldernél) megjelenik egy
      gyors-rögzítő blokk a kísérletkártyák fölött.
- [x] **Skálaválasztó** rádió-segment: Francia / UIAA / YDS. Sessionön belül bármikor átváltható; a
      váltás csak a következő koppintásokat érinti, a már rögzített kísérletek fokozata változatlan
      (egy sessionben vegyesen lehet UIAA és francia fokozatú út).
- [x] **Biztosítás** rádió-segment: Toprope / Lead. Sessionön belül bármikor átváltható, csak a
      következő koppintásokat érinti.
- [x] A kiválasztott skála fokozatai kompakt, áttekinthető rácsban (pl. egy sor = egy fő fok:
      `6a 6a+ 6b 6b+ 6c 6c+`, ill. `VI- VI VI+`), növekvő nehézség szerint; minden fokozat-gombon a
      sessionbeli darabszám (mint a boulder sávoknál), ha > 0.
- [x] Egy fokozat koppintása = egy új kísérlet, rövid haptikával:
  - `userRawInput` = a koppintott fokozat (a meglévő grade-mező / parser tölti ki az indexet, ahogy
    kézi bevitelnél),
  - `routeName` = `<terem neve> <n>`, ahol `n` 1-től induló sorszám = a session kísérleteinek száma a
    koppintás után (pl. `Mászóház 1`, `Mászóház 2`, …),
  - `isSuccess` = `true`, `ascentStyle` üres (mint bouldernél),
  - `safetyStyle` = a választott biztosítás,
  - `lengthInMeters` = a meglévő default (terem falmagasság), `indoorRouteId` = `null`.
- [x] Terem nélkül figyelmeztetés (mint bouldernél `QUICK_NEEDS_GYM`); a rögzítés tiltott, amíg nincs
      terem.
- [x] A gyorsan rögzített kísérletek alatta a megszokott kártyaként teljesen szerkeszthetők (pl.
      sikertelenre állítás, név / fokozat / biztosítás javítása, törlés).
- [x] A skála- és biztosítás-választás az élő draft része (`ClimbingLiveDraft` form-pillanatkép), így
      app-kill / újraindítás után helyreáll; minden gyors-koppintás után autosave, mint bouldernél.
- [x] Nincs új szinkronizált mező / backend / outbox-séma változás (minden a meglévő kísérlet-mezőkre
      képeződik le); `verify:outbox` zöld.
- [x] Tesztek: koppintás → helyes kísérlet (név-index, fokozat, biztosítás, siker); skála- és
      biztosításváltás csak az új kísérleteket érinti; terem nélküli tiltás; draft-helyreállítás.
- [x] Spec frissítés: [[Indoor köteles napló]] `### UI/UX elvárások` + [[Mászónapló]] élő session
      bekezdés („Beltéri bouldernél gyors-rögzítő rács" → kötélre is).

## Terv / döntési napló

- **Best effort kiindulás** — a pontos elrendezést használat közben finomítjuk; a cél a legkényelmesebb,
  legkompaktabb, legátláthatóbb első változat. A boulder `quick-grid` mintáját (stílus, haptika,
  darabszám, autosave-hook) érdemes újrahasznosítani, nem újat kitalálni.
- **Nincs `IndoorRoute` kötés** — a gyors-rögzítés szándékosan ad-hoc nevű kísérletet hoz létre; az
  admin útlista továbbra is a teljes kártyán választható. Emiatt a [[Mászónapló]] `ascentStyle`
  korábbi-megmászás figyelmeztetés itt nem releváns (nincs útazonosító).
- **Név-sorszám** (döntés, 2026-10-17) — **1-től** indul. Hogy miből számol, a user szerint mindegy;
  a legegyszerűbbet választjuk: `n` = a session kísérleteinek száma a koppintás után (kézi kísérletek
  is beleszámítanak; törlés után nem számozunk újra — a név csak előtöltés, ütközés nem gond).
- **Alapértékek** — skála: Francia, biztosítás: Lead (a köteles form meglévő defaultja). Lehetséges
  finomítás később: az utoljára használt skála / biztosítás megjegyzése sessionök között.
- **Fokozat-tartomány** (döntés, 2026-10-17) — első körben a mátrix **teljes** köteles listája az
  adott skálán; ha túl hosszú, később szűkíthető (pl. a user szintje körüli sávra, vagy a szélső sorok
  összecsukására) — az külön jegy.
- **Fokozat-skála kanonikus alakja** — a gombok a mátrix kanonikus jelölését használják (pl. UIAA
  `VI-`), hogy a parser egyértelműen, `VALID`-ként ismerje fel.

### Implementációs terv (2026-10-17)

Tisztán frontend; backend / OpenAPI / Flyway / natív SQLite / outbox-séma érintetlen.

1. **Fokozatlista helper** — `shared/climbing/climbing-grade-matrix.ts`:
   `ropeQuickGradeRows(scale: 'FRENCH' | 'UIAA' | 'YDS'): string[][]` (pure, unit-tesztelt).
   - Forrás: `CLIMBING_GRADE_MATRIX[scale]` kulcsai, **index szerint rendezve** (stabil, a matrix
     sorrendjével azonos index esetén). Figyelem: a JS objektum az egész-szerű kulcsokat (`'3'`, `'4'`,
     `'5'`) előre veszi, ezért nem lehet a beszúrási sorrendre hagyatkozni.
   - A francia csupasz `3` / `4` / `5` alias (a `3b` / `4b` / `5a` mellett) kimarad, hogy ne legyen
     duplikált gomb.
   - Sorokra bontás fő fok szerint: Francia → vezető számjegy (`6a … 6c+`); UIAA → a római alap
     (`VI- VI VI+`); YDS → `5.4 … 5.9` egy sor, utána `5.10a–d`, `5.11a–d`, ….
   - Minden címke a parser szerint `VALID` és a mátrix szerinti indexre old fel — spec-teszt
     mindhárom skála teljes listájára (`parseGrade(label, 'ROPE')`).
2. **Rope oldal állapot** — `indoor-rope-session-edit.page.ts`:
   - `quickScale = signal<'FRENCH' | 'UIAA' | 'YDS'>('FRENCH')`,
     `quickSafety = signal<SafetyStyleEnum>(…)`: default `LEAD`, de ha a terem
     `availableSafetyStyles` szűkít, a `safetyStyleOptions()` első eleme; a segment is csak ezeket
     kínálja (egy opciónál a segment rejtett).
   - `quickRows = computed(() => ropeQuickGradeRows(this.quickScale()))`.
   - `gradeCounts = computed(...)` (az `attemptsRevision`-re is figyel, mint a boulder `bandCounts`):
     `normalizeGradeInput(row.userRawInput(), 'ROPE')` → darab.
   - `quickRecord(grade: string)`: terem nélkül no-op; `emptyRow()` +
     `userRawInput = grade`, `routeName = \`${gym.name} ${attempts().length + 1}\``,
     `isSuccess = true`, `safetyStyle = quickSafety()`; hozzáfűzés, `touchAttempts()`,
     `Haptics.impact(Light)`, `live.autosave()` — a boulder `quickRecord` tükre.
     `lengthInMeters` null marad → a meglévő `resolveLength()` a falmagasságot adja.
3. **Skála / biztosítás helyreállítása app-kill után** — javaslat: **a draftból levezetni**, nem
   új mezőt perzisztálni. `resume()` után: `quickSafety` = az utolsó kísérlet `safetyStyle`-ja,
   `quickScale` = az utolsó `VALID` parse-ú kísérlet skálája (`parseGrade(...).scale`), ha nincs →
   default. Így a `ClimbingLiveDraft` / `ClimbingLiveSessionService` / autosave-diff érintetlen.
   Korlát: ha valaki átvált, de még nem koppint, és közben megölik az appot, a váltás elveszik —
   ez elfogadhatónak tűnik (alternatíva: opcionális `quick?: { scale, safetyStyle }` mező a
   `ClimbingLiveDraft`-ba + az autosave-diff kiterjesztése).
4. **Template** — `indoor-rope-session-edit.page.html`, a kísérletek fejléce fölött,
   `@if (live.isLive && !live.summary())` (mint bouldernél):
   - cím `WORKOUT.CLIMBING.LIVE.QUICK_TITLE`;
   - két `ion-segment` egymás alatt (vagy kis kijelzőn egy sorban, ha elfér): Francia / UIAA / YDS és
     Toprope / Lead (meglévő `WORKOUT.CLIMBING.SAFETY.*` címkék);
   - terem nélkül `ion-note` figyelmeztetés (új kulcs `QUICK_NEEDS_ROPE_GYM` — a meglévő
     `QUICK_NEEDS_GYM` színsávot említ), a rács ilyenkor rejtett;
   - rács: soronként flex-wrap kis `ion-button`-ok (`fill="outline"`, `size="small"`), gombon a
     fokozat + > 0 esetén a darabszám badge; `data-grade` attribútum a tesztekhez.
5. **Stílus** — a boulder `quick-grid` / `quick-count` stílusainak átvétele; a gombok egyenlő
   minimális szélességűek, hogy oszlopba rendeződjenek (360 px-en egy francia sor = 6 gomb).
6. **i18n** — `hu.json` / `en.json`: `LIVE.QUICK_SCALE` („Skála"), `LIVE.QUICK_SAFETY`
   („Biztosítás"), `LIVE.QUICK_NEEDS_ROPE_GYM`, skálanevek (`FRENCH` / `UIAA` / `YDS` — ha még nincs
   kulcsuk).
7. **Tesztek** — `climbing-grade-matrix.spec.ts` (sorrend, alias-kihagyás, sorbontás, minden címke
   VALID); `indoor-rope-session-edit.page.spec.ts`: koppintás → kísérlet (`Terem 1`, `Terem 2`,
   fokozat, siker, biztosítás, hossz = falmagasság); skála- és biztosításváltás csak az újakat
   érinti; terem nélküli no-op; darabszám; resume utáni levezetett skála / biztosítás; a rács csak
   élő, nem-összegző módban látszik.
8. **Kézi ellenőrzés** — böngészőben 360 px (Galaxy A55) élő köteles session: rács-elrendezés,
   váltások, kártya-szerkesztés, összegző → mentés.
9. **Lezárás** — zöld gate (`test:ci`, `lint`, `build`, `verify:outbox`), spec-frissítés
   ([[Indoor köteles napló]] UI/UX, [[Mászónapló]] élő session bekezdés, [[Nehézségi szint skálája]]
   megjegyzés a gyors-rács fokozatlistáról), `IMPLEMENTATION_STATUS.md` sor, jegy archiválás.

## Lezáráskor (on-done)

- Frissített specek: [[Indoor köteles napló]] — `### UI/UX elvárások`: élő gyors-rögzítő rács (skála + biztosítás, fokozatrács, koppintás → kísérlet); [[Mászónapló]] — élő felület bekezdés: kötélre is van gyors-rács; [[Nehézségi szint skálája]] — `### Megjegyzések`: a rács fokozatlistájának forrása
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #166 indoor köteles élő session gyors-rögzítés
- Kód: `pages/workout/climbing/naplo/indoor-rope-session-edit.page.*`, `shared/climbing/climbing-grade-matrix.ts` (`ropeQuickGradeRows`), i18n `WORKOUT.CLIMBING.LIVE.QUICK_*`
