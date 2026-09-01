package hu.bumler.lm2.steps;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class DailyStepLogSyncDataLoader implements SyncedEntityDataLoader {

	private final DailyStepLogRepository repository;
	private final DailyStepLogMapper mapper;

	DailyStepLogSyncDataLoader(DailyStepLogRepository repository, DailyStepLogMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "DailyStepLog";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(DailyStepLogEntity::getId, mapper::toDto));
	}
}
