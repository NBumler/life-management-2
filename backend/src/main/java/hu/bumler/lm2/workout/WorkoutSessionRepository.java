package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WorkoutSessionRepository extends JpaRepository<WorkoutSessionEntity, UUID> {

	List<WorkoutSessionEntity> findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(UUID userId);

	Optional<WorkoutSessionEntity> findByIdAndUserId(UUID id, UUID userId);
}
