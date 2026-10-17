package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class VolleyballLogSyncDataLoader implements SyncedEntityDataLoader {

	private final VolleyballLogRepository repository;
	private final VolleyballLogMapper mapper;

	VolleyballLogSyncDataLoader(VolleyballLogRepository repository, VolleyballLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "VolleyballLog";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(VolleyballLogEntity::getId, mapper::toDto));
	}
}
