package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface HouseholdRoomRepository extends JpaRepository<HouseholdRoomEntity, UUID> {

	List<HouseholdRoomEntity> findByUserIdAndDeletedFalseOrderBySortOrderAsc(UUID userId);

	Optional<HouseholdRoomEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the uniqueness pre-check (per user). */
	Optional<HouseholdRoomEntity> findByUserIdAndNameNormalizedAndDeletedFalse(UUID userId, String nameNormalized);
}
