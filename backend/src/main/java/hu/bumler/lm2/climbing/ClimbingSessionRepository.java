package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ClimbingSessionRepository extends JpaRepository<ClimbingSessionEntity, UUID> {

	List<ClimbingSessionEntity> findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(UUID userId);

	Optional<ClimbingSessionEntity> findByIdAndUserId(UUID id, UUID userId);
}
