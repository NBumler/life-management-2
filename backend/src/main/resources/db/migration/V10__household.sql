-- documentation/Subfeatures/Háztartási feladatok.md — rooms + recurring room-scoped tasks.

CREATE TABLE household_room (
    id              uuid PRIMARY KEY,
    user_id         uuid NOT NULL REFERENCES users (id),
    name            text NOT NULL,
    name_normalized text NOT NULL,
    sort_order      integer NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    deleted         boolean NOT NULL DEFAULT false,
    deleted_at      timestamptz
);

-- documentation/Architektúra/Névegyediség.md: unique per user, live rows only.
CREATE UNIQUE INDEX idx_household_room_user_id_name_normalized ON household_room (user_id, name_normalized) WHERE deleted = false;
CREATE INDEX idx_household_room_user_id_updated_at ON household_room (user_id, updated_at);

CREATE TRIGGER household_room_set_updated_at
    BEFORE INSERT OR UPDATE ON household_room
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

CREATE TABLE household_task (
    id                 uuid PRIMARY KEY,
    user_id            uuid NOT NULL REFERENCES users (id),
    room_id            uuid NOT NULL REFERENCES household_room (id),
    name               text NOT NULL,
    name_normalized    text NOT NULL,
    energy_level       varchar(16) NOT NULL CHECK (energy_level IN ('LOW', 'MEDIUM', 'HIGH')),
    estimated_minutes  integer NOT NULL CHECK (estimated_minutes >= 1),
    interval_days      integer NOT NULL CHECK (interval_days >= 1),
    next_due           date NOT NULL,
    last_completed_at  timestamptz,
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted            boolean NOT NULL DEFAULT false,
    deleted_at         timestamptz
);

-- documentation/Architektúra/Névegyediség.md: unique per room (not per user), live rows only.
CREATE UNIQUE INDEX idx_household_task_room_id_name_normalized ON household_task (room_id, name_normalized) WHERE deleted = false;
CREATE INDEX idx_household_task_user_id_updated_at ON household_task (user_id, updated_at);
CREATE INDEX idx_household_task_room_id ON household_task (room_id);

CREATE TRIGGER household_task_set_updated_at
    BEFORE INSERT OR UPDATE ON household_task
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
    SELECT 'HouseholdTask' AS entity_type, id, user_id, updated_at, deleted FROM household_task;
