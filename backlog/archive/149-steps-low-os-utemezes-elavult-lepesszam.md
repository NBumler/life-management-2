---
id: 149
type: bug
status: done
title: "STEPS_LOW: a 20:00 előtt OS-ütemezett riasztás elavult lépésszámmal tüzel"
specs: ["[[Értesítések]]"]
flag:
created: 2026-10-02
closed: 2026-10-02
---

# 149 — STEPS_LOW: 20:00 előtt OS-ütemezett riasztás elavult lépésszámmal

## Motiváció / probléma

A #81 után is jött valótlan „kevés lépés” értesítés 20:00-kor, pedig a napi lépésszám bőven a
küszöb fölött volt.

Ok: ha az app **20:00 előtt** nyílt meg, és a mai lépésszám akkor még a küszöb alatt volt (pl. délben
1500), a `NotificationScheduler.runReconcile()` a `STEPS_LOW`-t — mint bármely jövőbeli fix-idős
értesítést — **OS local notification**-ként 20:00-ra ütemezte, a pillanatnyi értékkel renderelt
szöveggel. 20:00-kor az OS ezt újraellenőrzés nélkül elsütötte. A natív `ReminderWorker` élő Health
Connect olvasása pedig nem futott le, mert az id szerepelt az OS-ütemezett registryben
(`lm2_notifScheduled`), és a worker ilyenkor szándékosan kihagyja. A #81 csak az app-nyitáskori
kiértékelés *pillanatát* javította, a 20:00-ig eltelt lépéseket nem.

## Elfogadási kritériumok

- [x] A `STEPS_LOW` 20:00 előtt sosem kerül OS-ütemezésre; 20:00 előtt a háttér-worker terve
      (`lm2_notifBgPlan.stepsLow`) viszi, élő 20:00-s Health Connect olvasással.
- [x] 20:00 után app-nyitáskor / előtérbe jövéskor a friss sync után azonnal tüzel, ha a küszöb alatt
      van (változatlan).
- [x] Egy régebbi build által már sorba tett 20:00-s `STEPS_LOW` riasztást a következő reconcile törli.
- [x] Dedupe (1 / nap) és „kiküldöttet nem vonunk vissza” változatlan.

## Terv / döntési napló

- **2026-10-02:** `READ_HEALTH_DATA_IN_BACKGROUND` grant nélkül így 20:00-kor nincs `STEPS_LOW`, csak a
  20:00 utáni első app-nyitáskor. Elfogadva: inkább maradjon el, mint hogy valótlant mondjon. A korábbi
  „Tudatos korlát” szöveg (grant nélkül „az utolsó ismert helyi értékből tüzel”) valójában ezt az
  OS-ütemezett riasztást írta le — javítva.
- Maradék kockázat: a Samsung Health → Health Connect szinkron késése (a worker a HC-t olvassa) —
  „Tudatos korlát”-ként rögzítve.

## Lezáráskor (on-done)

- Frissített spec: [[Értesítések]] — §3 új „20:00 előtt nincs OS-ütemezés” bullet; Architektúra /
  Frontend grant-bullet; „Tudatos korlát” pontosítva + Samsung Health → HC késés.
- Kód (commit `7d6e214`): `frontend/src/app/core/notifications/notification-scheduler.service.ts`
  (`runReconcile` — jövőbeli `STEPS_LOW` kimarad a `desiredById`-ből) + spec.
