---
id: 8
type: change-request
status: backlog
title: openapi-generator Spring Boot 4 kimenet-ellenőrzés
specs:
  - "[[Backend]]"
flag:
created: 2026-09-02
closed:
---

# 8 — openapi-generator Spring Boot 4 kimenet-ellenőrzés

## Motiváció / probléma

A `[[Backend]]` / `Life Management 2.0.md` nyitott kérdése: az openapi-generator
`spring` profiljának Spring Boot 4 / Framework 7 kimenetét verzió-pineléskor
ellenőrizni kell (tartalék: kézzel írt API interface). Karbantartási emlékeztető, nem
tervezési hiány — ezért `backlog/` jegy, nem spec-beli nyitott kérdés.

## Jelenlegi működés

Az `openApiGenerate` Gradle task fut `compileJava` előtt, Java interfészeket + DTO-kat
generál `build/generated/openapi/`-ba; a controllerek ezeket implementálják. A generált
kimenet Spring Boot 4-gyel jelenleg fordul (a build zöld).

## Elfogadási kritériumok

- [ ] A generátor / Spring Boot verzió következő emelésekor a generált interfészek +
      validációs annotációk manuálisan átnézve.
- [ ] Ha a kimenet eltér: dokumentált döntés (generátor-frissítés vs. kézzel írt interface).
- [ ] A `[[Backend]]` nyitott kérdése lezárva vagy pointerré rövidítve.

## Terv / döntési napló

_Verzió-emeléskor aktiválódik; addig `backlog`._

## Lezáráskor (on-done)

- Frissített specek: [[Backend]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
