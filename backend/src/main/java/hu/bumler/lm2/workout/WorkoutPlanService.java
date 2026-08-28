package hu.bumler.lm2.workout;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.WorkoutPlan;
import hu.bumler.lm2.api.model.WorkoutPlanExercise;
import hu.bumler.lm2.api.model.WorkoutPlanSet;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Heti terv.md — per-user training templates. Nested aggregate PUT like
 * {@link WorkoutSessionService}, three levels deep: WorkoutPlan → WorkoutPlanExercise →
 * WorkoutPlanSet, all committed atomically in one {@code @Transactional} method whose response echoes
 * every row (live or tombstoned). {@code active} is a plain field on the tree — no dedicated
 * activate/deactivate endpoint.
 */
@Service
class WorkoutPlanService {

	private final WorkoutPlanRepository repository;
	private final WorkoutPlanExerciseRepository exerciseRepository;
	private final WorkoutPlanSetRepository setRepository;
	private final WorkoutPlanMapper mapper;
	private final WorkoutPlanExerciseMapper exerciseMapper;
	private final WorkoutPlanSetMapper setMapper;

	WorkoutPlanService(WorkoutPlanRepository repository, WorkoutPlanExerciseRepository exerciseRepository,
			WorkoutPlanSetRepository setRepository, WorkoutPlanMapper mapper, WorkoutPlanExerciseMapper exerciseMapper,
			WorkoutPlanSetMapper setMapper) {
		this.repository = repository;
		this.exerciseRepository = exerciseRepository;
		this.setRepository = setRepository;
		this.mapper = mapper;
		this.exerciseMapper = exerciseMapper;
		this.setMapper = setMapper;
	}

	@Transactional(readOnly = true)
	List<WorkoutPlan> list(UUID userId) {
		List<WorkoutPlanEntity> plans = repository.findByUserIdAndDeletedFalseOrderByCreatedAtAsc(userId);
		Map<UUID, List<WorkoutPlanExerciseEntity>> exercisesByPlan = exerciseRepository
				.findByPlanIdIn(plans.stream().map(WorkoutPlanEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WorkoutPlanExerciseEntity::getPlanId));
		Map<UUID, List<WorkoutPlanSetEntity>> setsByExercise = setsByExerciseFor(exercisesByPlan.values().stream()
				.flatMap(List::stream).map(WorkoutPlanExerciseEntity::getId).toList());
		return plans.stream()
				.map(plan -> toDto(plan, exercisesByPlan.getOrDefault(plan.getId(), List.of()), setsByExercise))
				.toList();
	}

	@Transactional(readOnly = true)
	WorkoutPlan get(UUID userId, UUID id) {
		WorkoutPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such workout plan"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	WorkoutPlan create(UUID userId, WorkoutPlan dto) {
		WorkoutPlanEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new WorkoutPlanEntity(dto.getId(), userId));
		if (entity.isDeleted()) {
			entity.undelete();
		}
		return saveTree(entity, dto);
	}

	@Transactional
	WorkoutPlan update(UUID userId, UUID id, WorkoutPlan dto) {
		WorkoutPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such workout plan"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Workout plan already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live exercise line and target set on the plan. */
	@Transactional
	WorkoutPlan delete(UUID userId, UUID id) {
		WorkoutPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such workout plan"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (WorkoutPlanExerciseEntity exercise : exerciseRepository.findByPlanIdAndDeletedFalse(id)) {
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
	 * list (and each exercise's {@code targetSets}) is the complete desired live tree — presence/absence
	 * by id is the only signal. Rows missing from the incoming list are soft-deleted; the response
	 * always lists every row, live or tombstoned (WorkoutPlan.yaml).
	 */
	private WorkoutPlan saveTree(WorkoutPlanEntity entity, WorkoutPlan dto) {
		applyPlanFields(entity, dto);
		repository.saveAndFlush(entity);

		List<WorkoutPlanExerciseEntity> existingExercises = exerciseRepository.findByPlanId(entity.getId());
		Set<UUID> incomingExerciseIds = new HashSet<>();
		for (WorkoutPlanExercise exerciseDto : dto.getExercises()) {
			if (exerciseDto.getDeleted()) {
				continue;
			}
			incomingExerciseIds.add(exerciseDto.getId());
			WorkoutPlanExerciseEntity exerciseEntity = resolveExercise(entity.getId(), existingExercises, exerciseDto.getId());
			applyExerciseFields(exerciseEntity, exerciseDto);
			exerciseRepository.save(exerciseEntity);
			saveSets(exerciseEntity.getId(), exerciseDto.getTargetSets());
		}
		for (WorkoutPlanExerciseEntity existing : existingExercises) {
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

	private void saveSets(UUID planExerciseId, List<WorkoutPlanSet> setDtos) {
		List<WorkoutPlanSetEntity> existingSets = setRepository.findByPlanExerciseId(planExerciseId);
		Set<UUID> incomingSetIds = new HashSet<>();
		for (WorkoutPlanSet setDto : setDtos) {
			if (setDto.getDeleted()) {
				continue;
			}
			incomingSetIds.add(setDto.getId());
			WorkoutPlanSetEntity setEntity = resolveSet(planExerciseId, existingSets, setDto.getId());
			applySetFields(setEntity, setDto);
			setRepository.save(setEntity);
		}
		for (WorkoutPlanSetEntity existing : existingSets) {
			if (!existing.isDeleted() && !incomingSetIds.contains(existing.getId())) {
				existing.softDelete();
				setRepository.save(existing);
			}
		}
	}

	private void softDeleteLiveSets(UUID planExerciseId) {
		for (WorkoutPlanSetEntity set : setRepository.findByPlanExerciseId(planExerciseId)) {
			if (!set.isDeleted()) {
				set.softDelete();
				setRepository.save(set);
			}
		}
	}

	/** See {@link NestedChildResolver} — shared with MealService.resolveItem / WorkoutSessionService.resolveExercise. */
	private WorkoutPlanExerciseEntity resolveExercise(UUID planId, List<WorkoutPlanExerciseEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, WorkoutPlanExerciseEntity::getId, WorkoutPlanExerciseEntity::isDeleted,
				WorkoutPlanExerciseEntity::undelete, exerciseRepository::existsById,
				() -> new WorkoutPlanExerciseEntity(id, planId), "No such workout plan exercise");
	}

	private WorkoutPlanSetEntity resolveSet(UUID planExerciseId, List<WorkoutPlanSetEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, WorkoutPlanSetEntity::getId, WorkoutPlanSetEntity::isDeleted,
				WorkoutPlanSetEntity::undelete, setRepository::existsById,
				() -> new WorkoutPlanSetEntity(id, planExerciseId), "No such workout plan set");
	}

	private void applyPlanFields(WorkoutPlanEntity entity, WorkoutPlan dto) {
		entity.setName(dto.getName());
		entity.setNotes(dto.getNotes().orElse(null));
		entity.setActive(Boolean.TRUE.equals(dto.getActive()));
		entity.setGoalLabel(dto.getGoalLabel().orElse(null));
		WorkoutPlan.DefaultWorkoutTypeEnum type = dto.getDefaultWorkoutType().orElse(null);
		entity.setDefaultWorkoutType(type == null ? null : type.getValue());
	}

	private void applyExerciseFields(WorkoutPlanExerciseEntity entity, WorkoutPlanExercise dto) {
		entity.setExerciseId(dto.getExerciseId());
		entity.setExerciseName(dto.getExerciseName());
		entity.setExerciseCategory(dto.getExerciseCategory().getValue());
		entity.setExerciseKind(dto.getExerciseKind().getValue());
		entity.setOrderIndex(dto.getOrderIndex());
		entity.setSupersetGroup(dto.getSupersetGroup().orElse(null));
	}

	private void applySetFields(WorkoutPlanSetEntity entity, WorkoutPlanSet dto) {
		entity.setSetType(dto.getSetType().getValue());
		entity.setReps(dto.getReps().orElse(null));
		entity.setWeightKg(dto.getWeightKg().orElse(null));
		entity.setHoldTimeSeconds(dto.getHoldTimeSeconds().orElse(null));
		entity.setEdgeSizeMm(dto.getEdgeSizeMm().orElse(null));
		entity.setDistanceMeters(dto.getDistanceMeters().orElse(null));
		entity.setRestTimeSeconds(dto.getRestTimeSeconds().orElse(null));
		entity.setOrderIndex(dto.getOrderIndex());
	}

	private WorkoutPlan toDto(WorkoutPlanEntity entity) {
		List<WorkoutPlanExerciseEntity> exercises = exerciseRepository.findByPlanId(entity.getId());
		Map<UUID, List<WorkoutPlanSetEntity>> setsByExercise = setsByExerciseFor(
				exercises.stream().map(WorkoutPlanExerciseEntity::getId).toList());
		return toDto(entity, exercises, setsByExercise);
	}

	private WorkoutPlan toDto(WorkoutPlanEntity entity, List<WorkoutPlanExerciseEntity> exercises,
			Map<UUID, List<WorkoutPlanSetEntity>> setsByExercise) {
		List<WorkoutPlanExercise> exerciseDtos = exercises.stream()
				.map(exercise -> exerciseMapper.toDto(exercise, setsByExercise.getOrDefault(exercise.getId(), List.of()).stream()
						.map(setMapper::toDto).toList()))
				.toList();
		return mapper.toDto(entity, exerciseDtos);
	}

	private Map<UUID, List<WorkoutPlanSetEntity>> setsByExerciseFor(List<UUID> planExerciseIds) {
		return setRepository.findByPlanExerciseIdIn(planExerciseIds).stream()
				.collect(Collectors.groupingBy(WorkoutPlanSetEntity::getPlanExerciseId));
	}

	private static WorkoutPlanEntity requireOwner(WorkoutPlanEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such workout plan");
		}
		return entity;
	}
}
