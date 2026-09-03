---
id: 56
type: bug
status: done
title: Backend: tombstone fizikai torles (180 nap) utemezett job hianyzik
specs:
  - "[[Backend]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 56 — Backend: tombstone fizikai torles (180 nap) utemezett job hianyzik

## Motiváció / probléma

A 410 CURSOR_TOO_OLD ag es a sync_meta.tombstone_horizon olvasas all, de nincs @Scheduled cleanup / horizon-frissito job.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

`common/sync/TombstonePurgeJob` (`@Scheduled` cron `0 30 3 * * *`, a `common/SchedulingConfig`
`@EnableScheduling`-jével; a `lm2.sync.tombstone-purge.cron` property-vel felülírható, `-`-ral
kikapcsolható — a teszt alatt ez az alapértelmezés) minden nap:

1. `sync_meta.tombstone_horizon` = `GREATEST(tombstone_horizon, now() - 180 nap)` — monoton,
   sosem visszafelé (óra-elcsúszás / kézi override ellen).
2. A horizontnál régebbi `deleted_at`-ú sorok fizikai `DELETE`-je minden szinkronizált táblából.
   A táblalista a séma-katalógusból jön (`information_schema` — minden `deleted_at` oszlopos
   `BASE TABLE`), nem hardkódolt: új szinkronizált tábla automatikusan bekerül.
3. A szinkronizált táblák FK-jai nem `ON DELETE CASCADE`, ezért a `DELETE`-ek több körben futnak:
   a még le nem söpört gyerekre hivatkozó sor a következő körre marad. A cascade soft delete a
   szülőt és gyerekeit egy tranzakcióban tombstone-olja, így a `deleted_at`-ok együtt lépik át a
   horizontot és a körök konvergálnak.
4. Nem `@Transactional`: minden `DELETE` külön commitál, egy FK-ütközés izoláltan elkapódik és a
   következő körre / futásra marad, nem rontja el a testvér törléseket.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
      (`[[Backend]]` „Séma és migráció → Tombstone", `[[Backend-offline first]]` „Tombstone-retenció".)
- [x] Ha „Nem scope” blokkból jött: n/a — audit-találat, nem volt „Nem scope" blokk; a spec
      korábbi „a job jelenleg hiányzik" mondata jelen időbe került.

## Terv / döntési napló

- **Táblafelfedezés séma-katalógusból, nem hardkódolt lista** — ugyanaz a fragilitás-védelem, mint
  a `SyncChangesViewCompletenessTest`-nél: egy jövőbeli szinkronizált tábla különben csendben
  kimaradna a purge-ből.
- **Több körös törlés topológiai rendezés helyett** — a nem-cascade FK-k miatt kell a sorrend, de
  a dependency-mélység kicsi (≤ ~4), a retry-kör olcsóbb és olvashatóbb, mint egy `pg_constraint`
  topo-sort.
- **Nem tranzakcionális, per-`DELETE` autocommit** — hogy egy elkapott FK-hiba ne poison-olja a
  Postgres tranzakciót és a testvér törléseket. A retenciós purge amúgy sem igényel atomicitást.
- **Monoton horizon (`GREATEST`)** — egy elavult cursor maradjon elavult, és ne „éledjenek fel"
  már purge-ölt tombstone-ok egy visszafelé ugró óra miatt.

## Lezáráskor (on-done)

- Frissített specek: [[Backend]] (Séma és migráció → Tombstone), [[Backend-offline first]] (Tombstone-retenció)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #056 tombstone-retenció cleanup + horizon-frissítő ütemezett job
- Kód: `backend` `common/SchedulingConfig`, `common/sync/TombstonePurgeJob` (+ `TombstonePurgeJobTest`, teszt `application.yaml` cron-kikapcsoló)
