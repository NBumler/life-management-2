package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface StretchPlanItemRepository extends JpaRepository<StretchPlanItemEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see StretchPlan.yaml. */
	List<StretchPlanItemEntity> findByPlanId(UUID planId);

	List<StretchPlanItemEntity> findByPlanIdAndDeletedFalse(UUID planId);

	/** Batch form of {@link #findByPlanId} — list()/StretchPlanSyncDataLoader group the result by planId. */
	List<StretchPlanItemEntity> findByPlanIdIn(Collection<UUID> planIds);
}
