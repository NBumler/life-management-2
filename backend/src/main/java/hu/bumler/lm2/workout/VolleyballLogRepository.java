package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface VolleyballLogRepository extends JpaRepository<VolleyballLogEntity, UUID> {

	List<VolleyballLogEntity> findByUserIdAndDeletedFalseOrderByVolleyballDateDescCreatedAtDesc(UUID userId);

	Optional<VolleyballLogEntity> findByIdAndUserId(UUID id, UUID userId);
}
