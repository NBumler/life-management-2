---
id: 120
type: change-request
status: ready
title: Mászó session — „Új kísérlet" gomb a kísérletlista alján is
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
  - "[[Indoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Outdoor köteles napló]]"
flag:
created: 2026-09-24
closed:
---

# 120 — Mászó session — „Új kísérlet" gomb a kísérletlista alján is

## Motiváció / probléma

Hosszabb sessionnél a kísérletkártyák lista hosszú lesz, és új kísérlet felvételéhez minden
alkalommal vissza kell görgetni a lista tetejére.

## Jelenlegi működés

A négy session-szerkesztő oldalon (`pages/workout/climbing/naplo/{indoor,outdoor}-{boulder,rope}-session-edit.page.html`)
az `addAttempt()` gomb (`WORKOUT.CLIMBING.SESSION.ADD_ATTEMPT`) csak a „Kísérletek" szakasz
fejlécében van, a lista felett.

## Elfogadási kritériumok

- [ ] Mind a 4 kontextusban a kísérletlista **utolsó kártyája után** is megjelenik egy „Új kísérlet"
      gomb (ugyanaz az `addAttempt()` akció); a felső gomb megmarad.
- [ ] Az alsó gomb csak akkor jelenik meg, ha már van legalább 1 kísérlet (üres listánál a felső
      elég — duplikált gomb ne legyen egymás alatt).
- [ ] Új kísérlet hozzáadása után a nézet az új kártyához görget (alsó gombnál ez természetes,
      felsőnél javasolt).
- [ ] Spec-tesztek mind a 4 oldalra; zöld lint + test:ci + build.

## Terv / döntési napló

_Nincs. Kapcsolódik: #122-ben tervezett élő session felület, amely saját gyors-rögzítő UI-t kap._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] (`### UI/UX elvárások`), a 4 napló-spec
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
