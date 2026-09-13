---
id: 111
type: feature
status: ready
title: Túra — beépített túraeszközök (iránytű, magasságmérő, csúcskereső, QR-olvasó)
specs: []
flag:
created: 2026-09-13
closed:
---

# 111 — Túra — beépített túraeszközök (iránytű, magasságmérő, csúcskereső, QR-olvasó)

## Motiváció / probléma

A Természetjáró app több kis, önálló eszközt is ad ingyenesen a fő útvonaltervező mellé:
iránytű, magasságmérő, dőlésszögmérő, csúcskereső (peak finder), QR-olvasó. Ezek önmagukban kis
scope-úak, de összegyűjtve érdemes egy külön ticketben kezelni, mert eltérő natív
plugin-igényük van (kompasz/gyorsulásmérő szenzor, kamera).

## Jelenlegi működés

Nincs — ez egy vadonatúj feature. Az appban jelenleg nincs szenzor-alapú (kompasz/gyorsulásmérő)
vagy kamera-alapú (QR-olvasás) funkció ezen a területen — a `@capacitor-mlkit/barcode-scanning`
plugin már használatban van élelmiszer-vonalkód-olvasáshoz, ami QR-olvasáshoz is alapot adhat.

## Elfogadási kritériumok

- [x] Az alábbi döntési checklista véglegesítve.

## Terv / döntési napló

**Döntés (2026-09-13, felhasználóval egyeztetve):**

- [x] Iránytű (natív kompasz-szenzor) — **kell**.
- [x] Magasságmérő (barometrikus szenzor vagy GPS-alapú becslés) — **kell**.
- [x] Dőlésszögmérő (lejtő meredekségének mérése telefon-döntéssel) — **kell**.
- [ ] Csúcskereső / Skyline — **nem kell** (kikerül a scope-ból; a kamera+irány+domborzatmodell
      igénye aránytalanul nagy fejlesztési költség a többi egyszerű eszközhöz képest).
- [x] QR-olvasó (turistaút-táblák QR-kódjainak beolvasása) — **kell**; a meglévő
      `@capacitor-mlkit/barcode-scanning` plugin valószínűleg közvetlenül reuse-olható.

### Nyitott kérdés

- Melyik funkciókhoz van natív szenzor-hozzáférés Capacitor pluginon keresztül már elérhetően
  (kompasz/gyorsulásmérő nincs a jelenlegi natív pluginlistában — új plugin kellene)?

## Lezáráskor (on-done)

- Frissített specek: _(új spec-fájl, ha ekkor még nincs)_
- `IMPLEMENTATION_STATUS.md` sor: <dátum> — <mit>
- Kód: `frontend` új Capacitor plugin-integrációk (kompasz, barometrikus szenzor), meglévő
  barcode-scanning plugin reuse
