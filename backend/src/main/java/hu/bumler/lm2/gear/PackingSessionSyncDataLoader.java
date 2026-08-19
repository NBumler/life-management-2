package hu.bumler.lm2.gear;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class PackingSessionSyncDataLoader implements SyncedEntityDataLoader {

	private final PackingSessionRepository repository;
	private final PackingSessionMapper mapper;

	PackingSessionSyncDataLoader(PackingSessionRepository repository, PackingSessionMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "PackingSession";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(PackingSessionEntity::getId, mapper::toDto));
	}
}
