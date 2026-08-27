package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD exists for this entity type — it is only ever saved nested inside a ShoppingList (documentation/Architektúra/Backend.md "Nested aggregate PUT"), but it is still its own sync row (own tombstones, own delta pull entries), so it still needs its own loader. */
@Component
class ShoppingListItemSyncDataLoader implements SyncedEntityDataLoader {

	private final ShoppingListItemRepository repository;
	private final ShoppingListItemMapper mapper;

	ShoppingListItemSyncDataLoader(ShoppingListItemRepository repository, ShoppingListItemMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "ShoppingListItem";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(ShoppingListItemEntity::getId, mapper::toDto));
	}
}
