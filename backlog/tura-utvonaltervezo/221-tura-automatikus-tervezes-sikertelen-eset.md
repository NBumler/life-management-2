---
id: 221
type: change-request
status: backlog
title: Túra — sikertelen automatikus tervezésnél a hibaüzenet nem segít, és a kezdőpont elveszik
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 221 — Túra — sikertelen automatikus tervezésnél a hibaüzenet nem segít, és a kezdőpont elveszik

## Motiváció / probléma

Két távoli pontra (országnézetben, Duna–Ipoly és Kecskemét környéke) kb. 6 mp „Útvonal tervezése…” után felugró ablak jön: „Nem található összeköttetés…”. Nincs tanács, hogy mit tegyen a felhasználó, és OK után a kezdőpont is elveszik, az Automatikus mód kikapcsol.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `TURA.AUTO.NO_ROUTE` alert, OK gombbal.
- Utána `autoStart` = `null`, mód = alapállapot.

## Elfogadási kritériumok

- [ ] A hibaüzenet tanácsot ad (pl. „Válassz turistaút közelében lévő pontokat, vagy közelíts rá”), és nem blokkoló (pl. a tippsávban vagy toastban jelenik meg).
- [ ] Sikertelen tervezés után a kezdőpont megmarad, és a mód aktív marad, hogy csak a végpontot kelljen újraválasztani.
- [ ] Megvizsgálva, hogy a nyilvánvalóan túl távoli / hálózaton kívüli pontokat korábban (a 6 mp-es keresés előtt) fel lehet-e ismerni.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.

## Lezáráskor (on-done)

- Frissített specek: <a túra spec, ha addigra elkészült — [[102-tura-utvonaltervezo-attekintes]]>
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #221
- Kód: `frontend/src/app/pages/menu/tura/tura.page.ts|html|scss`, `core/data/route-suggestion.repository.ts`
