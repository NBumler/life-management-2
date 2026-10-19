---
id: 182
type: bug
status: backlog
title: Túra — nincs töltésjelző az automatikus útvonaltervezés alatt
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 182 — Túra — nincs töltésjelző az automatikus útvonaltervezés alatt

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A végpont kiválasztása után a tervezés másodpercekig (offline ~30 s-ig, lásd
[[181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf]]) fut, és ezalatt a képernyőn semmi
nem változik: a „Válaszd ki a végpontot” felirat marad. A teszt közben ezért többször is
másodszor koppintottam — elsőre úgy tűnt, az app elnyeli a koppintást.

## Jelenlegi működés

`RouteSuggestionRepository.loading` signal létezik (`core/data/route-suggestion.repository.ts`),
de a `tura.page.html` automatikus módja nem jeleníti meg; a térképkoppintás tervezés közben is
fogadható.

## Elfogadási kritériumok

- [ ] Tervezés közben látható töltésjelző (pl. spinner a tipp-sávban, i18n szöveggel hu + en).
- [ ] Tervezés közbeni térképkoppintás nem indít új tervezést (vagy a futót egyértelműen lecseréli).
- [ ] Unit / komponens teszt a `loading` megjelenítésére.

## Terv / döntési napló

_Még nincs._

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #182
- Kód: <fő fájlok>
