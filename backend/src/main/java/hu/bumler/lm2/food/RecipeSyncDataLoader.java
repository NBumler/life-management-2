package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class RecipeSyncDataLoader implements SyncedEntityDataLoader {

	private final RecipeRepository repository;
	private final RecipeIngredientRepository ingredientRepository;
	private final RecipeMapper mapper;
	private final RecipeIngredientMapper ingredientMapper;

	RecipeSyncDataLoader(RecipeRepository repository, RecipeIngredientRepository ingredientRepository, RecipeMapper mapper,
			RecipeIngredientMapper ingredientMapper) {
		this.repository = repository;
		this.ingredientRepository = ingredientRepository;
		this.mapper = mapper;
		this.ingredientMapper = ingredientMapper;
	}

	@Override
	public String entityType() {
		return "Recipe";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<RecipeEntity> entities = repository.findAllById(ids);
		Map<UUID, List<RecipeIngredientEntity>> ingredientsByRecipe = ingredientRepository
				.findByRecipeIdIn(entities.stream().map(RecipeEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(RecipeIngredientEntity::getRecipeId));
		return entities.stream()
				.collect(Collectors.toMap(RecipeEntity::getId,
						entity -> mapper.toDto(entity,
								ingredientsByRecipe.getOrDefault(entity.getId(), List.of()).stream().map(ingredientMapper::toDto).toList())));
	}
}
