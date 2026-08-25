package hu.bumler.lm2.tasks;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.LifePlan;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class LifePlanServiceTest {

	private LifePlanRepository repository;
	private LifePlanService service;

	@BeforeEach
	void setUp() {
		repository = mock(LifePlanRepository.class);
		service = new LifePlanService(repository, new LifePlanMapper());
	}

	private static LifePlanEntity entity(UUID id, UUID userId) {
		LifePlanEntity entity = new LifePlanEntity(id, userId);
		entity.setTitle("Motoros jogosítvány");
		entity.applyStatus("PLANNED", null);
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewPlan_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		LifePlan dto = new LifePlan(id, "Rope-solo tanfolyam", LifePlan.StatusEnum.PLANNED, false);
		LifePlan saved = service.create(userId, dto);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getTitle()).isEqualTo("Rope-solo tanfolyam");
		assertThat(saved.getStatus()).isEqualTo(LifePlan.StatusEnum.PLANNED);

		ArgumentCaptor<LifePlanEntity> captor = ArgumentCaptor.forClass(LifePlanEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
	}

	@Test
	void create_updatesOwnExistingPlan_whenIdBelongsToCallingUser() {
		UUID userId = UUID.randomUUID();
		LifePlanEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		LifePlan dto = new LifePlan(existing.getId(), "Költözés", LifePlan.StatusEnum.IN_PROGRESS, false);
		LifePlan saved = service.create(userId, dto);

		assertThat(saved.getTitle()).isEqualTo("Költözés");
		assertThat(saved.getStatus()).isEqualTo(LifePlan.StatusEnum.IN_PROGRESS);
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void create_rejectsForeignPlan_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		LifePlanEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		LifePlan dto = new LifePlan(existing.getId(), "Motoros jogosítvány", LifePlan.StatusEnum.PLANNED, false);

		assertThatThrownBy(() -> service.create(attacker, dto)).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_setsCompletedAt_whenStatusChangesToDone() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
		OffsetDateTime completedAt = OffsetDateTime.now();

		LifePlan dto = new LifePlan(id, "Maraton", LifePlan.StatusEnum.DONE, false);
		dto.completedAt(completedAt);

		LifePlan saved = service.create(userId, dto);

		assertThat(saved.getStatus()).isEqualTo(LifePlan.StatusEnum.DONE);
		assertThat(saved.getCompletedAt().orElse(null)).isEqualTo(completedAt);
	}

	@Test
	void create_throwsValidation_whenStatusDoneWithoutCompletedAt() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		LifePlan dto = new LifePlan(id, "Maraton", LifePlan.StatusEnum.DONE, false);

		assertThatThrownBy(() -> service.create(userId, dto))
				.isInstanceOf(ValidationException.class)
				.satisfies(ex -> assertThat(((ValidationException) ex).getField()).isEqualTo("completedAt"));
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsValidation_whenCompletedAtSetWithoutDoneStatus() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		LifePlan dto = new LifePlan(id, "Maraton", LifePlan.StatusEnum.PLANNED, false);
		dto.completedAt(OffsetDateTime.now());

		assertThatThrownBy(() -> service.create(userId, dto))
				.isInstanceOf(ValidationException.class)
				.satisfies(ex -> assertThat(((ValidationException) ex).getField()).isEqualTo("completedAt"));
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

	// --- update ---

	@Test
	void update_throwsEntityDeleted_whenPlanAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		LifePlanEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		LifePlan dto = new LifePlan(existing.getId(), "Motoros jogosítvány", LifePlan.StatusEnum.PLANNED, false);

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_clearsCompletedAt_whenStatusLeavesDone() {
		UUID userId = UUID.randomUUID();
		LifePlanEntity existing = entity(UUID.randomUUID(), userId);
		existing.applyStatus("DONE", OffsetDateTime.now());
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		LifePlan dto = new LifePlan(existing.getId(), "Motoros jogosítvány", LifePlan.StatusEnum.IN_PROGRESS, false);
		LifePlan saved = service.update(userId, existing.getId(), dto);

		assertThat(saved.getCompletedAt().orElse(null)).isNull();
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenPlanNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		LifePlanEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		LifePlan deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenPlanAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		LifePlanEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		LifePlan deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedPlansForUser() {
		UUID userId = UUID.randomUUID();
		LifePlanEntity e1 = entity(UUID.randomUUID(), userId);
		LifePlanEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByCreatedAtAsc(userId)).thenReturn(List.of(e1, e2));

		List<LifePlan> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(LifePlan::getId).containsExactly(e1.getId(), e2.getId());
	}
}
