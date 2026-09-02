# Audit ROLLUP — dokumentáció ↔ implementáció

Audit commit: `ff23984` · Lefuttatva: 2026-09-02 · 14 chunk, párhuzamos read-only alügynökök.

## Összegzés

**~1270 atomi spec-állítás** ellenőrizve minden `Kész` spec ellen a backend + frontend
kód és a tesztek alapján. **~91% `Implemented`.** A `documentation/` vault a magas
kockázatú doméneken is nagyrészt a jelenlegi, implementált állapotot írja le — SSOT-nak
használható, a lenti Fázis 4 spec-átírás + a 3 RED-javítás után.

| Chunk | Domén | Verdikt | Állítás | Impl | Partial | Missing | Future | Acc.limit |
|---|---|---|--:|--:|--:|--:|--:|--:|
| 01 | Steps / Lépésszám | GREEN | 82 | 80 | 0 | 0 | 2 | 0 |
| 02 | Notifications / Értesítések | YELLOW | 63 | 52 | 4 | 0 | 4 | 3 |
| 03 | Finance / Pénzügyek | GREEN | 83 | 71 | 0 | 0 | 11 | 1 |
| 04 | AYCM tracker | GREEN | 57 | 51 | 2 | 0 | 4 | 0 |
| 05 | Google Calendar export | RED* | 18 | 2 | 0 | 0 | 15 | 0 |
| 06 | Tasks / Tennivalók | RED→fix | 128 | 114 | 5 | 1 | 7 | 1 |
| 07 | Gear / GearCheck | YELLOW | 102 | 98 | 3 | 0 | 1 | 0 |
| 08 | Auth+Profile+Nyelv+Téma | RED→fix | 115 | 83 | 20 | 5 | 1 | 6 |
| 09 | Food — katalógus + tárolás | GREEN | 126 | 115 | 4 | 0 | 5 | 2 |
| 10 | Food — étkezés/recept/tápérték | YELLOW | 142 | 121 | 9 | 1 | 10 | 1 |
| 11 | Shopping / Bevásárlás | YELLOW | 63 | 57 | 6 | 0 | 0 | 0 |
| 12 | Workout (nem climbing) | GREEN | 111 | 97 | 4 | 2 | 8 | 0 |
| 13 | Climbing / Mászónapló | GREEN | 67 | 54 | 6 | 3 | 2 | 2 |
| 14 | Architektúra-SSOT-k + hub | GREEN | 118 | 101 | 7 | 1 | 0 | 4 |

`*` Chunk 05: előre elfogadott, dokumentált kivétel — lásd lent.

## RED tételek és diszpozíció

| # | Hiba | Chunk | Diszpozíció |
|---|---|---|---|
| B1 | **Dark&Light: fix Világos/Sötét felülírás inert eltérő rendszertémán** — a `global.scss` csak a `dark.system.css`-t importálta. | 08 | **Javítva** — `dark.class.css` osztály-stratégia (commit `2c09d70`). |
| B2 | **Naptár: napi listáról visszatérve a rács a megtekintett nap hónapjára ugrott.** | 06 | **Javítva** — origin hónap `?from=YYYY-MM` param (commit `2c09d70`). |
| B3 | **Nyelv választás: ismeretlen készülék-locale `en`-re esett, nem `hu`-ra.** | 08 | **Javítva** — `hu` fallback + `language.service.spec.ts` (commit `2c09d70`). |
| — | **Google Calendar szinkronizálása** spec `Kész`, de a flagen túl nulla implementáció. | 05 | **Elfogadott kivétel.** A #1 jegy (`deferred`) fedi. Fázis 4: a spec `Kész` → `Váz`, a törzs redukálva „nincs implementálva; tervezett — [[001-google-calendar-export]]" pointerre. |

**Go / no-go: GO.** A 3 valódi kód-hiba javítva (lint + build + `test:ci` zöld, 1353 teszt);
a Google Calendar spec dokumentált kivétellel megy tovább. Minden más chunk GREEN/YELLOW.

## Backlog jegyek (audit-találatokból)

54 új jegy készült: **`backlog/009` … `backlog/062`** (B1–B3 nem kapott jegyet, javítva).
Kategóriák: bug (`009`–`013`, `056`), i18n/téma infra (`014`–`017`, `020`),
auth/profile polish (`018`, `019`), climbing (`021`–`025`), gear (`026`, `027`),
notifications (`028`, `029`), naptár UI (`030`), finance (`031`–`036`),
aycm (`037`–`043`), food (`009`, `010`, `044`–`053`), workout (`054`, `055`),
backend infra (`056`–`058`), post-MVP feature-bővítés csomagok (`059`–`062`).

Meglévő seed jegyek: `001` Google Calendar export (deferred), `002` iOS Health (deferred),
`003`–`007` rendszerszintű MVP-vágások, `008` openapi-gen SB4 ellenőrzés.

## Nyitott kérdések diszpozíció (Chunk 14)

| Kérdés | Állapot | Teendő Fázis 4-ben |
|---|---|---|
| Health Connect bridge csomag | CODE-RESOLVED — saját plugin (`core/health/health-connect.plugin.ts` + Kotlin) | próza jelen időbe, kérdés törölve |
| Secure storage csomag | CODE-RESOLVED — `@aparajita/capacitor-secure-storage` (`auth-session.service.ts`) | próza jelen időbe, kérdés törölve |
| openapi-generator Spring Boot 4 kimenet | CODE-RESOLVED (gen 7.24.0 + SB 4.1.0 fordul) | jelen idejű próza + `> Tervezett: [[008-...]]` pointer |
| Prod hosting / TLS | STILL-OPEN — `backlog/006` | specsor → `> Tervezett: [[006-prod-hosting-tls]]` |
| iOS build + telepítés | STILL-OPEN — `backlog/004` | specsor → `> Tervezett: [[004-ios-build-es-telepites]]` |

## Fázis 4 — spec-átírás (a következő lépés, több session)

Chunkonként, a `chunk-NN-*.md` „Spec-átírás vázlat" szakasza alapján:

1. `### Jelenlegi működés` / `### Funkcionális leírás` / `#### Backend-offline` jelen időbe.
2. Minden `**Nem scope (MVP)**` / „későbbi scope" / „post-MVP" blokk törlése →
   a megvalósult működés prózája, vagy `> Tervezett: [[backlog/NNN-...]]` pointer.
3. Az elavult `(post-MVP)` címkék (Értesítések: Lead-time szerkesztő, Előzmény lista) törlése.
4. Állandó korlátok a `### Megjegyzések` alá „Tudatos korlát" címkével
   (row-level LWW, OEM-Doze, stock-deduction relatív-vesztés, dedupe-verseny).
5. Kisebb tény-javítások: „08:00" → „09:00" háttér-worker (Értesítések, Steps);
   `/api/workout/sessions` → `/api/workout-sessions` (Edzésnapló); `PANTRY` → `ROOM`
   (Bevásárlás); Edzés parent Backend szekció; wizard → egy review-képernyő (Bevásárlás
   teljesítve); stb.
6. `verifikalva` / `verifikalt_commit` frontmatter kitöltése az akkori HEAD-del.
7. `documentation/Subfeatures - TODO/Giga feature napló specifikáció ...` törlése +
   a `Mászónapló.md` rá mutató wikilinkek eltávolítása.
8. Kód-oldali apró takarítás: `refreshNow()` JSDoc „későbbi scope" komment (Steps).

Utána: Fázis 5 (SSOT-deklaráció átbillentése — CLAUDE.md / README / hub note /
`.obsidian/app.json`) és Fázis 6 (`IMPLEMENTATION_STATUS.md` elvékonyítása).
