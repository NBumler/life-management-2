package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface StretchSessionRepository extends JpaRepository<StretchSessionEntity, UUID> {

	List<StretchSessionEntity> findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(UUID userId);

	Optional<StretchSessionEntity> findByIdAndUserId(UUID id, UUID userId);
}
