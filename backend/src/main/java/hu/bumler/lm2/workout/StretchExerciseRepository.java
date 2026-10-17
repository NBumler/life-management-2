package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface StretchExerciseRepository extends JpaRepository<StretchExerciseEntity, UUID> {

	List<StretchExerciseEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<StretchExerciseEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the uniqueness pre-check. */
	Optional<StretchExerciseEntity> findByUserIdAndNameNormalizedAndDeletedFalse(UUID userId, String nameNormalized);
}
