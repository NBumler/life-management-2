---
id: 114
type: bug
status: done
title: Új út név mezője a mobil billentyűzeten automatikusan nagybetűsít
specs:
  - "[[Outdoor köteles admin]]"
flag:
created: 2026-09-19
closed: 2026-09-20
---

# 114 — Új út név mezője a mobil billentyűzeten automatikusan nagybetűsít

## Motiváció / probléma

Az „Új út" névmezőjébe koppintva a telefon virtuális billentyűzete automatikusan nagybetűvel
kezdi a gépelést (mondat-eleji auto-kapitalizáció), pedig ez route-neveknél gyakran nem
kívánt (pl. kisbetűs vagy vegyes írásmódú topó-nevek).

## Jelenlegi működés

`frontend/src/app/pages/workout/climbing/admin/route-edit.page.html` — a `name`
`formControlName`-hoz tartozó `ion-input`-on nincs explicit `autocapitalize` attribútum, így a
natív (Android) billentyűzet a default mondat-kapitalizációt alkalmazza. Összehasonlításképp
más névmezők a repóban explicit `autocapitalize="sentences"`-t állítanak be
(`aycm-partner-edit.page.html`, `recurring-expense-edit.page.html`) — ott ez szándékos, itt
viszont a user nem ezt akarja.

## Elfogadási kritériumok

- [x] A route név `ion-input`-ja kapjon `autocapitalize="off"` (vagy `"none"`) attribútumot,
      hogy a mobil billentyűzet ne kapitalizáljon automatikusan.
- [x] Ellenőrizd (scoping közben), hogy a mászónapló többi hasonló "szabad szöveg" névmezője
      (Crag/Sector/Gym név, `topoNumber`) mutatja-e ugyanezt a viselkedést — ha igen, vedd fel
      egy soros kiegészítésként ide, ne nyiss külön jegyet triviális duplikációra.
- [x] Zöld lint + test:ci + build.

## Terv / döntési napló

Scoping közben kiderült, hogy a Crag/Sector/Gym szerkesztő `name` mezője pontosan ugyanezt a
mintát mutatta (nincs `autocapitalize`) — mind az öt mászó-admin névmező (`Route`, `Crag`,
`Sector`, `Gym`, `IndoorRoute`) megkapta az `autocapitalize="off"`-ot egy jegyben, a ticket
saját triviális-duplikáció elkerülési szabálya szerint. A `topoNumber` mezőt nem érintettük —
az szám/rövid kód jellegű bevitel, ahol az auto-kapitalizáció eleve nem okoz gondot (nincs betű
eleji nagybetűsítés hatása numerikus/kevert karaktereken).

## Lezáráskor (on-done)

- Frissített specek: nincs — az `autocapitalize` billentyűzet-viselkedés az [[Outdoor köteles
  admin]] absztrakciós szintje alatti UI-mikrorészlet, a spec nem említette korábban sem.
- `IMPLEMENTATION_STATUS.md` sor: 2026-09-20 — #114 mászó-admin névmezők ne kapitalizáljanak automatikusan
- Kód: `frontend/src/app/pages/workout/climbing/admin/{route,crag,sector,gym,indoor-route}-edit.page.html`
  (`autocapitalize="off"` az öt `name` `ion-input`-on); nincs logikai / adat / outbox hatás
