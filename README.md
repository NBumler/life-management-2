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
| `Subfeatures/` | Alfeature specifikációk |
| `Subfeatures - TODO/` | Stub / részleges alfeature-ök (ma csak egy archív pointer) |
| `Architektúra/` | Architektúra jegyzetek |

A `- TODO` mappák csak addig léteznek, amíg van bennük tartalom.

## Státusz

Jelenleg **csak dokumentáció** van a repóban; az implementáció még nem indult.

A specifikáció **lezárva**: minden feature és architektúra jegyzet `Kész`. Az implementáció négy SSOT jegyzetből indul: [`Frontend`](documentation/Architekt%C3%BAra/Frontend.md) (app-shell, feature flag registry), [`Backend`](documentation/Architekt%C3%BAra/Backend.md) (stack, OpenAPI, séma), [`Backend-offline first`](documentation/Architekt%C3%BAra/Backend-offline%20first.md) (offline szerződés) és [`Fejlesztői környezet`](documentation/Architekt%C3%BAra/Fejleszt%C5%91i%20k%C3%B6rnyezet.md) (monorepo, futtatás, Android telepítés).

Nyitva szándékosan: prod hosting / TLS és az iOS build — egyik sem blokkolja a fejlesztést.
