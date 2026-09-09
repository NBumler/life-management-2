---
id: 98
type: bug
status: done
title: Edzés — a gyakorlat-picker modal nem tölti ki a teljes magasságot (a lista egy-két sorra zsugorodik)
specs:
  - "[[Edzésnapló]]"
  - "[[Heti terv]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 98 — Edzés — a gyakorlat-picker modal nem tölti ki a teljes magasságot (a lista egy-két sorra zsugorodik)

## Motiváció / probléma

Bejelentett tünet: edzéssablon (`WorkoutPlan`) szerkesztésekor a „gyakorlat hozzáadása" ablakban
a lista **üresnek tűnik**, keresésre / szűrőre is.

Tényleges hiba (a bejelentő web-en és Androidon is megnézte): a lista **nem üres** — a
`app-exercise-picker` komponens maga volt annyira **alacsony**, hogy Androidon semmit, web-en
csak egyetlen sort mutatott; le lehet görgetni, és ott van minden gyakorlat. A pickernek viszont
pont az a lényege, hogy a gyakorlatok látszódjanak — töltse ki a modal teljes magasságát, ne
spóroljon a hellyel.

## Jelenlegi működés

`shared/exercise-picker/exercise-picker.component.ts` `<ion-header>` (cím + `ion-searchbar`) +
`<ion-content>` (chip-sor, találati `ion-list`, ad-hoc létrehozó `ion-list`). Egy `<ion-modal>`
`<ng-template>`-jében jelenik meg, önálló gyerekként, a `plan-edit` / `workout-session-edit` /
`active-workout` oldalról.

Ionic 8 inline modalnál a slottolt gyerek-**komponens** köré a keretrendszer **nem** rak
`.ion-page` wrappert, és a komponens hoszt-eleme stílus nélkül `display: block; height: auto` —
így az `<ion-content>` (ami `flex: 1` egy `.ion-page` flex-oszlopban lenne) nem kap definit
magasságot, és majdnem 0 magasra esik össze. Ezért látszott „üres" listaként.

## Elfogadási kritériumok

- [x] A `app-exercise-picker` a `<ion-modal>` **teljes magasságát** kitölti; a találati lista a
      rendelkezésre álló egész teret használja.
- [x] Androidon és web-en is azonnal látszik több gyakorlat, görgetés nélkül.
- [x] Nincs viselkedés-változás (keresés / szűrő / chip / ad-hoc létrehozás változatlan).
- [x] Mindhárom fogyasztó javul egyszerre (megosztott komponens): sablon-szerkesztő
      (`plan-edit`), utólagos edzés-szerkesztő (`workout-session-edit`), élő edzés
      (`active-workout`).
- [x] Zöld gate: lint + `test:ci` + build + `verify:outbox`.

## Terv / döntési napló

### Gyökérok

Az eredeti „üres lista" gyanú (`#065` ARMS/CORE enum-felbontás regresszió) **téves** volt: a
`#065` commit nem nyúlt a pickerhez / repóhoz / storage-hoz, a `plan-edit` és a
`workout-session-edit` **ugyanazt** a megosztott `app-exercise-picker`-t + `providedIn: 'root'`
singleton `ExerciseRepository`-t használja azonos wiringgel, és a generált `Exercise` modell
`as const` map runtime enum-validáció nélkül. A lista tehát fel volt töltve — csak nem látszott,
mert a modal-tartalom magassága összeesett.

### Javítás

`exercise-picker.component.scss` (új) + `styleUrls` a komponensen: a `:host` a `.ion-page`
lényegi szabályait tükrözi —

```scss
:host {
  display: flex;
  flex-direction: column;
  position: absolute;
  inset: 0;
}
```

így a hoszt kitölti a modal-wrappert, az `<ion-content>` a fejléc alatt `flex: 1`-gyel
kitölti a maradékot, a találati lista a teljes magasságot kapja. Mellé egy kis `.chip-row`
flex-wrap + padding (eddig stílus nélküli osztály volt).

## Lezáráskor (on-done)

- Frissített specek: [[Edzésnapló]] `### UI/UX elvárások` — „Gyakorlat picker" sor: a modal a
  teljes magasságot kitölti (`:host position: absolute; inset: 0`). `verifikalt_commit` bump.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-09 — #98 gyakorlat-picker modal teljes magasság (CSS)
- Kód: `frontend/src/app/shared/exercise-picker/exercise-picker.component.{ts,scss}` (új scss +
  `styleUrls`); nincs logikai / adat / outbox hatás
