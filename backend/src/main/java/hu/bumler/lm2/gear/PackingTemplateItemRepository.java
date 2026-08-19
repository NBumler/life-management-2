package hu.bumler.lm2.gear;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface PackingTemplateItemRepository extends JpaRepository<PackingTemplateItemEntity, UUID> {

	/** All rows (live and tombstoned) — the nested detail response needs both, see PackingTemplateDetail.yaml. */
	List<PackingTemplateItemEntity> findByTemplateId(UUID templateId);

	List<PackingTemplateItemEntity> findByTemplateIdAndDeletedFalse(UUID templateId);

	/** documentation/Subfeatures/Eszközök.md — GearItem delete cascade. */
	List<PackingTemplateItemEntity> findByGearItemIdAndUserIdAndDeletedFalse(UUID gearItemId, UUID userId);
}
