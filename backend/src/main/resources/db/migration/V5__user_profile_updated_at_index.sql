-- documentation/Architektúra/Backend.md "Indexek": "(user_id, updated_at) a user-owned
-- táblákon (a delta pull szűrése)" — every user-owned synced table needs this composite index,
-- not just the ones with more than one row per user. user_profile had only the unique
-- (user_id) index from V3, which does not serve an (user_id, updated_at) range/order lookup.
CREATE INDEX idx_user_profile_user_id_updated_at ON user_profile (user_id, updated_at);
