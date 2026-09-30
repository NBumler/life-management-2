-- backlog/133 — sablon-gyakorlat megjegyzés (pl. padállás "szék: 5", tempó): opcionális, max. 200 karakter.
-- backlog/134 — egyoldali szett: side = LEFT | RIGHT, NULL = mindkét kéz / nem releváns.
-- backlog/135 — opcionális RPE (6–10, 0.5-ös lépés): cél a sablon-szetten, tényleges a napló-szetten.
-- Mind additív, nullable; a meglévő sorok migráció nélkül érvényesek. sync_changes view érintetlen.

ALTER TABLE workout_plan_exercise
    ADD COLUMN notes text CHECK (notes IS NULL OR char_length(notes) <= 200);

ALTER TABLE workout_plan_set
    ADD COLUMN side text CHECK (side IS NULL OR side IN ('LEFT', 'RIGHT')),
    ADD COLUMN rpe numeric(3, 1) CHECK (rpe IS NULL OR (rpe BETWEEN 6 AND 10 AND rpe * 2 = floor(rpe * 2)));

ALTER TABLE workout_set_entry
    ADD COLUMN side text CHECK (side IS NULL OR side IN ('LEFT', 'RIGHT')),
    ADD COLUMN rpe numeric(3, 1) CHECK (rpe IS NULL OR (rpe BETWEEN 6 AND 10 AND rpe * 2 = floor(rpe * 2)));
