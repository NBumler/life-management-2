-- documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — user-owned AYCM partners (acceptance
-- venues) and their time-band price rules. Flat CRUD (partner and rule are saved independently, not
-- as one nested aggregate). name_normalized is application-written (see V6__gear_item.sql / the
-- "Névnormalizálás" note in Backend.md). start_time / end_time are 'HH:mm' text; '24:00' is allowed
-- on end_time only (half-open [start, end), no midnight crossing). co_payment_huf is snapshot
-- metadata — it never feeds visitValueHuf (= list_price_huf); see AYCM tracker.md.

CREATE TABLE aycm_partner (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL REFERENCES users (id),
    name            text NOT NULL,
    name_normalized text NOT NULL,
    notes           text,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted         boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz
);

-- documentation/Architektúra/Névegyediség.md: unique per user, live rows only.
CREATE UNIQUE INDEX idx_aycm_partner_user_id_name_normalized
    ON aycm_partner (user_id, name_normalized) WHERE deleted = false;

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter.
CREATE INDEX idx_aycm_partner_user_id_updated_at ON aycm_partner (user_id, updated_at);

CREATE TRIGGER aycm_partner_set_updated_at
    BEFORE INSERT OR UPDATE ON aycm_partner
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE aycm_price_rule (
    id             uuid PRIMARY KEY,
    user_id        uuid NOT NULL REFERENCES users (id),
    partner_id     uuid NOT NULL REFERENCES aycm_partner (id),
    label          text,
    applies_mon    boolean NOT NULL DEFAULT false,
    applies_tue    boolean NOT NULL DEFAULT false,
    applies_wed    boolean NOT NULL DEFAULT false,
    applies_thu    boolean NOT NULL DEFAULT false,
    applies_fri    boolean NOT NULL DEFAULT false,
    applies_sat    boolean NOT NULL DEFAULT false,
    applies_sun    boolean NOT NULL DEFAULT false,
    -- 'HH:mm'; start in 00:00..23:59, end in (start, 24:00]. Half-open [start, end), no wrap.
    start_time     text NOT NULL,
    end_time       text NOT NULL,
    list_price_huf integer NOT NULL CHECK (list_price_huf >= 0),
    co_payment_huf integer NOT NULL DEFAULT 0 CHECK (co_payment_huf >= 0),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted        boolean NOT NULL DEFAULT false,
    deleted_at     timestamptz,
    -- at least one weekday flag (documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md "Entitás")
    CONSTRAINT aycm_price_rule_has_day CHECK (
        applies_mon OR applies_tue OR applies_wed OR applies_thu OR applies_fri OR applies_sat OR applies_sun),
    CONSTRAINT aycm_price_rule_time_order CHECK (start_time < end_time)
);

CREATE INDEX idx_aycm_price_rule_partner_id ON aycm_price_rule (partner_id);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter.
CREATE INDEX idx_aycm_price_rule_user_id_updated_at ON aycm_price_rule (user_id, updated_at);

CREATE TRIGGER aycm_price_rule_set_updated_at
    BEFORE INSERT OR UPDATE ON aycm_price_rule
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
    SELECT 'AycmPriceRule' AS entity_type, id, user_id, updated_at, deleted FROM aycm_price_rule;
