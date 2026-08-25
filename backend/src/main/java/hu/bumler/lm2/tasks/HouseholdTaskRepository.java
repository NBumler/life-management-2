package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface HouseholdTaskRepository extends JpaRepository<HouseholdTaskEntity, UUID> {

	List<HouseholdTaskEntity> findByUserIdAndDeletedFalseOrderByNextDueAsc(UUID userId);

	Optional<HouseholdTaskEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the uniqueness pre-check (per room, not per user). */
	Optional<HouseholdTaskEntity> findByRoomIdAndNameNormalizedAndDeletedFalse(UUID roomId, String nameNormalized);

	/** documentation/Subfeatures/Háztartási feladatok.md "Törlés" cascade source when a room is deleted. */
	List<HouseholdTaskEntity> findByRoomIdAndDeletedFalse(UUID roomId);
}
