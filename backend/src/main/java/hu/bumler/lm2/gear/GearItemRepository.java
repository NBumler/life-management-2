package hu.bumler.lm2.gear;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface GearItemRepository extends JpaRepository<GearItemEntity, UUID> {

	List<GearItemEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<GearItemEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the uniqueness pre-check. */
	Optional<GearItemEntity> findByUserIdAndNameNormalizedAndDeletedFalse(UUID userId, String nameNormalized);
}
