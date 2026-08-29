package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface RouteRepository extends JpaRepository<RouteEntity, UUID> {

	List<RouteEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<RouteEntity> findByIdAndUserId(UUID id, UUID userId);
}
