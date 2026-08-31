package hu.bumler.lm2.aycm;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class AycmPriceRuleSyncDataLoader implements SyncedEntityDataLoader {

	private final AycmPriceRuleRepository repository;
	private final AycmPriceRuleMapper mapper;

	AycmPriceRuleSyncDataLoader(AycmPriceRuleRepository repository, AycmPriceRuleMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "AycmPriceRule";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(AycmPriceRuleEntity::getId, mapper::toDto));
	}
}
