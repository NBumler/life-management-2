---
id: 221
type: change-request
status: done
title: Túra — sikertelen automatikus tervezésnél a hibaüzenet nem segít, és a kezdőpont elveszik
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 221 — Túra — sikertelen automatikus tervezésnél a hibaüzenet nem segít, és a kezdőpont elveszik

## Motiváció / probléma

Két távoli pontra (országnézetben, Duna–Ipoly és Kecskemét környéke) kb. 6 mp „Útvonal tervezése…” után felugró ablak jön: „Nem található összeköttetés…”. Nincs tanács, hogy mit tegyen a felhasználó, és OK után a kezdőpont is elveszik, az Automatikus mód kikapcsol.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- `TURA.AUTO.NO_ROUTE` alert, OK gombbal.
- Utána `autoStart` = `null`, mód = alapállapot.

## Elfogadási kritériumok

- [x] A hibaüzenet tanácsot ad (pl. „Válassz turistaút közelében lévő pontokat, vagy közelíts rá”), és nem blokkoló (pl. a tippsávban vagy toastban jelenik meg).
- [x] Sikertelen tervezés után a kezdőpont megmarad, és a mód aktív marad, hogy csak a végpontot kelljen újraválasztani.
- [x] Megvizsgálva, hogy a nyilvánvalóan túl távoli / hálózaton kívüli pontokat korábban (a 6 mp-es keresés előtt) fel lehet-e ismerni.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — megvalósítva: a „Nincs útvonal” felugró ablak helyett a Turistaúton mód tippsávjában piros, tanácsot adó sor („Nincs összeköttetés a két pont közt a turistautakon. Válassz másik végpontot, vagy tervezz rövidebb szakaszokban.”); a kezdőpont megmarad, a mód aktív marad — csak a végpontot kell újra választani. A következő koppintás, a visszavonás, a törlés vagy a módváltás eltünteti.
- 2026-10-20 — előszűrés: a koppintott pont azonnal „túl messze” jelzést kap („Ez a pont túl messze van a turistautaktól (több mint 2 km). Koppints egy jelzett turistaút közelébe.”), és nem lesz kezdő- / végpont, ha sem a betöltött szakaszok, sem a build-asset turistaút-csomag nem ad utat a közelében. A küszöb a gráf illesztési küszöbe (`MAX_SNAP_DISTANCE_METERS` HIKE = 2 km, a backend is ennyi) — a terv 500 m-es példája elvetve, mert az illeszthető pontokat is elutasítaná. Gráfépítés nélkül, pont–szakasz távolsággal (`isNearAnyLine`); a csomagon kívül (külföld) nem dönt, a tervezés fut.
- 2026-10-20 — emulátoron: az Alföldön, turistautaktól távol koppintva a jelzés azonnal megjelent, a budapesti kezdőpont és a mód megmaradt; Budapest → Mátra a csomagon 115,7 km-es útvonalat adott. A „nincs összeköttetés” ágat az emulátoron nem sikerült előidézni (a csomag hálózata összefüggő), ez kódszinten ellenőrzött.

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #216, #217, #221, #195
- Kód: `frontend/.../tura/tura.page.ts|html`, `auto-route-hint.component.ts`, `core/data/route-suggestion.repository.ts` (+ spec), `core/geo/routing.service.ts` (+ spec), `segment-route-graph.ts` (+ spec), `geo-math.ts` (+ spec)
