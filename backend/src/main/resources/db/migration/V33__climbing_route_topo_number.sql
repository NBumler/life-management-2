-- backlog/079 — opcionális topó-sorszám ("guidebook index") az utakhoz / problémákhoz. Az utak
-- gyakran felmászókönyvből kerülnek be; a sorszám (pl. "12", "5/a", "5b", "A14") megkönnyíti a
-- könyv <-> app megfeleltetést, és a rendezést a topó sorrendjében (természetes alfanumerikus
-- rendezés kliensoldalon, lásd shared/fixtures/natural-sort.json). Rövid szabad szöveg, NEM
-- uniqueness-kényszerített (két úton lehet elírásból ugyanaz), szektor/terem-scope-ban értelmezett.
-- A szerver soha nem rendez topó-sorszám szerint — a lista-végpontok maradnak név szerint --, ez
-- tisztán kliensoldali megjelenítési szempont. sync_changes view érintetlen (csak
-- id / user_id / updated_at / deleted oszlopokat vetít).

ALTER TABLE route
    ADD COLUMN topo_number text CHECK (topo_number IS NULL OR char_length(topo_number) <= 32);

ALTER TABLE boulder_problem
    ADD COLUMN topo_number text CHECK (topo_number IS NULL OR char_length(topo_number) <= 32);

ALTER TABLE indoor_route
    ADD COLUMN topo_number text CHECK (topo_number IS NULL OR char_length(topo_number) <= 32);
