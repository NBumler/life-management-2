---
id: 40
type: feature
status: in-progress
title: "AYCM Statisztikák bővítés — idei év (THIS_YEAR) + custom dátumtartomány + diagram + all-time + copay-kártya"
specs:
  - "[[AYCM Statisztikák]]"
flag:
created: 2026-09-02
closed:
---

# 40 — AYCM Statisztikák bővítés — idei év + custom dátumtartomány + diagram + all-time + copay-kártya

## Motiváció / probléma

Az AYCM statisztika ma csak három rövid preset-ablakot ismer: `THIS_MONTH`,
`PREV_MONTH`, `LAST_3_MONTHS`. Nincs rálátás hosszabb vagy szabadon választott
időszakokra:

- Az **idei naptári év** teljes használatára — Check-In előzmény + éves összesítők,
  megéri-e az éves bérlet-költséghez mérve. Egy AYCM-bérlet megtérülése jellemzően
  éves kérdés, ezt ma nem lehet egy képernyőn látni.
- Tetszőleges (**custom**) `from … to` dátumtartományra.
- **Összes idő** (all-time) nézetre.

Nincs **diagram** (időbeli trend), és a **copay** (önrész) sehol nem jelenik meg
külön kártyán — ma csak a `visitValueHuf` a pénz a képernyőn.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`;
korábban explicit „Nem scope (MVP)" blokk a specben.

## Jelenlegi működés

[[AYCM Statisztikák]] → `### Funkcionális leírás` → „Ablakok (preset)":

> | `window` | tartomány | `monthCount` |
> |---|---|---|
> | `THIS_MONTH` | aktuális naptári hónap | 1 |
> | `PREV_MONTH` | előző naptári hónap | 1 |
> | `LAST_3_MONTHS` | 3 teljes naptári hónap (a folyó bent) | 3 |
>
> Nincs custom, nincs YTD, nincs all-time. Nincs diagram, nincs külön copay-kártya,
> nincs saját OpenAPI / outbox.

Kód: `frontend/src/app/pages/menu/aycm/aycm-stats.ts` (`StatsWindow` union típus,
`windowRange()`, `filterCheckIns` / `summarize` / `groupByPartner` / `visitList`),
`aycm-stats.page.ts` (`windows` tömb, `setWindow()` guard, `ion-segment`),
`aycm-pass-cost.ts` (`passCostHuf(settings, expenses, monthCount)`).

## Elfogadási kritériumok

Önállóan szállítható szeletekre bontva — a sorrend egyben a javasolt szállítási
sorrend is. A 1. szelet a legkisebb, önmagában is érték.

### 1. `THIS_YEAR` preset (idei naptári év)  ← korábbi külön 064-es jegy, ide olvasztva — **KÉSZ (2026-09-03)**

- [x] Új `THIS_YEAR` preset-ablak: `from` = az aktuális év `YYYY-01-01`,
      `to` = `YYYY-12-31` (kliens TZ, zárt intervallum). — `windowRange()` új ág.
- [x] A tartományon belüli **jövőbeli** dátumú Check-In benne marad (konzisztens a
      meglévő ablakokkal és a hubbal — nincs vágás). — `filterCheckIns` változatlan.
- [x] `monthCount = 12` (a teljes naptári év, konzisztensen a „minden ablak teljes
      naptári hónapokra kerekít" szabállyal — vö. `LAST_3_MONTHS` a folyó részleges
      hónapot is teljesnek számolja). Döntés: **A) `12`**.
- [x] Az összesítők ugyanazokat a pure-TS utility-ket hívják, mint a többi ablak:
      `filterCheckIns` / `summarize` (darab + Σ `visitValueHuf`, 0 OK, sosem `~`),
      `passCostHuf(settings, expenses, 12)`, `worthItHuf(...)` (előjeles egész Ft,
      nincs clamp; `~` csak ha `passCostComputable = false`).
- [x] Helyszín bontás és látogatáslista változatlan logikával, csak a nagyobb
      halmazon (rendezés, névfeloldás, tap → Check-In `?date=YYYY-MM-DD` ugyanaz).
- [x] UI: negyedik `ion-segment-button` a preset-választóban, saját i18n kulccsal
      (HU „Idei év" + EN „This year"). `ion-segment` `scrollable` — a négy gomb nem
      csonkul keskeny kijelzőn.
- [x] `setWindow()` guard és a `windows` tömb kiegészítve; `StatsWindow` union
      típus bővítve.
- [x] `aycm-stats.spec.ts`: `windowRange('THIS_YEAR', ...)` határeset (év eleje /
      vége; a `to` fix `12-31`), `monthCount === 12`.
      `aycm-stats.page.spec.ts`: a negyedik segment kiválasztható, a megéri-e 12
      havi bérlet-költséggel számol.
- [x] [[AYCM Statisztikák]] spec frissítve: „Ablakok (preset)" tábla `THIS_YEAR`
      sorral + `monthCount = 12` indoklás, `### Jelenlegi működés` („négy
      preset-ablak"), UI/UX (négy, görgethető segment), Frontend szakasz;
      `> Tervezett:` pointer szűkítve a maradék 4 szeletre; `verifikalva: 2026-09-03`.

### 2. Custom dátumtartomány — **KÉSZ (2026-09-03)**

- [x] A preset-választóban `CUSTOM` szegmens; alatta két `ion-input type="date"`
      (`Kezdő nap` / `Záró nap`), kliens TZ, zárt intervallum. `from ≤ to` nem
      validációs hiba: fordított bevitelnél a végpontok megcserélődnek, és egy
      `warning` `IonNote` jelzi (`customRange()` normalizál).
- [x] `monthCount` a (normalizált) tartomány által érintett teljes naptári hónapok
      száma (`monthsSpanned()`), részleges hónapok **felfelé kerekítve** — konzisztens
      a presetekkel.
- [x] Ugyanazok az összesítők / bontás / lista / diagram a `CUSTOM` tartományon.
- [x] `aycm-stats.spec.ts`: `monthsSpanned` + `customRange` (normál + fordított);
      `aycm-stats.page.spec.ts`: `CUSTOM` szűrés + `monthCount`-alapú megéri-e,
      fordított tartomány jelzése.

### 3. „Összes idő" (all-time) — **KÉSZ (2026-09-03)**

- [x] `ALL_TIME` szegmens: `from` = a legkorábbi élő Check-In napja, `to` =
      max(ma, legkésőbbi Check-In) — a jövőbeli sorok bent maradnak. Nincs Check-In →
      egy napra / egy hónapra esik össze (`allTimeRange()`).
- [x] `monthCount` = a legkorábbi Check-Intől számított teljes naptári hónapok
      (`monthsSpanned(from, to)`) → a megéri-e a teljes előzményt méri az azóta
      kifizetett összes bérlethónaphoz. Döntés: **van értelmes `monthCount`** (nem
      rejtjük a megéri-e-t).
- [x] `aycm-stats.spec.ts`: `allTimeRange` (Check-Inekkel, jövőbeli Check-Innel,
      üresen); `aycm-stats.page.spec.ts`: `ALL_TIME` a folyó hónapon kívüli sorokat is
      tartja.

### 4. Diagram (időbeli trend)

- [ ] A választott ablakra havi bontású oszlop/vonaldiagram: alkalmak száma és/vagy
      Σ látogatásérték hónaponként.
- [ ] Rövid ablakoknál (pl. `THIS_MONTH`) döntendő a bontás granularitása (nap vs.
      hónap) vagy a diagram elrejtése.
- [ ] Megjelenítés a kaja-statisztika, ill. az edzésnapló-statisztika (ha addigra
      van) diagram-megoldásával konzisztensen; [[Dark&Light mode]] kontraszt.

### 5. Külön copay- (önrész-) kártya — **KÉSZ (2026-09-03)**

- [x] A `coPaymentHuf` összege külön `ion-card`-on a választott ablakra
      (`summarize().coPaymentSumHuf`), alatta alkalmankénti átlag
      (`coPaymentAvgHuf`, egész Ft, üres ablakon elrejtve).
- [x] **Nem** megy a megéri-e számba — `worthItHuf` továbbra is csak
      `visitValueSumHuf − passCostHuf`. Teszt is rögzíti.

### Közös

- [ ] `npm run lint` + `npm run test:ci` (frontend) zöld. Backend nincs érintve
      (pure-TS, helyi store, nincs outbox / API — csak több sort szűr).
- [ ] [[AYCM Statisztikák]] spec átírva a leszállított állapotra: „Ablakok (preset)"
      tábla, `### Jelenlegi működés`, `### Funkcionális leírás`, `### UI/UX elvárások`,
      `### Architektúra → Frontend`; a „Nincs custom / YTD / all-time / diagram /
      copay-kártya" mondatok szűkítve / törölve; a `> Tervezett:` pointer törölve
      vagy szűkítve; `#### Backend-offline` felülvizsgálva.

## Terv / döntési napló

- **Összevonás (2026-09-03):** a külön `064-aycm-statisztikak-idei-ev-...` jegy ide
  olvasztva mint 1. szelet. Nincs önálló 064-es fájl; a spec `> Tervezett:` pointere
  továbbra is erre a fájlra (`040-...`) mutat.
- **1. szelet leszállítva (2026-09-03):** `THIS_YEAR` preset kész, tesztekkel + i18n +
  spec-frissítéssel. `status: in-progress`. Érintett kód:
  `frontend/src/app/pages/menu/aycm/aycm-stats.ts` (`StatsWindow`, `windowRange`),
  `aycm-stats.page.ts` (`windows`, `setWindow`), `aycm-stats.page.html` (`scrollable`
  segment), `frontend/src/assets/i18n/{hu,en}.json`.
- **2., 3., 5. szelet leszállítva (2026-09-03):** `CUSTOM` + `ALL_TIME` ablak és az
  önrész-kártya egy commitban. Új pure-TS: `monthsSpanned` / `customRange` /
  `allTimeRange`; `summarize` kiegészítve `coPaymentSumHuf`-fal. Page: `customFrom` /
  `customTo` signal, `customRangeReversed`, `range` computed 3-ágú, `coPaymentAvgHuf`.
  HTML: `CUSTOM` dátumbevitel + önrész-kártya. i18n: `WINDOW.ALL_TIME/CUSTOM`,
  `CUSTOM_FROM/TO`, `CUSTOM_RANGE_REVERSED`, `CARD_COPAY`, `COPAY_AVG`. Hátra: 4.
  szelet (diagram) + spec-átírás + jegy-archiválás.
- **Szállíthatóság:** az 5 szelet külön PR-ben mehet; a THIS_YEAR a legkisebb,
  önmagában is érték, javasolt elsőnek.
- **`monthCount` döntés (`THIS_YEAR`, nyitott):**
  - *A) `12` (ajánlott)* — a teljes naptári év bérlet-költsége. Konzisztens a
    `LAST_3_MONTHS`-szal, ami a folyó részleges hónapot is teljesnek veszi.
    Egyszerű, kiszámítható; a megéri-e szám az év végi végállapotot vetíti.
  - *B) eltelt hónapok YTD* (`= a mai dátum hónapszáma`, a folyó hónap teljes) —
    a megéri-e az „eddig kifizetett" bérletdíjhoz méri a látogatásokat; év közben
    „igazságosabb", de eltér a meglévő ablakok konvenciójától és külön
    UI-magyarázatot kíván.
  - Javaslat: **A**, egy `IonNote` segédszöveggel („idei év, 12 havi bérletdíjjal").
- **Custom tartomány `monthCount`:** ugyanaz a „teljes naptári hónapok" definíció;
  részleges hónapoknál döntendő, hogy felfelé kerekítünk (mint a presetek) vagy
  arányosítunk. Javaslat: felfelé kerekítés, konzisztencia a presetekkel.
- **All-time megéri-e:** ha nincs értelmes `monthCount`, a kártya `~` / rejtett;
  a darab és a Σ mindig szám.
- **Adatmennyiség:** egy teljes év / all-time látogatáslistája hosszú lehet; nincs
  virtualizáció / lapozás (konzisztens a meglévő listákkal). Ha teljesítmény-gond
  lesz, külön követő jegy.

## Lezáráskor (on-done)

- Frissített specek: [[AYCM Statisztikák]] — „Ablakok (preset)" tábla az új
  presetekkel + custom tartomány, `### Jelenlegi működés` / `### Funkcionális leírás`
  / `### UI/UX elvárások` / Frontend szakasz átírva, a „Nem scope" / „Tervezett"
  hivatkozások törölve / szűkítve, diagram + copay-kártya dokumentálva.
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — AYCM statisztika bővítés (THIS_YEAR / custom / all-time / diagram / copay)
- Kód: `frontend/src/app/pages/menu/aycm/aycm-stats.ts`, `aycm-stats.page.ts`,
  `aycm-stats.page.html`, i18n `hu` / `en`, specek
