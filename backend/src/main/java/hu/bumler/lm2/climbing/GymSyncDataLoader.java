package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class GymSyncDataLoader implements SyncedEntityDataLoader {

	private final GymRepository repository;
	private final GymMapper mapper;

	GymSyncDataLoader(GymRepository repository, GymMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "Gym";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(GymEntity::getId, mapper::toDto));
	}
}
