-- documentation/Subfeatures/Outdoor boulder admin.md + Outdoor köteles admin.md — outdoor climbing
-- master data for the Mászónapló: a user-owned location tree Crag -> Sector -> (Route | BoulderProblem).
-- The same Crag/Sector rows are shared by the outdoor boulder and rope admin within one user. Flat,
-- user-owned, plain CRUD (mirrors V22 indoor master / bike_ride_log) — the admin screen edits each
-- row on its own, there is no nested-aggregate PUT here. Grades are stored as the client's raw
-- guidebook string; the napló parses + resolves the matrix index at attempt time, the server never
-- recomputes. No name uniqueness: the same route/problem name legitimately recurs across crags, and
-- the "legutóbbi helyszín előtöltés" prefill only needs the most recent row, not a unique one.

CREATE TABLE crag (
    id                uuid PRIMARY KEY,
    user_id           uuid NOT NULL REFERENCES users (id),
    name              text NOT NULL,
    -- optional GPS (documentation/Subfeatures/Outdoor boulder admin.md: "opcionális GPS mező");
    -- map/photo UI is explicitly out of 2.0 scope, only the coordinates are stored.
    latitude          double precision CHECK (latitude IS NULL OR (latitude BETWEEN -90 AND 90)),
    longitude         double precision CHECK (longitude IS NULL OR (longitude BETWEEN -180 AND 180)),
    -- free-text default rock type, inherited by the outdoor napló at session level (overridable there).
    default_rock_type text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted           boolean NOT NULL DEFAULT false,
    deleted_at        timestamptz
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_crag_user_id_updated_at ON crag (user_id, updated_at);

CREATE TRIGGER crag_set_updated_at
    BEFORE INSERT OR UPDATE ON crag
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE sector (
    id             uuid PRIMARY KEY,
    user_id        uuid NOT NULL REFERENCES users (id),
    crag_id        uuid NOT NULL REFERENCES crag (id),
    name           text NOT NULL,
    -- free-text default aspect / wall orientation ("fekvés"), inherited by routes and the napló.
    default_aspect text,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted        boolean NOT NULL DEFAULT false,
    deleted_at     timestamptz
);

CREATE INDEX idx_sector_user_id_updated_at ON sector (user_id, updated_at);
CREATE INDEX idx_sector_crag_id ON sector (crag_id) WHERE deleted = false;

CREATE TRIGGER sector_set_updated_at
    BEFORE INSERT OR UPDATE ON sector
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE route (
    id               uuid PRIMARY KEY,
    user_id          uuid NOT NULL REFERENCES users (id),
    sector_id        uuid NOT NULL REFERENCES sector (id),
    name             text NOT NULL,
    -- raw guidebook grade string; the napló parses it, the server stores it verbatim.
    guidebook_grade  text NOT NULL,
    -- optional prefill values for the rope napló (documentation/Subfeatures/Outdoor köteles admin.md).
    length_in_meters double precision CHECK (length_in_meters IS NULL OR length_in_meters > 0),
    total_pitches    integer CHECK (total_pitches IS NULL OR total_pitches >= 1),
    -- optional per-route rock type / aspect; when set they win over the Sector/Crag default in the napló.
    rock_type        text,
    aspect           text,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted          boolean NOT NULL DEFAULT false,
    deleted_at       timestamptz
);

CREATE INDEX idx_route_user_id_updated_at ON route (user_id, updated_at);
CREATE INDEX idx_route_sector_id ON route (sector_id) WHERE deleted = false;

CREATE TRIGGER route_set_updated_at
    BEFORE INSERT OR UPDATE ON route
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE boulder_problem (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL REFERENCES users (id),
    sector_id       uuid NOT NULL REFERENCES sector (id),
    name            text NOT NULL,
    -- raw guidebook grade string (documentation/Subfeatures/Outdoor boulder admin.md); parsed client-side.
    guidebook_grade text NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted         boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz
);

CREATE INDEX idx_boulder_problem_user_id_updated_at ON boulder_problem (user_id, updated_at);
CREATE INDEX idx_boulder_problem_sector_id ON boulder_problem (sector_id) WHERE deleted = false;

CREATE TRIGGER boulder_problem_set_updated_at
    BEFORE INSERT OR UPDATE ON boulder_problem
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
    SELECT 'IndoorRoute' AS entity_type, id, user_id, updated_at, deleted FROM indoor_route
    UNION ALL
    SELECT 'Crag' AS entity_type, id, user_id, updated_at, deleted FROM crag
    UNION ALL
    SELECT 'Sector' AS entity_type, id, user_id, updated_at, deleted FROM sector
    UNION ALL
    SELECT 'Route' AS entity_type, id, user_id, updated_at, deleted FROM route
    UNION ALL
    SELECT 'BoulderProblem' AS entity_type, id, user_id, updated_at, deleted FROM boulder_problem;
