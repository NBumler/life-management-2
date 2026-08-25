package hu.bumler.lm2.tasks;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class CalendarEventSyncDataLoader implements SyncedEntityDataLoader {

	private final CalendarEventRepository repository;
	private final CalendarEventMapper mapper;

	CalendarEventSyncDataLoader(CalendarEventRepository repository, CalendarEventMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "CalendarEvent";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(CalendarEventEntity::getId, mapper::toDto));
	}
}
