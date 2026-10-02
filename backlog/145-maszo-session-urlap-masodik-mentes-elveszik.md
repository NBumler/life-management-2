---
id: 145
type: bug
status: backlog
title: "Mászó session űrlap: mentés után újra megnyitva a korábbi dátumot hozza, a második mentés nem jön létre"
specs:
  - "[[Indoor boulder napló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-02
closed:
---

# 145 — Mászó session űrlap: a második mentés elveszik

## Motiváció / probléma

A #143 utáni Chrome-demóban (web build, 360 px) az Indoor boulder „Új session” űrlapot egymás után
kétszer használtuk:

1. Első alkalom (szimulált „ma” = 2026-10-06): terem + 90 perc → MENTÉS → a lista megmutatta a sessiont. ✔
2. Visszanavigálás a listára, majd újra „Új session” (szimulált „ma” = 2026-10-07): az űrlap **a
   korábbi dátumot (2026-10-06) hozta** előtöltve, és MENTÉS után a lista **nem** mutatta az új
   sessiont; a szerveren sem jött létre (`GET /api/climbing/sessions` csak az elsőt adta vissza).

Gyanú: az Ionic újrahasznosítja a `.../indoor-boulder/new` oldal-példányt (nincs újra `ngOnInit`),
így az űrlap az előző mentés állapotát (dátum, már mentett session id / „mentve” állapot) tartja, és
a második mentés az előző sessiont írja felül vagy no-op.

**Megjegyzés:** a navigáció scriptből történt (`history.pushState` + `popstate`, és a JS-ből
eltolt `Date`), nem valódi koppintásokkal — először reprodukálni kell valódi UI-navigációval
(lista → Új session → Mentés → Új session → Mentés), webes és natív buildben is.

## Jelenlegi működés

[[Indoor boulder napló]]: „Új session” → űrlap (dátum = ma, terem, hossz, kísérletek) → Mentés →
vissza a listára. Elvárt: minden „Új session” friss űrlap, mai dátummal és új client UUID-vel.

## Elfogadási kritériumok

- [ ] Reprodukálva (vagy kizárva) valódi UI-navigációval, web és native buildben.
- [ ] Ha reprodukálható: az „Új session” űrlap minden megnyitáskor alaphelyzetből indul (mai
      dátum, üres mezők, új UUID) — pl. `ionViewWillEnter`-ben reset, vagy az oldal ne legyen
      újrahasznosítva.
- [ ] A második mentés új sessiont hoz létre (helyi store + outbox; web: POST), az első érintetlen.
- [ ] Regressziós teszt a kétszeri egymás utáni létrehozásra.
- [ ] Ugyanez ellenőrizve a többi mászó-kontextus (indoor köteles, outdoor boulder / köteles)
      „Új session” űrlapján.

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: [[…]]
- `IMPLEMENTATION_STATUS.md` sor
