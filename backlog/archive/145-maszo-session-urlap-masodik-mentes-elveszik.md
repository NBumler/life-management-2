---
id: 145
type: bug
status: done
title: "Mászó session űrlap: mentés után újra megnyitva a korábbi dátumot hozza, a második mentés nem jön létre"
specs:
  - "[[Indoor boulder napló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-10-02
closed: 2026-10-02
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

- [x] Reprodukálva (vagy kizárva) valódi UI-navigációval, web és native buildben.
- [x] Ha reprodukálható: az „Új session” űrlap minden megnyitáskor alaphelyzetből indul (mai
      dátum, üres mezők, új UUID) — pl. `ionViewWillEnter`-ben reset, vagy az oldal ne legyen
      újrahasznosítva.
- [x] A második mentés új sessiont hoz létre (helyi store + outbox; web: POST), az első érintetlen.
- [x] Regressziós teszt a kétszeri egymás utáni létrehozásra.
- [x] Ugyanez ellenőrizve a többi mászó-kontextus (indoor köteles, outdoor boulder / köteles)
      „Új session” űrlapján.

## Terv / döntési napló

- 2026-10-02: valódi kattintásokkal (routerLink gombok, web build) reprodukálva: a második „Új session”
  az első példányt hozta vissza (előtöltve az előző értékekkel), és a mentés **felülírta** az első
  sessiont. Ok: mentés után előre-`navigateByUrl` a listára → az Ionic verem [lista, új, lista], a
  következő „új” navigáció a veremben bent maradt példányra lép vissza. Javítás: `NavController.navigateBack`
  mentés / törlés / „nincs ilyen session” után — utána a második „Új session” friss példány, két külön
  session jön létre. (A böngészős ellenőrzés egy háttérben lévő fülön futott, ahol a Chrome nem futtat
  animációs kereteket, így az Ionic átmenetek nem fejeződtek be — a verem-logika ettől független.)

## Lezáráskor (on-done)

- Frissített specek: [[Indoor boulder napló]] — UI/UX: mentés / törlés után `navigateBack`, friss „Új session” (a másik három kontextusra is)
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-02 — #145
- Kód: `bdb777a` — `pages/workout/climbing/naplo/*-session-edit.page.ts` (+ spec kontextusonként)
- Követő: [[148-ionic-verem-navigateback-mentes-utan]] — ugyanez a minta az app többi szerkesztő oldalán
