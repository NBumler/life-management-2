---
id: 159
type: change-request
status: ready
title: NG8113 build warning — felesleges IonRouterOutlet import a TabsPage-ben
specs: []
flag:
created: 2026-10-17
closed:
---

# 159 — NG8113 build warning — felesleges IonRouterOutlet import a TabsPage-ben

## Motiváció / probléma

`npm run build` warning:

```
▲ [WARNING] NG8113: IonRouterOutlet is not used within the template of TabsPage
    src/app/pages/tabs/tabs.page.ts:12:21
```

A `tabs.page.html` szándékosan **nem** tartalmaz `<ion-router-outlet>`-et (a kommentje
szerint az `IonTabs` saját, router-be kötött outletet renderel; egy második duplikátum
eltakarná az oldalt és elnyelné a tapokat) — az import ennek a javításnak a maradványa.

## Jelenlegi működés

`tabs.page.ts` `imports: [IonTabs, IonRouterOutlet, …]`; a sablon nem használja.

## Elfogadási kritériumok

- [ ] `IonRouterOutlet` eltávolítva az `imports` tömbből és az import-sorból.
- [ ] `npm run build` NG8113 nélkül; tab-navigáció változatlanul működik (a kommentben leírt
      tap-elnyelés nem tér vissza).

## Terv / döntési napló

_—_

## Lezáráskor (on-done)

- Frissített specek: — (nincs viselkedésváltozás)
- `IMPLEMENTATION_STATUS.md` sor: …
- Kód: `frontend/src/app/pages/tabs/tabs.page.ts`
