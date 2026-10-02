-- backlog/144 — a WeeklyPlan slot is now a one-day manual override of the rotation forecast
-- (documentation/Subfeatures/Heti terv.md "Kézi felülírás"): PLAN = this template on that day,
-- REST = a forced rest day (no template). Existing slots are template overrides.
ALTER TABLE weekly_plan_slot
    ADD COLUMN kind text NOT NULL DEFAULT 'PLAN' CHECK (kind IN ('PLAN', 'REST'));

ALTER TABLE weekly_plan_slot
    ALTER COLUMN plan_id DROP NOT NULL;

ALTER TABLE weekly_plan_slot
    ADD CONSTRAINT chk_weekly_plan_slot_kind_plan
        CHECK ((kind = 'PLAN' AND plan_id IS NOT NULL) OR (kind = 'REST' AND plan_id IS NULL));
