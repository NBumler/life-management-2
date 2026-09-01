package hu.bumler.lm2.steps;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface DailyStepLogRepository extends JpaRepository<DailyStepLogEntity, UUID> {

	List<DailyStepLogEntity> findByUserIdAndDeletedFalseOrderByLogDateDesc(UUID userId);

	Optional<DailyStepLogEntity> findByIdAndUserId(UUID id, UUID userId);
}
