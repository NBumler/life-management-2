package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WorkoutExerciseEntryRepository extends JpaRepository<WorkoutExerciseEntryEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see WorkoutSession.yaml. */
	List<WorkoutExerciseEntryEntity> findBySessionId(UUID sessionId);

	List<WorkoutExerciseEntryEntity> findBySessionIdAndDeletedFalse(UUID sessionId);

	/** Batch form of {@link #findBySessionId} — list()/WorkoutSessionSyncDataLoader group the result by sessionId instead of querying per session. */
	List<WorkoutExerciseEntryEntity> findBySessionIdIn(Collection<UUID> sessionIds);
}
