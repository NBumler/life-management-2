---
id: 153
type: feature
status: deferred
title: Biciklizés — energiatakarékos (ECO) tracker mód
specs:
  - "[[Biciklizés napló]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-10-06
closed:
---

# 153 — Biciklizés — energiatakarékos (ECO) tracker mód

## Motiváció / probléma

A [[150-biciklizes-elo-gps-tracker]] eredetileg három módot tervezett: Pontos, Energiatakarékos (ECO)
és Becsült. Az ECO mód az akkumulátor kímélését ígérte: „X másodpercenként egy pozíció”.

A 0. fázis spike-ja (2026-10-06) kimutatta, hogy a választott közösségi
`@capacitor-community/background-geolocation` plugin **nem támogat időalapú intervallumot**, csak
távolságszűrőt (`distanceFilter`). A GPS-hardver ilyenkor is folyamatosan fut, így a távolságalapú
változat is csak a visszahívások és mentések számát csökkentené, az akkumulátor-megtakarítás
pedig kicsi.

## Döntés (2026-10-06, felhasználóval egyeztetve)

- Az ECO mód **kimarad** a 150-es feature első körében (2 mód: Pontos, Becsült).
- A jegy `deferred`: nincs tervezett munka, csak nyoma marad, hogy a döntés visszakereshető.
- Újranyitási feltétel: ha az akkumulátor-fogyás zavaró lesz a Pontos módban, vagy ha a
  Transistorsoft-féle plugin licencköltsége / saját Capacitor-plugin megvalósítása szóba kerül.

## Jelenlegi működés

Nincs — a mód nincs implementálva.

## Lehetséges megoldások (ha újranyitjuk)

1. **Transistorsoft plugin** (`@transistorsoft/capacitor-background-geolocation`): időalapú
   intervallum és valódi GPS-alvás; release-hez fizetős licenc (`CUSTOM`).
2. **Saját Capacitor plugin** a fused location providerre, foreground service-szel, időalapú
   ébresztéssel (AlarmManager / WorkManager).
3. **Távolságalapú ECO** a közösségi pluginnal: csak nyereség a mentésben, nem a GPS-ben.

## Elfogadási kritériumok

- [ ] Mérés: 1 óra Pontos vs. ECO akkumulátor-fogyás valódi eszközön, ECO-val legalább 30%
      megtakarítás, különben a mód nem éri meg.
- [ ] Ha megvalósul: a mód-választó és a súgó hu + en szöveg frissítve.

## Terv / döntési napló

- 2026-10-06: ECO kimarad, a jegy `deferred`.

## Lezáráskor (on-done)

- Frissített specek: [[Biciklizés napló]] (ha a mód bekerül)
- `IMPLEMENTATION_STATUS.md`: nincs, amíg nem készül el
