package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WorkoutPlanExerciseRepository extends JpaRepository<WorkoutPlanExerciseEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see WorkoutPlan.yaml. */
	List<WorkoutPlanExerciseEntity> findByPlanId(UUID planId);

	List<WorkoutPlanExerciseEntity> findByPlanIdAndDeletedFalse(UUID planId);

	/** Batch form of {@link #findByPlanId} — list()/WorkoutPlanSyncDataLoader group the result by planId. */
	List<WorkoutPlanExerciseEntity> findByPlanIdIn(Collection<UUID> planIds);
}
