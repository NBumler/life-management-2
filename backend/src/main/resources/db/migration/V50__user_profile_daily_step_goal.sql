-- backlog/136 — napi lépéscél a Profilban (pl. 13 000): opcionális egész, 1000–100 000.
-- A widget és a Lépésszám-képernyő haladása ehhez mér; a STEPS_LOW értesítési küszöb külön marad.
-- Additív, nullable; a meglévő sorok migráció nélkül érvényesek. sync_changes view érintetlen.

ALTER TABLE user_profile
    ADD COLUMN daily_step_goal integer CHECK (daily_step_goal IS NULL OR daily_step_goal BETWEEN 1000 AND 100000);
