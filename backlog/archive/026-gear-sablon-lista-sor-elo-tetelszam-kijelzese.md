---
id: 26
type: feature
status: done
title: Gear: sablon-lista sor elo tetelszam kijelzese
specs:
  - "[[Sablonok]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 26 — Gear: sablon-lista sor elo tetelszam kijelzese

## Motiváció / probléma

A Sablonok UI/UX szekcio explicit keri a tetelszamot minden sablon-soron; jelenleg csak name + notes elonezet latszik.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

A `PackingTemplate` lista-DTO kap egy **származtatott, csak-olvasható `itemCount`** mezőt (az élő
`PackingTemplateItem` sorok száma). A Sablonok lista minden soron kiírja: `„{{count}} eszköz”`
(`GEAR.TEMPLATES.ITEM_COUNT`), a 0 is megjelenik (üres sablon engedélyezett).

- **Backend:** `PackingTemplateService.list` minden entitásra beállítja az `itemCount`-ot
  (`PackingTemplateItemRepository.countByTemplateIdAndDeletedFalse` — sablononként egy triviális
  derived `COUNT`). A `PackingTemplateMapper.toDto` és a `PackingTemplateSyncDataLoader` érintetlen,
  így a `GET /api/sync/changes` feed **nem** számol feleslegesen; ott `itemCount = null`. A
  `PackingTemplateDetail` nem kapott `itemCount`-ot — a nested detail a teljes `items` tömböt adja.
- **Web:** a generált kliens a szerver válaszából olvassa.
- **Natív:** a `SqliteStorageBackend.listPackingTemplates` korrelált alkérdéssel számol
  (`(SELECT COUNT(*) FROM packing_template_item i WHERE i.template_id = t.id AND i.deleted = 0)`),
  tehát Backend-offline / Full-offline esetén is helyes.
- **Mentés után:** a `PackingTemplateRepository` az összegző sort a visszakapott fából frissíti
  (`saved.items` élő sorok száma), nincs újra-`list()`.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
      (`[[Sablonok]]` — `PackingTemplate` mezőtábla, UI/UX lista-sor, Frontend / Backend-offline / Backend.)
- [x] Ha „Nem scope” blokkból jött: n/a — a UI/UX „(tételszám hiányzik — tervezett)” zárójeles
      mondat helyére a megvalósult működés került.

## Terv / döntési napló

- **Származtatott mező a lista-DTO-n, nem tárolt oszlop** — nincs denormalizált számláló a
  `packing_template` táblán, amit karban kéne tartani; a `COUNT` olcsó és mindig konzisztens.
- **`toDto` érintetlen, a `list()` állítja be** — a `PackingTemplateSyncDataLoader` ugyanazt a
  `toDto`-t használja; ha az számolna, minden synced sablon egy fölösleges `COUNT`-ot kapna, és a
  feed egy sosem használt aggregátumot cipelne.
- **`PackingTemplateDetail` kimarad** — a detail válasz már tartalmazza az `items` tömböt,
  `itemCount` ott redundáns lenne.
- **Derived `countByTemplateIdAndDeletedFalse`** a `@Query` helyett — a projekt alig használ
  `@Query`-t, a `findByTemplateIdAndDeletedFalse` már létezik ugyanezzel a származtatással.
- **Natív: korrelált alkérdés** egy külön count-hívás helyett — egy lekérdezés adja a listát is.

## Lezáráskor (on-done)

- Frissített specek: [[Sablonok]] (`PackingTemplate` entitás, UI/UX, Architektúra → Frontend / Backend-offline / Backend)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #026 Sablon-lista soronkénti élő tételszám
- Kód: `backend` `gear/PackingTemplateService` + `PackingTemplateItemRepository` + `openapi .../PackingTemplate.yaml`;
  `frontend` `core/storage/sqlite-storage-backend.ts`, `core/data/packing-template.repository.ts`,
  `pages/menu/gear/templates/packing-templates.page.html`, `assets/i18n/{hu,en}.json`
