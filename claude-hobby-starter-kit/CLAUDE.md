# CLAUDE.md

> Ez a fájl tanítja meg a Claude Code-nak, milyen ez a projekt. A repo
> gyökerében él, git-elve utazik a projekttel, így minden gépen érvényes.
> A `[SZÖGLETES]` részeket töltsd ki / igazítsd a sajátodra.

## Project Info

- **Név:** [PROJEKT_NEVE]
- **Típus:** Monorepo — `backend/` (Java Spring Boot) + `frontend/` (Ionic Angular)
- **Repo:** [git remote URL]
- **Tech stack:** Java Spring Boot (backend) + Ionic Angular (frontend)
- **Build:** Gradle (backend), npm + Angular CLI / Ionic CLI (frontend)
- **DB migráció:** [DÖNTSD EL: Flyway VAGY Liquibase — lásd a spring-boot-conventions skillt]
- **i18n:** ngx-translate (futásidejű nyelvváltás)

## How Claude should work here

- Válaszolj magyarul, hacsak nem angolul kérdezek.
- Kövesd a KISS és YAGNI elvet: a legegyszerűbb megoldást válaszd, ne tervezz túl.
  Ha DRY és egyszerűség ütközik, az egyszerűség nyer. Ez egy hobbi projekt —
  ne vezess be absztrakciót, amíg nincs rá valódi, jelenlegi igény.
- Új kódnál előbb nézd meg a meglévő mintákat, és illeszkedj hozzájuk.
- A backend konvenciókat a `spring-boot-conventions`, a frontendet az
  `ionic-angular-conventions` skill részletezi — ezek automatikusan betöltődnek.
- Ne módosíts git történelmet, ne pusholj, ne törölj branch-et kérdés nélkül.

## Repository layout

```
backend/          # Java Spring Boot alkalmazás (Gradle)
  src/main/java/
  src/main/resources/
  build.gradle(.kts)
frontend/         # Ionic Angular alkalmazás
  src/app/
  package.json
```

## Useful Commands

### Backend (`backend/`)
- Futtatás: `./gradlew bootRun`
- Build: `./gradlew build`
- Teszt: `./gradlew test`
- Egy teszt: `./gradlew test --tests "*UserServiceTest"`

### Frontend (`frontend/`)
- Futtatás (böngésző): `npm start` (vagy `ionic serve`)
- Build: `npm run build`
- Teszt: `npm test`
- Lint: `npm run lint`
- OpenAPI kliens generálás: `npm run gen:api`  ← lásd `/gen-api-client` parancs

## Project-Specific Rules

### Architecture
- Backend: feature-alapú csomagszervezés (nem réteg-alapú) — lásd spring-boot-conventions.
- Frontend: pages-alapú struktúra, a gyerek-komponensek a szülő mappájában.

### API contract (fontos!)
- A backend adja az OpenAPI specet; a frontend Angular kliense **generált**,
  NEM kézzel írt. Ha a backend API változik: regeneráld a klienst (`/gen-api-client`),
  ne szerkeszd kézzel a `frontend/src/app/api/` alatti generált fájlokat.

### Important Files
- [pl. `backend/src/main/resources/application.yml` — konfiguráció]
- [pl. `frontend/src/environments/environment.ts` — környezeti beállítások]
- [OpenAPI spec helye: pl. `backend/src/main/resources/openapi.yaml`]

<!-- Töltsd fel, ahogy nő a projekt. Csak valódi, ellenőrzött tényeket írj ide. -->
