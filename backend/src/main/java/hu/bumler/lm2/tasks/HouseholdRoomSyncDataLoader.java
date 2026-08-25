package hu.bumler.lm2.tasks;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class HouseholdRoomSyncDataLoader implements SyncedEntityDataLoader {

	private final HouseholdRoomRepository repository;
	private final HouseholdRoomMapper mapper;

	HouseholdRoomSyncDataLoader(HouseholdRoomRepository repository, HouseholdRoomMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "HouseholdRoom";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(HouseholdRoomEntity::getId, mapper::toDto));
	}
}
