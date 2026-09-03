---
id: 44
type: chore
status: dropped
title: Clipboard import: fejlec-alias tures bovitese
specs:
  - "[[Élelmiszer importálása clipboard-ról]]"
flag:
created: 2026-09-02
closed: 2026-09-03
---

# 44 — Clipboard import: fejlec-alias tures bovitese

## Motiváció / probléma

A spec felsorol elfogadando fejlec-aliasokat (telitetlen, fagasztva, szabadon); looksLikeHeaderRow csak ket fix mintat ismer.

Forrás: dokumentáció ↔ implementáció audit (2026-09-02), lásd `backlog/audit/`.

## Miért `dropped`

A jelenlegi import a gyakorlatban jól működik (megerősítve, 2026-09-03). A bemenet formátuma rögzített
(kanonikus táblázat-export), ezért az első sor mindig a két felismert minta egyikét hozza (`Üzlet` +
`Termék` kezdés, vagy `100g / 100ml … energia`). Tág alias- / elírás-tűrő fejléc-szótár karbantartása
haszon nélküli komplexitás lenne egy zárt formátumú bemenethez; a spec „bővítése tervezett" mondata
téves elvárás volt.

A korlát innentől **tudatosan vállalt**, nem nyitott munka — a spec `### Megjegyzések → #### Tudatos
korlát` szakaszába átvezetve; a `> Tervezett: backlog/044` pointer törölve.

## Elfogadási kritériumok

- [x] Az érintett spec(ek) a végleges (vállalt) működést írják le — a `backlog/044` forward-pointer
      helyett `#### Tudatos korlát` a fejléc-felismerés hatóköréről.

## Terv / döntési napló

- **Nincs kód.** Csak spec-tisztítás: a „tervezett bővítés" mondat kikerült, helyette a két
  felismert minta mint tudatos korlát.

## Lezáráskor (on-done)

- Frissített specek: [[Élelmiszer importálása clipboard-ról]] (fejléc-bekezdés + `#### Tudatos korlát`)
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-03 — #044 dropped (clipboard-import fejléc-alias bővítés nem kell)
- Kód: nincs
