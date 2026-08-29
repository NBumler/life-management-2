package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.BoulderProblem;
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
class BoulderProblemServiceTest {

	private BoulderProblemRepository repository;
	private BoulderProblemService service;

	@BeforeEach
	void setUp() {
		repository = mock(BoulderProblemRepository.class);
		service = new BoulderProblemService(repository, new BoulderProblemMapper());
	}

	private static BoulderProblem dto(UUID id, UUID sectorId, String name) {
		return new BoulderProblem(id, sectorId, name, "7A", false);
	}

	private static BoulderProblemEntity entity(UUID id, UUID userId, UUID sectorId) {
		BoulderProblemEntity e = new BoulderProblemEntity(id, userId, sectorId);
		e.setName("Kockakő");
		e.setGuidebookGrade("6C+");
		return e;
	}

	@Test
	void create_insertsNewProblem_withSectorLinkAndGrade() {
		UUID userId = UUID.randomUUID();
		UUID sectorId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		BoulderProblem saved = service.create(userId, dto(id, sectorId, "Traverz blokk"));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getSectorId()).isEqualTo(sectorId);
		assertThat(saved.getGuidebookGrade()).isEqualTo("7A");
	}

	@Test
	void create_rejectsForeignProblem_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		BoulderProblemEntity existing = entity(UUID.randomUUID(), owner, UUID.randomUUID());
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), existing.getSectorId(), "x")))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_replacesNameAndGrade() {
		UUID userId = UUID.randomUUID();
		BoulderProblemEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		BoulderProblem input = dto(existing.getId(), existing.getSectorId(), "renamed");
		input.setGuidebookGrade("7B");

		BoulderProblem updated = service.update(userId, existing.getId(), input);

		assertThat(updated.getName()).isEqualTo("renamed");
		assertThat(updated.getGuidebookGrade()).isEqualTo("7B");
	}

	@Test
	void update_throwsEntityDeleted_whenProblemAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		BoulderProblemEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(),
				dto(existing.getId(), existing.getSectorId(), "x"))).isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void delete_softDeletes_thenIsIdempotent() {
		UUID userId = UUID.randomUUID();
		BoulderProblemEntity existing = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		assertThat(service.delete(userId, existing.getId()).getDeleted()).isTrue();
		service.delete(userId, existing.getId());
		verify(repository).saveAndFlush(existing); // only once
	}

	@Test
	void list_returnsMappedProblemsForUser() {
		UUID userId = UUID.randomUUID();
		BoulderProblemEntity e1 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		BoulderProblemEntity e2 = entity(UUID.randomUUID(), userId, UUID.randomUUID());
		when(repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId)).thenReturn(List.of(e1, e2));

		List<BoulderProblem> result = service.list(userId);

		assertThat(result).extracting(BoulderProblem::getId).containsExactly(e1.getId(), e2.getId());
	}
}
