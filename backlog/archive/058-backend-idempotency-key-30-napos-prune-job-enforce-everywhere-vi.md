---
id: 58
type: chore
status: done
title: Backend: Idempotency-Key 30-napos prune job + enforce-everywhere vizsgalat
specs:
  - "[[Backend]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 58 — Backend: Idempotency-Key 30-napos prune job + enforce-everywhere vizsgalat

## Motiváció / probléma

Az Idempotency-Key-t a nativ drain minden replay-en kuldi, de a szerver csak a nem-idempotens atomi vegpontokon (POST /complete) kenyszeriti ki + tarolja; a 30-napos prune job hianyzik.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/` (B27).

## Jelenlegi működés

**Prune job:** `common/IdempotencyKeyPruneJob` — napi `@Scheduled` (cron `0 15 3 * * *`, a
`SchedulingConfig` `@EnableScheduling`-jével; `lm2.idempotency.prune.cron`-nal felülírható,
`-`-ral kikapcsolható — a teszt alatt ez az alapértelmezés). `IdempotencyKeyRepository
.deleteByCreatedAtBefore` egyetlen JPQL `@Modifying` bulk `DELETE`-tel törli a 30 napnál régebbi
`created_at`-ú sorokat (nem entity-betöltős derived `deleteBy…`); a tranzakciót a job `@Transactional`
`prune()` metódusa adja.

**Enforce-everywhere:** nincs teendő, a jelenlegi hatókör helyes.
- Plain CRUD végpont: a kliens-UUID upsert (`POST` létező id-ra → `200`, nem `409`) és az idempotens
  soft delete miatt eleve replay-biztos, `Idempotency-Key` nélkül is. A szerver nem kéri, nem tárolja.
- Atomi (nem-upsert) végpont: ma egyetlen ilyen van, a `POST /api/shopping-lists/{id}/complete`
  (archivál + `StoredFood` create-ek + új lista egy tranzakcióban). Itt az `Idempotency-Key` header
  kötelező (OpenAPI `shopping-lists-item-complete.yaml`), és a válasz az `idempotency_key` táblába
  kerül; replaynél a tárolt válasz megy vissza. Új atomi végpont ugyanezt a `common` mechanizmust
  használja.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
      (`[[Backend]]` §"Sync végpontok megvalósítása → Idempotencia".)
- [x] Ha „Nem scope” blokkból jött: n/a — audit-találat (B27 Partial); a spec „tervezett" mondata
      jelen időbe került, kiegészítve az enforce-everywhere következtetéssel.

## Terv / döntési napló

- **`@Modifying @Query` bulk DELETE** a derived `deleteByCreatedAtBefore` helyett — utóbbi minden
  sort betöltene entity-ként a lifecycle-callbackekhez; egy prune jobnak a bulk DELETE a helyes.
- **Külön `@Scheduled` osztály**, nem a `TombstonePurgeJob`-ba olvasztva — más tábla, más retenció
  (30 vs 180 nap), más feature-terület (`common` vs `common/sync`).
- **Enforce-everywhere = dokumentációs pontosítás**, nem kód — az audit B27 is ezt állapította meg;
  a plain CRUD-on nincs mit kikényszeríteni, az egyetlen atomi végpont már fedve van.

## Lezáráskor (on-done)

- Frissített specek: [[Backend]] (§"Sync végpontok megvalósítása → Idempotencia")
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #058 Idempotency-Key 30-napos prune job + enforce-everywhere pontosítás
- Kód: `backend` `common/IdempotencyKeyPruneJob`, `common/IdempotencyKeyRepository` (+ `IdempotencyKeyPruneJobTest`, teszt `application.yaml` cron-kikapcsoló)
