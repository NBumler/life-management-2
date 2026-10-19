---
id: 225
type: change-request
status: done
title: Szinkron — a fejléc szinkron-állapot gombjának nincs felirata, a jelentése nem derül ki
specs:
  - "[[Szinkronizációs központ]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-10-19
closed: 2026-10-19
---

# 225 — Szinkron — a fejléc szinkron-állapot gombjának nincs felirata, a jelentése nem derül ki

## Motiváció / probléma

A Kezdőlap (és más oldalak) fejlécében egy szürke pipás kör ikon van; nem derül ki, hogy a szinkron állapotát jelzi, és hogy a szinkronközpontba visz.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `shared/sync-status-button/sync-status-button.component.html`: állapotonként ikon (`checkmark-circle-outline`, `time-outline`, `alert-circle`, `airplane-outline`, `cloud-offline-outline`), mindegyik `aria-hidden="true"`; a gombnak nincs `aria-label`-je és felirata.

## Elfogadási kritériumok

- [x] A gombnak állapottól függő, lefordított `aria-label`-je van (pl. „Szinkronizálva”, „3 várakozó változás”, „Offline”), hu + en.
- [x] A jelentés vizuálisan is kiderül (pl. hosszú nyomásra / első alkalommal tooltip, vagy rövid szöveg a szinkronközpont fejlécében, ahová visz).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-19 — a gomb állapotfüggő, lefordított `aria-label`-t és `title`-t kap (`syncButtonLabel`, `SYNC.BUTTON.*`; ugyanaz a sorrend, mint az ikoné: szinkronizálás → hibás → várakozó → kapcsolat), natívan a „Koppints a szinkronizációs központ megnyitásához” tippel. Vizuálisan: **hosszú nyomásra** (500 ms) ugyanez toastban a képernyő tetején, és ilyenkor a gomb nem navigál. A web buildben a gomb továbbra is `disabled`.
- 2026-10-19 — emulátoron: hosszú nyomás → „Minden változás szinkronizálva / Koppints a szinkronizációs központ megnyitásához”, az oldal nem váltott; rövid koppintás → `/tabs/menu/sync`. Angolul az `aria-label` „All changes synced. Tap to open the sync center”. Unit teszt: `sync-status-button.component.spec.ts`.

## Lezáráskor (on-done)

- Frissített specek: [[Szinkronizációs központ]], [[Backend-offline first]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #207, #211, #220, #224, #225
- Kód: `frontend/src/app/shared/sync-status-button/` (+ spec), `assets/i18n/{hu,en}.json`
