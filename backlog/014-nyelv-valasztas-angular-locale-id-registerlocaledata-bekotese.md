---
id: 14
type: feature
status: backlog
title: Nyelv valasztas: Angular LOCALE_ID / registerLocaleData bekotese
specs:
  - "[[Nyelv választás]]"
flag:
created: 2026-09-02
closed:
---

# 14 — Nyelv valasztas: Angular LOCALE_ID / registerLocaleData bekotese

## Motiváció / probléma

Nincs locale-regisztracio; a datum/szam pipe-ok mindig en-US szerint formaznak. A spec hu / en-GB megjelenitest var.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

Lásd a motivációt + a hivatkozott spec(ek) `### Jelenlegi működés` szakaszát.

## Elfogadási kritériumok

- [ ] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
- [ ] Ha „Nem scope” blokkból jött: a blokk törölve, helyette a megvalósult működés prózája.

## Terv / döntési napló

- **2026-10-19 (#150 megfigyelés):** a hiány a súgó-szövegekben is látszik — a biciklis élő edzés
  súgója és az összegző „durva becslés” jelzése a `ROAD_CIRCUITY_FACTOR`-t a `LOCALE_ID` szerint
  formázza (`bikeLiveHelpParams()` → `formatNumber`, ill. `| number`), ami ma `en-US`, így magyar
  felületen is „1.3” jelenik meg „1,3” helyett. A locale bekötésével ezek automatikusan javulnak
  (ehhez a `hu` locale-adatot `registerLocaleData`-val regisztrálni kell, különben a
  `formatNumber(…, 'hu')` hibát dob). Az app 36 fájlban használ `number` pipe-ot — mind érintett.
- **2026-10-19 (emulátoros UX-teszt):** a szinkronközpont magyar felületen is `en-US` formában írja
  az utolsó szinkron idejét („10/19/26, 2:12 PM”) — `sync.page.html` `| date: 'short'` (3 helyen). A locale
  bekötésével javul; a túra oldal `toFixed`-es számformázása viszont nem — az külön jegy:
  [[220-tura-tizedespont-magyar-feluleten]].

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
