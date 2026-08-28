package hu.bumler.lm2.workout;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.WorkoutExerciseEntry;
import hu.bumler.lm2.api.model.WorkoutSession;
import hu.bumler.lm2.api.model.WorkoutSetEntry;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Edzésnapló.md — per-user workout log. Nested aggregate PUT like
 * MealService, but three levels deep: WorkoutSession → WorkoutExerciseEntry → WorkoutSetEntry, all
 * committed atomically in one {@code @Transactional} method whose response echoes every row (live or
 * tombstoned). No server-side kcal: the day's {@code activityExtraKcal} is a pure client calculation
 * (documentation/Features/Tápérték kalkulátor.md), so this service only persists — the set-field
 * rules per {@code exerciseKind} are enforced client-side ("szerver oldalon laza").
 */
@Service
class WorkoutSessionService {

	private final WorkoutSessionRepository repository;
	private final WorkoutExerciseEntryRepository exerciseRepository;
	private final WorkoutSetEntryRepository setRepository;
	private final WorkoutSessionMapper mapper;
	private final WorkoutExerciseEntryMapper exerciseMapper;
	private final WorkoutSetEntryMapper setMapper;

	WorkoutSessionService(WorkoutSessionRepository repository, WorkoutExerciseEntryRepository exerciseRepository,
			WorkoutSetEntryRepository setRepository, WorkoutSessionMapper mapper, WorkoutExerciseEntryMapper exerciseMapper,
			WorkoutSetEntryMapper setMapper) {
		this.repository = repository;
		this.exerciseRepository = exerciseRepository;
		this.setRepository = setRepository;
		this.mapper = mapper;
		this.exerciseMapper = exerciseMapper;
		this.setMapper = setMapper;
	}

	@Transactional(readOnly = true)
	List<WorkoutSession> list(UUID userId) {
		List<WorkoutSessionEntity> sessions = repository.findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(userId);
		Map<UUID, List<WorkoutExerciseEntryEntity>> exercisesBySession = exerciseRepository
				.findBySessionIdIn(sessions.stream().map(WorkoutSessionEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WorkoutExerciseEntryEntity::getSessionId));
		Map<UUID, List<WorkoutSetEntryEntity>> setsByExercise = setsByExerciseFor(exercisesBySession.values().stream()
				.flatMap(List::stream).map(WorkoutExerciseEntryEntity::getId).toList());
		return sessions.stream()
				.map(session -> toDto(session, exercisesBySession.getOrDefault(session.getId(), List.of()), setsByExercise))
				.toList();
	}

	@Transactional(readOnly = true)
	WorkoutSession get(UUID userId, UUID id) {
		WorkoutSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such workout session"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	WorkoutSession create(UUID userId, WorkoutSession dto) {
		WorkoutSessionEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new WorkoutSessionEntity(dto.getId(), userId));
		return saveTree(entity, dto);
	}

	@Transactional
	WorkoutSession update(UUID userId, UUID id, WorkoutSession dto) {
		WorkoutSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such workout session"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Workout session already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live exercise entry and set on the session. */
	@Transactional
	WorkoutSession delete(UUID userId, UUID id) {
		WorkoutSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such workout session"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (WorkoutExerciseEntryEntity exercise : exerciseRepository.findBySessionIdAndDeletedFalse(id)) {
				exercise.softDelete();
				exerciseRepository.save(exercise);
				softDeleteLiveSets(exercise.getId());
			}
			exerciseRepository.flush();
			setRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code exercises}
	 * list (and each entry's {@code sets}) is the complete desired live tree — presence/absence by id
	 * is the only signal. Rows missing from the incoming list are soft-deleted; the response always
	 * lists every row, live or tombstoned (WorkoutSession.yaml).
	 */
	private WorkoutSession saveTree(WorkoutSessionEntity entity, WorkoutSession dto) {
		applySessionFields(entity, dto);
		repository.saveAndFlush(entity);

		List<WorkoutExerciseEntryEntity> existingExercises = exerciseRepository.findBySessionId(entity.getId());
		Set<UUID> incomingExerciseIds = new HashSet<>();
		for (WorkoutExerciseEntry exerciseDto : dto.getExercises()) {
			if (exerciseDto.getDeleted()) {
				continue;
			}
			incomingExerciseIds.add(exerciseDto.getId());
			WorkoutExerciseEntryEntity exerciseEntity = resolveExercise(entity.getId(), existingExercises, exerciseDto.getId());
			applyExerciseFields(exerciseEntity, exerciseDto);
			exerciseRepository.save(exerciseEntity);
			saveSets(exerciseEntity.getId(), exerciseDto.getSets());
		}
		for (WorkoutExerciseEntryEntity existing : existingExercises) {
			if (!existing.isDeleted() && !incomingExerciseIds.contains(existing.getId())) {
				existing.softDelete();
				exerciseRepository.save(existing);
				softDeleteLiveSets(existing.getId());
			}
		}
		exerciseRepository.flush();
		setRepository.flush();

		return toDto(entity);
	}

	private void saveSets(UUID exerciseEntryId, List<WorkoutSetEntry> setDtos) {
		List<WorkoutSetEntryEntity> existingSets = setRepository.findByExerciseEntryId(exerciseEntryId);
		Set<UUID> incomingSetIds = new HashSet<>();
		for (WorkoutSetEntry setDto : setDtos) {
			if (setDto.getDeleted()) {
				continue;
			}
			incomingSetIds.add(setDto.getId());
			WorkoutSetEntryEntity setEntity = resolveSet(exerciseEntryId, existingSets, setDto.getId());
			applySetFields(setEntity, setDto);
			setRepository.save(setEntity);
		}
		for (WorkoutSetEntryEntity existing : existingSets) {
			if (!existing.isDeleted() && !incomingSetIds.contains(existing.getId())) {
				existing.softDelete();
				setRepository.save(existing);
			}
		}
	}

	private void softDeleteLiveSets(UUID exerciseEntryId) {
		for (WorkoutSetEntryEntity set : setRepository.findByExerciseEntryId(exerciseEntryId)) {
			if (!set.isDeleted()) {
				set.softDelete();
				setRepository.save(set);
			}
		}
	}

	/** See {@link NestedChildResolver} — shared with MealService.resolveItem / RecipeService.resolveIngredient. */
	private WorkoutExerciseEntryEntity resolveExercise(UUID sessionId, List<WorkoutExerciseEntryEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, WorkoutExerciseEntryEntity::getId, WorkoutExerciseEntryEntity::isDeleted,
				WorkoutExerciseEntryEntity::undelete, exerciseRepository::existsById,
				() -> new WorkoutExerciseEntryEntity(id, sessionId), "No such workout exercise entry");
	}

	private WorkoutSetEntryEntity resolveSet(UUID exerciseEntryId, List<WorkoutSetEntryEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, WorkoutSetEntryEntity::getId, WorkoutSetEntryEntity::isDeleted,
				WorkoutSetEntryEntity::undelete, setRepository::existsById,
				() -> new WorkoutSetEntryEntity(id, exerciseEntryId), "No such workout set entry");
	}

	private void applySessionFields(WorkoutSessionEntity entity, WorkoutSession dto) {
		entity.setDate(dto.getDate());
		entity.setStartTime(dto.getStartTime().orElse(null));
		entity.setEndTime(dto.getEndTime().orElse(null));
		entity.setDurationMinutes(dto.getDurationMinutes().orElse(null));
		entity.setWorkoutType(dto.getWorkoutType().getValue());
		entity.setTitle(dto.getTitle().orElse(null));
		entity.setNotes(dto.getNotes().orElse(null));
		WorkoutSession.LocationEnum location = dto.getLocation().orElse(null);
		entity.setLocation(location == null ? null : location.getValue());
		entity.setPlanId(dto.getPlanId().orElse(null));
		entity.setRoundsCount(dto.getRoundsCount().orElse(null));
	}

	private void applyExerciseFields(WorkoutExerciseEntryEntity entity, WorkoutExerciseEntry dto) {
		entity.setExerciseId(dto.getExerciseId().orElse(null));
		entity.setExerciseName(dto.getExerciseName());
		entity.setExerciseCategory(dto.getExerciseCategory().getValue());
		entity.setExerciseKind(dto.getExerciseKind().getValue());
		entity.setOrderIndex(dto.getOrderIndex());
		entity.setSupersetGroup(dto.getSupersetGroup().orElse(null));
	}

	private void applySetFields(WorkoutSetEntryEntity entity, WorkoutSetEntry dto) {
		entity.setSetNumber(dto.getSetNumber());
		entity.setSetType(dto.getSetType().getValue());
		entity.setReps(dto.getReps().orElse(null));
		entity.setWeightKg(dto.getWeightKg().orElse(null));
		entity.setHoldTimeSeconds(dto.getHoldTimeSeconds().orElse(null));
		entity.setEdgeSizeMm(dto.getEdgeSizeMm().orElse(null));
		entity.setDistanceMeters(dto.getDistanceMeters().orElse(null));
		entity.setRestTimeSeconds(dto.getRestTimeSeconds().orElse(null));
		entity.setCompleted(Boolean.TRUE.equals(dto.getIsCompleted()));
		entity.setOrderIndex(dto.getOrderIndex());
	}

	private WorkoutSession toDto(WorkoutSessionEntity entity) {
		List<WorkoutExerciseEntryEntity> exercises = exerciseRepository.findBySessionId(entity.getId());
		Map<UUID, List<WorkoutSetEntryEntity>> setsByExercise = setsByExerciseFor(
				exercises.stream().map(WorkoutExerciseEntryEntity::getId).toList());
		return toDto(entity, exercises, setsByExercise);
	}

	private WorkoutSession toDto(WorkoutSessionEntity entity, List<WorkoutExerciseEntryEntity> exercises,
			Map<UUID, List<WorkoutSetEntryEntity>> setsByExercise) {
		List<WorkoutExerciseEntry> exerciseDtos = exercises.stream()
				.map(exercise -> exerciseMapper.toDto(exercise, setsByExercise.getOrDefault(exercise.getId(), List.of()).stream()
						.map(setMapper::toDto).toList()))
				.toList();
		return mapper.toDto(entity, exerciseDtos);
	}

	private Map<UUID, List<WorkoutSetEntryEntity>> setsByExerciseFor(List<UUID> exerciseEntryIds) {
		return setRepository.findByExerciseEntryIdIn(exerciseEntryIds).stream()
				.collect(Collectors.groupingBy(WorkoutSetEntryEntity::getExerciseEntryId));
	}

	private static WorkoutSessionEntity requireOwner(WorkoutSessionEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such workout session");
		}
		return entity;
	}
}
