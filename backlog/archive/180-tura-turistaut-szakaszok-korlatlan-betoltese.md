---
id: 180
type: bug
status: done
title: Túra — a turistaút-szakaszok korlátlanul töltődnek be (20 MB / 27 s, soha nem ürül)
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-19
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

- [x] Minimális zoomszint, ami alatt a szakaszok nem töltődnek be és nem rajzolódnak ki (a réteg `minzoom`-ja és a lekérdezés is) — a határ mérés alapján, konstansként.
- [x] Backend-oldali védőkorlát: túl nagy bbox vagy túl sok sor esetén korlátozott / hibás válasz (stabil `code`-dal), nem a teljes tábla.
- [x] A frontend cache korlátos: a látható terület (+ margó) szakaszait tartja, a régieket kiszorítja.
- [x] Mérés a jegyben: az oldal megnyitásakor letöltött adat és idő előtte / utána, emulátoron.
- [x] Offline (a letöltött régió cache-e) viselkedés változatlan.

## Terv / döntési napló

- A [[181-tura-automatikus-tervezes-teljes-szakaszhalmaz-graf]] és a [[184-tura-terkep-kesleltetett-ujrarajzolas]] mérését e jegy után érdemes megismételni.
- Ha a backend-válasz alakja változik (pl. lapozás), OpenAPI + `npm run gen:api`.
- 2026-10-19 — megvalósítva:
  - Frontend: `MIN_TRAIL_SEGMENT_ZOOM = 12` (`tura.page.ts`) — a réteg `minzoom`-ja és a
    `loadCurrentViewport` kapuja. A kiinduló 10-es érték helyett mérés alapján 12 (lásd lent).
  - `TrailSegmentRepository`: korlátos cache — minden betöltés után csak a kért bbox +
    `TRAIL_SEGMENT_RETAIN_MARGIN_FRACTION` (0,5) szakaszai maradnak; egy újabb kérés által
    megelőzött válasz eldobva; `400` → üres lista, offline-cache fallback nélkül. Szakasz-bbox
    egyszer számolva (`core/geo/segment-route-graph.ts` `trailSegmentBbox`, `WeakMap`).
  - Backend: `TrailSegmentService.MAX_BBOX_AREA_SQUARE_DEGREES = 0.5` → `400 BBOX_TOO_LARGE`
    (`BboxTooLargeException`, `GlobalExceptionHandler`), OpenAPI `400` válasz. `LIMIT` szándékosan
    nincs: a csonkolt lista csendben hiányos térképet adna, a területkorlát már véd. A
    `RouteSuggestionService` a repository-t közvetlenül hívja, rá a korlát nem vonatkozik.
- Mérés (emulátor, LM2_Phone, 360 dp, a legsűrűbb Budapest–Pilis környék, `GET /api/tura/trail-segments`):
  - előtte: oldalmegnyitáskor (7-es zoom) 20,3 MB / 27,4 s;
  - utána, oldalmegnyitás (7-es zoom): **nincs kérés**;
  - 11-es zoom (csak összehasonlításnak): 4,0 MB / 5,0 s és 2,1 MB / 2,3 s;
  - 12-es zoom (a választott küszöb): 0,7 MB / 1,5 s, 1,4 MB / 1,0 s, 0,6 MB / 0,8 s (bbox ~0,02 fok²).
- A backend nem tömörít (`server.compression` nincs bekapcsolva); a JSON gzip-pel jóval kisebb
  lenne — globális beállítás, ezért nem e jegy része, javaslatként jelezve.
- A backend-korlát a futó helyi backenden csak újraindítás után él (a mérés a kliens-oldali zoom-kapuval készült).

## Lezáráskor (on-done)

- Frissített specek: **nincs** — a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-19 — #180–#182
- Kód: `frontend/src/app/core/data/trail-segment.repository.ts`, `core/geo/geo-math.ts`,
  `core/geo/segment-route-graph.ts`, `pages/menu/tura/tura.page.ts`;
  `backend/.../tura/TrailSegmentService.java`, `common/exception/BboxTooLargeException.java`,
  `common/GlobalExceptionHandler.java`, `openapi/paths/tura-trail-segments.yaml`.
