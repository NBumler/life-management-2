package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.Gym;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class GymServiceTest {

	private GymRepository repository;
	private GymService service;

	@BeforeEach
	void setUp() {
		repository = mock(GymRepository.class);
		service = new GymService(repository, new GymMapper());
	}

	private static Gym dto(UUID id, String name) {
		return new Gym(id, name, List.of(Gym.DisciplinesEnum.BOULDER), false);
	}

	private static GymEntity entity(UUID id, UUID userId, String name) {
		GymEntity entity = new GymEntity(id, userId);
		entity.rename(name, name.toLowerCase());
		entity.setDisciplines(List.of("BOULDER"));
		return entity;
	}

	@Test
	void create_insertsNewGym_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(any(), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Gym input = dto(id, "Mászócentrum");
		input.setDisciplines(List.of(Gym.DisciplinesEnum.BOULDER, Gym.DisciplinesEnum.ROPE));
		input.defaultWallHeightMeters(14.0);
		input.availableSafetyStyles(List.of(Gym.AvailableSafetyStylesEnum.TOPROPE, Gym.AvailableSafetyStylesEnum.LEAD));

		Gym saved = service.create(userId, input);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getDisciplines()).containsExactly(Gym.DisciplinesEnum.BOULDER, Gym.DisciplinesEnum.ROPE);
		assertThat(saved.getDefaultWallHeightMeters().orElse(null)).isEqualTo(14.0);
		assertThat(saved.getAvailableSafetyStyles().orElse(null))
				.containsExactly(Gym.AvailableSafetyStylesEnum.TOPROPE, Gym.AvailableSafetyStylesEnum.LEAD);
	}

	@Test
	void create_rejectsForeignGym_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		GymEntity existing = entity(UUID.randomUUID(), owner, "Owner Gym");
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), "Attacker Gym")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_returnsUniqueViolationWithConflictingId_whenNameAlreadyLive() {
		UUID userId = UUID.randomUUID();
		GymEntity live = entity(UUID.randomUUID(), userId, "Fal Klub");
		UUID newId = UUID.randomUUID();
		when(repository.findById(newId)).thenReturn(Optional.empty());
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, "fal klub")).thenReturn(Optional.of(live));

		assertThatThrownBy(() -> service.create(userId, dto(newId, "Fal Klub")))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("name");
					assertThat(uve.getConflictingId()).isEqualTo(live.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsEntityDeleted_whenGymAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		GymEntity existing = entity(UUID.randomUUID(), userId, "Old");
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId(), "Old")))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_clearsOptionalFields_whenOmitted() {
		UUID userId = UUID.randomUUID();
		GymEntity existing = entity(UUID.randomUUID(), userId, "Gym");
		existing.setAddress("Fő utca 1");
		existing.setDefaultWallHeightMeters(12.0);
		existing.setAvailableSafetyStyles(List.of("LEAD"));
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.findByUserIdAndNameNormalizedAndDeletedFalse(any(), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Gym updated = service.update(userId, existing.getId(), dto(existing.getId(), "Gym"));

		assertThat(updated.getAddress().orElse(null)).isNull();
		assertThat(updated.getDefaultWallHeightMeters().orElse(null)).isNull();
		assertThat(updated.getAvailableSafetyStyles().orElse(null)).isNull();
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		GymEntity existing = entity(UUID.randomUUID(), userId, "Gym");
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);

		service.delete(userId, existing.getId());
		verify(repository).saveAndFlush(existing); // still only once
	}

	@Test
	void list_returnsMappedGymsForUser() {
		UUID userId = UUID.randomUUID();
		GymEntity e1 = entity(UUID.randomUUID(), userId, "A");
		GymEntity e2 = entity(UUID.randomUUID(), userId, "B");
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<Gym> result = service.list(userId);

		assertThat(result).extracting(Gym::getId).containsExactly(e1.getId(), e2.getId());
	}
}
