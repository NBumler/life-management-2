-- documentation/Features/Események.md — user-owned calendar events: one-off day or a simple
-- recurring series (DAILY/WEEKLY/YEARLY). No occurrence table; the client projects occurrences.

CREATE TABLE calendar_event (
    id         uuid PRIMARY KEY,
    user_id    uuid NOT NULL REFERENCES users (id),
    title      text NOT NULL,
    location   text,
    notes      text,
    all_day    boolean NOT NULL,
    date       date NOT NULL,
    start_time varchar(5),
    end_time   varchar(5),
    frequency  varchar(16) CHECK (frequency IN ('DAILY', 'WEEKLY', 'YEARLY')),
    interval   integer NOT NULL DEFAULT 1 CHECK (interval >= 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted    boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    CHECK (
        (all_day = true AND start_time IS NULL AND end_time IS NULL)
        OR (all_day = false AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    )
);

-- documentation/Architektúra/Backend.md "Indexek": delta pull filter.
CREATE INDEX idx_calendar_event_user_id_updated_at ON calendar_event (user_id, updated_at);

CREATE TRIGGER calendar_event_set_updated_at
    BEFORE INSERT OR UPDATE ON calendar_event
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
    SELECT 'CalendarEvent' AS entity_type, id, user_id, updated_at, deleted FROM calendar_event;
