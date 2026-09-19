---
id: 114
type: bug
status: done
title: Új út név mezője a mobil billentyűzeten nem nagybetűsít
specs:
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-19
closed: 2026-09-20
---

# 114 — Új út név mezője a mobil billentyűzeten nem nagybetűsít

## Motiváció / probléma

Az „Új út" névmezőjébe koppintva a telefon virtuális billentyűzete **nem** kapitalizál
automatikusan (nincs mondat-eleji nagybetű-javaslat), pedig route-neveknél ez lenne az elvárt
viselkedés (a legtöbb route/crag/sector név tulajdonnévként nagybetűvel kezdődik).

## Jelenlegi működés

`frontend/src/app/pages/workout/climbing/admin/route-edit.page.html` — a `name`
`formControlName`-hoz tartozó `ion-input`-on nincs explicit `autocapitalize` attribútum, így a
natív (Android) billentyűzet a mezőtípusra jellemző alapértelmezést alkalmazza, ami itt nem
kapitalizál. Összehasonlításképp más névmezők a repóban explicit `autocapitalize="sentences"`-t
állítanak be (`aycm-partner-edit.page.html`, `recurring-expense-edit.page.html`) — ott ez a
kívánt viselkedést adja.

## Elfogadási kritériumok

- [x] A route név `ion-input`-ja kapjon explicit `autocapitalize="sentences"` attribútumot, hogy
      a mobil billentyűzet nagybetűvel kezdje a gépelést (mondat-eleji auto-kapitalizáció).
- [x] Ellenőrizd (scoping közben), hogy a mászónapló többi hasonló "szabad szöveg" névmezője
      (Crag/Sector/Gym név, `topoNumber`) mutatja-e ugyanezt a viselkedést — ha igen, vedd fel
      egy soros kiegészítésként ide, ne nyiss külön jegyet triviális duplikációra.
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

Scoping közben kiderült, hogy a Crag/Sector/Gym szerkesztő `name` mezője pontosan ugyanezt a
mintát mutatta (nincs `autocapitalize`) — mind az öt mászó-admin névmező (`Route`, `Crag`,
`Sector`, `Gym`, `IndoorRoute`) megkapta az `autocapitalize="sentences"`-t egy jegyben, a ticket
saját triviális-duplikáció elkerülési szabálya szerint. A `topoNumber` mezőt nem érintettük —
az szám/rövid kód jellegű bevitel, ahol a mondat-kapitalizációnak nincs értelme (nem
tulajdonnév).

**Javítás 2026-09-20:** az első implementáció (helytelenül) `autocapitalize="off"`-ot állított
be — ez a probléma félreértéséből eredt (a hibajegyzőkönyv szövege alapján úgy tűnt, a
billentyűzet *túl sokat* kapitalizál, holott a valós panasz az volt, hogy *egyáltalán nem*
kapitalizál). A user jelezte a félreértést, az öt `name` mező attribútuma
`autocapitalize="sentences"`-re lett javítva, a fenti convention-nek megfelelően.

## Lezáráskor (on-done)

- Frissített specek: nincs — az `autocapitalize` billentyűzet-viselkedés az [[Outdoor köteles
  admin]] absztrakciós szintje alatti UI-mikrorészlet, a spec nem említette korábban sem.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-20 — #114 mászó-admin névmezők ne kapitalizáljanak automatikusan
- Kód: `frontend/src/app/pages/workout/climbing/admin/{route,crag,sector,gym,indoor-route}-edit.page.html`
  (`autocapitalize="sentences"` az öt `name` `ion-input`-on); nincs logikai / adat / outbox hatás
