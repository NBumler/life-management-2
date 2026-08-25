-- documentation/Subfeatures/Élelmiszerek.md — the first shared/global catalog table: no user_id,
-- every authenticated user sees and can edit every live row. Duplicate detection is application-
-- level (documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség" compares every field,
-- not just the name), so there is deliberately no unique index on name_normalized here.

CREATE TABLE food (
    id                          uuid PRIMARY KEY,
    name                        text NOT NULL,
    name_normalized             text NOT NULL,
    store                       text,
    brand                       text,
    barcode                     text,
    barcode_normalized          text,
    note                        text,
    price_huf                   integer,
    net_amount                  numeric,
    net_unit                    text,
    energy_kcal                 numeric,
    fat_g                       numeric,
    fat_saturated_g             numeric,
    fat_unsaturated_g           numeric,
    fat_trans_g                 numeric,
    carbs_g                     numeric,
    carbs_sugars_g              numeric,
    carbs_complex_g             numeric,
    carbs_fiber_g               numeric,
    protein_g                   numeric,
    salt_g                      numeric,
    sodium_g                    numeric,
    chloride_g                  numeric,
    shelf_room_amount           numeric,
    shelf_room_unit             text,
    shelf_fridge_amount         numeric,
    shelf_fridge_unit           text,
    shelf_freezer_amount        numeric,
    shelf_freezer_unit          text,
    shelf_after_opening_amount  numeric,
    shelf_after_opening_unit    text,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    deleted                     boolean NOT NULL DEFAULT false,
    deleted_at                  timestamptz
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter. Global table, no user_id to scope by.
CREATE INDEX idx_food_updated_at ON food (updated_at);

CREATE TRIGGER food_set_updated_at
    BEFORE INSERT OR UPDATE ON food
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- documentation/Architektúra/Backend.md "GET /api/sync/changes": every synced table must appear
-- here (V4 comment: a forgotten table silently drops out of sync). Food has no user_id — the
-- NULL is what SyncChangesRepository's "WHERE (user_id = ? OR user_id IS NULL)" matches for every
-- caller, delivering the same global row set to every authenticated user.
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
    SELECT 'Food' AS entity_type, id, NULL::uuid AS user_id, updated_at, deleted FROM food;
