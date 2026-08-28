package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface WeeklyPlanRepository extends JpaRepository<WeeklyPlanEntity, UUID> {

	List<WeeklyPlanEntity> findByUserIdAndDeletedFalseOrderByWeekStartDateDesc(UUID userId);

	Optional<WeeklyPlanEntity> findByIdAndUserId(UUID id, UUID userId);
}
