-- documentation/Subfeatures/Indoor boulder admin.md + Indoor köteles admin.md — indoor climbing
-- master data for the Mászónapló: a user-owned Gym catalog plus its GymColorBand rows (boulder
-- colour → grade band) and optional IndoorRoute rows (fixed rope-route catalogue). Flat, user-owned,
-- plain CRUD (mirrors exercise_catalog / bike_ride_log) — the admin screen edits each row on its own,
-- there is no nested-aggregate PUT here. Grades are stored as the client's raw string plus the
-- matrix-derived absolute_difficulty_index (documentation/Subfeatures/Nehézségi szint skálája
-- (konverziós mátrix).md); the server does not recompute them. Outdoor master (crag/sector/route/
-- boulder_problem) lands in a later migration.

CREATE TABLE gym (
    id                          uuid PRIMARY KEY,
    user_id                     uuid NOT NULL REFERENCES users (id),
    name                        text NOT NULL,
    -- application-written canonical form (documentation/Architektúra/Névegyediség.md): unique per
    -- user among live rows, so the "legutóbbi terem előtöltés" prefill has a single hit.
    name_normalized             text NOT NULL,
    address                     text,
    -- non-empty subset of {BOULDER, ROPE}; the same Gym row is shared by the boulder and rope admin
    -- (documentation/Subfeatures/Indoor köteles admin.md: "Ugyanaz a Gym entitás").
    disciplines                 text[] NOT NULL CHECK (
                                    disciplines <@ ARRAY['BOULDER', 'ROPE']::text[]
                                    AND cardinality(disciplines) >= 1),
    -- rope only: average wall height, the napló's lengthInMeters default.
    default_wall_height_meters  double precision CHECK (
                                    default_wall_height_meters IS NULL OR default_wall_height_meters > 0),
    -- rope only: subset of {TOPROPE, LEAD} (TRAD is never offered indoor).
    available_safety_styles     text[] CHECK (
                                    available_safety_styles IS NULL
                                    OR available_safety_styles <@ ARRAY['TOPROPE', 'LEAD']::text[]),
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    deleted                     boolean NOT NULL DEFAULT false,
    deleted_at                  timestamptz
);

-- documentation/Architektúra/Névegyediség.md: unique per user, live rows only ("Törölt név újra felvehető").
CREATE UNIQUE INDEX idx_gym_user_id_name_normalized
    ON gym (user_id, name_normalized) WHERE deleted = false;
-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_gym_user_id_updated_at ON gym (user_id, updated_at);

CREATE TRIGGER gym_set_updated_at
    BEFORE INSERT OR UPDATE ON gym
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE gym_color_band (
    id                              uuid PRIMARY KEY,
    user_id                         uuid NOT NULL REFERENCES users (id),
    gym_id                          uuid NOT NULL REFERENCES gym (id),
    name                            text NOT NULL,
    -- canonical #rrggbb (documentation/Subfeatures/Indoor boulder admin.md): unique among the gym's
    -- live bands. Comparison form: hu.bumler.lm2.common.HexColorNormalizer.
    hex_color                       text NOT NULL,
    variant                         text NOT NULL CHECK (variant IN ('PLUS', 'MINUS', 'NEUTRAL')),
    grade_lower                     text NOT NULL,
    grade_upper                     text NOT NULL,
    -- matrix-derived, client-supplied (documentation/Subfeatures/Nehézségi szint skálája
    -- (konverziós mátrix).md); the server stores, never recomputes.
    absolute_difficulty_index_lower integer NOT NULL,
    absolute_difficulty_index_upper integer NOT NULL,
    created_at                      timestamptz NOT NULL DEFAULT now(),
    updated_at                      timestamptz NOT NULL DEFAULT now(),
    deleted                         boolean NOT NULL DEFAULT false,
    deleted_at                      timestamptz
);

-- documentation/Subfeatures/Indoor boulder admin.md: "egyedi a terem élő szín-sávjai között".
CREATE UNIQUE INDEX idx_gym_color_band_gym_id_hex_color
    ON gym_color_band (gym_id, hex_color) WHERE deleted = false;
CREATE INDEX idx_gym_color_band_user_id_updated_at ON gym_color_band (user_id, updated_at);
CREATE INDEX idx_gym_color_band_gym_id ON gym_color_band (gym_id) WHERE deleted = false;

CREATE TRIGGER gym_color_band_set_updated_at
    BEFORE INSERT OR UPDATE ON gym_color_band
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE indoor_route (
    id                        uuid PRIMARY KEY,
    user_id                   uuid NOT NULL REFERENCES users (id),
    gym_id                    uuid NOT NULL REFERENCES gym (id),
    name                      text NOT NULL,
    discipline                text NOT NULL CHECK (discipline IN ('BOULDER', 'ROPE')),
    grade                     text NOT NULL,
    absolute_difficulty_index integer NOT NULL,
    -- free-text sector / wall-strip label (documentation/Subfeatures/Indoor köteles admin.md).
    sector                    text,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    deleted                   boolean NOT NULL DEFAULT false,
    deleted_at                timestamptz
);

CREATE INDEX idx_indoor_route_user_id_updated_at ON indoor_route (user_id, updated_at);
CREATE INDEX idx_indoor_route_gym_id ON indoor_route (gym_id) WHERE deleted = false;

CREATE TRIGGER indoor_route_set_updated_at
    BEFORE INSERT OR UPDATE ON indoor_route
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
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
        FROM weekly_plan_slot wps JOIN weekly_plan wp ON wps.weekly_plan_id = wp.id
    UNION ALL
    SELECT 'SwimLog' AS entity_type, id, user_id, updated_at, deleted FROM swim_log
    UNION ALL
    SELECT 'BikeRideLog' AS entity_type, id, user_id, updated_at, deleted FROM bike_ride_log
    UNION ALL
    SELECT 'Gym' AS entity_type, id, user_id, updated_at, deleted FROM gym
    UNION ALL
    SELECT 'GymColorBand' AS entity_type, id, user_id, updated_at, deleted FROM gym_color_band
    UNION ALL
    SELECT 'IndoorRoute' AS entity_type, id, user_id, updated_at, deleted FROM indoor_route;
