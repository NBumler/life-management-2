package hu.bumler.lm2.food;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class StoredFoodSyncDataLoader implements SyncedEntityDataLoader {

	private final StoredFoodRepository repository;
	private final StoredFoodMapper mapper;

	StoredFoodSyncDataLoader(StoredFoodRepository repository, StoredFoodMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "StoredFood";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(StoredFoodEntity::getId, mapper::toDto));
	}
}
