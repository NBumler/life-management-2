---
id: 65
type: change-request
status: backlog
title: ExerciseCategory finomabb felbontás — kar → bicepsz/tricepsz, core → has/mélyhát/oldalsó törzs
specs:
  - "[[Gyakorlat]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-09-06
closed:
---

# 65 — ExerciseCategory finomabb felbontás — kar → bicepsz/tricepsz, core → has/mélyhát/oldalsó törzs

## Motiváció / probléma

Két észrevétel ugyanarról:

1. A gyakorlat kategóriáknál csak `ARMS` (kar) van, nincs külön bicepsz és tricepsz — pedig
   push/pull bontásban ez két külön edzett izomcsoport, és a statisztika (per-kategória volumen,
   piramis) így összemossa őket.
2. „A has és a törzs az más?” — jelenleg csak `CORE` van, ami a spec szerint egyszerre jelenti a
   hasat, a mélyhátat és a törzset. Ezek anatómiailag és edzésmódszertanilag különböznek
   (rectus abdominis vs. erector spinae / mély stabilizátorok / oldalsó törzs). A 4-es észrevétel
   feltételes volt („csak akkor kell jegy, ha különbözik a kettő”) — különbözik, ezért ide került.

## Jelenlegi működés

[[Gyakorlat]] → `#### Enum — ExerciseCategory`:

| Érték | Jelentés |
|---|---|
| `ARMS` | Kar (bicepsz, tricepsz) |
| `CORE` | Has, mélyhát, törzs |

A `category` kötelező mező az `Exercise`-en, és az [[Edzésnapló]] session entry **snapshotolja**
(`exerciseId` + név + `ExerciseCategory` + `ExerciseKind`), tehát bármilyen enum-változás
visszafelé kompatibilitási kérdést vet fel a régi snapshotokra.

## Elfogadási kritériumok

- [ ] Döntés: (a) enum-értékek bővítése (`BICEPS`/`TRICEPS`, `ABS`/`LOWER_BACK`/`OBLIQUES`…),
      vagy (b) elsődleges kategória + opcionális „al-izomcsoport” mező, vagy (c) marad, csak a
      megjelenítés/leírás pontosul. Alternatíva: szabad címkézés (tag-ek) a merev enum helyett.
- [ ] Migráció a meglévő `Exercise.category` sorokra és az [[Edzésnapló]] snapshotokra
      (a régi `ARMS`/`CORE` értékek értelmezése ne törjön).
- [ ] Parity fixture / seed `Exercise` sorok frissítése, ha determinisztikus v5 id-t érint.
- [ ] Statisztika (per-kategória volumen, grade/kategória piramis) az új felbontással.
- [ ] Frontend picker chipek + [[Edzésnapló]] szűrők.

## Terv / döntési napló

_Scoping során: eldönteni, hogy enum-bővítés vs. kétszintű (fő + al) taxonómia. A kétszintű
megoldás jövőállóbb (láb-, hát-bontás is jöhet), de több UI. A snapshot-kompatibilitás miatt a
régi értékeknek megfeleltethetőnek kell maradniuk._

## Lezáráskor (on-done)

- Frissített specek: [[Gyakorlat]] (`ExerciseCategory` tábla + migrációs jegyzet),
  [[Edzésnapló]] (snapshot mezők, szűrők)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `hu.bumler.lm2.workout` (enum + migráció), `frontend` gyakorlat picker + edzésnapló statisztika
