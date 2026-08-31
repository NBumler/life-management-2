package hu.bumler.lm2.aycm;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class AycmPartnerSyncDataLoader implements SyncedEntityDataLoader {

	private final AycmPartnerRepository repository;
	private final AycmPartnerMapper mapper;

	AycmPartnerSyncDataLoader(AycmPartnerRepository repository, AycmPartnerMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "AycmPartner";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(AycmPartnerEntity::getId, mapper::toDto));
	}
}
