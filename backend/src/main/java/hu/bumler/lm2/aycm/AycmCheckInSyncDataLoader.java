package hu.bumler.lm2.aycm;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class AycmCheckInSyncDataLoader implements SyncedEntityDataLoader {

	private final AycmCheckInRepository repository;
	private final AycmCheckInMapper mapper;

	AycmCheckInSyncDataLoader(AycmCheckInRepository repository, AycmCheckInMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "AycmCheckIn";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(AycmCheckInEntity::getId, mapper::toDto));
	}
}
