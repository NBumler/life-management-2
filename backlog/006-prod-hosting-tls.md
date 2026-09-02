---
id: 6
type: feature
status: backlog
title: Prod hosting / TLS
specs:
  - "[[Backend]]"
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-09-02
closed:
---

# 6 — Prod hosting / TLS

## Motiváció / probléma

A `Life Management 2.0.md` §„Első kör (MVP) hatókör” és a `[[Backend]]` nyitott
kérdése: a dev környezet specifikált, a prod üzemeltetés / hosting / TLS nem. A natív
app `apiBaseUrl`-je konfiguráció, így a kliens nem blokkolt, de éles kiadáshoz kell.

## Jelenlegi működés

`docker compose` a dev Postgreshez; `./gradlew bootRun` local profil, `http://localhost:8080`.
A natív app `assets/config/app-config.json` → `apiBaseUrl` runtime asset. Nincs prod
deploy pipeline, nincs TLS-terminálás, nincs prod reverse proxy dokumentálva.

## Elfogadási kritériumok

- [ ] Prod hosting cél kiválasztva és dokumentálva.
- [ ] TLS-terminálás + reverse proxy (`/api`) beállítva.
- [ ] A `[[Backend]]` nyitott kérdése (prod hosting / TLS) lezárva.

## Terv / döntési napló

_Nincs elkötelezettség; rögzítés az MVP-hatókör táblából + a `[[Backend]]` nyitott
kérdéséből._

## Lezáráskor (on-done)

- Frissített specek: [[Backend]], [[Fejlesztői környezet]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
