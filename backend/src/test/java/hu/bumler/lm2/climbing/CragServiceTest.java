package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.Crag;
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
class CragServiceTest {

	private CragRepository repository;
	private CragService service;

	@BeforeEach
	void setUp() {
		repository = mock(CragRepository.class);
		service = new CragService(repository, new CragMapper());
	}

	private static Crag dto(UUID id, String name) {
		return new Crag(id, name, false);
	}

	private static CragEntity entity(UUID id, UUID userId) {
		CragEntity e = new CragEntity(id, userId);
		e.setName("Sziklakert");
		e.setLatitude(47.5);
		e.setLongitude(19.0);
		e.setDefaultRockType("mészkő");
		return e;
	}

	@Test
	void create_insertsNewCrag_withGpsAndRockType() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Crag input = dto(id, "Bükk");
		input.latitude(48.1);
		input.longitude(20.5);
		input.defaultRockType("mészkő");

		Crag saved = service.create(userId, input);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getLatitude().orElse(null)).isEqualTo(48.1);
		assertThat(saved.getLongitude().orElse(null)).isEqualTo(20.5);
		assertThat(saved.getDefaultRockType().orElse(null)).isEqualTo("mészkő");
	}

	@Test
	void create_rejectsForeignCrag_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		CragEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), "x")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_clearsGpsAndRockType_whenOmitted() {
		UUID userId = UUID.randomUUID();
		CragEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		Crag updated = service.update(userId, existing.getId(), dto(existing.getId(), "renamed"));

		assertThat(updated.getLatitude().orElse(null)).isNull();
		assertThat(updated.getLongitude().orElse(null)).isNull();
		assertThat(updated.getDefaultRockType().orElse(null)).isNull();
	}

	@Test
	void update_throwsEntityDeleted_whenCragAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		CragEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId(), "x")))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		CragEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		service.delete(userId, existing.getId());
		verify(repository).saveAndFlush(existing); // only once
	}

	@Test
	void list_returnsMappedCragsForUser() {
		UUID userId = UUID.randomUUID();
		CragEntity e1 = entity(UUID.randomUUID(), userId);
		CragEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<Crag> result = service.list(userId);

		assertThat(result).extracting(Crag::getId).containsExactly(e1.getId(), e2.getId());
	}
}
