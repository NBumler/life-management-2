package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD — only ever saved nested inside a ClimbingSession (documentation/Architektúra/Backend.md "Nested aggregate PUT"), but its own sync row (own tombstones, own delta pull entries), so it still needs its own loader. */
@Component
class PitchLogSyncDataLoader implements SyncedEntityDataLoader {

	private final PitchLogRepository repository;
	private final PitchLogMapper mapper;

	PitchLogSyncDataLoader(PitchLogRepository repository, PitchLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "PitchLog";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(PitchLogEntity::getId, mapper::toDto));
	}
}
