package hu.bumler.lm2.gear;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

interface PackingTemplateItemRepository extends JpaRepository<PackingTemplateItemEntity, UUID> {

	/** All rows (live and tombstoned) — the nested detail response needs both, see PackingTemplateDetail.yaml. */
	List<PackingTemplateItemEntity> findByTemplateId(UUID templateId);

	List<PackingTemplateItemEntity> findByTemplateIdAndDeletedFalse(UUID templateId);

	/**
	 * Live item counts for a whole batch of templates in one grouped query — the template list's
	 * per-row count without the N+1 ({@link PackingTemplateService#list}). Templates with no live item
	 * are absent from the result (no zero rows); the caller defaults them to 0.
	 */
	@Query("""
			SELECT new hu.bumler.lm2.gear.PackingTemplateItemCount(i.templateId, COUNT(i))
			FROM PackingTemplateItemEntity i
			WHERE i.templateId IN :templateIds AND i.deleted = false
			GROUP BY i.templateId
			""")
	List<PackingTemplateItemCount> countLiveItemsByTemplateIds(@Param("templateIds") Collection<UUID> templateIds);

	/** documentation/Subfeatures/Eszközök.md — GearItem delete cascade. */
	List<PackingTemplateItemEntity> findByGearItemIdAndUserIdAndDeletedFalse(UUID gearItemId, UUID userId);
}
