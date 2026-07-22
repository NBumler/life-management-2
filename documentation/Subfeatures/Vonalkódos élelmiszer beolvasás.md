# Vonalkódos élelmiszer beolvasás

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Élelmiszer hozzáadása]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer manuális bevitele]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Az Open Food Facts külső szolgáltató segítségével vonalkód alapján lehet az [[Élelmiszerek]]et beolvasni az [[Élelmiszer hozzáadása]] funkcióhoz, megkönnyítve és gyorsítva, hogy ne kelljen kézzel begépelni az értékeket.

### Funkcionális leírás

Felhasználói folyamat (Scan & Pre-fill):

1. A felhasználó az Élelmiszerek oldalon rákattint a lebegő vonalkód gombra.
2. Megnyílik a kamera (`@capacitor-mlkit/barcode-scanning`).
3. Sikeres beolvasás után az alkalmazás meghívja az **Open Food Facts** API-t:
   `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
4. **Találat esetén:** átnavigálás az „Új élelmiszer” formra ([[Élelmiszer manuális bevitele]]), ahol a név, márka és a 100 g/100 ml-re vetített makrók automatikusan ki vannak töltve.
5. **Ha nincs találat:** üres form nyílik meg, a vonalkód mező előre ki van töltve, sárga toast: *"A termék nem található az online adatbázisban. Kérjük, töltsd ki manuálisan."*

### UI/UX elvárások

- Lebegő vonalkód gomb az Élelmiszerek oldalon
- Sárga toast, ha nincs Open Food Facts találat

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

* Kamera: `@capacitor-mlkit/barcode-scanning`
* Open Food Facts **közvetlenül a kliensről** (nincs backend proxy — [[Backend]], [[Backend-offline first]])
* **Full-offline** (nincs net): a beolvasott vonalkód elmenthető, az API hívás későbbre marad; vagy manuális kitöltés
* **Backend-offline** (van net, nincs saját backend): Open Food Facts hívás futhat; saját backendre mentés outboxba ([[Szinkronizációs központ]])

### Backend

_Nincs backend érintettség._ (külső API nem proxyzva; csak az élelmiszer mentés a saját API-n, lásd [[Élelmiszer manuális bevitele]])

### Nyitott kérdések

Nincs nyitott kérdés.
