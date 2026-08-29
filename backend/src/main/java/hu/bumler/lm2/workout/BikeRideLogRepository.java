package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface BikeRideLogRepository extends JpaRepository<BikeRideLogEntity, UUID> {

	List<BikeRideLogEntity> findByUserIdAndDeletedFalseOrderByRideDateDescCreatedAtDesc(UUID userId);

	Optional<BikeRideLogEntity> findByIdAndUserId(UUID id, UUID userId);
}
