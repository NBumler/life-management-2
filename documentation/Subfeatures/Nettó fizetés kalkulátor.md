---
verifikalva: 2026-09-02
verifikalt_commit: ebf0f17
---

# Nettó fizetés kalkulátor

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Pénzügyek]] |
| **Kapcsolódó** | [[Pénzügyek]], [[Profile]], [[Tápérték kalkulátor]], [[Rendszeres kiadások]], [[Nyelv választás]], [[Dark&Light mode]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Egyszerűsített **alkalmazotti** nettó becslés a [[Profile]] `grossMonthlySalaryHuf` (és opcionálisan `birthDate`) alapján. A [[Pénzügyek]] dashboard a **nettó számot** (vagy `~`) innen olvassa; a TB / SZJA bontás ezen a képernyőn van.

**Ownership:** nincs saját entitás; a bemenet user-owned profil — [[Bejelentkezés]].

A becslés jelenleg a TB-járulékot, a 15% SZJA-t és a 25 év alatti SZJA-kedvezményt fedi. NAV-pontos számítás, további kedvezmények (családi / első házas / 30 év alatti anya / KATA / KIVA / szocho / cafeteria / 13. havi) és a képernyőn belüli what-if bruttó mező tervezettek:

> Tervezett: `backlog/034-netto-fizetes-kalkulator-nav-pontos-szamitas-tovabbi-kedvezmenye.md`, `backlog/035-netto-fizetes-kalkulator-kepernyon-beluli-what-if-brutto-mezo.md`

### Funkcionális leírás

#### Bemenet ([[Profile]])

| Mező | Szerep |
|---|---|
| `grossMonthlySalaryHuf` | Kötelező a számoláshoz. **Üres** → nettó / TB / SZJA **nem számolható** (`~`). Kitöltött **0** érvényes. |
| `birthDate` | Opcionális. Hiányzik → **nincs** 25 év kedvezmény (teljes SZJA); a nettó **számolható**, ha a bruttó ki van töltve. |

Bruttó **nem** szerkeszthető itt. Életkor: teljes évek, kliens TZ, `floor` period — ugyanaz, mint a [[Tápérték kalkulátor]].

#### Konstansok (kód / utility, nem user adat)

Kézi frissítés a spechen + kódban, ha a jogszabály változik. Nincs NAV-API.

| Név | Érték | Megjegyzés |
|---|---|---|
| `TB_RATE` | `0.185` | TB járulék a bruttóra |
| `SZJA_RATE` | `0.15` | SZJA a (kedvezmény utáni) alapra |
| `UNDER_25_AGE_LIMIT` | `25` | Kedvezmény: `age < 25` (a 25. születésnapon véget ér; nem NAV-hónaphatár) |
| `UNDER_25_SZJA_EXEMPTION_CAP_HUF` | `715_765` | 2026-os hivatalos havi SZJA-mentes keret 25 év alatt |

#### Képlet (SSOT)

Egész Ft, tételenként `Math.round` (0.5 fel), aztán kivonás. `gross` = `grossMonthlySalaryHuf`.

```
tb = round(gross × TB_RATE)

ha birthDate hiányzik VAGY age ≥ 25:
  szja = round(SZJA_RATE × gross)
különben (age < 25):
  szja = round(SZJA_RATE × max(0, gross − UNDER_25_SZJA_EXEMPTION_CAP_HUF))

net = gross − tb − szja
```

`under25ExemptionApplied` = `birthDate` kitöltve **és** `age < 25` (akkor is, ha a bruttó a plafon felett van, és marad SZJA).

A [[Pénzügyek]] hub **csak** a `net`-et (vagy `~`) olvassa; TB / SZJA / kedvezmény-jelzés nem a dashboardon.

#### Fogyasztók

- [[Pénzügyek]] dashboard: nettó kártya; maradék = `net −` havi kiadás összeg, ha `net` számolható.
- Ez a képernyő: teljes bontás. Maradék **nincs** itt.

### UI/UX elvárások

- **Belépés:** [[Pénzügyek]] dashboard → Nettó kártya. Feature flag: a **Pénzügyek** flag.
- Sorok (i18n: [[Nyelv választás]]):
  1. **Bruttó** — Profile értéke, read-only; üres → `~` / „nincs megadva”.
  2. **TB** — szám vagy `~`.
  3. **SZJA** — szám vagy `~`; ha `under25ExemptionApplied`: jelzés (pl. „25 év alatti SZJA-kedvezmény”).
  4. **Nettó** — szám vagy `~`.
- Disclaimer (fix szöveg, i18n): *Egyszerűsített munkavállalói becslés.*
- CTA → [[Profile]] (bruttó / születési dátum szerkesztése). Nincs gate: üres bruttó mellett is nyitható a képernyő.
- Nincs what-if mező, Mentés, Fizetve. Kontraszt: [[Dark&Light mode]].

### Megjegyzések

Nem adótanácsadás.

#### Tudatos korlát

A konstansok (`TB_RATE`, `SZJA_RATE`, `UNDER_25_SZJA_EXEMPTION_CAP_HUF = 715_765`) kézzel karbantartottak a `net-pay-calculator.ts`-ben — nincs NAV-API. A `715_765` a 2026-os keret; jogszabály-változáskor a konstanst **és** ezt a specet frissíteni kell.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Képernyő: `NetPayPage`. Route pl. `/tabs/menu/finance/net-pay`.
- `NetPayCalculatorUtil` (vagy ekvivalens) pure TS: `tb`, `szja`, `net`, `under25ExemptionApplied`; életkor a TDEE `floor` szabályával.
- Bemenet: Profile store. A hub importálja a `net` / `isComputable` kimenetet — nem másolja a képletet.
- Konstansok egy shared modulban (mint a MET).

#### Backend-offline

Pure client. Backend-offline / Full-offline. **Nincs** outbox, **nincs** saját store. `~` csak hiányzó bruttónál. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (bruttó a [[Profile]] OpenAPI-ján; nettó nincs szerver-számítás)

### Nyitott kérdések

Nincs nyitott kérdés.
