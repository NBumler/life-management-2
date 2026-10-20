-- backlog/216 — az ajánlott túra turistajelzése (`PIROS_SAV`, `KEK_KERESZT`, …; ugyanaz a kód, mint a
-- trail_segment.symbol), az OSM-reláció osmc:symbol tagjéből: a katalógus-lista színes jelzés-ikont
-- mutat a név eleji rövidítés („P”, „K+”) helyett. Nullable: a jelzés nélküli relációk és az új import
-- előtti sorok jelzés nélkül maradnak.
ALTER TABLE curated_route ADD COLUMN symbol text;
