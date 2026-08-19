package hu.bumler.lm2.profile;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class WeightHistorySyncDataLoader implements SyncedEntityDataLoader {

	private final WeightHistoryEntryRepository repository;
	private final WeightHistoryEntryMapper mapper;

	WeightHistorySyncDataLoader(WeightHistoryEntryRepository repository, WeightHistoryEntryMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "WeightHistoryEntry";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(WeightHistoryEntryEntity::getId, mapper::toDto));
	}
}
