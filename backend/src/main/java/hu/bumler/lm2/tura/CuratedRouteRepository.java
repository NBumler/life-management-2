package hu.bumler.lm2.tura;

import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * backlog/tura-utvonaltervezo/103-... 2.5 fázis. A katalógus mérete admin-kurált tartalom (nem
 * OSM-import tömeges méretben), ezért a szűrés {@link CuratedRouteService}-ben, egyszerű
 * stream-filterrel történik a {@link #findAll()} eredményén — nincs szükség dinamikus JPQL/
 * Specification-építésre a több (opcionális) szűrő-tengelyhez.
 */
interface CuratedRouteRepository extends JpaRepository<CuratedRouteEntity, UUID> {
}
