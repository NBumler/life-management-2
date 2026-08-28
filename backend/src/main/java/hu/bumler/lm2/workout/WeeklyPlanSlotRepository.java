package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WeeklyPlanSlotRepository extends JpaRepository<WeeklyPlanSlotEntity, UUID> {

	/** All rows (live and tombstoned) — the nested response needs both, see WeeklyPlan.yaml. */
	List<WeeklyPlanSlotEntity> findByWeeklyPlanId(UUID weeklyPlanId);

	List<WeeklyPlanSlotEntity> findByWeeklyPlanIdAndDeletedFalse(UUID weeklyPlanId);

	/** Batch form of {@link #findByWeeklyPlanId} — grouped by weeklyPlanId by the caller. */
	List<WeeklyPlanSlotEntity> findByWeeklyPlanIdIn(Collection<UUID> weeklyPlanIds);
}
