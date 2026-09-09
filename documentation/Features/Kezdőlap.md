---
verifikalva: 2026-09-09
verifikalt_commit: 24ae531
---

# Kezdőlap

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Frontend]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Jelenlegi működés

A **Kezdőlap** az alsó tab-sor **első** eleme (`/tabs/home`), és — ha a `tab.kezdolap` flag be van
kapcsolva — a login utáni alapértelmezett nézet. Jelenleg minimális tartalmat mutat: gyorslinkeket a
többi engedélyezett tabhoz. A tényleges áttekintő widgetek és gyorsgombok külön fejlesztés.

> Tervezett tartalom: `backlog/095-kezdokepernyo-widgetek-gyorsgombok.md`

### Funkcionális leírás

- **Tab-regisztráció:** a `tab.kezdolap` flag a [[Frontend]] tab registry **első** eleme
  (`Kezdőlap` · `/tabs/home` · `home-outline`). Bekapcsolva 5 gombos a tab-sor (Ionic 1–5 gombot
  elbír), kikapcsolva a Kezdőlap eltűnik és a `Menü` marad a végső mentsvár.
- **Login utáni default tab:** ha a `tab.kezdolap` engedélyezett → Kezdőlap; különben a registry
  **első engedélyezett** tabja (`firstEnabledTabRoute` — a `Menü` mindig létezik). A `/tabs` üres
  útvonalának átirányítása ezt a láncot használja, ugyanezt a `featureFlagGuard` is (letiltott flag
  deep linkje → következő engedélyezett tab).
- **Tartalom (jelenleg):** a Kezdőlapon kívüli engedélyezett tabok listája gyorslinként, a registry
  sorrendjében (`Kaja`, `Edzés`, `Feladatok`, `Menü` — flag-függő), plusz egy rövid bevezető szöveg,
  ami jelzi, hogy a widgetek később kerülnek ide.

### UI/UX elvárások

- `ion-header` / `ion-toolbar` a `HOME.TITLE` címmel; a `SyncStatusButton` a `end` slotban
  ([[Frontend]] app-shell chrome minden tabon — [[Backend-offline first]] §16).
- A gyorslinkek `ion-list` / `ion-item[button]` sorok, tab-ikonnal és lokalizált címkével
  ([[Nyelv választás]] — `TABS.*`).
- **Nincs önálló flagje a tartalomnak:** a `tab.kezdolap` fedi a tabot és a képernyőt is.

### Megjegyzések

#### Tudatos korlát

Ez a képernyő a tab / route / flag / default-tab vázat szállítja, minimális kezdő tartalommal. A
[[Szinkronizációs központ]] korábbi `/tabs/dashboard/sync` útvonala **továbbra is elavult** — a sync
képernyő a `Menü` alatt él, nem ezen a tabon.

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- `pages/home/home.page.ts` — standalone, OnPush. A `quickLinks` a `TAB_REGISTRY`-ből szűri ki a
  `home`-on kívüli engedélyezett tabokat (`FeatureFlagsService.isEnabled`).
- `core/config/tab-registry.ts` — a `Kezdőlap` az első `TabDef`; `firstEnabledTabRoute(featureFlags)`
  adja a default-tab / guard-fallback útvonalat.
- `app.routes.ts` — `tabs` gyerek `home` route `featureFlagGuard('tab.kezdolap')`-pal; a `''`
  átirányítás függvény alakú `redirectTo`, ami a `firstEnabledTabRoute`-ot hívja.
- `core/config/feature-flag.guard.ts` — a letiltott flag átirányítása is `firstEnabledTabRoute`
  (nem fix `/tabs/menu`).
- Flag: `assets/config/features.json` `tab.kezdolap` (első kulcs), `FeatureFlagKey` union + kulcslista.
  Nincs függősége (tab-flag, mint a `tab.kaja`).

#### Backend-offline

A Kezdőlap kizárólag a helyi store-ból / statikus configból renderel (tab registry, feature flag
asset, i18n) — nincs hálózati hívása, Full-offline is teljes értékű. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._

### Nyitott kérdések

Nincs nyitott kérdés.
