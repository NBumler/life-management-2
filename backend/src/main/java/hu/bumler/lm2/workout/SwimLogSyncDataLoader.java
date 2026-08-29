package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class SwimLogSyncDataLoader implements SyncedEntityDataLoader {

	private final SwimLogRepository repository;
	private final SwimLogMapper mapper;

	SwimLogSyncDataLoader(SwimLogRepository repository, SwimLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "SwimLog";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(SwimLogEntity::getId, mapper::toDto));
	}
}
