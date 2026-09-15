-- backlog/tura-utvonaltervezo/103-... 2.4 fázis: többnapos túra tervezés — szakaszokra bontás +
-- éjszakázó pontok. A napi bontásnak nincs saját azonosítója/tombstone-ja és nem hivatkozik más
-- entitásra, ezért nem önálló sync entitás (ellentétben pl. a packing_template_item-mel) — a
-- HikeRoute egy denormalizált JSON mezőjeként tárolódik, ugyanúgy, ahogy a V41 elevation_profile-ja
-- is a szülőn él. A kliens tölti ki (minden napra külön meghívva az /api/tura/route-metrics
-- endpointot), a szerver csak a napok sorrendjét/lefedettségét validálja mentéskor
-- (HikeRouteService.validateDays) — nincs szükség új Postgres-oszlopra a sync_changes view-ban.
ALTER TABLE hike_route
    ADD COLUMN days jsonb;
