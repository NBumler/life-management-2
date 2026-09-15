package hu.bumler.lm2.tura;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface TrailSegmentRepository extends JpaRepository<TrailSegmentEntity, UUID> {

	/** Standard bbox-overlap check: the segment's own bbox must intersect the query bbox. */
	@Query("""
			SELECT t FROM TrailSegmentEntity t
			WHERE t.countryCode = :countryCode
			  AND t.minLon <= :maxLon AND t.maxLon >= :minLon
			  AND t.minLat <= :maxLat AND t.maxLat >= :minLat
			""")
	List<TrailSegmentEntity> findInBbox(@Param("countryCode") String countryCode, @Param("minLon") double minLon,
			@Param("minLat") double minLat, @Param("maxLon") double maxLon, @Param("maxLat") double maxLat);

	long deleteByCountryCode(String countryCode);

	/** backlog/tura-utvonaltervezo/103-... 2.2 fázis — a teljes ország-hálózat a routing-gráf felépítéséhez. */
	List<TrailSegmentEntity> findByCountryCode(String countryCode);
}
