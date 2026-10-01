---
id: 138
type: feature
status: done
title: "Terhelés-figyelmeztetések: pihenőnap hiány, edzés mászónapon, sok mászás, ujjterhelés"
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-10-01
closed: 2026-10-01
---

# 138 — Terhelés-figyelmeztetések

## Motiváció / probléma

Az edzés-elemzés szabályai: heti 1–2 kötelező pihenőnap; mászónapon nincs otthoni súlyzózás
(legfeljebb 10 perc törzs / prehab); heti 4–5 mászás mellett az otthoni húzó- és ujjnap törölve;
az avaszkuláris kötőszövet (pulley, ín) lassan regenerálódik. Ezek szabályként kiszámolhatók a
backlog/137 adataiból.

## Jelenlegi működés

Nincs ilyen logika. Az edzés bármikor indítható, figyelmeztetés nélkül.

## Elfogadási kritériumok

- [x] Pure TS szabálymotor (unit-teszttel), inputja a backlog/137 napi terhelés-sora:
  - [x] **Nincs pihenőnap:** az utolsó 7 napban (ma nélkül) 0 pihenőnap → figyelmeztetés.
  - [x] **Mászónap:** ma van mászó-session → info: „Ma már másztál — csak rövid törzs /
        prehab javasolt”.
  - [x] **Sok mászás:** a naptári héten ≥ 4 mászás → info: „Sok mászás a héten — az otthoni
        húzó- és ujjedzés kihagyható”.
  - [x] **Ujjterhelés:** gördülő 7 napban ≥ 5 ujjterhelés-nap → figyelmeztetés.
- [x] Megjelenés: nem blokkoló banner a Heti terv dashboardon és az Edzésnapló listán.
      Nincs push-értesítés.
- [x] A küszöbök konstansok (később hangolhatók).
- [x] Specek frissítve.

## Terv / döntési napló

- Nem orvosi tanács: szövegezés „javasolt”, nem „tilos”.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-01 — #138 terhelés-figyelmeztetések
- Kód: `pages/workout/load-warnings.ts`, `load-warnings-banner.component.ts`, Heti terv + Edzésnapló lista (`c5bb2b8`)
