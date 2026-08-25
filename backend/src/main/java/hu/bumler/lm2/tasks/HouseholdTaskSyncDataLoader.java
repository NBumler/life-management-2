package hu.bumler.lm2.tasks;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class HouseholdTaskSyncDataLoader implements SyncedEntityDataLoader {

	private final HouseholdTaskRepository repository;
	private final HouseholdTaskMapper mapper;

	HouseholdTaskSyncDataLoader(HouseholdTaskRepository repository, HouseholdTaskMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "HouseholdTask";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(HouseholdTaskEntity::getId, mapper::toDto));
	}
}
