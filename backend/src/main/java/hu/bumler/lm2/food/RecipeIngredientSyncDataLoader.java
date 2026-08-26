package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD exists for this entity type — it is only ever saved nested inside a Recipe (documentation/Architektúra/Backend.md "Nested aggregate PUT"), but it is still its own sync row (own tombstones, own delta pull entries), so it still needs its own loader. */
@Component
class RecipeIngredientSyncDataLoader implements SyncedEntityDataLoader {

	private final RecipeIngredientRepository repository;
	private final RecipeIngredientMapper mapper;

	RecipeIngredientSyncDataLoader(RecipeIngredientRepository repository, RecipeIngredientMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "RecipeIngredient";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(RecipeIngredientEntity::getId, mapper::toDto));
	}
}
