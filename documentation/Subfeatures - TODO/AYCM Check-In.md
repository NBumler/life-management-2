# AYCM Check-In

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[AYCM tracker]] |
| **Kapcsolódó** | [[AYCM elfogadóhely hozzáadása]], [[AYCM Statisztikák]], [[AYCM tracker]], [[Rendszeres kiadások]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

A felhasználó a pontos belépési időpontja alapján kapja meg a bérletével kalkulált valós látogatási értéket anélkül, hogy manuálisan kellene idősávokat kiválasztania.

### Funkcionális leírás

Automatikus idősáv-illesztés: a rendszer a dátum és a belépési időpont alapján határozza meg az árat.

Szűrési szabály: **`matchPriceRule`** — SSOT [[AYCM elfogadóhely hozzáadása]] (hét napja, `[start, end)`, legfeljebb egy találat). Ez a spec nem másolja a képletet.

Hub-szabályok: **max 1 Check-In / naptári nap**; rögzítéskor snapshot (`ruleLabel` = `displayLabel`); nincs sáv → 0 Ft, sárga, mentés mégis. Nincs inline partner-create; üres picker → CTA az elfogadóhelyekre. Lásd [[AYCM tracker]].

### UI/UX elvárások

* **Dátum mező:** Alapértelmezetten a mai nap.
* **Időpont mező:** Alapértelmezetten a jelenlegi pontos idő.
* **„[Most]” gomb:** Egy kattintással frissíti az időpontot az aktuális óra/percre.
* **Reaktív visszajelzés:** partner + dátum + idő megvan → zöld: `displayLabel` + `listPriceHuf` Ft ([[AYCM elfogadóhely hozzáadása]] `matchPriceRule`). Üres címke → idősáv-fallback.
* Ha az adott időpontra nincs konfigurált szabály, sárga figyelmeztetés, belépés 0 Ft-tal rögzül.

### Megjegyzések

Ez a specifikáció még nem végleges — átnézendő.

### Nyitott kérdések

Nincs nyitott kérdés. (Árszabály SSOT: [[AYCM elfogadóhely hozzáadása]].)

## Architektúra

### Frontend

Check-in űrlap; computed idősáv / ár megjelenítés.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

Check-in entitás + partner árszabályok lekérdezése (OpenAPI) — TBD.

### Nyitott kérdések

Nincs nyitott kérdés.
