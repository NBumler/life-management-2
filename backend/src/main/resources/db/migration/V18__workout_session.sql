-- documentation/Subfeatures/Edzésnapló.md — one logged strength / HIIT / mászó-kiegészítő session
-- ("mit csináltál ténylegesen?"). Nested aggregate like meal/recipe, but three levels deep:
-- workout_session → workout_exercise_entry → workout_set_entry, saved/read as one tree
-- (documentation/Architektúra/Backend.md "Nested aggregate PUT"). User-owned like `meal`; the two
-- child tables carry no user_id of their own (ownership flows through session_id), same shape as
-- meal_item. No server-side kcal: `activityExtraKcal` is a pure client calculation
-- (documentation/Features/Tápérték kalkulátor.md), the session stores neither kcal nor body weight.

CREATE TABLE workout_session (
    id               uuid PRIMARY KEY,
    user_id          uuid NOT NULL REFERENCES users (id),
    -- calendar date in the client's TZ; drives the aznapi activityExtraKcal sum. `date` is a legal
    -- column name in Postgres (calendar_event uses it) — kept spelled-out here for readability.
    session_date     date NOT NULL,
    start_time       varchar(5),
    end_time         varchar(5),
    duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes > 0),
    workout_type     text NOT NULL CHECK (workout_type IN ('GENERAL_WEIGHTS', 'HIIT_CIRCUIT')),
    title            text,
    notes            text,
    location         text CHECK (location IS NULL OR location IN ('HOME_GYM', 'COMMERCIAL_GYM', 'OUTDOOR_PARK')),
    -- → [[Heti terv]] WorkoutPlan.id (static template; nullable = ad-hoc). Plain uuid for now: the
    -- workout_plan table lands with the Heti terv slice, which adds the FK then.
    plan_id          uuid,
    rounds_count     integer CHECK (rounds_count IS NULL OR rounds_count >= 1),
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted          boolean NOT NULL DEFAULT false,
    deleted_at       timestamptz,
    -- start/end are independently optional (documentation/Subfeatures/Edzésnapló.md: both "Opcionális");
    -- only the ordering is enforced when both are present.
    CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time)
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_workout_session_user_id_updated_at ON workout_session (user_id, updated_at);
-- documentation/Subfeatures/Edzésnapló.md "Statisztika": aznapi / heti session lookups by date.
CREATE INDEX idx_workout_session_user_id_session_date ON workout_session (user_id, session_date);

CREATE TRIGGER workout_session_set_updated_at
    BEFORE INSERT OR UPDATE ON workout_session
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Edzésnapló.md "Entitás — WorkoutExerciseEntry": one exercise block on a
-- session. name/category/kind are a SNAPSHOT taken at save time — a later rename or soft delete of
-- the master exercise_catalog row never rewrites them, so exercise_id is a soft link only (nullable
-- for ad-hoc). A master exercise may appear multiple times on one session (separate entries).
CREATE TABLE workout_exercise_entry (
    id                uuid PRIMARY KEY,
    session_id        uuid NOT NULL REFERENCES workout_session (id),
    exercise_id       uuid REFERENCES exercise_catalog (id),
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

CREATE INDEX idx_workout_exercise_entry_session_id ON workout_exercise_entry (session_id);
CREATE INDEX idx_workout_exercise_entry_updated_at ON workout_exercise_entry (updated_at);
CREATE INDEX idx_workout_exercise_entry_exercise_id ON workout_exercise_entry (exercise_id);

CREATE TRIGGER workout_exercise_entry_set_updated_at
    BEFORE INSERT OR UPDATE ON workout_exercise_entry
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Edzésnapló.md "Entitás — WorkoutSetEntry": one set. Units are kg / mm /
-- m only (no lb / mile); assist (band/pulley) is a negative weight_kg. Which fields the client shows
-- follows exercise_kind (snapshot); the server stores whatever is sent (laza típus-szabály).
CREATE TABLE workout_set_entry (
    id                uuid PRIMARY KEY,
    exercise_entry_id uuid NOT NULL REFERENCES workout_exercise_entry (id),
    set_number        integer NOT NULL CHECK (set_number >= 1),
    set_type          text NOT NULL CHECK (set_type IN ('WARMUP', 'WORKING', 'DROPSET', 'REST_PAUSE', 'FAILURE')),
    reps              integer,
    weight_kg         numeric,
    hold_time_seconds integer,
    edge_size_mm      integer,
    distance_meters   integer CHECK (distance_meters IS NULL OR distance_meters >= 0),
    rest_time_seconds integer,
    is_completed      boolean NOT NULL DEFAULT true,
    order_index       integer NOT NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted           boolean NOT NULL DEFAULT false,
    deleted_at        timestamptz
);

CREATE INDEX idx_workout_set_entry_exercise_entry_id ON workout_set_entry (exercise_entry_id);
CREATE INDEX idx_workout_set_entry_updated_at ON workout_set_entry (updated_at);

CREATE TRIGGER workout_set_entry_set_updated_at
    BEFORE INSERT OR UPDATE ON workout_set_entry
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
-- The two workout child tables have no user_id — like meal_item, each arm joins back up to
-- workout_session to project the real owner.
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
        JOIN workout_session ws ON wee.session_id = ws.id;
