package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.Route;
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
class RouteServiceTest {

	private RouteRepository repository;
	private RouteService service;

	@BeforeEach
	void setUp() {
		repository = mock(RouteRepository.class);
		service = new RouteService(repository, new RouteMapper());
	}

	private static Route dto(UUID id, UUID sectorId, String name) {
		return new Route(id, sectorId, name, "7a", false);
	}

	private static RouteEntity entity(UUID id, UUID userId, UUID sectorId) {
		RouteEntity e = new RouteEntity(id, userId, sectorId);
		e.setName("Sárkányfészek");
		e.setGuidebookGrade("7b+");
		e.setLengthInMeters(28.0);
		e.setTotalPitches(1);
		e.setRockType("gránit");
		e.setAspect("nyugat");
		return e;
	}

	@Test
	void create_insertsNewRoute_withPrefillFields() {
		UUID userId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Route input = dto(id, sectorId, "Traverz");
		input.lengthInMeters(35.0);
		input.totalPitches(2);
		input.rockType("mészkő");
		input.aspect("kelet");

		Route saved = service.create(userId, input);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getSectorId()).isEqualTo(sectorId);
		assertThat(saved.getGuidebookGrade()).isEqualTo("7a");
		assertThat(saved.getLengthInMeters().orElse(null)).isEqualTo(35.0);
		assertThat(saved.getTotalPitches().orElse(null)).isEqualTo(2);
		assertThat(saved.getRockType().orElse(null)).isEqualTo("mészkő");
		assertThat(saved.getAspect().orElse(null)).isEqualTo("kelet");
	}

	@Test
	void create_rejectsForeignRoute_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		RouteEntity existing = entity(UUID.randomUUID(), owner, UUID.randomUUID());
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), existing.getSectorId(), "x")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_clearsOptionalPrefillFields_whenOmitted() {
		UUID userId = UUID.randomUUID();
		RouteEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Route updated = service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getSectorId(), "renamed"));

		assertThat(updated.getLengthInMeters().orElse(null)).isNull();
		assertThat(updated.getTotalPitches().orElse(null)).isNull();
		assertThat(updated.getRockType().orElse(null)).isNull();
		assertThat(updated.getAspect().orElse(null)).isNull();
	}

	@Test
	void update_throwsEntityDeleted_whenRouteAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		RouteEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getSectorId(), "x"))).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		RouteEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		service.delete(userId, existing.getId());
		verify(repository).saveAndFlush(existing); // only once
	}

	@Test
	void list_returnsMappedRoutesForUser() {
		UUID userId = UUID.randomUUID();
		RouteEntity e1 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		RouteEntity e2 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<Route> result = service.list(userId);

		assertThat(result).extracting(Route::getId).containsExactly(e1.getId(), e2.getId());
	}
}
