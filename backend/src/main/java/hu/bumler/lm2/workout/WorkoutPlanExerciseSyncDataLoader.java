package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

/** No standalone REST CRUD — only ever saved nested inside a WorkoutPlan, but its own sync row, so it still needs its own loader. */
@Component
class WorkoutPlanExerciseSyncDataLoader implements SyncedEntityDataLoader {

	private final WorkoutPlanExerciseRepository repository;
	private final WorkoutPlanSetRepository setRepository;
	private final WorkoutPlanExerciseMapper mapper;
	private final WorkoutPlanSetMapper setMapper;

	WorkoutPlanExerciseSyncDataLoader(WorkoutPlanExerciseRepository repository, WorkoutPlanSetRepository setRepository,
			WorkoutPlanExerciseMapper mapper, WorkoutPlanSetMapper setMapper) {
		this.repository = repository;
		this.setRepository = setRepository;
		this.mapper = mapper;
		this.setMapper = setMapper;
	}

	@Override
	public String entityType() {
		return "WorkoutPlanExercise";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<WorkoutPlanExerciseEntity> entries = repository.findAllById(ids);
		Map<UUID, List<WorkoutPlanSetEntity>> setsByExercise = setRepository
				.findByPlanExerciseIdIn(entries.stream().map(WorkoutPlanExerciseEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WorkoutPlanSetEntity::getPlanExerciseId));
		return entries.stream().collect(Collectors.toMap(WorkoutPlanExerciseEntity::getId, entry -> mapper.toDto(entry,
				setsByExercise.getOrDefault(entry.getId(), List.of()).stream().map(setMapper::toDto).toList())));
	}
}
