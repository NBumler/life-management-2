package hu.bumler.lm2.gear;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class GearItemSyncDataLoader implements SyncedEntityDataLoader {

	private final GearItemRepository repository;
	private final GearItemMapper mapper;

	GearItemSyncDataLoader(GearItemRepository repository, GearItemMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "GearItem";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(GearItemEntity::getId, mapper::toDto));
	}
}
