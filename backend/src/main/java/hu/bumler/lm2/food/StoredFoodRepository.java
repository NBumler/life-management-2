package hu.bumler.lm2.food;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface StoredFoodRepository extends JpaRepository<StoredFoodEntity, UUID> {

	List<StoredFoodEntity> findByUserIdAndDeletedFalseOrderByExpiresOnAsc(UUID userId);

	Optional<StoredFoodEntity> findByIdAndUserId(UUID id, UUID userId);

	/** documentation/Subfeatures/Élelmiszer tárolás.md "Törlés": cascade soft delete when the referenced Food is deleted. */
	List<StoredFoodEntity> findByFoodIdAndDeletedFalse(UUID foodId);
}
