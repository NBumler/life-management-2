package hu.bumler.lm2.food;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface FoodRepository extends JpaRepository<FoodEntity, UUID> {

	List<FoodEntity> findByDeletedFalseOrderByNameAsc();

	/** documentation/Architektúra/Névegyediség.md "Mezőhalmaz-egyediség": the field-set duplicate check compares against every live row. */
	List<FoodEntity> findByDeletedFalse();
}
