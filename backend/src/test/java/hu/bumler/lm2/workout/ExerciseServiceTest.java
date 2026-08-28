package hu.bumler.lm2.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.Exercise;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class ExerciseServiceTest {

	private ExerciseRepository repository;
	private ExerciseService service;

	@BeforeEach
	void setUp() {
		repository = mock(ExerciseRepository.class);
		service = new ExerciseService(repository, new ExerciseMapper());
	}

	private static Exercise dto(UUID id, String name) {
		return new Exercise(id, name, Exercise.CategoryEnum.CHEST, Exercise.KindEnum.WEIGHTED_REPS, false, false);
	}

	private static ExerciseEntity entity(UUID id, UUID userId) {
		ExerciseEntity entity = new ExerciseEntity(id, userId);
		entity.rename("Fekvenyomás", "fekvenyomás");
		entity.setCategory("CHEST");
		entity.setKind("WEIGHTED_REPS");
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewExercise_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Exercise input = dto(id, "Guggolás");
		input.category(Exercise.CategoryEnum.LEGS).kind(Exercise.KindEnum.WEIGHTED_REPS).defaultRestTimeSeconds(180).isFavorite(true)
				.equipment("Rúd + tárcsák");
		Exercise saved = service.create(userId, input);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Guggolás");
		assertThat(saved.getCategory()).isEqualTo(Exercise.CategoryEnum.LEGS);
		assertThat(saved.getDefaultRestTimeSeconds().get()).isEqualTo(180);
		assertThat(saved.getIsFavorite()).isTrue();

		ArgumentCaptor<ExerciseEntity> captor = ArgumentCaptor.forClass(ExerciseEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		assertThat(captor.getValue().getNameNormalized()).isEqualTo("guggolás");
		assertThat(captor.getValue().getKind()).isEqualTo("WEIGHTED_REPS");
	}

	@Test
	void create_rejectsForeignExercise_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		ExerciseEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), "Fekvenyomás")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsUniqueViolationWithConflictingId_whenNameAlreadyLiveForUser() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		ExerciseEntity conflict = entity(UUID.randomUUID(), userId);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "fekvenyomás")).thenReturn(Optional.of(conflict));

		assertThatThrownBy(() -> service.create(userId, dto(id, "Fekvenyomás")))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("name");
					assertThat(uve.getConflictingId()).isEqualTo(conflict.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	// --- update ---

	@Test
	void update_allowsKeepingItsOwnName_whenRenamingToTheSameValue() {
		UUID userId = UUID.randomUUID();
		ExerciseEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "fekvenyomás")).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Exercise saved = service.update(userId, existing.getId(), dto(existing.getId(), "Fekvenyomás"));

		assertThat(saved.getName()).isEqualTo("Fekvenyomás");
	}

	@Test
	void update_throwsEntityDeleted_whenExerciseAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		ExerciseEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId(), "Fekvenyomás")))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenExerciseBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenExerciseNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		ExerciseEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Exercise deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenExerciseAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		ExerciseEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		Exercise deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedExercisesForUser() {
		UUID userId = UUID.randomUUID();
		ExerciseEntity e1 = entity(UUID.randomUUID(), userId);
		ExerciseEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<Exercise> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(Exercise::getId).containsExactly(e1.getId(), e2.getId());
	}
}
