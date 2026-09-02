---
id: 3
type: feature
status: backlog
title: Web mint kiadott platform
specs:
  - "[[Frontend]]"
  - "[[Backend-offline first]]"
flag:
created: 2026-09-02
closed:
---

# 3 — Web mint kiadott platform

## Motiváció / probléma

A `Life Management 2.0.md` §„Első kör (MVP) hatókör” tudatos vágása: a web build
fordul és fejlesztésre használható, de **nem QA-zott**, és offline nem támogatott.
Rendszerszintű bővítés, ha a web valódi kiadott célponttá válik.

## Jelenlegi működés

Web build online-only (`offlineCapable = false`): nincs SQLite, nincs outbox; a
`HttpStorageBackend` közvetlenül a generált klienst hívja. Nincs web-specifikus QA-kör.
Lásd `[[Frontend]]` (web hatókör), `[[Backend-offline first]]` §17.

## Elfogadási kritériumok

- [ ] Web-specifikus QA-kör definiálva és lefuttatva.
- [ ] Döntés az offline-viselkedésről weben (marad online-only vs. korlátozott offline).
- [ ] Prod hosting / reverse proxy (átfed [[006-prod-hosting-tls]]).

## Terv / döntési napló

_Nincs elkötelezettség; rögzítés az MVP-hatókör táblából._

## Lezáráskor (on-done)

- Frissített specek: [[Frontend]], [[Backend-offline first]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
