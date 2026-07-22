# Háztartási feladatok

## Business

| | |
|---|---|
| **Státusz** | `Váz` |
| **Szülő** | [[Tennivalók]] |
| **Kapcsolódó** | [[Értesítések]], [[Naptár]] |

### Célállapot

Lakás körüli teendők irányítása helyiségekhez kötve, ismétlődő esedékességgel.

### Funkcionális leírás

Egyrészt hozzá lehet adni új helyiséget (pl. konyha, nappali, előszoba, WC). A helyszíneknek csak nevük van.

Másrészt új feladatokat lehet kitűzni egy vagy több helyiséghez (pl. porszívózás, felmosás, ablakmosás, pakolás).

Feladat attribútumok:

- feladat neve
- helyiség (checklist-ben kiválasztva)
- Energia szint: Alacsony / Közepes / Magas
- Becsült idő az elvégzéshez (perc)
- Hány naponta kell elvégezni (nap)
- Következő esedékesség (kalkulálva az előző paraméterből)
- Megjegyzés / leírás

### UI/UX elvárások

_Nincs UI/UX érintettség._

### Megjegyzések

_Nincs megjegyzés._

### Nyitott kérdések

- Feladat „kész” pipálás → következő esedékesség újraszámolása
- Megjelenés a [[Naptár]]ban

## Architektúra

### Frontend

Helyiség + feladat CRUD UI a Feladatok tab alatt.

### Backend

Helyiség / háztartási feladat entitások (OpenAPI) — TBD.

### Nyitott kérdések

Nincs nyitott kérdés.
