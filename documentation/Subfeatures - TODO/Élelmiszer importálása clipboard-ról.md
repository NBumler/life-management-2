# Élelmiszer importálása clipboard-ról

## Business

| | |
|---|---|
| **Státusz** | `TODO` |
| **Szülő** | [[Élelmiszer hozzáadása]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer manuális bevitele]] |

### Célállapot

Új [[Élelmiszerek]] tétel létrehozása a vágólapról beillesztett szöveg / strukturált adat alapján (pl. másik appból, táblázatból, vagy előre formázott exportból), hogy ne kelljen minden mezőt kézzel begépelni.

### Funkcionális leírás

_Nincs business érintettség._

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Elfogadott formátumok (szabad szöveg, JSON, CSV, Open Food Facts export, stb.)
- Parse / validációs szabályok és hibajelzés
- Offline működés

## Architektúra

### Frontend

Clipboard beolvasás → parse → előtöltött [[Élelmiszer manuális bevitele]] form (vagy dedikált megerősítő nézet).

### Backend

_Nincs backend érintettség._ (mentés ugyanaz, mint manuális create)

### Nyitott kérdések

Nincs nyitott kérdés.
