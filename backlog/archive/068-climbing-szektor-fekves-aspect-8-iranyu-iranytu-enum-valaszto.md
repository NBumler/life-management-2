---
id: 68
type: change-request
status: done
title: Sziklamászó szektor fekvés (aspect) — 8 irányú égtáj-enum vizuális választóval
specs:
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles admin]]"
  - "[[Outdoor köteles napló]]"
  - "[[Outdoor boulder napló]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed: 2026-09-06
---

# 68 — Sziklamászó szektor fekvés (aspect) — 8 irányú égtáj-enum vizuális választóval

## Motiváció / probléma

Új szektor felvételekor a fekvés (`aspect`) megadása most szabad/kevéssé strukturált. Jobb lenne
egy jól definiált 8 irányú égtáj-enum (É, ÉK, K, DK, D, DNy, Ny, ÉNy), **vizuális választóval**:
egy négyzet kerületén a 8 irány, egy tap. Ez azért ideális, mert a felmászókönyvek eleve
égtájként adják meg a fekvést — elég átmásolni. Mapper kell a numerikus fok ↔ enum között
(mi számít északnak, észak-keletnek stb.), hogy más forrásból (iránytű-fok) is konvertálható legyen.

Elvetett / későbbi alternatívák (dokumentálva, nem ez a scope):
- Kör + kézzel állított szög (jó, ha van fizikai iránytű) — pontos, de lassabb bevitel.
- Telefon a szikla felé irányítva, automatikus felismerés — pontatlan iránytűnél rossz adat,
  és csak helyben működik, távolról nem.

**Preferált megoldás: négyzet kerületén a 8 enum.**

## Jelenlegi működés

[[Outdoor boulder admin]]: `Sector` mezői közt `default aspect (fekvés)`, soft delete.
[[Outdoor köteles napló]] öröklési sorrend: Route saját `aspect` → `Sector.aspect` default →
session szinten felülírható. Az `aspect` reprezentációja / bevitele a specben nincs részletezve.

## Elfogadási kritériumok

- [ ] `aspect` enum rögzítése: 8 égtáj (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`) + `UNKNOWN`/null.
- [ ] Fok ↔ enum mapper (bin határok: pl. É = 337.5°–22.5°), kliens + backend paritás, fixture.
- [ ] Vizuális választó komponens: négyzet kerületén 8 tap-pont, kijelölt állapot, akadálymentes.
- [ ] Használat: szektor admin (`Sector.aspect`), és minden hely, ahol az `aspect` felülírható
      (napló session szint).
- [ ] Migráció, ha a jelenlegi tárolás nem enum (pl. szabad szöveg → enum).
- [ ] OpenAPI séma + helyi SQLite `SCHEMA_Vn`.

## Terv / döntési napló

### Döntések

- **Enum:** 8 égtáj `N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`; **ismeretlen = `null`** (nincs
  `UNKNOWN` tag — konzisztens minden más nullable mezővel és a „választás törlése" gesztussal).
  OpenAPI: inline `enum` a `Sector.defaultAspect` / `Route.aspect` / `ClimbingSession.aspect`
  property-ken (házi stílus, mint `locationType` / `discipline`); a token `text` oszlopban marad.
- **Fok ↔ enum mapper:** 45°-os cikkek, mindegyik a kardinális fokára centrálva (`N` = 0°); az alsó
  határ **felfelé** kerekít (pontosan 22,5° = `NE`). A fok bemenet `[0,360)`-ba normalizálódik, tehát
  negatív / ≥360 is érvényes. Pinnelve: `shared/fixtures/aspect-degrees.json` — **kliens + backend**
  paritás (`shared/aspect.ts` `degreesToAspect` / `aspectToDegrees`; `hu.bumler.lm2.common.AspectDirection`
  `fromDegrees` / `centerDegrees` + `AspectDirectionTest`). A backendnek jelenleg nincs fok-fogyasztó
  endpointja, de a jegy kifejezetten kérte a kétoldali paritást — egy jövőbeli import így kész.
- **Vizuális választó:** `app-aspect-picker` (`shared/aspect-picker/`) — 3×3 négyzet, a kerületén a 8
  irány `grid-template-areas`-szal (É felül), a közép cella a kiválasztott irány feliratát mutatja.
  `ControlValueAccessor` (`formControlName`) + `[value]`/`(valueChange)` duál API, mint a
  `GradeInputComponent`. Akadálymentes: `role="radiogroup"` + `role="radio"` + `aria-checked` +
  teljes égtáj-név `aria-label`. A kijelölt irányra újra tap → `null`. Disabled állapot tiltja a
  választást.
- **Migráció (lossy, elfogadott):** a `sector.default_aspect` / `route.aspect` /
  `climbing_session.aspect` eddig szabad `text` volt. `V34__climbing_aspect_compass_enum.sql`
  best-effort megfelelteti a magyar/angol szabad szöveget (kis-nagybetű + whitespace / kötőjel
  toleránsan, ideiglenes SQL függvénnyel), a felismerhetetlent `NULL`-ra állítja, majd
  `*_aspect_check` CHECK-et tesz mindhárom oszlopra. On-device tükre `SCHEMA_V33` (ugyanaz a
  `CASE`-megfeleltetés `UPDATE`-ekben; CHECK-et natíven nem teszünk). A helyszín-fa solo adat, kevés
  sor, a fekvés bármikor újraválasztható — a lossy megfeleltetés vállalt.
- **Használat:** `Sector` admin (`defaultAspect`), `Route` admin (`aspect`), és az outdoor napló
  session szintje (outdoor boulder + outdoor rope form) — az öröklési sorrend
  ([[Outdoor köteles napló]] / [[Outdoor boulder napló]]) változatlan, csak a mező-widget lett a
  választó. Az indoor napló-formok / `IndoorRoute` **nem** kaptak aspect mezőt (nincs a specben).
- **Elvetett alternatívák (a jegyből, nem scope):** kör + kézzel állított szög; telefon a szikla felé
  irányítva automatikus felismerés.

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor boulder admin]], [[Outdoor köteles admin]], [[Outdoor köteles napló]],
  [[Outdoor boulder napló]], [[Mászónapló]] (aspect enum + `app-aspect-picker` választó + backend
  oszlopjegyzet); mind `verifikalt_commit: 8dbfb13`
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-06 — #068 climbing aspect 8 irányú égtáj-enum + vizuális választó
- Kód backend: `V34__climbing_aspect_compass_enum.sql` (3 oszlop free-text→token megfeleltetés +
  CHECK), `hu.bumler.lm2.common.AspectDirection` (+ `AspectDirectionTest`), `SectorMapper` /
  `RouteMapper` / `ClimbingSessionMapper` + `SectorService` / `RouteService` / `ClimbingSessionService`
  `applyFields`, OpenAPI `Sector` / `Route` / `ClimbingSession` séma (inline `enum`), érintett
  `*ServiceTest` + `Climbing*IntegrationTest`
- Kód frontend: `gen:api` (3 model per-schema `AspectEnum`), `shared/aspect.ts` (+ `.spec.ts`) +
  `shared/fixtures/aspect-degrees.json`, `shared/aspect-picker/` komponens (+ `.spec.ts`),
  `SCHEMA_V33` (3 `UPDATE` free-text→token, `SCHEMA_VERSION = 33`), `local-rows.ts` (3 row cast) +
  `storage-backend.ts` `ClimbingSessionDraft.aspect`, `route` / `sector.repository.ts` `*SaveInput`,
  `sector-edit` / `route-edit` / `outdoor-boulder-session-edit` / `outdoor-rope-session-edit` page
  (`<ion-input>` → `<app-aspect-picker>`, form control típus, `save()` trim eltávolítva), i18n
  `hu`/`en` (`SHARED.ASPECT_PICKER.*`), érintett `*.spec.ts`-ek
