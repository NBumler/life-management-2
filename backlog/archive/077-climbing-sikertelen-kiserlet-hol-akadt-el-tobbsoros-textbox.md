---
id: 77
type: change-request
status: done
title: Sikertelen kísérlet „Hol akadt el” (failurePoint) legyen többsoros textarea
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 77 — Sikertelen kísérlet „Hol akadt el” (failurePoint) legyen többsoros textarea

## Motiváció / probléma

Egy sikertelen kísérletnél a „Hol akadt el” (`failurePoint`) most rövid egysoros input — egy
hosszabb megjegyzés (pl. „a kulcsmozdulatnál a bal kezes oldalfogásról nem tudtam átlépni a
párkányra, kicsúszott a láb”) nem látszik egyben. Legyen többsoros textarea, auto-grow-val, hogy
a teljes szöveg olvasható legyen.

## Jelenlegi működés

[[Mászónapló]] `AscentAttempt.failurePoint`: „Opcionális; sikertelennél”. [[Indoor boulder napló]]:
„sikertelennél `failurePoint` helyett / mellett rövid note”. A mezőtípus egysoros.

## Elfogadási kritériumok

- [ ] `failurePoint` bevitel többsoros textarea, auto-grow (min. 2–3 sor), ésszerű max. hossz.
- [ ] A session-részlet / lista nézet a teljes szöveget mutatja (sortöréssel), nem csonkolja
      egy sorra — vagy „több” kinyitóval.
- [ ] Csak `isSuccess = false` esetén látszik (változatlan feltétel).
- [ ] `failurePoint` vs. `notes` viszonya tisztázva (lásd [[070-climbing-kiserletek-ui-ux-uzleti-logika-review-attemptcount-jel]])
      — ne legyen két, gyakorlatilag azonos szabad szöveg mező sikertelennél.
- [ ] Nincs adatmodell-változás (a mező már string); csak UI + esetleg hossz-limit.

## Terv / döntési napló

_Együtt a [[076-climbing-kiserletek-vizualis-elkulonitese-listaban]] jeggyel. Ha a 070 review azt
mondja, `failurePoint` beolvad a `notes`-ba, akkor ez a jegy a `notes` textarea-jára szűkül._

## Lezáráskor (on-done)

**Döntés (#70 review): a `failurePoint` megszűnik, beolvad a `notes`-ba.** Sikertelen kísérletnél
nincs két, gyakorlatilag azonos szabadszöveg mező — egyetlen többsoros, auto-grow `notes` van, ami
sikernél „Jegyzet", sikertelennél „Jegyzet / hol akadt el?" címkével + „Hol akadt el? Mi ment / nem
ment?" prompttal jelenik meg.

### Adatmigráció (a meglévő failurePoint szöveg megőrzése)

- **Backend** `V31__ascent_attempt_merge_failure_point_into_notes.sql`: `UPDATE` a `failure_point`
  szöveget a `notes` elé/mögé fűzi (mindkettő kitöltve → `notes` \n `failure_point`; csak az egyik →
  az), majd `ALTER TABLE ascent_attempt DROP COLUMN failure_point`. A `sync_changes` nézet csak
  id/updated_at/deleted-et hivatkoz, így a DROP nézet-újraépítés nélkül megy. Az érintett sorok
  `updated_at`-je bumpol → a delta-pull egyszer újratölti a klienseket (row-level LWW, konvergens).
- **Frontend natív** `local-database.service.ts` `SCHEMA_V30`: ugyanez az `UPDATE` on-device. Az
  oszlopot **nem** dobja el (nem minden on-device SQLite build támogatja a `DROP COLUMN`-t); üresen,
  használaton kívül marad (a CREATE blokk változatlan — soha nem szerkesztünk lezárt `SCHEMA_Vn`-t).

### Kód

- OpenAPI `AscentAttempt.yaml`: `failurePoint` property törölve, `notes` leírása frissítve →
  `npm run gen:api` (regenerált `api/model/ascentAttempt.ts`).
- Backend: `AscentAttemptEntity` mező + getter/setter, `AscentAttemptMapper`, `ClimbingSessionService`
  `applyAttemptFields` — `failurePoint` eltávolítva.
- Frontend: `AscentAttemptSaveItem` (`storage-backend.ts`), `sqlite-` / `http-storage-backend.ts`
  attempt-map, `local-rows.ts` (`AscentAttemptRow` + `ascentAttemptRowToDto` + a két upsert-builder
  oszloplistája/paraméterei) — `failure_point` / `failurePoint` kivéve.
- `indoor-rope` / `outdoor-rope` napló-form: `AttemptRow.failurePoint` + a `@else` failure-point
  `ion-item` törölve; a jegyzet mező `ion-input` → `ion-textarea` (`autoGrow`, `rows=2`), a címke +
  placeholder `isSuccess`-től függ (`FIELD_ATTEMPT_NOTES` / `FIELD_ATTEMPT_NOTES_FAIL` +
  `ATTEMPT_NOTES_FAIL_PLACEHOLDER`). `indoor-boulder` / `outdoor-boulder`: a `failurePoint: null`
  sor kivéve a `rowToSaveItem`-ből.
- i18n: `FIELD_FAILURE_POINT` törölve, `FIELD_ATTEMPT_NOTES_FAIL` + `ATTEMPT_NOTES_FAIL_PLACEHOLDER`
  hozzáadva (hu + en). Tesztek: a két rope-form „failure point" tesztje `notes`-ra átírva; 4
  fixture-ből a `failurePoint: null` kivéve.

- Frissített specek: [[Mászónapló]] (`AscentAttempt` tábla + UI/UX), [[Indoor boulder napló]],
  [[Indoor köteles napló]]. `verifikalt_commit` bump.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #77 failurePoint → notes merge (V31 + SCHEMA_V30 migráció)
- Kód: backend `hu.bumler.lm2.climbing` + `db/migration/V31`, `openapi/components/schemas/AscentAttempt.yaml`;
  frontend `api/model`, `core/storage/*`, `core/data/local-rows.ts`, `local-database.service.ts`,
  4× `*-session-edit.page.{ts,html}`, `assets/i18n/{hu,en}.json`.
