---
id: 215
type: feature
status: done
title: Túra — nincs „saját helyzetem” gomb és helykeresés
specs: []
flag: menu.tura
created: 2026-10-19
closed: 2026-10-20
---

# 215 — Túra — nincs „saját helyzetem” gomb és helykeresés

## Motiváció / probléma

A tervezés kiindulópontját csak kézi nagyítással-húzással lehet megtalálni: nem lehet a saját helyzetre ugrani, és nem lehet települést / hegyet keresni.

Forrás: a 2026-10-19-i emulátoros UX-teszt (LM2_Phone, 360 dp, magyar felület), a felhasználó visszajelzése alapján: „eléggé átláthatatlan… a gombok nem egyértelműek… a térképen random színes vonalakat látok”.

## Jelenlegi működés

- A térképen csak a MapLibre nagyítás / tájolás vezérlő van.
- A GPS-réteg a #106 / #150 C fázis része; a POI-keresés a #108 része.

## Elfogadási kritériumok

- [x] „Saját helyzetem” gomb a térképen (egyszeri helymeghatározás, engedélykéréssel; a háttér-követés nem része).
- [x] Helykeresés (település / csúcs név szerint) — offline-first módon (pl. a #108 POI-adatból vagy build assetből), nem backend-proxyval. Döntés a naplóban, a [[108-tura-poi-adatbazis-ketura-belyegzok]]-vel összehangolva.

## Terv / döntési napló

- 2026-10-19 — felvéve a felhasználó kérésére az emulátoros UX-teszt észrevételeiből.
- 2026-10-20 — döntés (a felhasználó elfogadta a terv javaslatát): a **helykeresés átkerül a [[108-tura-poi-adatbazis-ketura-belyegzok]]-be** — offline-first módon a POI-adatból vagy build assetből kereshető, backend-proxy nélkül; ez a jegy a helyzet-gombbal zárul.
- 2026-10-20 — megvalósítva: „Saját helyzetem” gomb a MapLibre +/− / iránytű vezérlő alatt, ugyanabban a stílusban (ikon, `aria-label` + `title`; `my-location-control.ts`). Egyszeri helymeghatározás a meglévő `LocationTrackingService`-en át, a bicikli Becsült mód végpont-fixének mintájára (20 s; ≤ 20 m pontosságnál korábban kész). A pont kék korong a térképen (a jelmagyarázatban „Saját helyzet”), a térkép odaugrik, legalább 14-es zoomra, hogy a turistautak látsszanak. Követés nincs. Élő bicikli-edzés közben a már futó követés utolsó pontját használja. Helymeghatározás közben a gomb lüktet, és nem nyomható.
- 2026-10-20 — engedély: az emulátoros próbán kiderült, hogy a `@capgo/background-geolocation` (8.4.14, a legújabb) külön `requestPermissions()` hívása Androidon elutasítás után soha nem tér vissza — a plugin újra és újra kéri, a gomb örökre „dolgozott”. Ezért a helyzet-gomb nem azt hívja: az új `LocationTrackingService.locateOnce()` a plugin `start()`-jára bízza az engedélykérést, ami elutasításkor `NOT_AUTHORIZED` hibát ad; ekkor azonnal megáll, és üzenet jön („A helyzeted nem érhető el: kapcsold be a helymeghatározást, és engedélyezd az appnak a helyhozzáférést…”). Ugyanez a plugin-hiba a bicikli élő edzés indítását is érinti: [[229-bicikli-elo-edzes-inditas-beragad-elutasitott-helyengedelynel]].
- 2026-10-20 — emulátoron (hu + en, 360 dp): a gomb a Pilisben (emulált GPS) kék pontot tett és odaugrott; tartósan elutasított engedélynél azonnal megjött az üzenet, és a gomb újra nyomható lett; az engedély visszaadása után ismét működött. Web buildben a böngésző saját engedélykérése fut (a plugin web-implementációja `navigator.geolocation`); elutasításkor az `1`-es hibakód adja ugyanezt az üzenetet — ezt csak unit teszt fedi.

## Lezáráskor (on-done)

- Frissített specek: [[Backend-offline first]] §13 (helymeghatározás sor); a túra spec a [[102-tura-utvonaltervezo-attekintes]] szerint a család végén készül.
- `IMPLEMENTATION_STATUS.md` sor: 2026-10-20 — #223, #215
- Kód: `frontend/src/app/pages/menu/tura/my-location-control.ts` (+ spec), `tura.page.ts`, `map-icons.ts`, `tura-legend.component.ts`, `core/geo/location-tracking.service.ts` (`locateOnce`, + spec), `global.scss`, `core/config/icons.ts`
