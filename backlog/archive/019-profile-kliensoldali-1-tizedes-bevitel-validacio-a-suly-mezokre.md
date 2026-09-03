---
id: 19
type: change-request
status: done
title: Profile: kliensoldali 1-tizedes bevitel-validacio a suly mezokre
specs:
  - "[[Profile]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 19 — Profile: kliensoldali 1-tizedes bevitel-validacio a suly mezokre

## Motiváció / probléma

A spec 'max 1 tizedes'; a kliens csak min/max-ot validal, a DB numeric(5,1) skalajara hagyatkozik.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Jelenlegi működés

A Profile űrlap két súly mezője — `currentWeightKg` és a súlytörténet-bejegyzés (`WeightHistoryEntry`)
`weightKg` mezője — kliensoldali `oneDecimalPlaceValidator`-t kap (Reactive Forms, module-szintű
függvény a `profile.page.ts`-ben, a meglévő `kgPerWeekRequiredValidator` mintájára). A validátor a
`numeric(5,1)` DB-oszlop kliens-tükre: több mint 1 tizedesjegy esetén `{ oneDecimalPlace: true }` hibát
ad. Float-reprezentációs zajra toleráns: `value * 10` és annak kerekítése közti eltérést `1e-9`
küszöbhöz méri (`72.4` érvényes, `72.45` nem). Üres / nem szám érték → nincs hiba (a kötelezőséget
másik validátor kezeli).

Hiba esetén a mező alatt `PROFILE.VALIDATION_ONE_DECIMAL` felirat jelenik meg (`touched` után), és a
`save()` / `saveEntry()` a meglévő `form.invalid` / `entryForm.invalid` ág miatt **nem hív repót**.

**Hatókör:** csak a súly mezők. A `kgPerWeek` (cél heti ütem, 0.1–1.5) szándékosan kimaradt — ez
ráta, nem súly, és a `step="0.1"` + tartomány-validáció már fedi; ha később kell, külön jegy.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) `### Jelenlegi működés` szakasza a leszállított viselkedést írja le.
      (`[[Profile]]` — `#### Mentés validáció`, a `currentWeightKg` / `weightKg` mezősorok, a Frontend szakasz.)
- [x] Ha „Nem scope” blokkból jött: n/a — a spec „tervezett" mondatai (`currentWeightKg` sor,
      `WeightHistoryEntry.weightKg` sor) jelen időbe kerültek, a `backlog/019` pointer törölve.

## Terv / döntési napló

- **Blokkoló validáció, nem néma kerekítés** — a jegy „validáció / kerekítés"-t említ; a form többi
  mezője is blokkoló (min/max, kgPerWeek-required), így a konzisztens választás a hibajelzés +
  mentés-tiltás, nem a háttérben kerekítés.
- **Epszilon-alapú tizedes-check** a `Number.isInteger(value * 10)` helyett — utóbbi a `36.1 * 10 =
  360.99999999999994` miatt hamis pozitívot adna.
- **`kgPerWeek` kihagyva** — ráta, nem súly; a jegy címe és motivációja kifejezetten „suly mezők".
- **Nincs shared validátor-fájl** — a projektben minden page-szintű validátor a saját `*.page.ts`-ében
  él (`pieceUnitNotDb`, `poolFieldsPairedValidator`, `kgPerWeekRequiredValidator`); egyetlen új
  fogyasztó nem indokol `shared/` modult.
- Új `profile.page.spec.ts` (eddig nem volt) — 4 eset: 2-tizedes `currentWeightKg` blokkol; 1-tizedes
  (+ egész) átmegy és ment; 2-tizedes súlytörténet-bejegyzés blokkol; 1-tizedes átmegy.

## Lezáráskor (on-done)

- Frissített specek: [[Profile]] (`#### Mentés validáció`, mezőtáblák, `### Architektúra → Frontend`)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #019 Profile kliensoldali 1-tizedes súly-validáció
- Kód: `frontend` `pages/menu/profile/profile.page.{ts,html}`, `assets/i18n/{hu,en}.json` (+ `profile.page.spec.ts`)
