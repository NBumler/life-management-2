package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class CragSyncDataLoader implements SyncedEntityDataLoader {

	private final CragRepository repository;
	private final CragMapper mapper;

	CragSyncDataLoader(CragRepository repository, CragMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "Crag";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(CragEntity::getId, mapper::toDto));
	}
}
