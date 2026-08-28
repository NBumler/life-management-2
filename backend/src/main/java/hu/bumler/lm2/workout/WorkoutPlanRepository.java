package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WorkoutPlanRepository extends JpaRepository<WorkoutPlanEntity, UUID> {

	/** Active and inactive alike — the catalog screen filters client-side; only tombstones are excluded here. */
	List<WorkoutPlanEntity> findByUserIdAndDeletedFalseOrderByCreatedAtAsc(UUID userId);

	Optional<WorkoutPlanEntity> findByIdAndUserId(UUID id, UUID userId);
}
