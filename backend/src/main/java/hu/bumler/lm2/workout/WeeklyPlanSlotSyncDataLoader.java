package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD — only ever saved nested inside a WeeklyPlan, but its own sync row, so it still needs its own loader. */
@Component
class WeeklyPlanSlotSyncDataLoader implements SyncedEntityDataLoader {

	private final WeeklyPlanSlotRepository repository;
	private final WeeklyPlanSlotMapper mapper;

	WeeklyPlanSlotSyncDataLoader(WeeklyPlanSlotRepository repository, WeeklyPlanSlotMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "WeeklyPlanSlot";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(WeeklyPlanSlotEntity::getId, mapper::toDto));
	}
}
