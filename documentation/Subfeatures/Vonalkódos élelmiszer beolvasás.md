# Vonalkódos élelmiszer beolvasás

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Élelmiszer hozzáadása]] |
| **Kapcsolódó** | [[Élelmiszerek]], [[Élelmiszer manuális bevitele]], [[Backend-offline first]], [[Szinkronizációs központ]] |

### Célállapot

Open Food Facts alapján vonalkóddal előtöltött új [[Élelmiszerek]] tétel az [[Élelmiszer manuális bevitele]] űrlapon — kevesebb kézi gépelés.

### Funkcionális leírás

#### Scan & Pre-fill

1. A felhasználó az Élelmiszerek felületen elindítja a vonalkód olvasást (pl. lebegő gomb).
2. Megnyílik a kamera (`@capacitor-mlkit/barcode-scanning`).
3. Sikeres beolvasás után: Open Food Facts API  
   `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
4. **Találat:** navigáció az [[Élelmiszer manuális bevitele]] formra; vonalkód + mappelhető mezők (név, márka, tápanyagok, stb.) előtöltve. Üres / új form → nincs felülírás-dialógus.
5. **Nincs találat:** üres form, vonalkód mező kitöltve; sárga toast: *"A termék nem található az online adatbázisban. Kérjük, töltsd ki manuálisan."*

#### Kézi EAN javítás + újra-sync

Ha a kamera hibás számsort adott (vagy a user kézzel ír EAN-t), az [[Élelmiszer manuális bevitele]] vonalkód mezőjén lévő **sync gomb** ugyanazt az OFF hívást futtatja.

- Ha meglévő, **eltérő** űrlapértékeket írna felül → megerősítő dialógus (mezőnként régi → új; azonos értékek kihagyva).
- Megerősítés után az OFF mezők felülírják az űrlapot.
- Részletek: [[Élelmiszer manuális bevitele]].

### UI/UX elvárások

- Lebegő / egyértelmű vonalkód belépő az Élelmiszerek oldalon.
- Sárga toast, ha nincs OFF találat.
- Sync gomb + felülírás dialógus az űrlapon.

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

- Kamera: `@capacitor-mlkit/barcode-scanning`
- Open Food Facts **közvetlenül a kliensről** (nincs backend proxy — [[Backend]], [[Backend-offline first]])
- **Full-offline** (nincs net): beolvasott vonalkód elmenthető / formra vihető; OFF hívás később (sync gomb), vagy manuális kitöltés
- **Backend-offline** (van net, nincs saját backend): OFF hívás futhat; saját backendre mentés outboxba ([[Szinkronizációs központ]])

### Backend

_Nincs backend érintettség._ (külső API nem proxyzva; mentés: [[Élelmiszerek]] / [[Élelmiszer manuális bevitele]])

### Nyitott kérdések

Nincs nyitott kérdés.
