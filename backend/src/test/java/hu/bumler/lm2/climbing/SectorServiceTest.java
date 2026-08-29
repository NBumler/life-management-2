package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.Sector;
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
class SectorServiceTest {

	private SectorRepository repository;
	private SectorService service;

	@BeforeEach
	void setUp() {
		repository = mock(SectorRepository.class);
		service = new SectorService(repository, new SectorMapper());
	}

	private static Sector dto(UUID id, UUID cragId, String name) {
		return new Sector(id, cragId, name, false);
	}

	private static SectorEntity entity(UUID id, UUID userId, UUID cragId) {
		SectorEntity e = new SectorEntity(id, userId, cragId);
		e.setName("Főfal");
		e.setDefaultAspect("észak");
		return e;
	}

	@Test
	void create_insertsNewSector_withCragLinkAndAspect() {
		UUID userId = UUID.randomUUID();
		UUID cragId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Sector input = dto(id, cragId, "Alsó szektor");
		input.defaultAspect("dél");

		Sector saved = service.create(userId, input);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getCragId()).isEqualTo(cragId);
		assertThat(saved.getDefaultAspect().orElse(null)).isEqualTo("dél");
	}

	@Test
	void create_rejectsForeignSector_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		SectorEntity existing = entity(UUID.randomUUID(), owner, UUID.randomUUID());
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), existing.getCragId(), "x")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_clearsAspect_whenOmitted() {
		UUID userId = UUID.randomUUID();
		SectorEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Sector updated = service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getCragId(), "renamed"));

		assertThat(updated.getDefaultAspect().orElse(null)).isNull();
	}

	@Test
	void update_throwsEntityDeleted_whenSectorAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		SectorEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getCragId(), "x"))).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		SectorEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		service.delete(userId, existing.getId());
		verify(repository).saveAndFlush(existing); // only once
	}

	@Test
	void list_returnsMappedSectorsForUser() {
		UUID userId = UUID.randomUUID();
		SectorEntity e1 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		SectorEntity e2 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<Sector> result = service.list(userId);

		assertThat(result).extracting(Sector::getId).containsExactly(e1.getId(), e2.getId());
	}
}
