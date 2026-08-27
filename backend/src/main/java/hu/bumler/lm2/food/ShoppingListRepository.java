package hu.bumler.lm2.food;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface ShoppingListRepository extends JpaRepository<ShoppingListEntity, UUID> {

	List<ShoppingListEntity> findByUserIdAndDeletedFalseOrderByCreatedAtDesc(UUID userId);

	Optional<ShoppingListEntity> findByIdAndUserId(UUID id, UUID userId);
}
