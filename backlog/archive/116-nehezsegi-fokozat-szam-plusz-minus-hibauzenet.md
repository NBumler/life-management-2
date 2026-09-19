---
id: 116
type: change-request
status: done
title: Nehézségi fokozat input — egyedi hibaüzenet/javaslat a "szám+/-" mintára (pl. "4+")
specs:
  - "[[Nehézségi szint skálája]]"
flag:
created: 2026-09-19
closed: 2026-09-20
---

# 116 — Nehézségi fokozat input — egyedi hibaüzenet/javaslat a "szám+/-" mintára (pl. "4+")

## Motiváció / probléma

Falmászó út nehézségénél a `4+` bevitel nem fogadható el. Ez **szándékos** a jelenlegi skála-
regexek szerint: sem a Font (`^\d[A-C]\+?$` — betű kötelező A–C), sem a Francia
(`^\d[a-c]\+?$` — betű kötelező a–c), sem az UIAA (`^[IVXLCDM]+[-+]?$` — római szám kötelező)
minta nem enged puszta arab számjegy + `+`/`-` kombinációt ([[Nehézségi szint skálája]]
"Regex"). A user valószínűleg vagy az UIAA `IV+`-ra (római számmal), vagy a Francia/Font
`4a+`/`4A+`-ra (betűvel) gondolt — ez egy gyakori félregépelés, de a jelenlegi visszajelzés
csak az általános „Ismeretlen" (`UNKNOWN`) állapot (`?` badge + generikus súgó-modal), nem
mutat rá konkrétan, mi hiányzik az adott bevitelből.

## Jelenlegi működés

`shared/climbing/grade-scale.ts` `parseGrade`: `4+` egyik `SCALE_PATTERNS`-re sem illeszkedik
→ `UNKNOWN` állapot → `HelpInputComponent` súgó-ikon + `AlertController` modal a skálák
listájával + `ERROR_UNKNOWN` inline hibaüzenet ([[Nehézségi szint skálája]] "Ismeretlen"). Nincs
a bevitt string mintájára szabott (pl. "számjegy + `+`/`-`, betű vagy római szám nélkül")
speciális felismerés.

## Elfogadási kritériumok

- [x] Ha a bevitt string illeszkedik egy `^\d+[+-]$` (vagy hasonló, "arab szám + `+`/`-`, betű
      nélkül") mintára, a `parseGrade` `UNKNOWN` eredménye kapjon egy dedikált hibakódot
      (pl. `ERROR_MISSING_LETTER_OR_ROMAN`) ahelyett/mellett, hogy csak generikus `ERROR_UNKNOWN`.
- [x] Az inline hibaüzenet konkrét javítást ajánljon a `discipline` (Boulder/Köteles) alapján,
      pl.: „UIAA-ban római számmal (`IV+`), Francia/Font skálán betűvel (`4a+`/`4A+`) add meg."
- [x] A meglévő súgó-modal (`HelpInputComponent`) továbbra is elérhető ugyanerről az állapotról.
- [x] Fixture/unit teszt a `4+`, `4-`, `6+` stb. bemenetekre mindkét diszciplínán
      (`shared/climbing/grade-scale.spec.ts` mintájára).
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

`isBareNumberWithModifier` (`shared/climbing/grade-scale.ts`) ismeri fel a mintát; a
`GradeInputComponent.errorKey` a `discipline` alapján választ a két dedikált kulcs
(`ERROR_MISSING_LETTER_BOULDER` / `ERROR_MISSING_LETTER_ROPE`) között, ahelyett hogy egy
`ERROR_MISSING_LETTER_OR_ROMAN` kulcsot használna diszciplína-semlegesen — mivel a Boulder
diszciplína (`BOULDER_SCALES`) csak Font/V-skálát ismer (nincs UIAA), a Rope pedig csak
Francia/YDS/UIAA-t (nincs Font), a két hibaszöveg más-más javítást ajánl, nem ugyanazt a
mindkét formátumot felsoroló mondatot.

## Lezáráskor (on-done)

- Frissített specek: [[Nehézségi szint skálája]] — "Ismeretlen" állapot leírás kiegészítve az
  új alesettel; `verifikalt_commit` bump
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-20 — #116 dedikált hibaüzenet a "szám+/-" grade-mintára
- Kód: `frontend/src/app/shared/climbing/grade-scale.ts` (+ `.spec.ts`),
  `frontend/src/app/shared/grade-input/grade-input.component.ts` (+ `.spec.ts`); nincs
  outbox/backend hatás (pure client parser)
