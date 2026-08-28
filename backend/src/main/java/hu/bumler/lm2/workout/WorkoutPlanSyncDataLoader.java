package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class WorkoutPlanSyncDataLoader implements SyncedEntityDataLoader {

	private final WorkoutPlanRepository repository;
	private final WorkoutPlanExerciseRepository exerciseRepository;
	private final WorkoutPlanSetRepository setRepository;
	private final WorkoutPlanMapper mapper;
	private final WorkoutPlanExerciseMapper exerciseMapper;
	private final WorkoutPlanSetMapper setMapper;

	WorkoutPlanSyncDataLoader(WorkoutPlanRepository repository, WorkoutPlanExerciseRepository exerciseRepository,
			WorkoutPlanSetRepository setRepository, WorkoutPlanMapper mapper, WorkoutPlanExerciseMapper exerciseMapper,
			WorkoutPlanSetMapper setMapper) {
		this.repository = repository;
		this.exerciseRepository = exerciseRepository;
		this.setRepository = setRepository;
		this.mapper = mapper;
		this.exerciseMapper = exerciseMapper;
		this.setMapper = setMapper;
	}

	@Override
	public String entityType() {
		return "WorkoutPlan";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<WorkoutPlanEntity> plans = repository.findAllById(ids);
		Map<UUID, List<WorkoutPlanExerciseEntity>> exercisesByPlan = exerciseRepository
				.findByPlanIdIn(plans.stream().map(WorkoutPlanEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WorkoutPlanExerciseEntity::getPlanId));
		Map<UUID, List<WorkoutPlanSetEntity>> setsByExercise = setRepository
				.findByPlanExerciseIdIn(exercisesByPlan.values().stream().flatMap(List::stream)
						.map(WorkoutPlanExerciseEntity::getId).toList())
				.stream().collect(Collectors.groupingBy(WorkoutPlanSetEntity::getPlanExerciseId));
		return plans.stream().collect(Collectors.toMap(WorkoutPlanEntity::getId, plan -> mapper.toDto(plan,
				exercisesByPlan.getOrDefault(plan.getId(), List.of()).stream()
						.map(exercise -> exerciseMapper.toDto(exercise, setsByExercise.getOrDefault(exercise.getId(), List.of())
								.stream().map(setMapper::toDto).toList()))
						.toList())));
	}
}
