package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class FoodSyncDataLoader implements SyncedEntityDataLoader {

	private final FoodRepository repository;
	private final FoodMapper mapper;

	FoodSyncDataLoader(FoodRepository repository, FoodMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "Food";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(FoodEntity::getId, mapper::toDto));
	}
}
