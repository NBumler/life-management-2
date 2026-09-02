---
verifikalva: 2026-09-02
verifikalt_commit: 9a41447
---

# Life Management 2.0

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | _Nincs szülő (hub / architektúra / gyökér)._ |
| **Kapcsolódó** | [[Backend]], [[Frontend]], [[Fejlesztői környezet]], [[Backend-offline first]], [[Mennyiség mező]], [[Szöveges keresés]], [[Névegyediség]], [[Bejelentkezés]], [[Nyelv választás]], [[Dark&Light mode]], [[SPEC-TEMPLATE]] |

### Jelenlegi működés

Személyes life-management alkalmazás (hibrid mobil + web). Több felhasználóra is felkészülünk, de az elsődleges cél a személyes használat.

### Funkcionális leírás

#### Általános elvek

- Minden feature **feature flag**-hez kötve a hibridben, hogy az alkalmazás egyes feature-ök nélkül is kiadható legyen. A flag-ek **build-time ship configból** jönnek (nincs in-app kapcsoló); a core (nem kapcsolható) kör és a teljes flag registry SSOT-ja: [[Frontend]].
- Input mezők egységesítve; web vs mobil esetén a platformnak megfelelő, legkényelmesebb kontroll.
- Ha egy felületen egyértelmű, hogy melyik inputot fogja használni a user, az mező legyen automatikusan fókuszban.
- Offline / backend-offline állapot kezelése: [[Backend-offline first]] + [[Szinkronizációs központ]]. Az offline működés a **natív** builden teljes; a **web build online-only**.
- **Nyelv és téma:** mindkettő a készülék beállítását követi alapértelmezésben (fallback: magyar, illetve light / dark a rendszertől), a user felülírhatja, és a választás **device-local** — [[Nyelv választás]], [[Dark&Light mode]].
- Minden felhasználói szöveg i18n kulcson megy át, és minden szín téma-tokenből jön; a szerver hibaválasza `code`-ot ad, a szöveget a kliens fordítja — [[Nyelv választás]], [[Backend]].

#### Dokumentációs konvenciók

A `documentation/` vault a **jelenlegi, implementált állapot** Single Source of Truth-ja (jelen idejű próza, „így működik ma"). Jövőbeli munka, hiányosság, change request és bug a repo gyökér `backlog/` jegyrendszerében él, nem a specben. Ha egy `backlog/` jegy elkészül, a hozzá tartozó spec frissül a jelenlegi állapotra.

| Mappa | Jelentés |
|---|---|
| `Features/` | Feature szintű specifikáció |
| `Subfeatures/` | Alfeature specifikáció |
| `Architektúra/` | Architektúra-SSOT jegyzetek |

Minden specifikáció egységes szerkezetet követ: **Business** + **Architektúra** (Frontend → **Backend-offline** → Backend). A `#### Backend-offline` alfejezet kötelező. Minden specen `verifikalva` / `verifikalt_commit` frontmatter (a kód elleni verifikáció dátuma + commitja). Sablon: [[SPEC-TEMPLATE]]. Státusz: `Kész` (a kód ellen auditált, jelenlegi működés) / `Váz` (elsodródott a kódtól, jegy után átírandó) / `Ideiglenes` / `TODO`.
Agent skillek: `.cursor/skills/documentation-spec/` (spec) + `.cursor/skills/task-ticket/` (`backlog/` jegy). Offline SSOT: [[Backend-offline first]].

#### Feature lista (`Features/`)

- [[Kaja]]
- [[Edzés]]
- [[GearCheck]]
- [[Tennivalók]]
- [[Naptár]]
- [[Nyelv választás]]
- [[Dark&Light mode]]
- [[AYCM tracker]]
- [[Tápérték kalkulátor]]
- [[Profile]]
- [[Lépésszám követés]]
- [[Úszás napló]]
- [[Biciklizés napló]]
- [[Értesítések]]
- [[Szinkronizációs központ]]
- [[Bevásárlás]]
- [[Mászónapló]]
- [[Bejelentkezés]]
- [[Események]]
- [[Pénzügyek]]

#### Rendszerszintű tervezett munka

Az MVP-n túli, rendszerszintű tételek `backlog/` jegyként vannak rögzítve:

| Tétel | Jegy |
|---|---|
| Web mint kiadott (QA-zott, publikált) platform | `backlog/003-web-mint-kiadott-platform.md` |
| iOS build és eszközre telepítés | `backlog/004-ios-build-es-telepites.md` |
| iOS Health lépés-forrás | `backlog/002-ios-health-lepes-forras.md` |
| Google Calendar export (flag `feladatok.googleExport` = `false`) | `backlog/001-google-calendar-export.md` |
| Remote push (FCM / APNs) | `backlog/005-remote-push-fcm-apns.md` |
| Prod hosting / TLS | `backlog/006-prod-hosting-tls.md` |
| Profil-szintű beállítás-sync (nyelv / téma / értesítés-kapcsolók) | `backlog/007-profil-szintu-beallitas-sync.md` |

Realtime sync, mezőszintű merge és CRDT **tudatos, elfogadott korlát** — [[Backend-offline first]] §17.

### UI/UX elvárások

Alsó tab bar: Kaja, Edzés, Feladatok, Menü. Tab-térkép, tabon belüli navigáció, route-térkép és a minden tabon látszó szinkronizációs státuszjelző: [[Frontend]] (app-shell SSOT).

### Megjegyzések

**Az MVP leszállítva:** a vault a jelenlegi, implementált állapotot írja le, a kód ellen auditálva (`backlog/audit/ROLLUP.md`). A négy architektúra-SSOT: [[Frontend]] (app-shell, flag registry), [[Backend]] (stack, OpenAPI, séma), [[Backend-offline first]] (offline szerződés) és [[Fejlesztői környezet]] (monorepo, futtatás, Android telepítés).

A korábbi 5 nyitott kérdésből kettő a leszállított kód által eldőlt (Health Connect: saját Capacitor plugin; secure storage: `@aparajita/capacitor-secure-storage`), három tervezett munkaként jegyzett:

| Hol | Mi | Jegy |
|---|---|---|
| [[Backend]] / [[Fejlesztői környezet]] | Prod üzemeltetés / hosting és TLS | `backlog/006-prod-hosting-tls.md` |
| [[Fejlesztői környezet]] | iOS build és eszközre telepítés | `backlog/004-ios-build-es-telepites.md` |
| [[Backend]] | openapi-generator `spring` profil re-check verzió-emeléskor (jelenleg 7.24.0 + SB 4.1.0 fordul) | `backlog/008-openapi-generator-spring-boot-4-kimenet-ellenorzes.md` |

Ha egy feature spec és egy architektúra jegyzet ütközik, az architektúra jegyzet nyer (az app-shell és az offline szerződés SSOT); a feature spec javítandó, nem az architektúra megkerülendő.

### Nyitott kérdések

Nincs nyitott kérdés. (A rendszerszintű tételek fentebb, a Megjegyzésekben — mindegyik `backlog/` jegyként rögzítve.)

## Architektúra

### Frontend

- Ionic — Angular (hibrid), standalone komponensek
- Állapotkezelés: Angular Signals + root service-ek (nincs NgRx)
- OpenAPI-ból generált kliens
- Az első kiadás **kiadott** targetje a natív build; a web online-only és nem QA-zott platform
- Részletek: [[Frontend]]

#### Backend-offline

Minden feature kötelezően Backend-offline first. Közös mechanizmus: helyi store, kliens UUID, outbox, sync UI. Részletek: [[Backend-offline first]], [[Szinkronizációs központ]], [[Frontend]].

### Backend

- Java — Spring Boot, Gradle build
- **PostgreSQL** + Flyway migráció (a partial unique index és a `timestamptz` követelmény miatt nem opcionális)
- API szerződés: OpenAPI (Swagger), **spec-first** — ebből generálódik a Spring Boot interface és az Ionic Angular kliens is
- [[Backend-offline first]] (kötelező)
- Részletek: [[Backend]]; monorepo elrendezés és fejlesztői futtatás: [[Fejlesztői környezet]]

### Nyitott kérdések

Nincs nyitott kérdés.
