-- backlog/tura-utvonaltervezo/103-... 2.3 fázis: táv/idő/szintkülönbség-becslés + magassági profil.
-- A kliens a /api/tura/route-metrics hívás eredményét küldi el mentéskor, denormalizáltan tárolva
-- ezeken az oszlopokon — a HikeRoute teljesen offline-szinkronizált (V40), tehát egy mentett
-- útvonal listázása/megtekintése Full-Offline módban sem függhet egy élő elevation API-hívástól.
-- Nullable: online elevation-lekérdezés nélkül (pl. offline mentés, vagy az elevation API
-- pillanatnyi elérhetetlensége) az útvonal metrika nélkül is menthető marad — tudatos korlát.
-- elevation_profile ugyanazt a lapított [x1, y1, x2, y2, ...] mintát követi, mint coordinates
-- (itt [distanceMeters, elevationMeters] párok).
ALTER TABLE hike_route
    ADD COLUMN distance_meters double precision,
    ADD COLUMN elevation_gain_meters double precision,
    ADD COLUMN elevation_loss_meters double precision,
    ADD COLUMN estimated_duration_minutes double precision,
    ADD COLUMN elevation_profile double precision[];
