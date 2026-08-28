package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class WorkoutSessionSyncDataLoader implements SyncedEntityDataLoader {

	private final WorkoutSessionRepository repository;
	private final WorkoutExerciseEntryRepository exerciseRepository;
	private final WorkoutSetEntryRepository setRepository;
	private final WorkoutSessionMapper mapper;
	private final WorkoutExerciseEntryMapper exerciseMapper;
	private final WorkoutSetEntryMapper setMapper;

	WorkoutSessionSyncDataLoader(WorkoutSessionRepository repository, WorkoutExerciseEntryRepository exerciseRepository,
			WorkoutSetEntryRepository setRepository, WorkoutSessionMapper mapper, WorkoutExerciseEntryMapper exerciseMapper,
			WorkoutSetEntryMapper setMapper) {
		this.repository = repository;
		this.exerciseRepository = exerciseRepository;
		this.setRepository = setRepository;
		this.mapper = mapper;
		this.exerciseMapper = exerciseMapper;
		this.setMapper = setMapper;
	}

	@Override
	public String entityType() {
		return "WorkoutSession";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<WorkoutSessionEntity> sessions = repository.findAllById(ids);
		Map<UUID, List<WorkoutExerciseEntryEntity>> exercisesBySession = exerciseRepository
				.findBySessionIdIn(sessions.stream().map(WorkoutSessionEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WorkoutExerciseEntryEntity::getSessionId));
		Map<UUID, List<WorkoutSetEntryEntity>> setsByExercise = setRepository
				.findByExerciseEntryIdIn(exercisesBySession.values().stream().flatMap(List::stream)
						.map(WorkoutExerciseEntryEntity::getId).toList())
				.stream().collect(Collectors.groupingBy(WorkoutSetEntryEntity::getExerciseEntryId));
		return sessions.stream().collect(Collectors.toMap(WorkoutSessionEntity::getId, session -> mapper.toDto(session,
				exercisesBySession.getOrDefault(session.getId(), List.of()).stream()
						.map(exercise -> exerciseMapper.toDto(exercise, setsByExercise.getOrDefault(exercise.getId(), List.of())
								.stream().map(setMapper::toDto).toList()))
						.toList())));
	}
}
