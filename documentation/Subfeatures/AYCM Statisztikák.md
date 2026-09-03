---
verifikalva: 2026-09-03
verifikalt_commit: 6c8fe56
---

# AYCM Statisztikák

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM tracker]], [[AYCM Check-In]], [[AYCM elfogadóhely hozzáadása]], [[Rendszeres kiadások]], [[Pénzügyek]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Read-only összesítés az élő [[AYCM Check-In]] snapshotokból: időablak, megéri-e, önrész, havi bontás, helyszín, látogatáslista. Nincs saját entitás, nincs saját OpenAPI / outbox. A [[AYCM tracker]] hub az **aktuális naptári hónap** kártyáit mutatja; ez a képernyő az időablakokat és a bontásokat.

**Ownership:** a Check-In / settings user-owned — [[Bejelentkezés]].

Hat időablak: négy preset (`THIS_MONTH` alapértelmezett, `PREV_MONTH`, `LAST_3_MONTHS`, `THIS_YEAR`), az **összes idő** (`ALL_TIME`) és a szabadon megadott **egyéni tartomány** (`CUSTOM`). Minden ablakhoz: három számkártya (látogatások, Σ érték, megéri-e), egy önrész-kártya, egy havi bontású diagram (csak ≥ 2 hónapos ablaknál), a helyszín-bontás és a látogatáslista.

### Funkcionális leírás

#### Adathalmaz

Élő (`deleted = false`) `AycmCheckIn` sorok, ahol `checkInDate` a választott ablakban van (zárt intervallum, kliens TZ). **Jövőbeli** dátum a tartományban **benne van** (a hub sem vágja). 0 Ft-os Check-In **beleszámít a darabba**, a Σ-hoz 0-t ad.

#### Ablakok

Default: **ez a hónap** — ugyanaz a darab / Σ, mint a [[AYCM tracker]] hubon.

| `window` | Dátum (`from` … `to`, inkluzív) | `monthCount` |
|---|---|---|
| `THIS_MONTH` | aktuális naptári hónap 1. napja … utolsó napja | 1 |
| `PREV_MONTH` | előző naptári hónap teljes | 1 |
| `LAST_3_MONTHS` | aktuális−2 hónap 1. napja … aktuális hónap utolsó napja (3 teljes naptári hónap, a jelenlegi bent) | 3 |
| `THIS_YEAR` | aktuális év `01-01` … `12-31` (teljes naptári év) | 12 |
| `ALL_TIME` | a legkorábbi élő Check-In napja … `max(ma, legkésőbbi Check-In)` | a `from`-tól a `to`-ig **érintett teljes naptári hónapok** száma (`monthsSpanned`); Check-In nélkül a tartomány egy napra / egy hónapra esik össze |
| `CUSTOM` | a felhasználó által megadott két nap (fordított bevitelnél a végpontok megcserélődnek) | a normalizált tartomány érintett teljes naptári hónapjai (`monthsSpanned`) |

**`monthsSpanned(from, to)`** = a zárt tartomány által érintett különböző naptári hónapok száma; a két végponti részleges hónap is **egész**nek számít — ugyanaz az elv, mint a `LAST_3_MONTHS` / `THIS_YEAR` presetnél (a folyó részleges hónap is teljes). `from > to` → 0. Így a `THIS_YEAR` `monthCount`-ja a **teljes** év (12), az `ALL_TIME`-é pedig a legkorábbi Check-In óta kifizetett **összes** bérlethónap — a megéri-e a teljes előzményt méri ehhez.

#### Összegző számok

- `visitCount` = a halmaz mérete (0 OK).
- `visitValueSumHuf` = Σ `visitValueHuf` (0 OK, nem `~`).
- `coPaymentSumHuf` = Σ `coPaymentHuf` — **külön kártyán**, sosem a megéri-e-ben. Alatta alkalmankénti átlag (`round(coPaymentSumHuf / visitCount)`), üres ablakon elrejtve.
- `passCostComputable` — SSOT [[AYCM tracker]] (Pénzügyek flag + belinkelt **beszámított** kiadás).
- `passCostHuf` = `monthlyEquivalentHuf × monthCount` — `monthlyEquivalentHuf` SSOT [[Rendszeres kiadások]]; ez a spec **nem** másolja a /3 /12 képletet.
- **Megéri-e:** ha `passCostComputable`: `visitValueSumHuf − passCostHuf` (előjeles egész Ft, nincs clamp). Különben `~` / homokóra. A darab, a Σ és az önrész ettől függetlenül szám.

#### Havi bontás (diagram)

Egy vízszintes sáv-sor **minden** naptári hónapra a `from … to` tartományban (üres hónap 0-s sorként, kronologikus sorrend — `monthlyBuckets`). Soronként: a `YYYY-MM` címke, egy sáv (hossz = a hónap `visitValueSumHuf`-ja az ablak legerősebb hónapjához skálázva) és a `{darab} × · {Σ Ft}` szöveg.

Csak akkor jelenik meg, ha az ablak **≥ 2** naptári hónapot fog át (`THIS_MONTH` / `PREV_MONTH` → egyetlen sáv, elrejtve). Nincs chart-könyvtár: függőség nélküli CSS-sávok Ionic téma-tokenekkel, így [[Dark&Light mode]] mindkét témában olvasható.

#### Helyszín bontás

Csoport: `partnerId`.

Megjelenő név: ha a partner élő (`deleted = false`) → aktuális `AycmPartner.name`. Ha törölt, és a csoportban több eltérő snapshot `partnerName` is előfordul (mert a partnert menet közben átnevezték, és a régebbi Check-Injek a régi nevet snapshotolták): a megjelenő név a snapshot `partnerName`-ek **lexikálisan első** értéke (determinisztikus, stabil tie-break — nem a leggyakoribb, nem tetszőleges).

Sorok: név, `visitCount`, `visitValueSumHuf`. Rendezés: Σ **csökkenő**, majd név. Üres ablak: üres lista, nincs CTA.

#### Látogatáslista (előzmény)

A tartomány Check-Injei: `checkInDate` **csökkenő**, majd `checkInTime` csökkenő. Sor: dátum, megjelenő partnernév (ugyanaz a szabály, mint a bontásnál), `visitValueHuf`. Nincs lapozás / virtualizáció — egy teljes év vagy az `ALL_TIME` listája is végiggörgethető.

Tap → [[AYCM Check-In]] `?date=YYYY-MM-DD`.

### UI/UX elvárások

- **Belépés:** [[AYCM tracker]] hub → Megéri-e kártya / statisztika belépő. Flag: **AYCM tracker**.
- Route: `/tabs/menu/aycm/stats`.
- Ablakválasztó: vízszintesen görgethető `ion-segment` hat gombbal. `CUSTOM` alatt két `ion-input type="date"` (Kezdő nap / Záró nap); fordított tartománynál egy `warning` `IonNote` jelzi, hogy a végpontok megcserélve számolnak.
- Kártyák: látogatások, Σ érték, megéri-e (vagy `~`), önrész (Σ + átlag). Alattuk a havi bontás (ha látszik), a helyszín tábla, a látogatáslista.
- Read-only (szerkesztés a Check-In oldalon). i18n: [[Nyelv választás]]. Kontraszt: [[Dark&Light mode]].
- Üres ablak: 0 / 0 Ft / megéri = `0 − passCost` vagy `~`; önrész 0 Ft, átlag elrejtve; listák üresek, nincs create CTA.

### Megjegyzések

A hub havi számai nem másolódnak ide képletként: a `THIS_MONTH` ugyanazt a utility-t hívja (`from`/`to` = aktuális hónap).

#### Tudatos korlát

A látogatáslista és a havi bontás nincs lapozva. Egy sokéves `ALL_TIME` ablak sok sort renderel (görgethető). Ha ez teljesítmény-gond lesz, külön `backlog/` jegy tárgya.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyő: `AycmStatsPage` (`pages/menu/aycm/aycm-stats.page.*`), OnPush, signal-alapú.
- Pure TS (`aycm-stats.ts`, nincs Angular):
  - `windowRange(window, todayIso)` a négy presetre; `customRange(fromIso, toIso)` (normalizál); `allTimeRange(checkIns, todayIso)`; mind `{ from, to, monthCount }`-ot ad. `monthsSpanned(fromIso, toIso)` a `CUSTOM` / `ALL_TIME` `monthCount`-jához.
  - `filterCheckIns` (zárt intervallum, törölt sor ki, jövő bent); `summarize` → `visitCount` / `visitValueSumHuf` / `coPaymentSumHuf`; `groupByPartner`; `visitList`; `monthlyBuckets(checkIns, from, to)` a diagramhoz.
  - `aycm-pass-cost.ts`: `passCostComputable` / `passCostHuf(settings, expenses, monthCount)` / `worthItHuf` — a `monthlyEquivalentHuf` SSOT-ot ([[Rendszeres kiadások]]) importálja, nem másolja.
- A page: `window` signal + `windows` tömb (a `setWindow` guard erre a tömbre ellenőriz); `customFrom` / `customTo` signal (a folyó hónapra seedelve) + `customRangeReversed`; a `range` computed háromágú (`CUSTOM` → `customRange`, `ALL_TIME` → `allTimeRange`, egyébként `windowRange`); `coPaymentAvgHuf`, `chartBuckets`, `showChart` (`>= 2` hónap), `chartMaxHuf`.
- Adatforrás: a Check-In / partner / settings / kiadás repository-k helyi store-ja (a `GET /api/aycm-check-ins?from=&to=` a [[AYCM Check-In]] szerint). **Nincs saját mutáció.** Újra-belépéskor (`ionViewWillEnter`) mind újratölt.

#### Backend-offline

Tisztán olvasás a Check-In / settings / kiadás helyi store-jából — Backend-offline és Full-offline egyaránt működik. **Nincs** outbox, nincs hálózati hívás. Minden szám kliensoldali TS számítás; `~` csak `passCostComputable = false` esetén. Lásd [[Backend-offline first]], [[AYCM tracker]].

### Backend

_Nincs backend érintettség._ (Check-In lista API: [[AYCM Check-In]]; settings: [[AYCM tracker]])

### Nyitott kérdések

Nincs nyitott kérdés.
