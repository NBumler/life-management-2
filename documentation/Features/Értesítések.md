# Értesítések

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Élelmiszer tárolás]], [[Rendszeres kiadások]], [[Tennivalók]], [[Események]], [[Lépésszám követés]], [[Tápérték kalkulátor]], [[Étkezés]], [[Backend-offline first]] |

### Célállapot

Telefonos (push / lokális) értesítések küldése fontos eseményekről / küszöbökről.

### Funkcionális leírás

Értesítés, ha:

- [[Élelmiszer tárolás]] alapján egy élelmiszer meg fog romlani — lead time:
  - a tétel helyéhez tartozó katalógus tárolhatóság **> 5 nap** → lejárat előtt **3 nappal**
  - **≤ 5 nap** (vagy nincs katalógus-idő: felvétel→lejárat napköz ≤ 5) → lejárat előtt **2 nappal**
  - Részletek: [[Élelmiszer tárolás]]
- [[Rendszeres kiadások]] következő fizetése közeledik
- [[Tennivalók]] időpontja közeledik
- [[Események]] időpontja közeledik
- Az adott napon a [[Lépésszám követés]] alapján 20 órakor kevesebb mint 2000 lépés történt
- **Kalória túllépés (sorozat):** egymást követő **5 napon** át minden nap a bevitt kalória ([[Étkezés]]) **több mint 750 kcal-lal meghaladja** az aznapi célt (`dailyAllowanceKcal` a [[Tápérték kalkulátor]]ból). Csak **túllépés** számít (alulmaradás nem). Nincs szükség külön energiaegyenleg-feature-re.

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

Élelmiszer-romlás lead time: [[Élelmiszer tárolás]]. Kalória túllépés: [[Étkezés]] + [[Tápérték kalkulátor]] SSOT.

### Nyitott kérdések

- Értesítés beállítások / kikapcsolás feature-önként
- Lead time a többi (nem élelmiszer) értesítéstípusnál

## Architektúra

### Frontend

Lokális / push értesítések (Capacitor) — plugin TBD ([[Frontend]] nyitott kérdések). Kalória-sorozat: helyi Étkezés + Tápérték kalkulátor store alapján értékelhető.

#### Backend-offline

Lokális értesítések a helyi store / eszköz órája alapján — Backend-offline és Full-offline is működhet. Remote push TBD. Lásd [[Backend-offline first]].

### Backend

_Nincs backend érintettség._ (ha szerveroldali push kell, később; jelenleg kliensoldali triggerelés feltételezett)

### Nyitott kérdések

- Lokális vs remote push döntés
