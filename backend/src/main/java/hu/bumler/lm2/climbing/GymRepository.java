package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface GymRepository extends JpaRepository<GymEntity, UUID> {

	List<GymEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<GymEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the uniqueness pre-check. */
	Optional<GymEntity> findByUserIdAndNameNormalizedAndDeletedFalse(UUID userId, String nameNormalized);
}
