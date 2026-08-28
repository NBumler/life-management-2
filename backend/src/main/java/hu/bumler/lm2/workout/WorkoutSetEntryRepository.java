package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WorkoutSetEntryRepository extends JpaRepository<WorkoutSetEntryEntity, UUID> {

	/** All rows (live and tombstoned) for one exercise entry — the nested response needs both. */
	List<WorkoutSetEntryEntity> findByExerciseEntryId(UUID exerciseEntryId);

	/** Batch form of {@link #findByExerciseEntryId} — grouped by exerciseEntryId by the caller. */
	List<WorkoutSetEntryEntity> findByExerciseEntryIdIn(Collection<UUID> exerciseEntryIds);
}
