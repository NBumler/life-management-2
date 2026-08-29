package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface IndoorRouteRepository extends JpaRepository<IndoorRouteEntity, UUID> {

	List<IndoorRouteEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<IndoorRouteEntity> findByIdAndUserId(UUID id, UUID userId);
}
