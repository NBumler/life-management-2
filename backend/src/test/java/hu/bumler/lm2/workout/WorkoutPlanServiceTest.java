package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.WorkoutPlan;
import hu.bumler.lm2.api.model.WorkoutPlanExercise;
import hu.bumler.lm2.api.model.WorkoutPlanSet;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). Tree-diff over a real DB is covered by WorkoutPlanIntegrationTest. */
class WorkoutPlanServiceTest {

	private WorkoutPlanRepository repository;
	private WorkoutPlanExerciseRepository exerciseRepository;
	private WorkoutPlanSetRepository setRepository;
	private WorkoutPlanService service;

	@BeforeEach
	void setUp() {
		repository = mock(WorkoutPlanRepository.class);
		exerciseRepository = mock(WorkoutPlanExerciseRepository.class);
		setRepository = mock(WorkoutPlanSetRepository.class);
		service = new WorkoutPlanService(repository, exerciseRepository, setRepository, new WorkoutPlanMapper(),
				new WorkoutPlanExerciseMapper(), new WorkoutPlanSetMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(exerciseRepository.findByPlanIdIn(any())).thenReturn(List.of());
		when(setRepository.findByPlanExerciseIdIn(any())).thenReturn(List.of());
		when(setRepository.findByPlanExerciseId(any())).thenReturn(List.of());
	}

	private static WorkoutPlanEntity planEntity(UUID id, UUID userId) {
		WorkoutPlanEntity entity = new WorkoutPlanEntity(id, userId);
		entity.setName("Felsőtest A");
		entity.setActive(true);
		return entity;
	}

	private static WorkoutPlanExerciseEntity exerciseEntity(UUID id, UUID planId) {
		WorkoutPlanExerciseEntity entity = new WorkoutPlanExerciseEntity(id, planId);
		entity.setExerciseId(UUID.randomUUID());
		entity.setExerciseName("Fekvenyomás");
		entity.setExerciseCategory("CHEST");
		entity.setExerciseKind("WEIGHTED_REPS");
		return entity;
	}

	private static WorkoutPlanSetEntity setEntity(UUID id, UUID planExerciseId) {
		WorkoutPlanSetEntity entity = new WorkoutPlanSetEntity(id, planExerciseId);
		entity.setSetType("WORKING");
		return entity;
	}

	private static WorkoutPlan plan(UUID id, List<WorkoutPlanExercise> exercises) {
		return new WorkoutPlan(id, "Felsőtest A", true, exercises, false);
	}

	private static WorkoutPlanExercise exercise(UUID id, UUID planId, int orderIndex, List<WorkoutPlanSet> targetSets) {
		return new WorkoutPlanExercise(id, planId, UUID.randomUUID(), "Fekvenyomás",
				WorkoutPlanExercise.ExerciseCategoryEnum.CHEST, WorkoutPlanExercise.ExerciseKindEnum.WEIGHTED_REPS, orderIndex,
				targetSets, false);
	}

	private static WorkoutPlanSet set(UUID id, UUID planExerciseId, int orderIndex) {
		return new WorkoutPlanSet(id, planExerciseId, WorkoutPlanSet.SetTypeEnum.WORKING, orderIndex, false);
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewPlan_withExerciseAndTargetSetTree() {
		UUID userId = UUID.randomUUID();
		UUID planId = UUID.randomUUID();
		UUID exerciseId = UUID.randomUUID();
		UUID setId = UUID.randomUUID();
		when(repository.findById(planId)).thenReturn(Optional.empty());
		when(exerciseRepository.findByPlanId(planId)).thenReturn(List.of());

		WorkoutPlan dto = plan(planId, List.of(exercise(exerciseId, planId, 0, List.of(set(setId, exerciseId, 0)))));
		WorkoutPlan saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(planId);
		ArgumentCaptor<WorkoutPlanEntity> planCaptor = ArgumentCaptor.forClass(WorkoutPlanEntity.class);
		verify(repository).saveAndFlush(planCaptor.capture());
		assertThat(planCaptor.getValue().getUserId()).isEqualTo(userId);
		assertThat(planCaptor.getValue().isActive()).isTrue();

		ArgumentCaptor<WorkoutPlanExerciseEntity> exerciseCaptor = ArgumentCaptor.forClass(WorkoutPlanExerciseEntity.class);
		verify(exerciseRepository).save(exerciseCaptor.capture());
		assertThat(exerciseCaptor.getValue().getId()).isEqualTo(exerciseId);

		ArgumentCaptor<WorkoutPlanSetEntity> setCaptor = ArgumentCaptor.forClass(WorkoutPlanSetEntity.class);
		verify(setRepository).save(setCaptor.capture());
		assertThat(setCaptor.getValue().getId()).isEqualTo(setId);
		assertThat(setCaptor.getValue().getPlanExerciseId()).isEqualTo(exerciseId);
	}

	@Test
	void create_rejectsForeignPlan_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, plan(existing.getId(), List.of())))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_revivesTombstonedPlan_whenPostedAgain() {
		UUID userId = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
		when(exerciseRepository.findByPlanId(existing.getId())).thenReturn(List.of());

		WorkoutPlan revived = service.create(userId, plan(existing.getId(), List.of()));

		assertThat(existing.isDeleted()).isFalse();
		assertThat(revived.getDeleted()).isFalse();
	}

	// --- update: tree diff + active toggle ---

	@Test
	void update_addsExercise_softDeletesMissingExercise_andCascadesToItsSets() {
		UUID userId = UUID.randomUUID();
		UUID planId = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(planId, userId);
		UUID keptExerciseId = UUID.randomUUID();
		UUID removedExerciseId = UUID.randomUUID();
		WorkoutPlanExerciseEntity kept = exerciseEntity(keptExerciseId, planId);
		WorkoutPlanExerciseEntity removed = exerciseEntity(removedExerciseId, planId);
		WorkoutPlanSetEntity removedSet = setEntity(UUID.randomUUID(), removedExerciseId);

		when(repository.findByIdAndUserId(planId, userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findByPlanId(planId)).thenReturn(List.of(kept, removed));
		when(setRepository.findByPlanExerciseId(removedExerciseId)).thenReturn(List.of(removedSet));

		UUID addedExerciseId = UUID.randomUUID();
		WorkoutPlan dto = plan(planId,
				List.of(exercise(keptExerciseId, planId, 0, List.of()), exercise(addedExerciseId, planId, 1, List.of())));
		service.update(userId, planId, dto);

		assertThat(removed.isDeleted()).isTrue();
		assertThat(removedSet.isDeleted()).isTrue();
		ArgumentCaptor<WorkoutPlanExerciseEntity> captor = ArgumentCaptor.forClass(WorkoutPlanExerciseEntity.class);
		verify(exerciseRepository, times(3)).save(captor.capture());
		assertThat(captor.getAllValues()).anySatisfy(e -> assertThat(e.getId()).isEqualTo(addedExerciseId));
	}

	@Test
	void update_revivesTombstonedSet_whenItsIdReappearsInIncomingLiveList() {
		UUID userId = UUID.randomUUID();
		UUID planId = UUID.randomUUID();
		UUID exerciseId = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(planId, userId);
		WorkoutPlanExerciseEntity exerciseEntity = exerciseEntity(exerciseId, planId);
		WorkoutPlanSetEntity tombstonedSet = setEntity(UUID.randomUUID(), exerciseId);
		tombstonedSet.softDelete();

		when(repository.findByIdAndUserId(planId, userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findByPlanId(planId)).thenReturn(List.of(exerciseEntity));
		when(setRepository.findByPlanExerciseId(exerciseId)).thenReturn(List.of(tombstonedSet));

		WorkoutPlan dto = plan(planId,
				List.of(exercise(exerciseId, planId, 0, List.of(set(tombstonedSet.getId(), exerciseId, 0)))));
		service.update(userId, planId, dto);

		assertThat(tombstonedSet.isDeleted()).isFalse();
		verify(setRepository).save(tombstonedSet);
	}

	@Test
	void update_persistsTheActiveFlag_throughTheOrdinaryTreePut() {
		UUID userId = UUID.randomUUID();
		UUID planId = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(planId, userId);
		when(repository.findByIdAndUserId(planId, userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findByPlanId(planId)).thenReturn(List.of());

		WorkoutPlan dto = plan(planId, List.of());
		dto.active(false);
		service.update(userId, planId, dto);

		assertThat(existing.isActive()).isFalse();
	}

	@Test
	void update_throwsEntityDeleted_whenPlanAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), plan(existing.getId(), List.of())))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenPlanBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesPlan_andCascadesToLiveExercisesAndSets() {
		UUID userId = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(UUID.randomUUID(), userId);
		WorkoutPlanExerciseEntity exercise = exerciseEntity(UUID.randomUUID(), existing.getId());
		WorkoutPlanSetEntity set = setEntity(UUID.randomUUID(), exercise.getId());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findByPlanIdAndDeletedFalse(existing.getId())).thenReturn(List.of(exercise));
		when(exerciseRepository.findByPlanId(existing.getId())).thenReturn(List.of(exercise));
		when(setRepository.findByPlanExerciseId(exercise.getId())).thenReturn(List.of(set));

		WorkoutPlan deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(exercise.isDeleted()).isTrue();
		assertThat(set.isDeleted()).isTrue();
		verify(exerciseRepository).save(exercise);
		verify(setRepository).save(set);
	}

	@Test
	void delete_isIdempotent_whenPlanAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WorkoutPlanEntity existing = planEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findByPlanId(existing.getId())).thenReturn(List.of());

		WorkoutPlan deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(exerciseRepository, never()).findByPlanIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedPlansForUser() {
		UUID userId = UUID.randomUUID();
		WorkoutPlanEntity p1 = planEntity(UUID.randomUUID(), userId);
		WorkoutPlanEntity p2 = planEntity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByCreatedAtAsc(userId)).thenReturn(List.of(p1, p2));

		List<WorkoutPlan> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(WorkoutPlan::getId).containsExactly(p1.getId(), p2.getId());
	}
}
