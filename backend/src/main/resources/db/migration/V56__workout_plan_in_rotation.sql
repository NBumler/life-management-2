-- backlog/165 — documentation/Subfeatures/Heti terv.md "Aktív / inaktív sablonok": an active template
-- can be kept out of the rotation forecast while still being offered by the pickers (weekly manual
-- override, "Terv indítása…") — e.g. an occasional finger-strength session. Independent of `active`;
-- every existing template stays in the rotation, so today's forecast is unchanged.
ALTER TABLE workout_plan ADD COLUMN in_rotation boolean NOT NULL DEFAULT true;
