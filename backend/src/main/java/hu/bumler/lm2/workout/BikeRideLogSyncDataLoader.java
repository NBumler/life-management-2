package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class BikeRideLogSyncDataLoader implements SyncedEntityDataLoader {

	private final BikeRideLogRepository repository;
	private final BikeRideLogMapper mapper;

	BikeRideLogSyncDataLoader(BikeRideLogRepository repository, BikeRideLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "BikeRideLog";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(BikeRideLogEntity::getId, mapper::toDto));
	}
}
