---
id: 92
type: change-request
status: done
title: Mászás — onsight választása korábban már megmászott útnál: engedélyezett, de figyelmeztető info
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-09
closed: 2026-09-09
---

# 92 — Mászás — onsight választása korábban már megmászott útnál: engedélyezett, de figyelmeztető info

## Motiváció / probléma

Ha egy kísérlethez `ONSIGHT` stílust választunk, de az adatbázis szerint a user az adott utat
**már korábban megmászta** (van rá sikeres `AscentAttempt` másik sessionben), ez definíció
szerint nem lehet onsight. Ne tiltsuk le — a user tudhatja jobban (rossz linkelés, más út,
elírás) —, de jelenjen meg egy **warning / info** üzenet: „ezt az utat korábban már megmásztad
(YYYY-MM-DD)".

## Jelenlegi működés

[[Mászónapló]] `AscentAttempt.ascentStyle`: `ONSIGHT | FLASH | REDPOINT`, kontextus szerinti
whitelist, súgó gomb a definíciókkal (`backlog/071`). **Nincs** kereszt-ellenőrzés a user korábbi
megmászásaival szemben — bármikor választható onsight, akkor is, ha van korábbi sikeres kísérlet
ugyanarra a `Route` / `BoulderProblem` / `IndoorRoute` sorra.

## Elfogadási kritériumok

- [x] `ONSIGHT` **és** `FLASH` kiválasztásakor a kliens ellenőrzi a helyi store-ban, van-e
      korábbi, nem törölt, sikeres `AscentAttempt` ugyanarra a linkelt útra, korábbi
      `ClimbingSession.date`-tel.
- [x] Ha van: **nem blokkoló** inline `ion-note` (`color="warning"`) a stílus-választó alatt, a
      legutóbbi megmászás dátumával (`WORKOUT.CLIMBING.SESSION.PRIOR_ASCENT_WARNING`); a mentés
      engedélyezett.
- [x] Csak linkelt út (`routeId` / `boulderProblemId` / `indoorRouteId`) esetén fut az
      ellenőrzés; ad-hoc név nélkül nincs mihez hasonlítani.
- [x] Full-offline is működik (helyi lekérdezés a betöltött `items()`-en).
- [x] Döntés: **`FLASH`-re is szól**. Flash = előzetes infó megengedett, de korábbi próba/megmászás
      nem — ugyanaz a kizáró feltétel, mint onsightnál. Redpoint nem kap figyelmeztetést.

## Terv / döntési napló

Tisztán kliensoldali, származtatott figyelmeztetés — nincs adatmodell-változás.

- **`ClimbingSessionRepository.priorSuccessfulAscentDate(ref, beforeDate, excludeSessionId?)`** —
  végigmegy a betöltött sessionökön, kihagyja a törölt / `date >= beforeDate` / épp szerkesztett
  sessiont, és a legutóbbi olyan session dátumát adja vissza, amelyben van sikeres, nem törölt
  kísérlet a `ref` (linkelt út id) sorra. `ref` üres → `null`.
- Mind a 3 route-linkelt napló-form (`indoor-rope`, `outdoor-rope`, `outdoor-boulder`) kap egy
  `priorAscentWarningDate(row)` template-metódust + egy `ion-note`-ot a stílus `@if
  (row.isSuccess())` blokkban. A figyelmeztetett stílusok: `PRIOR_ASCENT_WARN_STYLES = {ONSIGHT, FLASH}`.
- **Indoor boulder kimarad:** a kísérlet csak `colorBandId` szín-sávra linkel, ami nem azonosít
  konkrét problémát — nincs mihez hasonlítani. A [[Indoor boulder napló]] spec ezt rögzíti.

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] (`ascentStyle` — onsight/flash korábbi-megmászás figyelmeztetés),
  [[Indoor köteles napló]], [[Outdoor köteles napló]], [[Outdoor boulder napló]] (per-kontextus
  említés), [[Indoor boulder napló]] (kizárás rögzítve). Stamp: `verifikalva: 2026-09-09`,
  `verifikalt_commit: ca19d1e`.
- `IMPLEMENTATION_STATUS.md`: `2026-09-09 — #92` sor.
- Kód: `core/data/climbing-session.repository.ts` (`priorSuccessfulAscentDate` + spec), 3×
  `naplo/{indoor-rope,outdoor-rope,outdoor-boulder}-session-edit.page.{ts,html}`, i18n `hu`/`en`
  (`WORKOUT.CLIMBING.SESSION.PRIOR_ASCENT_WARNING`), `climbing-session.repository.spec.ts` (5 új eset).
- Green gate: lint ✓ · `test:ci` 1606 ✓ · build ✓ · `verify:outbox` ✓.
