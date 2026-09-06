---
id: 77
type: change-request
status: backlog
title: Sikertelen kísérlet „Hol akadt el” (failurePoint) legyen többsoros textarea
specs:
  - "[[Mászónapló]]"
  - "[[Indoor boulder napló]]"
flag:
created: 2026-09-06
closed:
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

- Frissített specek: [[Mászónapló]] / [[Indoor boulder napló]] (`### UI/UX elvárások`, attempt mezők)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` climbing attempt input + session detail
