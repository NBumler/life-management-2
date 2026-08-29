package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class SectorSyncDataLoader implements SyncedEntityDataLoader {

	private final SectorRepository repository;
	private final SectorMapper mapper;

	SectorSyncDataLoader(SectorRepository repository, SectorMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "Sector";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(SectorEntity::getId, mapper::toDto));
	}
}
