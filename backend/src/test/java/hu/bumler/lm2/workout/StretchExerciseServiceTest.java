package hu.bumler.lm2.workout;

import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.StretchExercise;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). backlog/167. */
class StretchExerciseServiceTest {

	private StretchExerciseRepository repository;
	private StretchExerciseService service;

	@BeforeEach
	void setUp() {
		repository = mock(StretchExerciseRepository.class);
		service = new StretchExerciseService(repository, new StretchExerciseMapper());
	}

	private static StretchExercise dto(UUID id, String name) {
		return new StretchExercise(id, name, StretchExercise.CategoryEnum.HIPS, false, 30, false, false);
	}

	@Test
	void create_insertsWithAllStretchFields_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		StretchExercise input = dto(id, "Csípőhajlító nyújtás");
		input.defaultHoldSeconds(45).defaultPerSide(true).isFavorite(true).equipment("Szőnyeg").description("Térdelő kitörés");
		StretchExercise saved = service.create(userId, input);

		assertThat(saved.getCategory()).isEqualTo(StretchExercise.CategoryEnum.HIPS);
		assertThat(saved.getDefaultHoldSeconds()).isEqualTo(45);
		assertThat(saved.getDefaultPerSide()).isTrue();
		assertThat(saved.getIsFavorite()).isTrue();
		assertThat(saved.getEquipment().get()).isEqualTo("Szőnyeg");
		assertThat(saved.getDescription().get()).isEqualTo("Térdelő kitörés");

		ArgumentCaptor<StretchExerciseEntity> captor = ArgumentCaptor.forClass(StretchExerciseEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		assertThat(captor.getValue().getNameNormalized()).isEqualTo("csípőhajlító nyújtás");
	}

	@Test
	void create_rejectsForeignRow_whenIdBelongsToAnotherUser() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.of(new StretchExerciseEntity(id, UUID.randomUUID())));

		assertThatThrownBy(() -> service.create(UUID.randomUUID(), dto(id, "Nyak nyújtás")))
				.isInstanceOf(EntityNotFoundException.class);
	}

	@Test
	void create_throwsUniqueViolation_whenAnotherLiveRowHasTheName() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		StretchExerciseEntity other = new StretchExerciseEntity(UUID.randomUUID(), userId);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(eq(userId), any())).thenReturn(Optional.of(other));

		assertThatThrownBy(() -> service.create(userId, dto(id, "Vádli nyújtás")))
				.isInstanceOf(UniqueViolationException.class);
	}

	@Test
	void update_throwsEntityDeleted_whenRowIsDeleted() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		StretchExerciseEntity entity = new StretchExerciseEntity(id, userId);
		entity.softDelete();
		when(repository.findByIdAndUserId(id, userId)).thenReturn(Optional.of(entity));

		assertThatThrownBy(() -> service.update(userId, id, dto(id, "Hát nyújtás")))
				.isInstanceOf(EntityDeletedException.class);
	}
}
