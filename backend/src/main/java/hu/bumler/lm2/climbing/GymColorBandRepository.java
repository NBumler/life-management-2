package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface GymColorBandRepository extends JpaRepository<GymColorBandEntity, UUID> {

	List<GymColorBandEntity> findByUserIdAndDeletedFalseOrderByNameAsc(UUID userId);

	Optional<GymColorBandEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Subfeatures/Indoor boulder admin.md — "egyedi a terem élő szín-sávjai között". */
	Optional<GymColorBandEntity> findByGymIdAndHexColorAndDeletedFalse(UUID gymId, String hexColor);
}
