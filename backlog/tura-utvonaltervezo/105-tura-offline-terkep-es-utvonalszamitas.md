---
id: 105
type: feature
status: ready
title: Túra — offline térkép-letöltés és offline útvonalszámítás
specs: []
flag:
created: 2026-09-13
closed:
---

# 105 — Túra — offline térkép-letöltés és offline útvonalszámítás

## Motiváció / probléma

Szinte **minden** versenytárs alkalmazásnál (Mapy.cz, Locus Map, OsmAnd, Komoot, bergfex,
AllTrails, Gaia GPS) az offline térkép-letöltés és/vagy offline útvonalszámítás a legfőbb fizetős
funkció. Ez az app viszont már architekturálisan offline-first (lásd [[Backend-offline first]]) —
ez a természetes differenciátor: amit másoknál elő kell fizetni, az nálunk alapból jár.

## Jelenlegi működés

Nincs — ez egy vadonatúj feature. A meglévő offline-first kontraktus (helyi SQLite + outbox,
delta-sync) más entitásokra épül, térképi csempe-/vektoradat offline tárolására még nincs minta.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.
- [ ] Az offline térkép-tárolás módja explicit rákötve a [[Backend-offline first]] kontraktra:
      melyik connectivity-state-ben mi működik (`ONLINE`, `BACKEND_OFFLINE`, `FULL_OFFLINE`).

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Régiónkénti offline térkép-letöltés — **kell**, ez legyen az alapértelmezett, ingyenes élmény.
- [x] Offline útvonalszámítás (új útvonal kiszámítása internet nélkül) — **kell, explicit döntés**:
      a felhasználó a valódi offline routingot választotta a "csak megtervezett útvonal offline
      használata" light-verzió helyett, mert ez a legnagyobb differenciátor a versenytársakhoz
      képest. Ez jelentős extra munka — helyi routing motor kell (pl. beágyazott BRouter-szerű
      megoldás), lásd nyitott kérdés.
- [x] Automatikus/kézi "előretöltés" a tervezett túra környékére — **kell**.
- [x] Tárhely-kezelés UI (mekkora terület van letöltve, törölhető-e) — **kell**.
- [x] Web build explicit **online-only** marad ezen a területen is (nincs SQLite, nincs offline
      térkép a webes buildben) — ez követi a meglévő `offlineCapable` flag mintát, nem volt vitás pont.

### Nyitott kérdés

- Térkép-csempe formátum és tárolás: natív fájlrendszer (Capacitor Filesystem plugin) vagy SQLite
  BLOB-ok? Ez erősen összefügg a `104-tura-adatforras-integracio.md` adatforrás-választásával és a
  `103-...` térkép-technológia döntésével — a három ticketet egymással konzisztensen kell zárni.
- Mekkora egy "régió" — közigazgatási határ, rács alapú csempe-terület, vagy a felhasználó által
  szabadon rajzolt terület?
- Offline útvonalszámítás motorjának választása (saját implementáció vs. beágyazott nyílt forráskódú
  routing engine).

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_ + [[Backend-offline first]] érintettség
  átvezetése, ha a kontraktus bővül
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` `core/storage/` bővítés, natív Capacitor plugin(ok)
