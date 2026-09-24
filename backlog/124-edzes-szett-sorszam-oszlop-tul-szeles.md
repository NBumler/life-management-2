---
id: 124
type: bug
status: ready
title: Edzés — a szettsorok sorszám-oszlopa túl sok helyet foglal (sablon szerkesztő + napló)
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-24
closed:
---

# 124 — Edzés — a szettsorok sorszám-oszlopa túl sok helyet foglal (sablon szerkesztő + napló)

## Motiváció / probléma

Edzés-sablon létrehozásánál / szerkesztésénél a gyakorlat szettjei sorszámozott sorokban jelennek
meg, és az első oszlop (a sorszám) aránytalanul széles, elveszi a helyet a mezők elől. Hasonló bug
volt már korábban egy másik komponensben (az index első oszlopa rengeteg helyet vett el).

## Jelenlegi működés

Ugyanaz a markup három helyen: `pages/workout/plan/plan-edit.page.html`,
`pages/workout/log/active-workout.page.html`, `pages/workout/log/workout-session-edit.page.html`:

```html
<ion-label slot="start" class="set-number">{{ i + 1 }}</ion-label>
<div class="set-fields">…</div>
```

A `.set-number` osztályhoz nincs stílus definiálva, így az `ion-label` az Ionic alapértelmezett
flex-viselkedésével (`flex: 1`) a sor szélességének jelentős részét elfoglalja.

## Elfogadási kritériumok

- [ ] A sorszám-oszlop tartalomhoz igazodó, keskeny (pl. `flex: 0 0 auto`, kis `min-width`,
      jobb margó), a `.set-fields` kapja a maradék szélességet.
- [ ] Mind a 3 oldalon egységesen javítva — lehetőleg közös stílusban (pl. megosztott SCSS mixin /
      globális osztály, ahogy a #117 tette a modal-magassággal), nem háromszor másolva.
- [ ] Átnézni a többi `ion-label slot="start"` sorszám-mintát (pl. mászó kísérlet-kártyák
      `ATTEMPT_N`, `kaja-stats`) — ha ott is jelentkezik, ugyanazzal javítva.
- [ ] Ellenőrzés keskeny (≈360 px) kijelzőn.
- [ ] Zöld lint + test:ci + build.

## Terv / döntési napló

_Nincs._

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]] (`### UI/UX elvárások`, ha rögzítjük)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
