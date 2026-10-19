---
id: 180
type: bug
status: backlog
title: Túra — a turistaút-szakaszok korlátlanul töltődnek be (20 MB / 27 s, soha nem ürül)
specs: []
flag: menu.tura
created: 2026-10-19
closed:
---

# 180 — Túra — a turistaút-szakaszok korlátlanul töltődnek be (20 MB / 27 s, soha nem ürül)

## Motiváció / probléma

Forrás: a 2026-10-19-i emulátoros túra-teszt (LM2_Phone, Android 15). A Túra oldal ország-nézetben nyílik meg (`HUNGARY_ZOOM`), és az első `moveend`
a teljes látható bbox-ra kéri le a turistaút-szakaszokat. Mérve: egyetlen
`GET /api/tura/trail-segments` válasz **20,3 MB**, **27,4 s** alatt (a kezdeti, Közép-Magyarországot
lefedő nézetre). Az adatbázisban 230 611 szakasz / 2,8 millió pont van (48 MB nyersen). Az
eredmény a memóriában marad, és minden további térképmozgás csak hozzáad. Ugyanez az ok, hogy
ország-nézetben az összes betöltött turistaút kirajzolódik (olvashatatlan, zsúfolt térkép), és a
[[181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf]] lassúságának is ez a táptalaja.

## Jelenlegi működés

- Backend: `TrailSegmentRepository.findInBbox` (`backend/.../tura/`) — nincs `LIMIT`, nincs
  bbox-méret korlát.
- Frontend: `tura.page.ts` `loadCurrentViewport()` minden `moveend`-re hív, zoomtól függetlenül;
  `core/data/trail-segment.repository.ts` `loadBbox()` a `byId` Map-be **összefésül**, soha nem
  dob ki elemet; a `segments` computed minden változáskor a teljes tömböt újraépíti, a térkép
  `trail-segments` forrása a teljes halmazzal kap `setData`-t.

## Elfogadási kritériumok

- [ ] Minimális zoomszint, ami alatt a szakaszok nem töltődnek be és nem rajzolódnak ki (a réteg `minzoom`-ja és a lekérdezés is) — a határ mérés alapján, konstansként.
- [ ] Backend-oldali védőkorlát: túl nagy bbox vagy túl sok sor esetén korlátozott / hibás válasz (stabil `code`-dal), nem a teljes tábla.
- [ ] A frontend cache korlátos: a látható terület (+ margó) szakaszait tartja, a régieket kiszorítja.
- [ ] Mérés a jegyben: az oldal megnyitásakor letöltött adat és idő előtte / utána, emulátoron.
- [ ] Offline (a letöltött régió cache-e) viselkedés változatlan.

## Terv / döntési napló

- A [[181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf]] és a [[184-tura-terkep-kesleltetett-ujrarajzolas]] mérését e jegy után érdemes megismételni.
- Ha a backend-válasz alakja változik (pl. lapozás), OpenAPI + `npm run gen:api`.

## Lezáráskor (on-done)

- Frissített specek: a túra spec (a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül)
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — #180
- Kód: <fő fájlok>
