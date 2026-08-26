-- documentation/Subfeatures/Élelmiszer tárolás.md — per-user home storage inventory. Each row is a
-- separate storage item (no merging by Food + location + expiry — e.g. two pieces of meat can spoil
-- independently), unlike the global `food` catalog table.

CREATE TABLE stored_food (
    id               uuid PRIMARY KEY,
    user_id          uuid NOT NULL REFERENCES users (id),
    food_id          uuid NOT NULL REFERENCES food (id),
    quantity_amount  numeric NOT NULL,
    quantity_unit    text NOT NULL,
    storage_location varchar(16) NOT NULL CHECK (storage_location IN ('ROOM', 'FRIDGE', 'FREEZER')),
    expires_on       date NOT NULL,
    opened           boolean NOT NULL DEFAULT false,
    opened_at        timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    deleted          boolean NOT NULL DEFAULT false,
    deleted_at       timestamptz
);

CREATE INDEX idx_stored_food_user_id_updated_at ON stored_food (user_id, updated_at);

-- documentation/Subfeatures/Élelmiszer tárolás.md "Törlés": cascade lookup when a catalog Food is deleted.
CREATE INDEX idx_stored_food_food_id ON stored_food (food_id);

CREATE TRIGGER stored_food_set_updated_at
    BEFORE INSERT OR UPDATE ON stored_food
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
    SELECT 'StoredFood' AS entity_type, id, user_id, updated_at, deleted FROM stored_food;
