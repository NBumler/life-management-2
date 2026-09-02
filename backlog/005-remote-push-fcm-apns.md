---
id: 5
type: feature
status: backlog
title: Remote push (FCM / APNs)
specs:
  - "[[Értesítések]]"
flag:
created: 2026-09-02
closed:
---

# 5 — Remote push (FCM / APNs)

## Motiváció / probléma

A `Life Management 2.0.md` §„Első kör (MVP) hatókör” és az `[[Értesítések]]` spec
(„Remote push: későbbi scope”): az első kör kizárólag lokális ütemezés. Szerver-oldali
push akkor kell, ha az értesítéseknek eszközfüggetlennek vagy szerver-triggereltnek
kell lenniük.

## Jelenlegi működés

Minden értesítés lokálisan ütemezett a kliensen (natív `AlarmManager` / `WorkManager`
`ReminderWorker`, cold-start újraértékelés). Nincs FCM/APNs regisztráció, nincs
szerver-oldali push-küldés, nincs `device_token` tábla.

## Elfogadási kritériumok

- [ ] Push-token regisztráció (FCM Android, APNs iOS) + szerver-oldali tárolás.
- [ ] Szerver → eszköz push útvonal, dedupe a lokális ütemezéssel.
- [ ] Az `[[Értesítések]]` spec frissítve.

## Terv / döntési napló

_Nincs elkötelezettség; rögzítés az MVP-hatókör táblából. NEM architektúra-döntés
(`@capacitor/background-runner`), hanem valódi funkció-bővítés._

## Lezáráskor (on-done)

- Frissített specek: [[Értesítések]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
