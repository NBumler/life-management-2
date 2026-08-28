package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class ExerciseSyncDataLoader implements SyncedEntityDataLoader {

	private final ExerciseRepository repository;
	private final ExerciseMapper mapper;

	ExerciseSyncDataLoader(ExerciseRepository repository, ExerciseMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "Exercise";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(ExerciseEntity::getId, mapper::toDto));
	}
}
