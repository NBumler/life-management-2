---
id: 225
type: change-request
status: backlog
title: Szinkron — a fejléc szinkron-állapot gombjának nincs felirata, a jelentése nem derül ki
specs:
  - "[[Szinkronizációs központ]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-10-19
closed:
---

# 225 — Szinkron — a fejléc szinkron-állapot gombjának nincs felirata, a jelentése nem derül ki

## Motiváció / probléma

A Kezdőlap (és más oldalak) fejlécében egy szürke pipás kör ikon van; nem derül ki, hogy a szinkron állapotát jelzi, és hogy a szinkronközpontba visz.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `shared/sync-status-button/sync-status-button.component.html`: állapotonként ikon (`checkmark-circle-outline`, `time-outline`, `alert-circle`, `airplane-outline`, `cloud-offline-outline`), mindegyik `aria-hidden="true"`; a gombnak nincs `aria-label`-je és felirata.

## Elfogadási kritériumok

- [ ] A gombnak állapottól függő, lefordított `aria-label`-je van (pl. „Szinkronizálva”, „3 várakozó változás”, „Offline”), hu + en.
- [ ] A jelentés vizuálisan is kiderül (pl. hosszú nyomásra / első alkalommal tooltip, vagy rövid szöveg a szinkronközpont fejlécében, ahová visz).

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: [[Szinkronizációs központ]], [[Backend-offline first]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #225
- Kód: `frontend/src/app/shared/sync-status-button/`, `assets/i18n/{hu,en}.json`
