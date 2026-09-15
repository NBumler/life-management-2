-- backlog/tura-utvonaltervezo/103-... 2.5 fázis — admin-szerkesztett vagy OSM-eredetű ajánlott
-- túrakatalógus (kizárólag saját/admin tartalom, nem közösségi — ld. archive/110-... dropped).
-- Megosztott referenciaadat, ugyanaz a minta, mint a trail_segment: nincs user_id, nincs
-- deleted/deleted_at tombstone (admin hard-delete-tel törli, nincs kliens-oldali offline másolat,
-- aminek konvergálnia kellene), nem az /api/sync/changes csatornán megy, hanem egy dedikált,
-- szűrhető GET listával (nehézség/aktivitás-típus/táv szerint).
--
-- A geometria és a napi bontás ugyanazt a mintát követi, mint a HikeRoute: lapított
-- double precision[] koordinátatömb, illetve a napi bontás pre-szerializált jsonb-ként (nem önálló
-- entitás/tábla, ld. V42__tura_hike_route_days.sql indoklását).
--
-- A táv/szint/idő-becslést a szerver számolja ki (RouteMetricsService) admin upsertkor a
-- coordinates-ból, nem az admin adja meg — így a katalógus és a felhasználó saját útvonalai
-- ugyanazzal a becslési logikával kapnak metrikát, és a táv szerinti szűrés is konzisztens marad.

CREATE TABLE curated_route (
    id                         uuid PRIMARY KEY,
    name                       varchar(200) NOT NULL,
    description                text,
    difficulty                 varchar(20) NOT NULL,
    activity_type              varchar(20) NOT NULL,
    coordinates                double precision[] NOT NULL,
    days                       jsonb,
    distance_meters            double precision NOT NULL,
    elevation_gain_meters      double precision NOT NULL,
    elevation_loss_meters      double precision NOT NULL,
    estimated_duration_minutes double precision NOT NULL,
    created_at                 timestamptz NOT NULL DEFAULT now(),
    updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- A katalógus-szűrés (nehézség/aktivitás-típus/táv) erre támaszkodik.
CREATE INDEX idx_curated_route_filters ON curated_route (difficulty, activity_type, distance_meters);

CREATE TRIGGER curated_route_set_updated_at
    BEFORE INSERT OR UPDATE ON curated_route
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
