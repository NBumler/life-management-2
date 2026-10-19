---
id: 224
type: bug
status: done
title: Profil — a menüpont és az oldalcím magyar felületen is „Profile”
specs:
  - "[[Nyelv választás]]"
  - "[[Profile]]"
flag:
created: 2026-10-19
closed: 2026-10-19
---

# 224 — Profil — a menüpont és az oldalcím magyar felületen is „Profile”

## Motiváció / probléma

Magyar felületen a Menü „Profile” sora és a Profil oldal címe angolul marad.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `assets/i18n/hu.json`: `MENU.PROFILE` = „Profile”, `PROFILE.TITLE` = „Profile” (ugyanaz, mint az `en.json`-ben).
- A `verify:i18n` csak a kulcs- és paraméter-egyezést nézi, a fordítatlan értéket nem.

## Elfogadási kritériumok

- [x] `MENU.PROFILE` és `PROFILE.TITLE` magyarul („Profil”).
- [x] Átnézve a többi, a hu és en fájlban azonos értékű kulcs (2026-10-19: pl. `AYCM.CHECK_IN.TITLE` „Check-In”, `TASKS.CALENDAR.MONTH_NAMES.10/11` „November” / „December”, `FOOD.IMPORT.SECTION_INVALID` „Invalid”, `SYNC.STATE_ONLINE` „Online”, `WORKOUT.SESSION.SET_TYPE.REST_PAUSE`), és ami nem szándékos (márkanév / szakkifejezés), az lefordítva.
- [x] Megfontolva egy `verify:i18n` figyelmeztetés az azonos hu / en értékekre, engedélylistával — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — `MENU.PROFILE` és `PROFILE.TITLE` → „Profil”. Átnézve a többi azonos hu / en érték: lefordítva `FOOD.IMPORT.SECTION_INVALID` („Érvénytelen”) és `SYNC.STATE_ONLINE` („Kapcsolódva”, a többi állapot is magyar mondat). Szándékosan azonos marad: márkanevek (GearCheck, AYCM, Health Connect, „Life Management”), mértékegységek, a mászó / edzés szakkifejezések (Boulder, Flash, Redpoint, Onsight, Trad, Rest-pause, Dropset rövidítések), „Sport”, „OK”, az `AYCM.CHECK_IN.TITLE` („Check-In” — az AYCM saját fogalma). A „November” / „December” a hónapnév-tömb része, és az egész tömb különbözik, így nem jelez.
- 2026-10-19 — döntés: a `verify:i18n` **figyelmeztet** (nem bukik el) az azonos hu / en értékekre, az `IDENTICAL_ALLOWED` engedélylistán kívül; betű nélküli értékek (`~`, `#`, csak `{{param}}`) kimaradnak. Kipróbálva: a „Kapcsolódva” visszaírása „Online”-ra egy figyelmeztetést adott.
- 2026-10-19 — emulátoron: a Menüben „Profil” látszik.

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]], [[Profile]], [[Fejlesztői környezet]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #207, #211, #220, #224, #225
- Kód: `frontend/src/assets/i18n/hu.json`, `frontend/scripts/verify-i18n.mjs`
