package hu.bumler.lm2.food;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

interface RecipeRepository extends JpaRepository<RecipeEntity, UUID> {

	List<RecipeEntity> findByDeletedFalseOrderByNameAsc();

	/** documentation/Architektúra/Névegyediség.md — live-row scope for the name uniqueness pre-check. */
	Optional<RecipeEntity> findByNameNormalizedAndDeletedFalse(String nameNormalized);

	/** documentation/Subfeatures/Recept.md "Duplikáció": the ingredient-set duplicate check compares against every other live recipe. */
	List<RecipeEntity> findByDeletedFalse();
}
