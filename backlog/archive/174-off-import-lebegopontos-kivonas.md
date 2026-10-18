---
id: 174
type: bug
status: done
title: OFF vonalkód-import — a számított mezők lebegőpontos kivonási hibát mutatnak (2.599999…)
specs:
  - "[[Vonalkódos élelmiszer beolvasás]]"
  - "[[Élelmiszer manuális bevitele]]"
flag:
created: 2026-10-18
closed: 2026-10-18
---

# 174 — OFF vonalkód-import — a számított mezők lebegőpontos kivonási hibát mutatnak (2.599999…)

## Motiváció / probléma

Vonalkódos beolvasásnál (Open Food Facts import) az **összetett szénhidrát** mezőbe
lebegőpontos kivonási maradék kerül.

Reprodukció: vonalkód `5999033898461`
(`https://world.openfoodfacts.org/api/v2/product/5999033898461.json`):

- név, márka, energia, zsír, telített zsír, szénhidrát (7 g), cukrok (4,4 g) — helyesen előtöltve;
- **összetett szénhidrát: `2.599999999999…`** a várt `2,6` helyett (`7 - 4.4` IEEE-754 double-ben).
- A hiányzó „1 csomag nettó tartalma” nem hiba — az OFF sem adja vissza.

## Jelenlegi működés

`frontend/src/app/pages/food/catalog/open-food-facts.ts` a származtatott mezőket nyers
`number` kivonással számolja, kerekítés nélkül:

- `carbsComplexG = Math.max(0, carbsG - carbsSugarsG)` — a jelentett hiba;
- `fatUnsaturatedG = Math.max(0, fatG - fatSaturatedG - (fatTransG ?? 0))` — ugyanaz a hibaosztály,
  csak ennél a terméknél véletlenül nem jött elő.

## Elfogadási kritériumok

- [x] Az `5999033898461` importja után az összetett szénhidrát `2,6` (nem `2.5999…`).
- [x] A telítetlen zsír számítása ugyanígy kerekített (pl. `fat=1.1, sat=0.2` → `0.9`, nem `0.9000000000000001`).
- [x] A származtatott mezők **3 tizedesjegyre** kerekítenek (user-döntés, 2026-10-18) — ugyanaz a
      pontosság, mint a só → nátrium / klorid számításé.
- [x] Unit teszt az `open-food-facts` mapperre a fenti esetekkel.
- [x] Ellenőrizve, hogy más származtatott tápérték-számítás (pl. kézi bevitel, recept/étkezés-összesítő)
      nem mutat-e hasonló nyers float-megjelenítést; ha igen, ugyanazzal a helperrel javítva vagy külön jegyben rögzítve.

## Terv / döntési napló

- 2026-10-18 — Döntés (user): **3 tizedesjegy**, fix. A `salt-sodium-chloride.ts` privát `round3`
  helperje kiemelve `shared/round.ts`-be, és az OFF-mapper mindkét kivonása ezt használja
  (`Math.max(0, round3(...))`).
- Többi származtatott érték átnézve: a kézi bevitelnél csak a nátrium / klorid számított (már
  `round3`); az étkezés- / recept-összesítők `DecimalPipe`-pal formáznak megjelenítéskor, nyers
  float nem jut a UI-ra — nincs további teendő.

## Lezáráskor (on-done)

- Frissített specek: [[Vonalkódos élelmiszer beolvasás]] — Funkcionális leírás 4. pont: a számított
  telítetlen zsír / összetett szénhidrát képlete és 3 tizedes kerekítése
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-18 — #174 OFF-import származtatott mezők 3 tizedesre kerekítve
- Kód: `frontend/src/app/shared/round.ts` (+spec), `pages/food/catalog/open-food-facts.ts` (+spec),
  `pages/food/catalog/salt-sodium-chloride.ts`
