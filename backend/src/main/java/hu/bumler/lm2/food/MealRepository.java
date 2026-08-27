package hu.bumler.lm2.food;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface MealRepository extends JpaRepository<MealEntity, UUID> {

	List<MealEntity> findByUserIdAndDeletedFalseOrderByEatenAtAsc(UUID userId);

	Optional<MealEntity> findByIdAndUserId(UUID id, UUID userId);
}
