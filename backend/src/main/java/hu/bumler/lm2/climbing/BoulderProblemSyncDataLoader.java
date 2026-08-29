package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class BoulderProblemSyncDataLoader implements SyncedEntityDataLoader {

	private final BoulderProblemRepository repository;
	private final BoulderProblemMapper mapper;

	BoulderProblemSyncDataLoader(BoulderProblemRepository repository, BoulderProblemMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "BoulderProblem";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(BoulderProblemEntity::getId, mapper::toDto));
	}
}
