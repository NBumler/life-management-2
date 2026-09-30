---
id: 138
type: feature
status: ready
title: "Terhelés-figyelmeztetések: pihenőnap hiány, edzés mászónapon, sok mászás, ujjterhelés"
specs:
  - "[[Heti terv]]"
  - "[[Edzésnapló]]"
flag:
created: 2026-10-01
closed:
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

- [ ] Pure TS szabálymotor (unit-teszttel), inputja a backlog/137 napi terhelés-sora:
  - [ ] **Nincs pihenőnap:** az utolsó 7 napban (ma nélkül) 0 pihenőnap → figyelmeztetés.
  - [ ] **Mászónap:** ma van mászó-session → info: „Ma már másztál — csak rövid törzs /
        prehab javasolt”.
  - [ ] **Sok mászás:** a naptári héten ≥ 4 mászás → info: „Sok mászás a héten — az otthoni
        húzó- és ujjedzés kihagyható”.
  - [ ] **Ujjterhelés:** gördülő 7 napban ≥ 5 ujjterhelés-nap → figyelmeztetés.
- [ ] Megjelenés: nem blokkoló banner a Heti terv dashboardon és az Edzésnapló listán.
      Nincs push-értesítés.
- [ ] A küszöbök konstansok (később hangolhatók).
- [ ] Specek frissítve.

## Terv / döntési napló

- Nem orvosi tanács: szövegezés „javasolt”, nem „tilos”.

## Lezáráskor (on-done)

- Frissített specek: [[Heti terv]], [[Edzésnapló]]
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: <fő package-ek / fájlok>
