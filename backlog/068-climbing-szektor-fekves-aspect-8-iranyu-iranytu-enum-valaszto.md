---
id: 68
type: change-request
status: backlog
title: Sziklamászó szektor fekvés (aspect) — 8 irányú égtáj-enum vizuális választóval
specs:
  - "[[Outdoor boulder admin]]"
  - "[[Outdoor köteles admin]]"
  - "[[Mászónapló]]"
flag:
created: 2026-09-06
closed:
---

# 68 — Sziklamászó szektor fekvés (aspect) — 8 irányú égtáj-enum vizuális választóval

## Motiváció / probléma

Új szektor felvételekor a fekvés (`aspect`) megadása most szabad/kevéssé strukturált. Jobb lenne
egy jól definiált 8 irányú égtáj-enum (É, ÉK, K, DK, D, DNy, Ny, ÉNy), **vizuális választóval**:
egy négyzet kerületén a 8 irány, egy tap. Ez azért ideális, mert a felmászókönyvek eleve
égtájként adják meg a fekvést — elég átmásolni. Mapper kell a numerikus fok ↔ enum között
(mi számít északnak, észak-keletnek stb.), hogy más forrásból (iránytű-fok) is konvertálható legyen.

Elvetett / későbbi alternatívák (dokumentálva, nem ez a scope):
- Kör + kézzel állított szög (jó, ha van fizikai iránytű) — pontos, de lassabb bevitel.
- Telefon a szikla felé irányítva, automatikus felismerés — pontatlan iránytűnél rossz adat,
  és csak helyben működik, távolról nem.

**Preferált megoldás: négyzet kerületén a 8 enum.**

## Jelenlegi működés

[[Outdoor boulder admin]]: `Sector` mezői közt `default aspect (fekvés)`, soft delete.
[[Outdoor köteles napló]] öröklési sorrend: Route saját `aspect` → `Sector.aspect` default →
session szinten felülírható. Az `aspect` reprezentációja / bevitele a specben nincs részletezve.

## Elfogadási kritériumok

- [ ] `aspect` enum rögzítése: 8 égtáj (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`) + `UNKNOWN`/null.
- [ ] Fok ↔ enum mapper (bin határok: pl. É = 337.5°–22.5°), kliens + backend paritás, fixture.
- [ ] Vizuális választó komponens: négyzet kerületén 8 tap-pont, kijelölt állapot, akadálymentes.
- [ ] Használat: szektor admin (`Sector.aspect`), és minden hely, ahol az `aspect` felülírható
      (napló session szint).
- [ ] Migráció, ha a jelenlegi tárolás nem enum (pl. szabad szöveg → enum).
- [ ] OpenAPI séma + helyi SQLite `SCHEMA_Vn`.

## Terv / döntési napló

_A mapper fok-tartományai legyenek fixture-ölve (`shared/fixtures/`). A vizuális választó
újrahasznosítható a napló felülírásnál is._

## Lezáráskor (on-done)

- Frissített specek: [[Outdoor boulder admin]], [[Outdoor köteles admin]], [[Outdoor köteles napló]],
  [[Outdoor boulder napló]] (aspect enum + választó), [[Mászónapló]] ha a közös entitás érintett
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `hu.bumler.lm2.climbing` (enum + mapper + migráció), `frontend` aspect választó komponens
