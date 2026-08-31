package hu.bumler.lm2.aycm;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class AycmSettingsSyncDataLoader implements SyncedEntityDataLoader {

	private final AycmSettingsRepository repository;
	private final AycmSettingsMapper mapper;

	AycmSettingsSyncDataLoader(AycmSettingsRepository repository, AycmSettingsMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "AycmSettings";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(AycmSettingsEntity::getId, mapper::toDto));
	}
}
