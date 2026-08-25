package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface LifePlanRepository extends JpaRepository<LifePlanEntity, UUID> {

	List<LifePlanEntity> findByUserIdAndDeletedFalseOrderByCreatedAtAsc(UUID userId);

	Optional<LifePlanEntity> findByIdAndUserId(UUID id, UUID userId);
}
