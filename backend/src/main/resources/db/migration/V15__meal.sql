-- documentation/Subfeatures/Étkezés.md — per-user meal log. Unlike Food/Recipe, Meal IS user-owned
-- (mirrors packing_template); its polymorphic MealItem child, however, carries no user_id of its
-- own (mirrors recipe_ingredient's shape) even though its parent is per-user, not global.

CREATE TABLE meal (
    id            uuid PRIMARY KEY,
    user_id       uuid NOT NULL,
    eaten_at      timestamptz NOT NULL,
    time_zone_id  text NOT NULL,
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    deleted       boolean NOT NULL DEFAULT false,
    deleted_at    timestamptz
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter, scoped per user.
CREATE INDEX idx_meal_user_id_updated_at ON meal (user_id, updated_at);

CREATE TRIGGER meal_set_updated_at
    BEFORE INSERT OR UPDATE ON meal
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Subfeatures/Étkezés.md "Tétel — közös": one flat polymorphic table for the three
-- source types (RECIPE / FOOD / CUSTOM) rather than three tables — the per-type columns are a
-- nullable superset, same shape as `food`'s many-optional-nutrient-columns table.
CREATE TABLE meal_item (
    id               uuid PRIMARY KEY,
    meal_id          uuid NOT NULL REFERENCES meal (id),
    type             text NOT NULL,
    recipe_id        uuid REFERENCES recipe (id),
    food_id          uuid REFERENCES food (id),
    quantity_amount  numeric,
    quantity_unit    text,
    display_name     text,
    calories_kcal    numeric,
    protein_g        numeric,
    carbs_g          numeric,
    fat_g            numeric,
    price_huf        integer,
    servings         numeric NOT NULL,
    sort_order       integer NOT NULL,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted          boolean NOT NULL DEFAULT false,
    deleted_at       timestamptz
);

CREATE INDEX idx_meal_item_meal_id ON meal_item (meal_id);
CREATE INDEX idx_meal_item_updated_at ON meal_item (updated_at);

-- documentation/Subfeatures/Recept forrású étkezés.md / Élelmiszer forrású étkezés.md: cascade lookups
-- when the referenced Recipe/Food is deleted (see FoodService.delete / RecipeService.delete).
CREATE INDEX idx_meal_item_recipe_id ON meal_item (recipe_id);
CREATE INDEX idx_meal_item_food_id ON meal_item (food_id);

CREATE TRIGGER meal_item_set_updated_at
    BEFORE INSERT OR UPDATE ON meal_item
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here, so the view is fully replaced (V4 comment: a forgotten table silently drops out of sync).
-- meal_item has no user_id column of its own — unlike recipe_ingredient (NULL, a global table),
-- its parent Meal IS per-user, so this arm joins to meal to project the real owner. Do not copy the
-- NULL-owner shape here for a future user-owned child table; it belongs only to genuinely global rows.
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
    SELECT 'MealItem' AS entity_type, mi.id, m.user_id, mi.updated_at, mi.deleted FROM meal_item mi JOIN meal m ON mi.meal_id = m.id;
