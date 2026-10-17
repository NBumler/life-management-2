---
id: 129
type: bug
status: done
title: "[PRIO] Font/francia fokozat: a súgó és a hibaüzenet félrevezet (3A/4A érvénytelen), a színsáv mentése pedig csendben elnyeli a hibát"
specs:
  - "[[Nehézségi szint skálája]]"
  - "[[Indoor boulder admin]]"
  - "[[Indoor köteles admin]]"
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-25
closed: 2026-10-17
---

# 129 — [PRIO] Font/francia fokozat: félrevezető súgó és hibaüzenet + csendes mentés a színsáv-szerkesztőn

## Motiváció / probléma

Felhasználói bejelentés (Android, 2026-09-25): a Monkey Boulder teremhez nem lehetett új
színsávot felvenni (Név: Fehér, Hex: `#ffffff`, Változat: Semleges, **Alsó: `3A`, Felső: `4A`**).
**A Mentés gombra nyomva semmi sem történt.**

**Gyökérok (a user eszközön igazolta):** a `3A` és a `4A` **nem érvényes Font-fokozat**. A
Fontainebleau skálán a betű (A–C) csak **6-tól** létezik: az alsó fokozatok `3`, `4`, `5`
(a hagyományos skálán `4+`, `5+` is), utána `6A`, `6A+`, `6B`, … Ez a konverziós mátrixban is
így van (`FONT: '3', '4', '5', '6A', …`), a parser tehát helyesen utasítja el a `3A`-t. A hibát
a félrevezető UI okozta:

1. **A súgó félrevezet.** `SHARED.GRADE_INPUT.HELP_BOULDER`: „a 3, 4, 5 betű nélkül **is**
   érvényes” → azt sugallja, hogy a `3A` / `4A` is jó. Valójában 3–5-nél **csak** betű nélkül
   érvényes.
2. **A „hiányzó betű” hibaüzenet kifejezetten rossz utat mutat.**
   `SHARED.GRADE_INPUT.ERROR_MISSING_LETTER_BOULDER`: „Font skálán betű is kell a szám mellé,
   pl. **4A+**” — a `4A+` maga is érvénytelen. Ugyanez a köteles párjánál
   (`ERROR_MISSING_LETTER_ROPE`: „pl. **4a+**”; a francia mátrixban `3`, `4`, `5`, `5a`–`5c`,
   `6a`… van, `4a+` nincs).
3. **A színsáv-szerkesztő mentése csendes.** `gym-color-band-edit.page.ts` `save()` érvénytelen
   formnál vagy nem `VALID` grade-nél szó nélkül kilép. Látható hiba csak a hex mezőnél van,
   így a user nem tudja, mi a baj.

Szakmai forrás (a Font skála 3–5 betű nélkül, a betű 6-tól):
[99Boulders — Bouldering Grades](https://www.99boulders.com/bouldering-grades),
[Lacrux — Climbing scales explained](https://www.lacrux.com/en/klettern/climbing-scales-explained-uiaa-fontainebleau-v-grade-co/).

## Jelenlegi működés

- [[Nehézségi szint skálája]] / `shared/grade-input/grade-input.component.ts`: a súgó (ⓘ)
  szövege `HELP_BOULDER` / `HELP_ROPE` (`assets/i18n/{hu,en}.json`), a mező alatti hiba
  `ERROR_UNKNOWN` / `ERROR_AMBIGUOUS` / `ERROR_MISSING_LETTER_*` (`isBareNumberWithModifier`
  esetén). A hiba a 250 ms-os debounce vagy a blur után jelenik meg.
- [[Indoor boulder admin]] színsáv-szerkesztő: a `save()` érvénytelen név vagy grade esetén
  `markAllAsTouched()` után visszatér. Hibaüzenet nincs, navigáció nincs.

## Elfogadási kritériumok

- [ ] `HELP_BOULDER` (hu + en) egyértelmű: **3, 4, 5 csak betű nélkül érvényes** (nem „is”),
      6-tól kötelező a betű. Példa a súgóban: `3`, `5`, `6A`, `6B+`, `7C`.
- [ ] `HELP_ROPE` (hu + en) a francia mátrixhoz igazítva: `3`, `4` csak betű nélkül, `5`
      betű nélkül vagy `5a`–`5c`, 6-tól kötelező a betű.
- [ ] `ERROR_MISSING_LETTER_BOULDER` / `_ROPE` nem javasol érvénytelen fokozatot (a `4A+` /
      `4a+` példa kikerül). Olyan példát ad, ami ténylegesen elfogadott (pl. `6A+` / `6a+`).
- [ ] Ha 3–5 közötti számhoz betű kerül (Font: `3A`, `4A`, `5C`, …; francia: `3a`, `4b`, …),
      a mező **célzott** hibaüzenetet ad (pl. „3–5 között betű nélkül: `4`”), nem csak az
      általános „nem ismerhető fel” szöveget.
- [ ] A színsáv-szerkesztő `save()` soha nem csendes: érvénytelen névnél és alsó/felső
      fokozatnál azonnal (debounce nélkül) látható, lefordított hiba jelenik meg a mező
      alatt. Nem várt hibánál is van visszajelzés (toast), nem csak konzol.
- [ ] Ugyanez a csendes-mentés minta átnézve a többi grade-mezős admin szerkesztőn
      (indoor route, outdoor route, boulder problem). Ahol ugyanígy csendes, ott is javítva.
- [ ] Spec: [[Nehézségi szint skálája]] súgó- és hibaszöveg-leírása frissítve, [[Indoor boulder
      admin]] mentés-validáció leírva.
- [ ] Regressziós tesztek: a grade-input `3A` / `4a` célzott hibaüzenete, és a színsáv-szerkesztő
      érvénytelen grade melletti mentésénél megjelenő hiba.

## Nyitott kérdések / döntendő

- A hagyományos Font skálán a `4+` és az `5+` is létező fokozat, a mátrixban viszont nincs
  (`'3', '4', '5', '6A'`). Legyen-e felvéve? Ez mátrixváltozás és index-átsorolás, a meglévő
  adatokat is érintheti → javasolt külön jegyben, ha kell.

## Terv / döntési napló

- 2026-09-25: a user eszközön igazolta, hogy a `3A` / `4A` alsó/felső fokozat okozza a néma
  mentést. A kezdeti hipotézisek (rossz `gymId`, lista-cache, SQLite/outbox hiba, natív
  színválasztó) elvetve.

- **2026-10-17 — újraszabás a #155 után:** a #155 a Font / francia skálán 3–5 között opcionálissá
  tette a betűt (`3A`…`5C+`, `3a`…`5c+` érvényes, a súgó ezt mondja, a `4A+` / `4a+` hibaüzenet-példa
  így már valódi fokozat). A súgó / hibaüzenet / „célzott 3–5 betűs hiba” kritériumok ezzel
  **tárgytalanok**. Megmaradt rész: a csendes mentés.
- **Megoldás:** `submitAttempted` signal a négy grade-mezős admin szerkesztőn (színsáv, beltéri út,
  outdoor route, boulder probléma). Érvénytelen mentésnél: `COMMON.FIELD_REQUIRED` a név / szabad
  szöveges grade alatt; a `GradeInputComponent` új `[showRequired]` inputja az üres mezőre
  `SHARED.GRADE_INPUT.ERROR_REQUIRED`-et ad és a függő debounce-ot azonnal lefuttatja. Nem várt
  repository-hiba: `COMMON.SAVE_FAILED` toast + `console.error`, az oldal nyitva marad (eddig a
  színsávon re-throw, a többin kezeletlen promise-rejection volt).
- A nem grade-mezős climbing admin szerkesztők (gym, crag, sector) ugyanígy csendesek a kötelező
  névnél — a jegy hatókörén kívül, nem javítva.

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája]] (UI/UX: `showRequired` / `ERROR_REQUIRED`),
  [[Indoor boulder admin]], [[Indoor köteles admin]], [[Outdoor boulder admin]], [[Outdoor köteles admin]]
  (UI/UX: nem csendes mentés; Outdoor köteles: a `guidebookGrade` szabad szöveg, nem a grade-komponens)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-17 — #129 nem csendes mentés a grade-mezős climbing admin szerkesztőkön
- Kód: `shared/grade-input/grade-input.component.ts`, `pages/workout/climbing/admin/{gym-color-band,indoor-route,route,boulder-problem}-edit.page.*`, `assets/i18n/{hu,en}.json`
