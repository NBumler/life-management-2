---
id: 113
type: change-request
status: done
title: Út szerkesztő — szektor-hossz előtöltés az új út hossz mezőjéhez, vagy legalább felülírás-hint
specs:
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-19
closed: 2026-09-20
---

# 113 — Út szerkesztő — szektor-hossz előtöltés az új út hossz mezőjéhez, vagy legalább felülírás-hint

## Motiváció / probléma

A napló-oldali öröklési sorrend (`Route.lengthInMeters` → `Sector.defaultLengthInMeters` →
kézi felülírás, `backlog/088`, [[Outdoor köteles admin]] "Naplózáskor a Route kiválasztása...")
jól dokumentált és van hozzá UI-hint az **út szerkesztőn** a fekvés (`aspect`) mezőnél:
`ROUTE.FIELD_ASPECT` = *"Fekvés (felülírja a szektor alapot)"* (`frontend/src/assets/i18n/hu.json`).
A `ROUTE.FIELD_LENGTH` mezőnél ("Hossz (m)") nincs ilyen üzenet, pedig a hossz pontosan
ugyanúgy felülírja a szektor `defaultLengthInMeters`-ét a naplóban — ez a következetlenség
összezavaró: az egyik mezőnél explicit figyelmeztetés van, a másiknál nincs.

## Jelenlegi működés

`frontend/src/app/pages/workout/climbing/admin/route-edit.page.html` — a `lengthInMeters`
`ion-input`-nak nincs se előtöltése a szülő szektor `defaultLengthInMeters`-éből, se hint
szövege. A `FIELD_ROCK_TYPE` / `FIELD_ASPECT` cím már tartalmazza a "(felülírja a
szektor/szikla alapot)" utótagot.

## Elfogadási kritériumok

Két lehetséges megoldás — az egyiket válaszd, a döntést írd a "Terv / döntési napló"-ba:

- [x] **A) Előtöltés:** amikor a user egy szektoron belül új utat hoz létre, a hossz mező
      alapértéke a szektor `defaultLengthInMeters`-e legyen (üres marad, ha a szektornak
      nincs default hossza); a user szabadon felülírhatja mentés előtt.
- [ ] ~~B) Hint~~ — nem választott alternatíva, ld. döntési napló.
- [x] A választott megoldás csak az **admin szerkesztő űrlapot** érinti, a napló-oldali
      öröklési logikát ([[Outdoor köteles admin]]) nem változtatja meg.
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

**A) Előtöltés** mellett döntöttünk — a jegy motivációjában ez volt az elsődleges kérés, a hint
(B) csak konzisztencia-fallbackként merült fel arra az esetre, ha az előtöltés valamiért nem
férne bele az UI-ba. Az előtöltés jobban illeszkedik a napló-oldali öröklési mintához is (a
napló ugyanígy előtölti a hosszt Route kiválasztásakor). Implementáció:
`RouteEditPage.ngOnInit()` új-út ágán (`idParam === 'new'`) betölti a `SectorRepository`-t, és ha
a szülő szektornak van `defaultLengthInMeters`-e, azzal `patchValue`-zza a `lengthInMeters`
form-mezőt; szerkesztéskor (meglévő route) ez az ág nem fut le.

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor köteles admin]] — `Route` táblázat sora kiegészítve az előtöltés
  leírásával; `verifikalt_commit` bump
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-20 — #113 új út hossz-mező előtöltése a szektor alapértelmezett hosszával
- Kód: `frontend/src/app/pages/workout/climbing/admin/route-edit.page.ts` (+ `.spec.ts`) — a
  `SectorRepository` injektálása és a `defaultLengthInMeters` előtöltés; nincs outbox/backend hatás
