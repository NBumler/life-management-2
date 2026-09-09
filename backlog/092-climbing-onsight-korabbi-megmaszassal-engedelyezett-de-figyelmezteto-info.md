---
id: 92
type: change-request
status: backlog
title: Mászás — onsight választása korábban már megmászott útnál: engedélyezett, de figyelmeztető info
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-09
closed:
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
whitelist, súgó gomb a definíciókkal (`backlog/071` — [[071-climbing-kiserlet-stilus-onsight-flash-redpoint-sugo-gomb]]).
**Nincs** kereszt-ellenőrzés a user korábbi megmászásaival szemben — bármikor választható
onsight, akkor is, ha van korábbi sikeres kísérlet ugyanarra a `Route` / `BoulderProblem` /
`IndoorRoute` sorra.

## Elfogadási kritériumok

- [ ] `ONSIGHT` (és `FLASH`?) kiválasztásakor a kliens ellenőrzi a helyi store-ban, van-e
      korábbi, nem törölt, sikeres `AscentAttempt` ugyanarra a linkelt útra, korábbi
      `ClimbingSession.date`-tel.
- [ ] Ha van: **nem blokkoló** inline info / warning a stílus-választó alatt, a legutóbbi
      megmászás dátumával; a mentés engedélyezett.
- [ ] Csak linkelt út (`routeId` / `boulderProblemId` / `indoorRouteId`) esetén fut az
      ellenőrzés; ad-hoc név nélkül nincs mihez hasonlítani.
- [ ] Full-offline is működik (helyi lekérdezés).
- [ ] Döntés: `FLASH`-re is szól-e (a flash csak azt engedi, hogy előzetes infód volt, de
      másztad-e már — ugyanaz a kizáró feltétel).

## Terv / döntési napló

_Tisztán kliensoldali, származtatott figyelmeztetés — nincs adatmodell-változás. A
`ClimbingSessionRepository` / attempt-repo kap egy `hasPriorSuccessfulAscent(routeRef, beforeDate)`
lekérdezést._

## Lezáráskor (on-done)

- Frissített specek: [[Mászónapló]] (`ascentStyle` — onsight/flash figyelmeztetés),
  [[Indoor boulder napló]] (ha a boulder-flow külön szövegez)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: frontend `core/data/*climbing*repository.ts` (új lekérdezés), `naplo/*-session-edit.*`
  (inline warning), i18n `hu`/`en`, érintett `*.spec.ts`
