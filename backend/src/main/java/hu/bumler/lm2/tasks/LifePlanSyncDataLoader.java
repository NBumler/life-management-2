package hu.bumler.lm2.tasks;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class LifePlanSyncDataLoader implements SyncedEntityDataLoader {

	private final LifePlanRepository repository;
	private final LifePlanMapper mapper;

	LifePlanSyncDataLoader(LifePlanRepository repository, LifePlanMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "LifePlan";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(LifePlanEntity::getId, mapper::toDto));
	}
}
