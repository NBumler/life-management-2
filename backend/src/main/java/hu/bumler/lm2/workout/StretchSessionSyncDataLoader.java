package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class StretchSessionSyncDataLoader implements SyncedEntityDataLoader {

	private final StretchSessionRepository repository;
	private final StretchSessionItemRepository itemRepository;
	private final StretchSessionMapper mapper;

	StretchSessionSyncDataLoader(StretchSessionRepository repository, StretchSessionItemRepository itemRepository, StretchSessionMapper mapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "StretchSession";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<StretchSessionEntity> sessions = repository.findAllById(ids);
		Map<UUID, List<StretchSessionItemEntity>> itemsBySession = itemRepository
				.findBySessionIdIn(sessions.stream().map(StretchSessionEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(StretchSessionItemEntity::getSessionId));
		return sessions.stream().collect(Collectors.toMap(StretchSessionEntity::getId, session -> mapper.toDto(session,
				itemsBySession.getOrDefault(session.getId(), List.of()).stream().map(mapper::toDto).toList())));
	}
}
