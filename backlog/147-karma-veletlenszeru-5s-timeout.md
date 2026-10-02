---
id: 147
type: bug
status: backlog
title: "Frontend tesztek: véletlenszerű 5 s-os Jasmine timeout a teljes `test:ci` futásban"
specs:
  - "[[Fejlesztői környezet]]"
flag:
created: 2026-10-02
closed:
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

- [ ] A futás kiírja a Jasmine random seedet, és egy bukott futás seeddel reprodukálható
      (`client.jasmine.seed`) — dokumentálva a [[Fejlesztői környezet]]ben.
- [ ] Ok azonosítva: függő timer / promise / `setInterval` szivárgó spec(ek) (pl. root szolgáltatások
      intervalja, `fakeAsync` nélküli várakozás, valódi `setTimeout`-os spec), vagy headless Chrome
      throttling (`--disable-background-timer-throttling`, `--disable-renderer-backgrounding`,
      `--disable-backgrounding-occluded-windows`).
- [ ] Javítás: a szivárgó spec(ek) rendbetétele és / vagy a launcher flagek; a timeout növelése
      csak indokolt esetben, nem tüneti kezelésként.
- [ ] 10 egymás utáni teljes `test:ci` futás timeout nélkül.

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: [[Fejlesztői környezet]]
- `IMPLEMENTATION_STATUS.md` sor
