package hu.bumler.lm2.finance;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.RecurringExpense;
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
class RecurringExpenseServiceTest {

	private RecurringExpenseRepository repository;
	private RecurringExpenseService service;

	@BeforeEach
	void setUp() {
		repository = mock(RecurringExpenseRepository.class);
		service = new RecurringExpenseService(repository, new RecurringExpenseMapper());
	}

	private static RecurringExpense dto(UUID id) {
		return new RecurringExpense(id, "Netflix", 4990, RecurringExpense.FrequencyEnum.MONTHLY,
				RecurringExpense.CategoryEnum.ENTERTAINMENT, LocalDate.parse("2026-09-10"), 10, true, false);
	}

	private static RecurringExpenseEntity entity(UUID id, UUID userId) {
		RecurringExpenseEntity entity = new RecurringExpenseEntity(id, userId);
		entity.setName("Spotify");
		entity.setAmountHuf(1990);
		entity.setFrequency("MONTHLY");
		entity.setCategory("ENTERTAINMENT");
		entity.setNextBillingDate(LocalDate.parse("2026-09-01"));
		entity.setBillingDayOfMonth((short) 1);
		entity.setActive(true);
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewExpense_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		RecurringExpense saved = service.create(userId, dto(id));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Netflix");
		assertThat(saved.getAmountHuf()).isEqualTo(4990);
		assertThat(saved.getFrequency()).isEqualTo(RecurringExpense.FrequencyEnum.MONTHLY);
		assertThat(saved.getBillingDayOfMonth()).isEqualTo(10);
	}

	@Test
	void create_trimsName_andRejectsBlankName() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		RecurringExpense padded = dto(id);
		padded.setName("  Disney+  ");
		assertThat(service.create(userId, padded).getName()).isEqualTo("Disney+");

		RecurringExpense blank = dto(id);
		blank.setName("   ");
		assertThatThrownBy(() -> service.create(userId, blank)).isInstanceOf(ValidationException.class);
	}

	@Test
	void create_rejectsForeignExpense_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		RecurringExpenseEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId())))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenExpenseBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- update ---

	@Test
	void update_throwsEntityDeleted_whenExpenseAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		RecurringExpenseEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId())))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_appliesPauseAndClearsNotes_whenOmitted() {
		UUID userId = UUID.randomUUID();
		RecurringExpenseEntity existing = entity(UUID.randomUUID(), userId);
		existing.setNotes("old note");
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		RecurringExpense paused = dto(existing.getId());
		paused.setActive(false);

		RecurringExpense updated = service.update(userId, existing.getId(), paused);

		assertThat(updated.getActive()).isFalse();
		assertThat(updated.getNotes().orElse(null)).isNull();
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenExpenseNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		RecurringExpenseEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		RecurringExpense deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenExpenseAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		RecurringExpenseEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		RecurringExpense deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedExpensesForUser() {
		UUID userId = UUID.randomUUID();
		RecurringExpenseEntity e1 = entity(UUID.randomUUID(), userId);
		RecurringExpenseEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByNextBillingDateAscNameAsc(userId))
				.thenReturn(List.of(e1, e2));

		List<RecurringExpense> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(RecurringExpense::getId).containsExactly(e1.getId(), e2.getId());
	}
}
