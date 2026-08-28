package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD — only ever saved nested inside a WorkoutSession (documentation/Architektúra/Backend.md "Nested aggregate PUT"), but its own sync row (own tombstones, own delta pull entries), so it still needs its own loader. */
@Component
class WorkoutExerciseEntrySyncDataLoader implements SyncedEntityDataLoader {

	private final WorkoutExerciseEntryRepository repository;
	private final WorkoutSetEntryRepository setRepository;
	private final WorkoutExerciseEntryMapper mapper;
	private final WorkoutSetEntryMapper setMapper;

	WorkoutExerciseEntrySyncDataLoader(WorkoutExerciseEntryRepository repository, WorkoutSetEntryRepository setRepository,
			WorkoutExerciseEntryMapper mapper, WorkoutSetEntryMapper setMapper) {
		this.repository = repository;
		this.setRepository = setRepository;
		this.mapper = mapper;
		this.setMapper = setMapper;
	}

	@Override
	public String entityType() {
		return "WorkoutExerciseEntry";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<WorkoutExerciseEntryEntity> entries = repository.findAllById(ids);
		Map<UUID, List<WorkoutSetEntryEntity>> setsByExercise = setRepository
				.findByExerciseEntryIdIn(entries.stream().map(WorkoutExerciseEntryEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WorkoutSetEntryEntity::getExerciseEntryId));
		return entries.stream().collect(Collectors.toMap(WorkoutExerciseEntryEntity::getId, entry -> mapper.toDto(entry,
				setsByExercise.getOrDefault(entry.getId(), List.of()).stream().map(setMapper::toDto).toList())));
	}
}
