# Life Management 2.0

Személyes life-management alkalmazás (hibrid mobil + web). Stack terv:

- **Backend:** Java – Spring Boot (Gradle) + PostgreSQL, Flyway migráció
- **Frontend / mobil:** Ionic – Angular (Capacitor), Angular Signals
- **API szerződés:** OpenAPI spec-first – ebből generálódik a Spring interface és az Angular kliens
- **Offline:** backend-offline first + SQLite outbox queue (natív); a web build online-only

Tervezett monorepo elrendezés (kód még nincs): `backend/`, `frontend/`, `shared/fixtures/`, `scripts/`, `documentation/`. Részletek: [`Fejlesztői környezet`](documentation/Architekt%C3%BAra/Fejleszt%C5%91i%20k%C3%B6rnyezet.md).

## Dokumentáció

A specifikáció Obsidian vault formájában a [`documentation/`](documentation/) mappában él. Belépő jegyzet: [`Life Management 2.0`](documentation/Life%20Management%202.0.md).

Obsidianban: *Open folder as vault* → válaszd a `documentation` mappát.

### Mappák

| Mappa | Jelentés |
|---|---|
| `Features/` | Feature specifikációk |
| `Feature - TODO/` | Hiányos feature specifikációk |
| `Subfeatures/` | Kidolgozottabb alfeature-ök |
| `Subfeatures - TODO/` | Stub / részleges alfeature-ök |
| `Architektúra/` | Architektúra jegyzetek |
| `Architektúra - TODO/` | Architektúra stubok |

## Státusz

Jelenleg **csak dokumentáció** van a repóban; az implementáció még nem indult.
