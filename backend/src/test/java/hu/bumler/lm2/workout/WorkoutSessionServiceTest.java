package hu.bumler.lm2.workout;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.WorkoutExerciseEntry;
import hu.bumler.lm2.api.model.WorkoutSession;
import hu.bumler.lm2.api.model.WorkoutSetEntry;
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

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). Tree-diff over a real DB is covered by WorkoutSessionIntegrationTest. */
class WorkoutSessionServiceTest {

	private static final LocalDate DATE = LocalDate.parse("2026-08-28");

	private WorkoutSessionRepository repository;
	private WorkoutExerciseEntryRepository exerciseRepository;
	private WorkoutSetEntryRepository setRepository;
	private WorkoutSessionService service;

	@BeforeEach
	void setUp() {
		repository = mock(WorkoutSessionRepository.class);
		exerciseRepository = mock(WorkoutExerciseEntryRepository.class);
		setRepository = mock(WorkoutSetEntryRepository.class);
		service = new WorkoutSessionService(repository, exerciseRepository, setRepository, new WorkoutSessionMapper(),
				new WorkoutExerciseEntryMapper(), new WorkoutSetEntryMapper());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		when(exerciseRepository.findBySessionIdIn(any())).thenReturn(List.of());
		when(setRepository.findByExerciseEntryIdIn(any())).thenReturn(List.of());
		when(setRepository.findByExerciseEntryId(any())).thenReturn(List.of());
	}

	private static WorkoutSessionEntity sessionEntity(UUID id, UUID userId) {
		WorkoutSessionEntity entity = new WorkoutSessionEntity(id, userId);
		entity.setDate(DATE);
		entity.setWorkoutType("GENERAL_WEIGHTS");
		return entity;
	}

	/** A persisted-shaped exercise entry — its snapshot columns are NOT NULL in the DB, so the mapper needs them set. */
	private static WorkoutExerciseEntryEntity exerciseEntity(UUID id, UUID sessionId) {
		WorkoutExerciseEntryEntity entity = new WorkoutExerciseEntryEntity(id, sessionId);
		entity.setExerciseName("Fekvenyomás");
		entity.setExerciseCategory("CHEST");
		entity.setExerciseKind("WEIGHTED_REPS");
		return entity;
	}

	/** A persisted-shaped set entry — set_type is NOT NULL in the DB. */
	private static WorkoutSetEntryEntity setEntity(UUID id, UUID exerciseEntryId) {
		WorkoutSetEntryEntity entity = new WorkoutSetEntryEntity(id, exerciseEntryId);
		entity.setSetType("WORKING");
		return entity;
	}

	private static WorkoutSession session(UUID id, List<WorkoutExerciseEntry> exercises) {
		return new WorkoutSession(id, DATE, WorkoutSession.WorkoutTypeEnum.GENERAL_WEIGHTS, exercises, false);
	}

	private static WorkoutExerciseEntry exercise(UUID id, UUID sessionId, int orderIndex, List<WorkoutSetEntry> sets) {
		return new WorkoutExerciseEntry(id, sessionId, "Fekvenyomás", WorkoutExerciseEntry.ExerciseCategoryEnum.CHEST,
				WorkoutExerciseEntry.ExerciseKindEnum.WEIGHTED_REPS, orderIndex, sets, false);
	}

	private static WorkoutSetEntry set(UUID id, UUID exerciseEntryId, int setNumber) {
		return new WorkoutSetEntry(id, exerciseEntryId, setNumber, WorkoutSetEntry.SetTypeEnum.WORKING, true, setNumber - 1, false);
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewSession_withExerciseAndSetTree() {
		UUID userId = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		UUID exerciseId = UUID.randomUUID();
		UUID setId = UUID.randomUUID();
		when(repository.findById(sessionId)).thenReturn(Optional.empty());
		when(exerciseRepository.findBySessionId(sessionId)).thenReturn(List.of());

		WorkoutSession dto = session(sessionId, List.of(exercise(exerciseId, sessionId, 0, List.of(set(setId, exerciseId, 1)))));
		WorkoutSession saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(sessionId);
		ArgumentCaptor<WorkoutSessionEntity> sessionCaptor = ArgumentCaptor.forClass(WorkoutSessionEntity.class);
		verify(repository).saveAndFlush(sessionCaptor.capture());
		assertThat(sessionCaptor.getValue().getUserId()).isEqualTo(userId);

		ArgumentCaptor<WorkoutExerciseEntryEntity> exerciseCaptor = ArgumentCaptor.forClass(WorkoutExerciseEntryEntity.class);
		verify(exerciseRepository).save(exerciseCaptor.capture());
		assertThat(exerciseCaptor.getValue().getId()).isEqualTo(exerciseId);
		assertThat(exerciseCaptor.getValue().getExerciseName()).isEqualTo("Fekvenyomás");

		ArgumentCaptor<WorkoutSetEntryEntity> setCaptor = ArgumentCaptor.forClass(WorkoutSetEntryEntity.class);
		verify(setRepository).save(setCaptor.capture());
		assertThat(setCaptor.getValue().getId()).isEqualTo(setId);
		assertThat(setCaptor.getValue().getExerciseEntryId()).isEqualTo(exerciseId);
	}

	@Test
	void create_rejectsForeignSession_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		WorkoutSessionEntity existing = sessionEntity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, session(existing.getId(), List.of())))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update: tree diff ---

	@Test
	void update_addsExercise_softDeletesMissingExercise_andCascadesToItsSets() {
		UUID userId = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		WorkoutSessionEntity existing = sessionEntity(sessionId, userId);
		UUID keptExerciseId = UUID.randomUUID();
		UUID removedExerciseId = UUID.randomUUID();
		WorkoutExerciseEntryEntity kept = exerciseEntity(keptExerciseId, sessionId);
		WorkoutExerciseEntryEntity removed = exerciseEntity(removedExerciseId, sessionId);
		WorkoutSetEntryEntity removedSet = setEntity(UUID.randomUUID(), removedExerciseId);

		when(repository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findBySessionId(sessionId)).thenReturn(List.of(kept, removed));
		when(setRepository.findByExerciseEntryId(removedExerciseId)).thenReturn(List.of(removedSet));

		UUID addedExerciseId = UUID.randomUUID();
		WorkoutSession dto = session(sessionId,
				List.of(exercise(keptExerciseId, sessionId, 0, List.of()), exercise(addedExerciseId, sessionId, 1, List.of())));
		service.update(userId, sessionId, dto);

		assertThat(removed.isDeleted()).isTrue();
		assertThat(removedSet.isDeleted()).isTrue();
		ArgumentCaptor<WorkoutExerciseEntryEntity> captor = ArgumentCaptor.forClass(WorkoutExerciseEntryEntity.class);
		verify(exerciseRepository, times(3)).save(captor.capture());
		assertThat(captor.getAllValues()).anySatisfy(e -> assertThat(e.getId()).isEqualTo(addedExerciseId));
	}

	@Test
	void update_revivesTombstonedSet_whenItsIdReappearsInIncomingLiveList() {
		UUID userId = UUID.randomUUID();
		UUID sessionId = UUID.randomUUID();
		UUID exerciseId = UUID.randomUUID();
		WorkoutSessionEntity existing = sessionEntity(sessionId, userId);
		WorkoutExerciseEntryEntity exerciseEntity = exerciseEntity(exerciseId, sessionId);
		WorkoutSetEntryEntity tombstonedSet = setEntity(UUID.randomUUID(), exerciseId);
		tombstonedSet.softDelete();

		when(repository.findByIdAndUserId(sessionId, userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findBySessionId(sessionId)).thenReturn(List.of(exerciseEntity));
		when(setRepository.findByExerciseEntryId(exerciseId)).thenReturn(List.of(tombstonedSet));

		WorkoutSession dto = session(sessionId,
				List.of(exercise(exerciseId, sessionId, 0, List.of(set(tombstonedSet.getId(), exerciseId, 1)))));
		service.update(userId, sessionId, dto);

		assertThat(tombstonedSet.isDeleted()).isFalse();
		verify(setRepository).save(tombstonedSet);
	}

	@Test
	void update_throwsEntityDeleted_whenSessionAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WorkoutSessionEntity existing = sessionEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), session(existing.getId(), List.of())))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenSessionBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, cascading, idempotent) ---

	@Test
	void delete_softDeletesSession_andCascadesToLiveExercisesAndSets() {
		UUID userId = UUID.randomUUID();
		WorkoutSessionEntity existing = sessionEntity(UUID.randomUUID(), userId);
		WorkoutExerciseEntryEntity exercise = exerciseEntity(UUID.randomUUID(), existing.getId());
		WorkoutSetEntryEntity set = setEntity(UUID.randomUUID(), exercise.getId());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findBySessionIdAndDeletedFalse(existing.getId())).thenReturn(List.of(exercise));
		when(exerciseRepository.findBySessionId(existing.getId())).thenReturn(List.of(exercise));
		when(setRepository.findByExerciseEntryId(exercise.getId())).thenReturn(List.of(set));

		WorkoutSession deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		assertThat(exercise.isDeleted()).isTrue();
		assertThat(set.isDeleted()).isTrue();
		verify(exerciseRepository).save(exercise);
		verify(setRepository).save(set);
	}

	@Test
	void delete_isIdempotent_whenSessionAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		WorkoutSessionEntity existing = sessionEntity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(exerciseRepository.findBySessionId(existing.getId())).thenReturn(List.of());

		WorkoutSession deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
		verify(exerciseRepository, never()).findBySessionIdAndDeletedFalse(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedSessionsForUser() {
		UUID userId = UUID.randomUUID();
		WorkoutSessionEntity s1 = sessionEntity(UUID.randomUUID(), userId);
		WorkoutSessionEntity s2 = sessionEntity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(userId)).thenReturn(List.of(s1, s2));

		List<WorkoutSession> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(WorkoutSession::getId).containsExactly(s1.getId(), s2.getId());
	}
}
