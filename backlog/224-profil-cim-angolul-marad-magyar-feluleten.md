---
id: 224
type: bug
status: backlog
title: Profil — a menüpont és az oldalcím magyar felületen is „Profile”
specs:
  - "[[Nyelv választás]]"
  - "[[Profile]]"
flag:
created: 2026-10-19
closed:
---

# 224 — Profil — a menüpont és az oldalcím magyar felületen is „Profile”

## Motiváció / probléma

Magyar felületen a Menü „Profile” sora és a Profil oldal címe angolul marad.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `assets/i18n/hu.json`: `MENU.PROFILE` = „Profile”, `PROFILE.TITLE` = „Profile” (ugyanaz, mint az `en.json`-ben).
- A `verify:i18n` csak a kulcs- és paraméter-egyezést nézi, a fordítatlan értéket nem.

## Elfogadási kritériumok

- [ ] `MENU.PROFILE` és `PROFILE.TITLE` magyarul („Profil”).
- [ ] Átnézve a többi, a hu és en fájlban azonos értékű kulcs (2026-10-19: pl. `AYCM.CHECK_IN.TITLE` „Check-In”, `TASKS.CALENDAR.MONTH_NAMES.10/11` „November” / „December”, `FOOD.IMPORT.SECTION_INVALID` „Invalid”, `SYNC.STATE_ONLINE` „Online”, `WORKOUT.SESSION.SET_TYPE.REST_PAUSE`), és ami nem szándékos (márkanév / szakkifejezés), az lefordítva.
- [ ] Megfontolva egy `verify:i18n` figyelmeztetés az azonos hu / en értékekre, engedélylistával — döntés a naplóban.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: [[Nyelv választás]], [[Profile]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #224
- Kód: `frontend/src/assets/i18n/hu.json`, esetleg `scripts/verify-i18n*`
