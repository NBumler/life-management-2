package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class ShoppingListSyncDataLoader implements SyncedEntityDataLoader {

	private final ShoppingListRepository repository;
	private final ShoppingListItemRepository itemRepository;
	private final ShoppingListMapper mapper;
	private final ShoppingListItemMapper itemMapper;

	ShoppingListSyncDataLoader(ShoppingListRepository repository, ShoppingListItemRepository itemRepository, ShoppingListMapper mapper,
			ShoppingListItemMapper itemMapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.mapper = mapper;
		this.itemMapper = itemMapper;
	}

	@Override
	public String entityType() {
		return "ShoppingList";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<ShoppingListEntity> entities = repository.findAllById(ids);
		Map<UUID, List<ShoppingListItemEntity>> itemsByList = itemRepository
				.findByShoppingListIdIn(entities.stream().map(ShoppingListEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(ShoppingListItemEntity::getShoppingListId));
		return entities.stream().collect(Collectors.toMap(ShoppingListEntity::getId,
				entity -> mapper.toDto(entity, itemsByList.getOrDefault(entity.getId(), List.of()).stream().map(itemMapper::toDto).toList())));
	}
}
