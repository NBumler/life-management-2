package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ExerciseRepository extends JpaRepository<ExerciseEntity, UUID> {

	List<ExerciseEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<ExerciseEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the uniqueness pre-check. */
	Optional<ExerciseEntity> findByUserIdAndNameNormalizedAndDeletedFalse(UUID userId, String nameNormalized);
}
