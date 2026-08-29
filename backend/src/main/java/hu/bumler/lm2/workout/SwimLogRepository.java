package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface SwimLogRepository extends JpaRepository<SwimLogEntity, UUID> {

	List<SwimLogEntity> findByUserIdAndDeletedFalseOrderBySwimDateDescCreatedAtDesc(UUID userId);

	Optional<SwimLogEntity> findByIdAndUserId(UUID id, UUID userId);
}
