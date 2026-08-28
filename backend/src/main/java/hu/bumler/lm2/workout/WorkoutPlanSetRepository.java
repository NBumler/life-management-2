package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WorkoutPlanSetRepository extends JpaRepository<WorkoutPlanSetEntity, UUID> {

	/** All rows (live and tombstoned) for one exercise line — the nested response needs both. */
	List<WorkoutPlanSetEntity> findByPlanExerciseId(UUID planExerciseId);

	/** Batch form of {@link #findByPlanExerciseId} — grouped by planExerciseId by the caller. */
	List<WorkoutPlanSetEntity> findByPlanExerciseIdIn(Collection<UUID> planExerciseIds);
}
