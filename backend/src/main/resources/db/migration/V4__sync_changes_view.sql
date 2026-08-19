-- documentation/Architektúra/Backend.md "Sync végpontok megvalósítása": UNION ALL over every
-- synced table, used by GET /api/sync/changes for the delta pull cursor.
-- Every future synced-table migration must CREATE OR REPLACE this view with itself added —
-- a forgotten table here silently drops out of sync (documentation's own warning).
CREATE VIEW sync_changes AS
    SELECT 'UserProfile' AS entity_type, id, user_id, updated_at, deleted FROM user_profile
    UNION ALL
    SELECT 'WeightHistoryEntry' AS entity_type, id, user_id, updated_at, deleted FROM weight_history_entry;
