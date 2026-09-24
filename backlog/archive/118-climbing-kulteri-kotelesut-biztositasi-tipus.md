---
id: 118
type: feature
status: done
title: Mászó admin — kültéri kötélút biztosítási típusa (nittelt / trad / clean / toprope), rádiógombokkal
specs:
  - "[[Outdoor köteles admin]]"
  - "[[Outdoor köteles napló]]"
flag:
created: 2026-09-24
closed: 2026-09-24
---

# 118 — Mászó admin — kültéri kötélút biztosítási típusa (nittelt / trad / clean / toprope), rádiógombokkal

## Motiváció / probléma

Egy kültéri útnál alapvető tulajdonság, hogyan biztosítható: nittelt (sport), trad, clean vagy
csak toprope-os. Ma ezt sehol nem lehet rögzíteni az út törzsadatán, pedig ez az út állandó
jellemzője (nem a kísérleté).

## Jelenlegi működés

A `Route` (`openapi/components/schemas/Route.yaml`, admin: `pages/workout/climbing/admin/route-edit.page.*`)
mezői: `sectorId`, `name`, `guidebookGrade`, `lengthInMeters`, `totalPitches`, `rockType`, `aspect`,
`topoNumber` — biztosítási típus nincs. A kísérlet szintjén van egy rokon, de más jelentésű mező:
`AscentAttempt.safetyStyle` (`TOPROPE | LEAD | TRAD`) — ez azt írja le, *hogyan* mászta a user az
adott kísérletet, nem azt, milyen az út.

## Elfogadási kritériumok

- [x] Új opcionális mező a `Route`-on: `protectionType` enum `BOLTED | TRAD | CLEAN | TOPROPE`
      (nullable; meglévő utak `null`-lal maradnak).
- [x] Flyway migráció (új oszlop + `CHECK` constraint az enumra), `ddl-auto=validate` zöld;
      OpenAPI spec + `gen:api`; natív `SCHEMA_Vn` új oszlop; mindkét storage backend írja/olvassa.
- [x] Az út admin formon **rádiógomb-csoport** (`ion-radio-group`) a 4 opcióval + „nincs megadva"
      (vagy visszakattintással törölhető) — nem legördülő.
- [x] i18n (hu/en) címkék: Nittelt / Trad / Clean / Toprope.
- [x] Az út részletek / választó listában a típus megjelenik (pl. rövid címke az út neve mellett).
- [x] Kültéri köteles naplóban út kiválasztásakor a kísérlet `safetyStyle`-ja a `protectionType`
      alapján előtöltődik (leképezés: döntési napló), és utána szabadon módosítható.
- [x] `verify:outbox` snapshot frissítve (`OUTBOX_PAYLOAD_SCHEMA_VERSION` bump + migrációs lépés,
      ha kell — új nullable mező, a régi payload `null`-lal kiegészíthető).
- [x] Zöld lint + test:ci + build + backend test.

## Terv / döntési napló

- **Döntés (2026-09-24):** kültéri köteles naplóban út választásakor a `protectionType` **előtölti**
  a kísérlet `safetyStyle`-ját (`BOLTED → LEAD`, `TRAD`/`CLEAN → TRAD`, `TOPROPE → TOPROPE`), de az
  **mindig módosítható** — pl. a partner tradként mássza, fent toprope-ot szerel, és a másik a trad
  utat toprope-ként mássza. Az előtöltés csak út-választáskor fut, a már kézzel állított
  `safetyStyle`-t nem írja felül.
- A beltéri kötélutakra (`IndoorRoute`) nem kerül (teremben gyakorlatilag mindig nittelt/toprope) —
  ha mégis kell, külön jegy. Szektor-szintű alapértelmezés sem kell, elég út-szinten.

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor köteles admin]], [[Outdoor köteles napló]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-24 — #118
- Kód: `climbing/Route*` (backend), `V44__climbing_route_protection_type.sql`, `SCHEMA_V41`, `shared/climbing/protection-type.ts`, `admin/route-edit.page.*`, `naplo/outdoor-rope-session-edit.page.*`
