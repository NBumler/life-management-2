package hu.bumler.lm2.gear;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class PackingTemplateSyncDataLoader implements SyncedEntityDataLoader {

	private final PackingTemplateRepository repository;
	private final PackingTemplateMapper mapper;

	PackingTemplateSyncDataLoader(PackingTemplateRepository repository, PackingTemplateMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "PackingTemplate";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(PackingTemplateEntity::getId, mapper::toDto));
	}
}
