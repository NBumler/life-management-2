---
id: 167
type: feature
status: ready
title: Nyújtó gyakorlatok — külön adatmodell, típusválasztás és többes chip-szűrő a katalógusban
specs:
  - "[[Gyakorlat]]"
  - "[[Edzés]]"
  - "[[Frontend]]"
flag: edzes.nyujtas
created: 2026-10-17
closed:
---

# 167 — Nyújtó gyakorlatok — külön adatmodell, típusválasztás és többes chip-szűrő a katalógusban

> Sorozat: **167** (katalógus) → [[168-nyujto-sablonok]] → [[169-nyujto-session-vezetett-idozito-es-naplo]]
> → [[170-eroesito-sablonhoz-csatolt-nyujtas]].

## Motiváció / probléma

Az [[Edzés]] feature ma csak terhelő / erősítő gyakorlatokat ismer. Nyújtásra külön gyakorlattípus
kell. Az erősítő gyakorlat űrlapjának több mezője (`kind` → szett-mezők, `defaultRestTimeSeconds`) a
nyújtásnál értelmetlen. A naplóbejegyzések ráadásul snapshotolják a `kind`-ot, és arra épül a szett-UI.
Ezért a nyújtás **saját adatmodellt** kap; az `Exercise` nem kap nullable mezőket.

## Jelenlegi működés

[[Gyakorlat]]: egyetlen `Exercise` entitás (`exercise_catalog`): `name`, `category`
(`ExerciseCategory`, 11 érték), `kind`, `defaultRestTimeSeconds`, `isFavorite`, `equipment`,
`description`. Katalógus lista (`pages/workout/exercises/exercise-list.page.ts`): kereső,
**egyszerre egy** kategória-chip (`categoryFilter` signal, újratapra törlődik), Kedvencek chip.

## Elfogadási kritériumok

- [ ] Új, user-owned entitás: **`StretchExercise`** — `id` (kliens UUID), `name` (kötelező, egyedi a
      user élő nyújtó gyakorlatai között — [[Névegyediség]], `name_normalized` partial unique index),
      `category` (kötelező, közös `ExerciseCategory`), `description` (opcionális, max. 1000 karakter),
      `equipment` (opcionális), `isFavorite` (default `false`), `defaultHoldSeconds` (kötelező
      egész > 0, alapból 30), `defaultPerSide` (boolean, alapból `false`), `deleted` / `deleted_at`,
      audit. A két `default*` mező csak előtöltés: a [[168-nyujto-sablonok]] sablon-tételébe
      felvételkor másolódik, utólagos módosításuk a meglévő sablon-tételeket nem írja át.
      Backend: Flyway tábla `stretch_exercise`, OpenAPI CRUD + `GET /api/sync/changes` delta,
      `*SyncDataLoader`. Frontend: helyi SQLite séma (új `SCHEMA_Vn`), repository, outbox.
- [ ] A névegyediség **típusonként külön** névtér: lehet „Hát” nevű erősítő és nyújtó gyakorlat is.
- [ ] **`ExerciseCategory` bővítés** két új értékkel: `HIPS` (Csípő / farizom) és `NECK` (Nyak). Mindkét
      típus használhatja. Backend CHECK constraint-ek (`exercise_catalog`, `workout_exercise_entry`,
      `workout_plan_exercise` snapshot, új `stretch_exercise`), OpenAPI enum, i18n címkék.
      Meglévő sorokat nem módosít (bővítés, nem felbontás).
- [ ] **Meglévő gyakorlatok = erősítő:** a meglévő `exercise_catalog` sorok adatmigráció nélkül
      erősítőként jelennek meg (a tábla maga az erősítő katalógus). A UI-szövegekben az eddigi
      „Gyakorlat” helyett „Erősítő gyakorlat” / „Nyújtó gyakorlat” áll, ahol a típus számít.
- [ ] **Új gyakorlat felület:** első mezőként szegmens: **Erősítés** | **Nyújtás** (alapból
      Erősítés). Nyújtásnál csak a nyújtó mezők látszanak: Név, Kategória, Leírás / megjegyzés,
      Eszközigény, Kedvenc, valamint **Alap tartás (mp)** és **Oldalanként** kapcsoló (segédszöveg:
      „Sablonba felvételkor ezzel töltődik elő.”). Szerkesztésnél a típus **nem** váltható (két külön entitás); a szegmens
      ilyenkor csak megjelenik, nem állítható.
- [ ] **Katalógus lista** egyben mutatja a két típust (név szerint rendezve). A soron a típus jelölése:
      erősítőnél a mai „kategória · kind”, nyújtónál „kategória · Nyújtás”. A kereső a nyújtó
      gyakorlatoknál is a névre, eszközigényre és leírásra illeszt.
- [ ] **Többes chip-szűrő:** új chip-csoport **Erősítés** / **Nyújtás**. A kategória-chipek
      **többszörösen** kiválaszthatók.
      Szabály: csoporton belül **VAGY**, a csoportok (típus, kategória, Kedvencek) között **ÉS**.
      Példák: „Hát + Nyújtás” = hát kategóriás nyújtások; „Hát + Mell” = hát vagy mell, mindkét
      típusból; semmi kijelölve = minden. A szűrési logika tiszta, unit-tesztelt függvény.
- [ ] A meglévő erősítő pickerek (Edzésnapló, sablon-szerkesztő) továbbra is **csak erősítő**
      gyakorlatot kínálnak. A nyújtó picker a [[168-nyujto-sablonok]] része.
- [ ] Törlés: soft delete megerősítéssel; soha nem szinkronizált draft → helyi hard remove + outbox
      purge (mint az `Exercise`).
- [ ] Feature flag **`edzes.nyujtas`** (`features.json`, alapból `true`). Kikapcsolva rejtve marad: a
      típus-szegmens, a Nyújtás chip és a nyújtó sorok; a route-ok guardoltak.
- [ ] Seed: nincs kötelező nyújtó seed. Opcionálisan néhány alap nyújtás (determinisztikus v5 UUID:
      `StretchExercise:<userId>:<normalizedName>`) — implementáláskor dönthető.
- [ ] Specek: [[Gyakorlat]] (új „Nyújtó gyakorlat” entitás + szűrő), [[Edzés]], [[Frontend]]
      flag registry; `#### Backend-offline` frissítve. `verify:outbox` snapshot + payload verzió, ha
      kell.

## Terv / döntési napló

- 2026-10-17 — **Külön entitás**, nem `Exercise.type` diszkriminátor. Az `Exercise` `kind`-ja kötelező,
  a napló- és sablon-snapshot erre épít; nullable mezőkkel a szett-UI-t és a CHECK-eket mindenhol
  típusra kellene ágaztatni. Külön táblával a „meglévők erősítőként” migráció adatmódosítás nélkül
  megvan, és a nyújtó gyakorlat technikailag sem kerülhet erősítő sablonba. (Felhasználói igény:
  „új adat model”.)
- 2026-10-17 — Közös `ExerciseCategory` + `HIPS` / `NECK`, hogy a „Hát + Nyújtás” chip-kombináció
  egységesen működjön. (Felhasználói döntés.)
- 2026-10-17 — A seedben lévő „Tricepsz nyújtás” valójában kábeles tricepsz-gyakorlat (`WEIGHTED_REPS`),
  nem nyújtás; erősítőként marad.
- 2026-10-17 — A nyújtó gyakorlat kap `defaultHoldSeconds` + `defaultPerSide` mezőt, hogy a
  [[168-nyujto-sablonok]] tétele előtöltődjön. Az „oldalanként” jelleg a nyújtás sajátja (pl. combhajlító
  nyújtás). A sablon-tétel saját értéket tárol (másolat, nem élő hivatkozás), így sablononként
  felülírható. (Felhasználói döntés.)

## Lezáráskor (on-done)

- Frissített specek: [[Gyakorlat]] — …
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #167 nyújtó gyakorlatok
- Kód: `workout` (backend), `pages/workout/exercises/`, local schema, outbox
