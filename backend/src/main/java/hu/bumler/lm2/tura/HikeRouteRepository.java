package hu.bumler.lm2.tura;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface HikeRouteRepository extends JpaRepository<HikeRouteEntity, UUID> {

	List<HikeRouteEntity> findByUserIdAndDeletedFalseOrderByUpdatedAtDesc(UUID userId);

	Optional<HikeRouteEntity> findByIdAndUserId(UUID id, UUID userId);
}
