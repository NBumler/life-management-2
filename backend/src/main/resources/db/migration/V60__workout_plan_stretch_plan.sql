-- backlog/170 — documentation/Subfeatures/Heti terv.md "Csatolt nyújtás": an optional stretching template
-- run after a workout of this strength template. A reference, not ownership — one stretching template may
-- be attached to many strength templates; deleting it never rewrites these rows (the client ignores a
-- link to a deleted template and clears it on the next save). The sync_changes view is unaffected.
ALTER TABLE workout_plan ADD COLUMN stretch_plan_id uuid REFERENCES stretch_plan (id);
