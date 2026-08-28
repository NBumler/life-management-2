package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD — only ever saved nested inside a WorkoutSession (documentation/Architektúra/Backend.md "Nested aggregate PUT"), but its own sync row (own tombstones, own delta pull entries), so it still needs its own loader. */
@Component
class WorkoutSetEntrySyncDataLoader implements SyncedEntityDataLoader {

	private final WorkoutSetEntryRepository repository;
	private final WorkoutSetEntryMapper mapper;

	WorkoutSetEntrySyncDataLoader(WorkoutSetEntryRepository repository, WorkoutSetEntryMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "WorkoutSetEntry";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(WorkoutSetEntryEntity::getId, mapper::toDto));
	}
}
