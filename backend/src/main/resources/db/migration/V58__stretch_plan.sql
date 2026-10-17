-- backlog/168 — documentation/Subfeatures/Heti terv.md "Nyújtó sablonok": a nyújtó sablon (StretchPlan) és
-- a tételei (StretchPlanItem). Külön tábla, nem a workout_plan egy típusa: a cél-szett modell (setType,
-- reps, weightKg, RPE) a nyújtásnál értelmetlen, a tétel-mezők (tartás, oldalanként, ismétlés) pedig az
-- erősítésnél. A meglévő workout_plan sorok így adatmódosítás nélkül erősítő sablonok.
-- A nyújtó sablon soha nem rotál (nincs in_rotation), de az `active` ugyanúgy kapcsolja, mint az erősítőt.

CREATE TABLE stretch_plan (
    id          uuid PRIMARY KEY,
    user_id     uuid NOT NULL REFERENCES users (id),
    -- nem egyedi, mint a workout_plan.name
    name        text NOT NULL,
    notes       text,
    active      boolean NOT NULL DEFAULT true,
    goal_label  text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    deleted     boolean NOT NULL DEFAULT false,
    deleted_at  timestamptz
);

CREATE INDEX idx_stretch_plan_user_id_updated_at ON stretch_plan (user_id, updated_at);

CREATE TRIGGER stretch_plan_set_updated_at
    BEFORE INSERT OR UPDATE ON stretch_plan
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Nincs user_id — a tulajdon a szülőn (plan_id) át jön, mint a workout_plan_exercise-nél.
-- stretch_name / stretch_category: snapshot a szerkesztéskor (a gyakorlat átnevezése / törlése nem írja át).
CREATE TABLE stretch_plan_item (
    id                   uuid PRIMARY KEY,
    plan_id              uuid NOT NULL REFERENCES stretch_plan (id),
    stretch_exercise_id  uuid NOT NULL REFERENCES stretch_exercise (id),
    stretch_name         text NOT NULL,
    stretch_category     text NOT NULL CONSTRAINT stretch_plan_item_stretch_category_check CHECK (stretch_category IN (
                             'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'BICEPS', 'TRICEPS', 'ABS', 'LOWER_BACK',
                             'OBLIQUES', 'FOREARM_FINGERS', 'FULL_BODY', 'HIPS', 'NECK')),
    order_index          integer NOT NULL,
    hold_seconds         integer NOT NULL CHECK (hold_seconds > 0),
    per_side             boolean NOT NULL DEFAULT false,
    repetitions          integer NOT NULL DEFAULT 1 CHECK (repetitions >= 1),
    notes                text CHECK (notes IS NULL OR char_length(notes) <= 200),
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    deleted              boolean NOT NULL DEFAULT false,
    deleted_at           timestamptz
);

CREATE INDEX idx_stretch_plan_item_plan_id ON stretch_plan_item (plan_id);

CREATE TRIGGER stretch_plan_item_set_updated_at
    BEFORE INSERT OR UPDATE ON stretch_plan_item
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Heti kézi felülírás: új STRETCH kind — a nap egy nyújtó sablon, a rotáció szempontjából pihenőnap.
-- Külön oszlop, mert a plan_id FK a workout_plan-ra mutat (V19).
ALTER TABLE weekly_plan_slot ADD COLUMN stretch_plan_id uuid REFERENCES stretch_plan (id);

ALTER TABLE weekly_plan_slot DROP CONSTRAINT IF EXISTS weekly_plan_slot_kind_check;
ALTER TABLE weekly_plan_slot ADD CONSTRAINT weekly_plan_slot_kind_check CHECK (kind IN ('PLAN', 'REST', 'STRETCH'));

ALTER TABLE weekly_plan_slot DROP CONSTRAINT chk_weekly_plan_slot_kind_plan;
ALTER TABLE weekly_plan_slot ADD CONSTRAINT chk_weekly_plan_slot_kind_plan CHECK (
    (kind = 'PLAN' AND plan_id IS NOT NULL AND stretch_plan_id IS NULL)
    OR (kind = 'REST' AND plan_id IS NULL AND stretch_plan_id IS NULL)
    OR (kind = 'STRETCH' AND plan_id IS NULL AND stretch_plan_id IS NOT NULL));

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced. Base: the V57 definition (the latest one) + StretchPlan / StretchPlanItem.
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
    SELECT 'BoulderProblem' AS entity_type, id, user_id, updated_at, deleted FROM boulder_problem
    UNION ALL
    SELECT 'ClimbingSession' AS entity_type, id, user_id, updated_at, deleted FROM climbing_session
    UNION ALL
    SELECT 'AscentAttempt' AS entity_type, aa.id, cs.user_id, aa.updated_at, aa.deleted
        FROM ascent_attempt aa JOIN climbing_session cs ON aa.session_id = cs.id
    UNION ALL
    SELECT 'PitchLog' AS entity_type, pl.id, cs.user_id, pl.updated_at, pl.deleted
        FROM pitch_log pl
        JOIN ascent_attempt aa ON pl.attempt_id = aa.id
        JOIN climbing_session cs ON aa.session_id = cs.id
    UNION ALL
    SELECT 'RecurringExpense' AS entity_type, id, user_id, updated_at, deleted FROM recurring_expense
    UNION ALL
    SELECT 'AycmPartner' AS entity_type, id, user_id, updated_at, deleted FROM aycm_partner
    UNION ALL
    SELECT 'AycmPriceRule' AS entity_type, id, user_id, updated_at, deleted FROM aycm_price_rule
    UNION ALL
    SELECT 'AycmCheckIn' AS entity_type, id, user_id, updated_at, deleted FROM aycm_check_in
    UNION ALL
    SELECT 'AycmSettings' AS entity_type, id, user_id, updated_at, deleted FROM aycm_settings
    UNION ALL
    SELECT 'DailyStepLog' AS entity_type, id, user_id, updated_at, deleted FROM daily_step_log
    UNION ALL
    SELECT 'HikeRoute' AS entity_type, id, user_id, updated_at, deleted FROM hike_route
    UNION ALL
    SELECT 'VolleyballLog' AS entity_type, id, user_id, updated_at, deleted FROM volleyball_log
    UNION ALL
    SELECT 'StretchExercise' AS entity_type, id, user_id, updated_at, deleted FROM stretch_exercise
    UNION ALL
    SELECT 'StretchPlan' AS entity_type, id, user_id, updated_at, deleted FROM stretch_plan
    UNION ALL
    SELECT 'StretchPlanItem' AS entity_type, spi.id, sp.user_id, spi.updated_at, spi.deleted
        FROM stretch_plan_item spi JOIN stretch_plan sp ON spi.plan_id = sp.id;
