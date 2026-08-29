package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.IndoorRoute;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class IndoorRouteServiceTest {

	private IndoorRouteRepository repository;
	private IndoorRouteService service;

	@BeforeEach
	void setUp() {
		repository = mock(IndoorRouteRepository.class);
		service = new IndoorRouteService(repository, new IndoorRouteMapper());
	}

	private static IndoorRoute dto(UUID id, UUID gymId, String name) {
		return new IndoorRoute(id, gymId, name, IndoorRoute.DisciplineEnum.ROPE, "7A", 50, false);
	}

	private static IndoorRouteEntity entity(UUID id, UUID userId, UUID gymId) {
		IndoorRouteEntity e = new IndoorRouteEntity(id, userId, gymId);
		e.setName("Sárga sáv 3");
		e.setDiscipline("ROPE");
		e.setGrade("6C");
		e.setAbsoluteDifficultyIndex(44);
		e.setSector("Bal fal");
		return e;
	}

	@Test
	void create_insertsNewRoute_withSector() {
		UUID userId = UUID.randomUUID();
		UUID gymId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		IndoorRoute input = dto(id, gymId, "Overhang line");
		input.sector("Jobb szektor");

		IndoorRoute saved = service.create(userId, input);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getGymId()).isEqualTo(gymId);
		assertThat(saved.getDiscipline()).isEqualTo(IndoorRoute.DisciplineEnum.ROPE);
		assertThat(saved.getSector().orElse(null)).isEqualTo("Jobb szektor");
	}

	@Test
	void create_rejectsForeignRoute_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		IndoorRouteEntity existing = entity(UUID.randomUUID(), owner, UUID.randomUUID());
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), existing.getGymId(), "x")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_clearsSector_whenOmitted() {
		UUID userId = UUID.randomUUID();
		IndoorRouteEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		IndoorRoute updated = service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getGymId(), "renamed"));

		assertThat(updated.getSector().orElse(null)).isNull();
	}

	@Test
	void update_throwsEntityDeleted_whenRouteAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		IndoorRouteEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getGymId(), "x"))).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		IndoorRouteEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		service.delete(userId, existing.getId());
		verify(repository).saveAndFlush(existing); // only once
	}

	@Test
	void list_returnsMappedRoutesForUser() {
		UUID userId = UUID.randomUUID();
		IndoorRouteEntity e1 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		IndoorRouteEntity e2 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<IndoorRoute> result = service.list(userId);

		assertThat(result).extracting(IndoorRoute::getId).containsExactly(e1.getId(), e2.getId());
	}
}
