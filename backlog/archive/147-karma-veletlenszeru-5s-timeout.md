---
id: 147
type: bug
status: done
title: "Frontend tesztek: véletlenszerű 5 s-os Jasmine timeout a teljes `test:ci` futásban"
specs:
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-10-02
closed: 2026-10-02
---

# 147 — Karma: véletlenszerű 5 s-os timeout

## Motiváció / probléma

A teljes `npm run test:ci` futás (≈1900 spec, ChromeHeadlessCI, véletlen sorrend) időnként egyetlen
spec-en elhasal:

```
Error: Timeout - Async function did not complete within 5000ms (set by jasmine.DEFAULT_TIMEOUT_INTERVAL)
```

Mindig **más** spec bukik (az elmúlt körökben több különböző, a változtatásokhoz nem kapcsolódó
spec), és újrafuttatásra zöld. Árulkodó eset (2026-10-02): a bukott spec a
`ClimbingLiveSessionService (backlog/122) liveRoute points at the context live screen` — egy
**szinkron**, egysoros `expect` —, tehát nem a spec maga lassú: vagy az előtte futó spec hagy
függőben aszinkron munkát / blokkolja a fő szálat, vagy a headless Chrome akad meg (GC, háttér-fül
throttling) a hosszú futás közben. A zöld kapu („tests + lint + build + verify:outbox” commit előtt)
így esetenként újrafuttatást igényel, ami lassít és elfedheti a valódi hibát.

## Jelenlegi működés

[[Fejlesztői környezet]]: `npm run test:ci` = `ng test --browsers=ChromeHeadlessCI --watch=false`;
`karma.conf.js`: alapértelmezett Jasmine konfig (véletlen sorrend, a seed nincs kiírva / rögzítve),
`ChromeHeadlessCI` = `--no-sandbox --disable-gpu`; `DEFAULT_TIMEOUT_INTERVAL` = 5000 ms.

## Elfogadási kritériumok

- [x] A futás kiírja a Jasmine random seedet, és egy bukott futás seeddel reprodukálható
      (`client.jasmine.seed`) — dokumentálva a [[Fejlesztői környezet]]ben.
- [x] Ok azonosítva: függő timer / promise / `setInterval` szivárgó spec(ek) (pl. root szolgáltatások
      intervalja, `fakeAsync` nélküli várakozás, valódi `setTimeout`-os spec), vagy headless Chrome
      throttling (`--disable-background-timer-throttling`, `--disable-renderer-backgrounding`,
      `--disable-backgrounding-occluded-windows`).
- [x] Javítás: a szivárgó spec(ek) rendbetétele és / vagy a launcher flagek; a timeout növelése
      csak indokolt esetben, nem tüneti kezelésként.
- [x] 10 egymás utáni teljes `test:ci` futás timeout nélkül.

## Terv / döntési napló

- 2026-10-02: mérés a seed-naplóval. Javítás előtt 9 teljes futás zöld (6 terheletlen, 3 párhuzamos
  backend-teszt terhelés alatt); terhelés alatt egy spec ~2 s-ig futott: `ActiveWorkoutPage — a rest-timer
  tick…` (a lejárati hangjelzés valódi WebAudio kontextust nyitott — hangeszköz-init a fő szálon). Az
  eredeti bukás egy szinkron spec volt, vagyis a fő szál / az időzítők álltak: ennek két ismert forrását
  szüntettük meg (Chrome időzítő-fojtás a háttér-renderereken; valódi hangeszköz a tesztben). A timeout
  értéke változatlan (5 s). Javítás után 10 egymás utáni teljes futás zöld, terhelés mellett is, lassú
  spec nélkül. Ha mégis előjön: a logból a seed + a lassú specek adják a nyomot.

## Lezáráskor (on-done)

- Frissített specek: [[Fejlesztői környezet]] — `test:ci` launcher flagek, seed-napló + `JASMINE_SEED` visszajátszás, lassú-spec jelzés
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-02 — #147
- Kód: `db7fb7b` — `frontend/karma.conf.js`, `frontend/src/test.ts`, `active-workout.page.spec.ts`
