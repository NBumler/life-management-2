---
verifikalva: 2026-09-02
verifikalt_commit: a409f5b
---

# Kaja

## Business

| | |
|---|---|
| **Státusz** | `Kész` |
| **Szülő** | [[Life Management 2.0]] |
| **Kapcsolódó** | [[Bevásárlás]], [[Élelmiszerek]], [[Recept]], [[Tápérték kalkulátor]], [[Mennyiség mező]], [[Bejelentkezés]], [[Backend-offline first]] |

### Jelenlegi működés

Élelmiszer, tárolás, recept, étkezés és kapcsolódó statisztikák kezelése egy feature alatt. Alsó tab: **Kaja** (lásd [[Frontend]]). A [[Bevásárlás]] domainben kapcsolódik (katalógus / tárolás), de navigációja a **Menü** tabon van.

### Funkcionális leírás

Subfeature lista:

- [[Élelmiszerek]] (`Kész`)
- [[Élelmiszer tárolás]] (`Kész`)
- [[Recept]] (`Kész`)
- [[Étkezés]] (`Kész`)
- [[Kaja statisztika]] (`Kész`)

### UI/UX elvárások

- Alsó tab: **Kaja** (`/tabs/food`) — app-shell SSOT: [[Frontend]].
- A tab gyökerén **felső szegmens**: Étkezés | Tárolás | Katalógus | Recept | Stat. Alapértelmezett szegmens: [[Étkezés]] dashboard.
- Mélyebb képernyők (részletek, szerkesztő) push-sal nyílnak, a szegmens nélkül.
- Flag: a `tab.kaja` fedi az Étkezés / Tárolás / Katalógus szegmenst; a [[Recept]] és a [[Kaja statisztika]] saját flaget kap ([[Frontend]] registry). Ki → az adott szegmens rejtve.

### Megjegyzések

Ownership: `Food` / `Recipe` **shared**; tárolás / étkezés / bevásárlás **user-owned** — [[Bejelentkezés]].

### Nyitott kérdések

Nincs nyitott kérdés.

## Architektúra

### Frontend

Kaja tab belépő; a subfeature-ök külön képernyők / flow-k.

#### Backend-offline

Backend-offline és Full-offline: olvasás/írás a helyi store-on; módosító kérések outboxba (`OfflineQueueService`), kliens UUID. Sync: [[Szinkronizációs központ]]. Lásd [[Backend-offline first]].

### Backend

**Nincs** aggregált „Kaja API" ebben a szülőben: a szerződés erőforrás / tag alapon szerveződik (`foods`, `stored-foods`, `recipes`, `meals`), és a gyerek specek a birtokosai — a hub navigációs fogalom, nem API-határ ([[Backend]]). Itt csak a közös döntések élnek: az [[Élelmiszerek]] katalógus (`Food`, **shared**) és a [[Recept]] shared; tárolás / étkezés user-owned — [[Bejelentkezés]]. Cascade törlés minden user hivatkozó adatára: [[Backend-offline first]].

### Nyitott kérdések

Nincs nyitott kérdés.
