---
id: 117
type: bug
status: done
title: "Ion-modalba slotolt komponens magasság-bug: audit + közös megoldás (mintapélda: Étkezés tétel-szerkesztő)"
specs:
  - "[[Edzésnapló]]"
  - "[[Étkezés]]"
  - "[[Frontend]]"
flag:
created: 2026-09-19
closed: 2026-09-20
---

# 117 — Ion-modalba slotolt komponens magasság-bug: audit + közös megoldás

## Motiváció / probléma

`backlog/098` (archiválva, `27bf564`) már egyszer megoldotta ezt a gyakorlat-picker modalnál:
Ionic 8 inline modalnál (`<ion-modal><ng-template>`) ha a slotolt tartalom egy **önálló Angular
komponens**, nincs köré `.ion-page` wrapper — a hoszt stílus nélkül `display:block`/`height:auto`,
így a komponens `<ion-content>`-je majdnem 0 magasságra esik össze (Androidon üresnek tűnő,
weben egy-két soros lista). A fix akkor a `shared/exercise-picker/exercise-picker.component.scss`
`:host { display:flex; flex-direction:column; position:absolute; inset:0; }` mintája volt.

Most ugyanez a tünet jelentkezett **Étkezésnél**: új tétel hozzáadásakor a megjelenő
"Mennyiség" + "Adagszorzó" felület alig fér ki / nem látszik rendesen. Mivel a root cause
ugyanaz a modal-mintázat, valószínűsíthető, hogy ez nem az egyetlen érintett hely, és a fixet
eddig konzisztensen, komponensenként külön oldottuk meg — kellene egy közös, jövőre nézve is
érvényes megoldás.

## Jelenlegi működés

Grep-audit (`<ion-modal>` használatok, `frontend/src/app/pages/**/*.html`):

- `meal-edit.page.html` → `<ion-modal><ng-template><app-meal-item-editor ...>` — **a hibás
  minta, nincs `:host` magasság-fix** (`meal-item-editor.component.scss` nem tartalmaz
  `position: absolute; inset: 0`-t).
- `active-workout.page.html`, `workout-session-edit.page.html`, `plan-edit.page.html` →
  mindhárom `<app-exercise-picker>`-t slotol, **már javítva** (`backlog/098`).
- `sync.page.html`, `tura.page.html` → a modal `ng-template`-je közvetlenül `<ion-header>` /
  `<ion-content>`-et ír (nem külön komponensre mutat), ezért ezeknél feltehetően nem áll fenn a
  bug — de scoping közben ellenőrizd, hogy ezek content-magassága is rendben van-e valós
  eszközön/Androidon.

## Elfogadási kritériumok

- [x] Fix `meal-item-editor.component.scss`-ben (vagy a `meal-item-editor.component.ts`
      `styleUrls`-ben) — a `backlog/098` mintáját követve (`:host` flex-oszlop +
      `position: absolute; inset: 0`).
- [x] Teljes audit: minden `<ion-modal>` + slotolt önálló komponens pár a repóban (jelenleg
      ismert: exercise-picker × 3 hely — javítva; meal-item-editor — javítandó); ha van további
      ilyen pár, azt is javítsd ugyanazzal a mintával.
- [x] **Közös megoldás jövőre**: emeld ki az ismétlődő `:host` szabályt egy megosztott SCSS
      helyre (pl. `shared/styles/` mixin/placeholder osztály, amit a jövőbeli
      "modal-ban slotolt komponens" `:host`-ja `@include`-ol/kiterjeszt), hogy ne kelljen
      komponensenként újra felfedezni/másolni ezt a 4 CSS sort. Dokumentáld a mintát (pl. rövid
      megjegyzés a megosztott SCSS fájlban, vagy [[Frontend]] "UI konvenciók"-szerű szakaszban),
      hogy egy új modal-slotolt komponens írásakor ez legyen az alapértelmezett lépés.
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

Egy Sass `@mixin` mellett döntöttünk (`shared/styles/_ion-modal-host.scss`,
`ion-modal-host-fill`), nem placeholder-selectorral vagy külön wrapper-komponenssel — ez igényli
a legkevesebb boilerplate-et hívó oldalon (`@use ... as modal-host;` + egysoros `@include` a
`:host`-ban), és nem vezet be új Angular-komponenst egy tisztán CSS-probléma megoldásához. A
mintát a [[Frontend]] "Kötelező elvek" szakaszába vettük fel (nem csak a mixin fájl
kommentjébe), hogy egy jövőbeli modal+komponens pár írásakor ez alapból eszébe jusson bárkinek,
aki a specet olvassa, nem csak annak, aki a `shared/styles/` mappát böngészi.

Teljes audit (`grep -rl "<ion-modal" frontend/src/app --include=*.html`) 6 találatot adott: a
`sync.page.html` és `tura.page.html` modaljai közvetlenül `<ion-header>`/`<ion-content>`-et írnak
a `ng-template`-ben (nincs slotolt komponens), ezért nem érintettek; a 3 gyakorlat-picker hely már
javítva volt (`backlog/098`); az Étkezés tétel-szerkesztője volt az egyetlen új találat.

## Lezáráskor (on-done)

- Frissített specek: [[Étkezés]] — tétel-szerkesztő modal magasság-viselkedés; [[Edzésnapló]] —
  gyakorlat-picker leírás a megosztott mixinre mutat; [[Frontend]] — új "Kötelező elvek" sor a
  mintáról
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-20 — #117 ion-modal + slotolt komponens magasság-fix (audit + megosztott mixin)
- Kód: `frontend/src/app/shared/styles/_ion-modal-host.scss` (új mixin),
  `frontend/src/app/pages/food/meal/meal-item-editor.component.scss` (fix),
  `frontend/src/app/shared/exercise-picker/exercise-picker.component.scss` (átállítva a mixinre);
  nincs logikai / adat / outbox hatás
