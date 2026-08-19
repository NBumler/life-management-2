package hu.bumler.lm2.gear;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface PackingSessionRepository extends JpaRepository<PackingSessionEntity, UUID> {

	List<PackingSessionEntity> findByUserIdAndDeletedFalseOrderByCreatedAtDesc(UUID userId);

	Optional<PackingSessionEntity> findByIdAndUserId(UUID id, UUID userId);
}
