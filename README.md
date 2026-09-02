# Life Management 2.0

Személyes life-management alkalmazás (hibrid mobil + web). Stack:

- **Backend:** Java 25 – Spring Boot 4 (Gradle) + PostgreSQL, Flyway migráció
- **Frontend / mobil:** Ionic 8 – Angular 20 (Capacitor 8), Angular Signals
- **API szerződés:** OpenAPI spec-first – ebből generálódik a Spring interface és az Angular kliens
- **Offline:** backend-offline first + SQLite outbox queue (natív); a web build online-only

Monorepo: `backend/`, `frontend/`, `shared/fixtures/`, `scripts/`, `documentation/`, `backlog/`.
Dev környezet és futtatás: [`Fejlesztői környezet`](documentation/Architekt%C3%BAra/Fejleszt%C5%91i%20k%C3%B6rnyezet.md) · agent-guide: [`CLAUDE.md`](CLAUDE.md).

## Státusz

Az MVP leszállítva. A `documentation/` Obsidian vault a **jelenlegi, implementált állapot**
Single Source of Truth-ja (jelen idejű próza, a kód ellen auditálva — lásd
[`backlog/audit/ROLLUP.md`](backlog/audit/ROLLUP.md)). Minden specen `verifikalva` /
`verifikalt_commit` frontmatter jelzi a verifikáció dátumát és commitját.

Jövőbeli munka — feature, change request, bug — a repo gyökér [`backlog/`](backlog/)
jegyrendszerében él, nem a specben. Ha egy jegy elkészül, a hozzá tartozó spec frissül a
jelenlegi állapotra, a jegy pedig `backlog/archive/`-ba kerül. Konvenciók:
[`backlog/README.md`](backlog/README.md).

A kód-készültség kör-szintű változásnaplója: [`IMPLEMENTATION_STATUS.md`](IMPLEMENTATION_STATUS.md).

## Dokumentáció

A specifikáció Obsidian vault formájában a [`documentation/`](documentation/) mappában él.
Belépő jegyzet: [`Life Management 2.0`](documentation/Life%20Management%202.0.md).
Obsidianban: *Open folder as vault* → válaszd a `documentation` mappát.

| Mappa | Jelentés |
|---|---|
| `Features/` | Feature specifikációk |
| `Subfeatures/` | Alfeature specifikációk |
| `Architektúra/` | Architektúra-SSOT jegyzetek |

Az implementáció négy SSOT jegyzetből indul:
[`Frontend`](documentation/Architekt%C3%BAra/Frontend.md) (app-shell, feature flag registry),
[`Backend`](documentation/Architekt%C3%BAra/Backend.md) (stack, OpenAPI, séma),
[`Backend-offline first`](documentation/Architekt%C3%BAra/Backend-offline%20first.md) (offline szerződés),
[`Fejlesztői környezet`](documentation/Architekt%C3%BAra/Fejleszt%C5%91i%20k%C3%B6rnyezet.md) (monorepo, futtatás, Android telepítés).
