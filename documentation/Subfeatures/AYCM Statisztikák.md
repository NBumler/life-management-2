# AYCM Statisztikák

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM tracker]], [[AYCM Check-In]], [[AYCM elfogadóhely hozzáadása]], [[Rendszeres kiadások]], [[Pénzügyek]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]] |

### Célállapot

Read-only összesítés az élő [[AYCM Check-In]] snapshotokból: időablak, megéri-e, helyszín, látogatáslista. Nincs saját entitás. A hub az **aktuális naptári hónap** kártyáit mutatja; ez a képernyő a preset-ablakokat és a bontást.

**Ownership:** a Check-In / settings user-owned — [[Bejelentkezés]].

**Nem scope (MVP):** diagram; custom dátumtartomány; „összes idő”; idei naptári év preset; copay-összeg külön kártyán; saját OpenAPI / outbox.

### Funkcionális leírás

#### Adathalmaz

Élő (`deleted = false`) `AycmCheckIn` sorok, ahol `checkInDate` a választott ablakban van (zárt intervallum, kliens TZ). **Jövőbeli** dátum a tartományban **benne van** (a hub sem vágja). 0 Ft-os Check-In **beleszámít a darabba**, a Σ-hoz 0-t ad.

#### Ablakok (preset)

Default: **ez a hónap** — ugyanaz a darab / Σ, mint a [[AYCM tracker]] hubon.

| `window` | Dátum (`from` … `to`, inkluzív) | `monthCount` |
|---|---|---|
| `THIS_MONTH` | aktuális naptári hónap 1. napja … utolsó napja | 1 |
| `PREV_MONTH` | előző naptári hónap teljes | 1 |
| `LAST_3_MONTHS` | aktuális−2 hónap 1. napja … aktuális hónap utolsó napja (3 teljes naptári hónap, a jelenlegi bent) | 3 |

Nincs custom, nincs YTD, nincs all-time.

#### Összegző számok

- `visitCount` = a halmaz mérete (0 OK).
- `visitValueSumHuf` = Σ `visitValueHuf` (0 OK, nem `~`).
- `passCostComputable` — SSOT [[AYCM tracker]] (Pénzügyek flag + belinkelt **beszámított** kiadás).
- `passCostHuf` = `monthlyEquivalentHuf × monthCount` — `monthlyEquivalentHuf` SSOT [[Rendszeres kiadások]]; ez a spec **nem** másolja a /3 /12 képletet.
- **Megéri-e:** ha `passCostComputable`: `visitValueSumHuf − passCostHuf` (előjeles egész Ft, nincs clamp). Különben `~` / homokóra. A darab és a Σ ettől függetlenül szám.

`coPaymentHuf` nem megy a megéri-be.

#### Helyszín bontás

Csoport: `partnerId`.

Megjelenő név: ha a partner élő (`deleted = false`) → aktuális `AycmPartner.name`. Ha törölt, és a csoportban több eltérő snapshot `partnerName` is előfordul (mert a partnert menet közben átnevezték, és a régebbi Check-Injek a régi nevet snapshotolták): a megjelenő név a snapshot `partnerName`-ek **lexikálisan első** értéke (determinisztikus, stabil tie-break — nem a leggyakoribb, nem tetszőleges).

Sorok: név, `visitCount`, `visitValueSumHuf`. Rendezés: Σ **csökkenő**, majd név. Üres ablak: üres lista, nincs CTA.

#### Látogatáslista (előzmény)

A tartomány Check-Injei: `checkInDate` **csökkenő**, majd `checkInTime` csökkenő. Sor: dátum, megjelenő partnernév (ugyanaz a szabály, mint a bontásnál), `visitValueHuf`.

Tap → [[AYCM Check-In]] `?date=YYYY-MM-DD`.

### UI/UX elvárások

- **Belépés:** [[AYCM tracker]] hub → Megéri-e kártya / statisztika belépő. Flag: **AYCM tracker**.
- Route pl. `/tabs/menu/aycm/stats`.
- Preset választó (három); kártyák: darab, Σ érték, megéri-e (vagy `~`); helyszín tábla; látogatáslista.
- Read-only (szerkesztés a Check-In oldalon). i18n: [[Nyelv választás]]. Kontraszt: [[Dark&Light mode]].
- Üres ablak: 0 / 0 Ft / megéri = `0 − passCost` vagy `~`; listák üresek, nincs create CTA.

### Megjegyzések

A hub három havi száma nem másolódik ide képletként: `THIS_MONTH` ugyanazt a utility-t hívja (`from`/`to` = aktuális hónap). Diagram későbbi scope.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyő: `AycmStatsPage`.
- Pure TS: ablak `from`/`to` + `monthCount`; szűrés; Σ / darab; megéri-e; groupBy `partnerId`.
- Check-In lista: helyi store (vagy már behúzott `GET /api/aycm-check-ins?from=&to=` a [[AYCM Check-In]] szerint). Nincs saját mutáció.

#### Backend-offline

Olvasás a Check-In / settings / kiadás helyi store-jából Backend-offline és Full-offline. **Nincs** outbox. Számítás kliens TS; `~` csak `passCostComputable = false`. Lásd [[Backend-offline first]], [[AYCM tracker]].

### Backend

_Nincs backend érintettség._ (Check-In lista API: [[AYCM Check-In]]; settings: [[AYCM tracker]])

### Nyitott kérdések

Nincs nyitott kérdés.
