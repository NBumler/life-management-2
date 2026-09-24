-- backlog/125 — edzés-sablon szett cél-ismétlésszáma tartományként ("8-12"): a meglévő `reps` az alsó
-- határ / az egyetlen cél, az új nullable `reps_max` a felső határ (NULL = nem tartomány). Additív,
-- a meglévő sorok migráció nélkül érvényesek. A "reps_max >= reps" szabályt a service validálja
-- (400 VALIDATION), itt csak a nem-negativitás. sync_changes view érintetlen.

ALTER TABLE workout_plan_set
    ADD COLUMN reps_max integer CHECK (reps_max IS NULL OR reps_max >= 0);
