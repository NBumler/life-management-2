---
id: 106
type: feature
status: ready
title: Túra — élő GPS-navigáció, track-felvétel, élő helymegosztás
specs: []
flag:
created: 2026-09-13
closed:
---

# 106 — Túra — élő GPS-navigáció, track-felvétel, élő helymegosztás

## Motiváció / probléma

Túrázás közben a felhasználó valós idejű GPS-pozíciót, útvonal-rögzítést, és — biztonsági okból —
esetleg élő helymegosztást/vészjelzést szeretne. A "GPS-es live offline túrázás" a felhasználó
egyik konkrét panasza a versenytársakkal szemben (gyakran fizetős, pl. Wikiloc Premium élő
tracking, Természetjáró BuddyBeacon).

## Jelenlegi működés

Nincs — ez egy vadonatúj feature. A `073-climbing-crag-gps-terkep-nezet-placeholder.md` ticket már
felvetette a Capacitor geolocation plugin használatát egy más kontextusban (crag GPS-koordináta) —
érdemes onnan mintát/tanulságot átvenni GPS input UX terén.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.
- [ ] Backend-offline szempont tisztázva: élő navigáció **FULL_OFFLINE**-ban (nincs internet, csak
      helyi GPS-jel) is működnie kell — ez a feature lényege, nem opcionális él.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Élő pozíció megjelenítés a térképen — **kell**.
- [x] Track-felvétel (GPX-log a megtett útról) — **kell**.
- [x] Turn-by-turn / hangalapú navigáció a tervezett útvonal mentén — **kell**.
- [x] Letérés-figyelmeztetés — **kell**.
- [x] SOS/vészhívás jelenlegi GPS-pozícióval — **kell**.
- [ ] Élő helymegosztás ismerősökkel/vészhelyzeti kontakttal — **nem kell** (explicit kizárva;
      indoklás: online-függő funkció lenne egy egyébként offline-first feature-ben, és a SOS-hívás
      már lefedi a biztonsági alapigényt)
- [ ] Akkumulátor-kímélő GPS-mintavételezési mód hosszú túrákhoz — nem került döntésre, implementációs
      részletkérdésnek tekintjük, nem külön feature-döntésnek.

### Nyitott kérdés

- SOS-hívás natív telefonhívás-e (egyszerű `tel:` link a mentők számára + GPS-koordináta), vagy
  valamilyen backend-integráció (pl. automatikus SMS/email egy vészhelyzeti kontaktnak)?
- `@capacitor/local-notifications` már használatban van más feature-höz — újrafelhasználható-e
  letérés-figyelmeztetéshez?
- Turn-by-turn hangalapú navigáció FULL_OFFLINE-ban is működnie kell (a `105-...` offline
  útvonalszámítás tickettel közös alapra épül) — implementációkor egyeztetendő.

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` Capacitor Geolocation plugin integráció, `core/data/` track-repository
