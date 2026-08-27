package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class MealSyncDataLoader implements SyncedEntityDataLoader {

	private final MealRepository repository;
	private final MealItemRepository itemRepository;
	private final MealMapper mapper;
	private final MealItemMapper itemMapper;

	MealSyncDataLoader(MealRepository repository, MealItemRepository itemRepository, MealMapper mapper, MealItemMapper itemMapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.mapper = mapper;
		this.itemMapper = itemMapper;
	}

	@Override
	public String entityType() {
		return "Meal";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<MealEntity> entities = repository.findAllById(ids);
		Map<UUID, List<MealItemEntity>> itemsByMeal = itemRepository.findByMealIdIn(entities.stream().map(MealEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(MealItemEntity::getMealId));
		return entities.stream().collect(Collectors.toMap(MealEntity::getId,
				entity -> mapper.toDto(entity, itemsByMeal.getOrDefault(entity.getId(), List.of()).stream().map(itemMapper::toDto).toList())));
	}
}
