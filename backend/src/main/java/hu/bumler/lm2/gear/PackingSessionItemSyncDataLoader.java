package hu.bumler.lm2.gear;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class PackingSessionItemSyncDataLoader implements SyncedEntityDataLoader {

	private final PackingSessionItemRepository repository;
	private final PackingSessionItemMapper mapper;

	PackingSessionItemSyncDataLoader(PackingSessionItemRepository repository, PackingSessionItemMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "PackingSessionItem";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(PackingSessionItemEntity::getId, mapper::toDto));
	}
}
