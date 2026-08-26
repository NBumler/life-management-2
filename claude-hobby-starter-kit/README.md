# Claude Code starter kit — Spring Boot + Ionic Angular hobbi projekt

Kész konfigurációs csomag a Claude Code-hoz, a saját (nem céges) fejlesztői
konvencióiddal. Minden projekt-lokális: a repódba commitolod, és bármely gépen,
ami klónozza, a Claude Code magától felismeri — céges import nélkül is.

## Teljes tartalom

```
CLAUDE.md                              # a projekt leírása — töltsd ki a [SZÖGLETES] részeket
.gitignore                             # Java/Gradle + Node/Angular/Ionic + IDE/OS + secrets
.editorconfig                          # egységes formázás (2 space, Java 4 space, LF, UTF-8)
frontend/
├── proxy.conf.json                    # dev proxy: frontend /api -> backend :8080 (CORS nélkül)
└── README-proxy.md                    # hogyan kösd be a proxy-t
.claude/
├── skills/
│   ├── general-principles/            # KISS / YAGNI / egyszerűség — döntési reflexek
│   │   └── SKILL.md
│   ├── git-conventions/               # Conventional Commits + branch elnevezés
│   │   └── SKILL.md
│   ├── spring-boot-conventions/       # backend (auto-betöltődik java kódnál)
│   │   ├── SKILL.md
│   │   └── references/
│   │       ├── error-handling.md      # @RestControllerAdvice, egységes ApiError
│   │       ├── testing.md             # JUnit5 + Mockito + Testcontainers
│   │       └── database-migrations.md # Flyway vs Liquibase — ITT döntesz
│   └── ionic-angular-conventions/     # frontend (auto-betöltődik Angular kódnál)
│       ├── SKILL.md
│       └── references/
│           ├── i18n.md                # ngx-translate: setup, kulcsnevek, használat
│           └── testing.md             # TestBed komponens- és service-teszt
└── commands/                          # egyedi /parancsok
    ├── run-app.md                     # /run-app        — backend + frontend indítás
    ├── gen-api-client.md              # /gen-api-client — OpenAPI -> Angular kliens
    ├── new-feature.md                 # /new-feature    — feature scaffold mindkét oldalon
    ├── review-local.md                # /review-local   — self-review commit előtt
    └── commit.md                      # /commit         — Conventional Commit üzenet + commit
```

## Hogyan használd

1. Csomagold ki a zip-et, és másold a tartalmat a **hobbi projekted gyökerébe**
   (a monorepo tetejére, ahol a `backend/` és `frontend/` van):
   - `CLAUDE.md`, `.gitignore`, `.editorconfig` -> repo gyökér
   - `.claude/` mappa -> repo gyökér
   - `frontend/proxy.conf.json` -> a meglévő `frontend/` mappádba
     (a `frontend/README-proxy.md`-t elolvasás után törölheted)
2. Nyisd meg a `CLAUDE.md`-t, és töltsd ki a `[SZÖGLETES]` helyőrzőket.
3. Döntsd el a DB-migrációs eszközt (Flyway vagy Liquibase), és igazítsd hozzá
   a `database-migrations.md`-t + a `CLAUDE.md` "DB migráció" sorát.
4. Kösd be a dev proxy-t (lásd `frontend/README-proxy.md`).
5. Commitold be — ettől kezdve a Claude Code minden gépen ezeket használja.

## Mi történik automatikusan

- A `CLAUDE.md` minden beszélgetésnél betöltődik ebben a projektben.
- A skillek **automatikusan** aktiválódnak a `description`-jük alapján:
  general-principles (döntéseknél), git-conventions (commitnál), java kódnál a
  spring-boot-conventions, Angular kódnál az ionic-angular-conventions.
- A parancsokat te hívod: `/run-app`, `/gen-api-client`, `/new-feature <név>`,
  `/review-local`, `/commit`.

## Testreszabás

Ezek a te szabályaid — bátran szerkeszd. A skillek fejléce (`name`,
`description`) a fontos: a `description` dönti el, mikor töltődik be a skill.
Ha valami nem aktiválódik magától, pontosítsd ott a trigger-kifejezéseket.

## Megjegyzés a céges pluginról

Ezen a gépen a céges `intuitech-dev-toolkit` skilljei (java-standards,
angular-standards) is betöltődhetnek. A projekt-lokális beállítás a
specifikusabb, tehát ez a csomag felülírja/pontosítja őket. Más gépen (céges
import nélkül) tisztán ezek a szabályok érvényesülnek.
