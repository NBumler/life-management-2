-- documentation/Subfeatures/Heti terv.md — training templates (WorkoutPlan) and their weekly
-- assignment (WeeklyPlan). Two nested aggregates like meal/recipe/workout_session:
--   workout_plan → workout_plan_exercise → workout_plan_set   (three levels, saved/read as one tree)
--   weekly_plan  → weekly_plan_slot                           (two levels, saved/read as one tree)
-- workout_plan and weekly_plan are user-owned (like exercise_catalog / meal); the child tables carry
-- no user_id of their own — ownership flows through plan_id / weekly_plan_id, same shape as meal_item
-- and the workout_session child tables. WorkoutSession.planId is a soft link to workout_plan.id: the
-- FK V18 deferred to this slice is added below (a plan soft-deleted later keeps every past session's
-- planId intact — the FK does not cascade, and reads filter deleted = false in application code).

CREATE TABLE workout_plan (
    id                   uuid PRIMARY KEY,
    user_id              uuid NOT NULL REFERENCES users (id),
    name                 text NOT NULL,
    notes                text,
    -- documentation/Subfeatures/Heti terv.md "Aktív / inaktív sablonok": default true on create,
    -- toggled row-by-row through the ordinary nested PUT (no dedicated endpoint). Inactive is NOT a
    -- delete — the row stays in the catalog, past WorkoutSession.planId / WeeklyPlan slots referencing
    -- it are untouched; it is only hidden from the pickers (weekly slot assignment, "Terv indítása").
    active               boolean NOT NULL DEFAULT true,
    -- Optional display-only grouping label in the list / picker ("Alap rotáció", "Cél: …"). No logic.
    goal_label           text,
    default_workout_type text CHECK (default_workout_type IS NULL OR default_workout_type IN ('GENERAL_WEIGHTS', 'HIIT_CIRCUIT')),
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    deleted              boolean NOT NULL DEFAULT false,
    deleted_at           timestamptz
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_workout_plan_user_id_updated_at ON workout_plan (user_id, updated_at);

CREATE TRIGGER workout_plan_set_updated_at
    BEFORE INSERT OR UPDATE ON workout_plan
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- V18 left workout_session.plan_id a bare uuid ("the workout_plan table lands with the Heti terv
-- slice, which adds the FK then"). No ON DELETE action: deletes are soft everywhere, a hard delete of
-- a referenced plan should fail loudly rather than orphan or wipe sessions.
ALTER TABLE workout_session
    ADD CONSTRAINT fk_workout_session_plan_id FOREIGN KEY (plan_id) REFERENCES workout_plan (id);

-- documentation/Subfeatures/Heti terv.md "Entitás — WorkoutPlanExercise": one exercise line in a
-- template. exerciseId is REQUIRED here (unlike workout_exercise_entry, which allows null for ad-hoc)
-- — "kötelező a sablonban". name/category/kind are a snapshot taken at edit time (from the picker),
-- so a later rename or soft delete of the master exercise never rewrites the template.
CREATE TABLE workout_plan_exercise (
    id                uuid PRIMARY KEY,
    plan_id           uuid NOT NULL REFERENCES workout_plan (id),
    exercise_id       uuid NOT NULL REFERENCES exercise_catalog (id),
    exercise_name     text NOT NULL,
    exercise_category text NOT NULL CHECK (exercise_category IN (
                          'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'FOREARM_FINGERS', 'FULL_BODY')),
    exercise_kind     text NOT NULL CHECK (exercise_kind IN (
                          'WEIGHTED_REPS', 'BODYWEIGHT_REPS', 'ISOMETRIC_TIME', 'HANGBOARD_PINCH', 'CARDIO_TIME_DIST')),
    order_index       integer NOT NULL,
    superset_group    integer,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted           boolean NOT NULL DEFAULT false,
    deleted_at        timestamptz
);

CREATE INDEX idx_workout_plan_exercise_plan_id ON workout_plan_exercise (plan_id);
CREATE INDEX idx_workout_plan_exercise_updated_at ON workout_plan_exercise (updated_at);
CREATE INDEX idx_workout_plan_exercise_exercise_id ON workout_plan_exercise (exercise_id);

CREATE TRIGGER workout_plan_exercise_set_updated_at
    BEFORE INSERT OR UPDATE ON workout_plan_exercise
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Heti terv.md "targetSets": the template's target set list. Same field
-- shape as workout_set_entry minus set_number / is_completed (a template has no "completed" state and
-- ordering is order_index alone). Which fields matter follows the parent's exercise_kind snapshot;
-- the server persists whatever is sent (deliberately loose type rule, like the session sets).
CREATE TABLE workout_plan_set (
    id                uuid PRIMARY KEY,
    plan_exercise_id  uuid NOT NULL REFERENCES workout_plan_exercise (id),
    set_type          text NOT NULL CHECK (set_type IN ('WARMUP', 'WORKING', 'DROPSET', 'REST_PAUSE', 'FAILURE')),
    reps              integer,
    weight_kg         numeric,
    hold_time_seconds integer,
    edge_size_mm      integer,
    distance_meters   integer CHECK (distance_meters IS NULL OR distance_meters >= 0),
    rest_time_seconds integer,
    order_index       integer NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted           boolean NOT NULL DEFAULT false,
    deleted_at        timestamptz
);

CREATE INDEX idx_workout_plan_set_plan_exercise_id ON workout_plan_set (plan_exercise_id);
CREATE INDEX idx_workout_plan_set_updated_at ON workout_plan_set (updated_at);

CREATE TRIGGER workout_plan_set_set_updated_at
    BEFORE INSERT OR UPDATE ON workout_plan_set
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Heti terv.md "Entitás — WeeklyPlan": one calendar week's assignment.
-- id is a deterministic client UUID v5 of (user_id, week_start_date) — "adott naptári hét" is a
-- natural key, so two offline devices editing the same week converge on one row instead of forking
-- (documentation/Architektúra/Backend-offline first.md §2). The partial unique index is the backstop.
CREATE TABLE weekly_plan (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL REFERENCES users (id),
    -- the week's Monday (client TZ, ISO date).
    week_start_date date NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted         boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz
);

CREATE UNIQUE INDEX idx_weekly_plan_user_id_week_start_date
    ON weekly_plan (user_id, week_start_date) WHERE deleted = false;
CREATE INDEX idx_weekly_plan_user_id_updated_at ON weekly_plan (user_id, updated_at);

CREATE TRIGGER weekly_plan_set_updated_at
    BEFORE INSERT OR UPDATE ON weekly_plan
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Heti terv.md "slots": nap → sablon. A slot exists only where a template
-- is assigned; clearing a day soft-deletes its slot. "max egy sablon / nap az első körben" → partial
-- unique index on live rows. plan_id is NOT NULL (a slot without a plan is meaningless).
CREATE TABLE weekly_plan_slot (
    id             uuid PRIMARY KEY,
    weekly_plan_id uuid NOT NULL REFERENCES weekly_plan (id),
    day_of_week    text NOT NULL CHECK (day_of_week IN (
                       'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')),
    plan_id        uuid NOT NULL REFERENCES workout_plan (id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted        boolean NOT NULL DEFAULT false,
    deleted_at     timestamptz
);

CREATE UNIQUE INDEX idx_weekly_plan_slot_plan_day
    ON weekly_plan_slot (weekly_plan_id, day_of_week) WHERE deleted = false;
CREATE INDEX idx_weekly_plan_slot_weekly_plan_id ON weekly_plan_slot (weekly_plan_id);
CREATE INDEX idx_weekly_plan_slot_updated_at ON weekly_plan_slot (updated_at);

CREATE TRIGGER weekly_plan_slot_set_updated_at
    BEFORE INSERT OR UPDATE ON weekly_plan_slot
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
-- The four child tables have no user_id — like meal_item, each arm joins back up to its owning
-- user-owned root (workout_plan / weekly_plan) to project the real owner.
CREATE OR REPLACE VIEW sync_changes AS
    SELECT 'UserProfile' AS entity_type, id, user_id, updated_at, deleted FROM user_profile
    UNION ALL
    SELECT 'WeightHistoryEntry' AS entity_type, id, user_id, updated_at, deleted FROM weight_history_entry
    UNION ALL
    SELECT 'GearItem' AS entity_type, id, user_id, updated_at, deleted FROM gear_item
    UNION ALL
    SELECT 'PackingTemplate' AS entity_type, id, user_id, updated_at, deleted FROM packing_template
    UNION ALL
    SELECT 'PackingTemplateItem' AS entity_type, id, user_id, updated_at, deleted FROM packing_template_item
    UNION ALL
    SELECT 'PackingSession' AS entity_type, id, user_id, updated_at, deleted FROM packing_session
    UNION ALL
    SELECT 'PackingSessionItem' AS entity_type, id, user_id, updated_at, deleted FROM packing_session_item
    UNION ALL
    SELECT 'LifePlan' AS entity_type, id, user_id, updated_at, deleted FROM life_plan
    UNION ALL
    SELECT 'HouseholdRoom' AS entity_type, id, user_id, updated_at, deleted FROM household_room
    UNION ALL
    SELECT 'HouseholdTask' AS entity_type, id, user_id, updated_at, deleted FROM household_task
    UNION ALL
    SELECT 'CalendarEvent' AS entity_type, id, user_id, updated_at, deleted FROM calendar_event
    UNION ALL
    SELECT 'Food' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM food
    UNION ALL
    SELECT 'StoredFood' AS entity_type, id, user_id, updated_at, deleted FROM stored_food
    UNION ALL
    SELECT 'Recipe' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM recipe
    UNION ALL
    SELECT 'RecipeIngredient' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM recipe_ingredient
    UNION ALL
    SELECT 'Meal' AS entity_type, id, user_id, updated_at, deleted FROM meal
    UNION ALL
    SELECT 'MealItem' AS entity_type, mi.id, m.user_id, mi.updated_at, mi.deleted FROM meal_item mi JOIN meal m ON mi.meal_id = m.id
    UNION ALL
    SELECT 'ShoppingList' AS entity_type, id, user_id, updated_at, deleted FROM shopping_list
    UNION ALL
    SELECT 'ShoppingListItem' AS entity_type, sli.id, sl.user_id, sli.updated_at, sli.deleted FROM shopping_list_item sli JOIN shopping_list sl ON sli.shopping_list_id = sl.id
    UNION ALL
    SELECT 'Exercise' AS entity_type, id, user_id, updated_at, deleted FROM exercise_catalog
    UNION ALL
    SELECT 'WorkoutSession' AS entity_type, id, user_id, updated_at, deleted FROM workout_session
    UNION ALL
    SELECT 'WorkoutExerciseEntry' AS entity_type, wee.id, ws.user_id, wee.updated_at, wee.deleted
        FROM workout_exercise_entry wee JOIN workout_session ws ON wee.session_id = ws.id
    UNION ALL
    SELECT 'WorkoutSetEntry' AS entity_type, wse.id, ws.user_id, wse.updated_at, wse.deleted
        FROM workout_set_entry wse
        JOIN workout_exercise_entry wee ON wse.exercise_entry_id = wee.id
        JOIN workout_session ws ON wee.session_id = ws.id
    UNION ALL
    SELECT 'WorkoutPlan' AS entity_type, id, user_id, updated_at, deleted FROM workout_plan
    UNION ALL
    SELECT 'WorkoutPlanExercise' AS entity_type, wpe.id, wp.user_id, wpe.updated_at, wpe.deleted
        FROM workout_plan_exercise wpe JOIN workout_plan wp ON wpe.plan_id = wp.id
    UNION ALL
    SELECT 'WorkoutPlanSet' AS entity_type, wps.id, wp.user_id, wps.updated_at, wps.deleted
        FROM workout_plan_set wps
        JOIN workout_plan_exercise wpe ON wps.plan_exercise_id = wpe.id
        JOIN workout_plan wp ON wpe.plan_id = wp.id
    UNION ALL
    SELECT 'WeeklyPlan' AS entity_type, id, user_id, updated_at, deleted FROM weekly_plan
    UNION ALL
    SELECT 'WeeklyPlanSlot' AS entity_type, wps.id, wp.user_id, wps.updated_at, wps.deleted
        FROM weekly_plan_slot wps JOIN weekly_plan wp ON wps.weekly_plan_id = wp.id;
