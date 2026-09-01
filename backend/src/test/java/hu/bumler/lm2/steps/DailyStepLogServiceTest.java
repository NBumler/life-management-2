package hu.bumler.lm2.steps;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.DailyStepLog;
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
class DailyStepLogServiceTest {

	private DailyStepLogRepository repository;
	private DailyStepLogService service;

	@BeforeEach
	void setUp() {
		repository = mock(DailyStepLogRepository.class);
		service = new DailyStepLogService(repository, new DailyStepLogMapper());
	}

	private static DailyStepLog dto(UUID id, int stepCount) {
		return new DailyStepLog(id, LocalDate.parse("2026-09-01"), stepCount, false);
	}

	private static DailyStepLogEntity entity(UUID id, UUID userId) {
		DailyStepLogEntity entity = new DailyStepLogEntity(id, userId);
		entity.setLogDate(LocalDate.parse("2026-09-01"));
		entity.setStepCount(1000);
		return entity;
	}

	@Test
	void create_insertsNewLog_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		DailyStepLog saved = service.create(userId, dto(id, 8421));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getStepCount()).isEqualTo(8421);
	}

	@Test
	void create_isIdempotentUpsert_andOverwritesWithASmallerValue() {
		UUID userId = UUID.randomUUID();
		DailyStepLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.setStepCount(9000);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		// The server does plain last-write-wins — max-wins lives on the client.
		DailyStepLog saved = service.create(userId, dto(existing.getId(), 120));

		assertThat(saved.getStepCount()).isEqualTo(120);
	}

	@Test
	void create_revivesTombstonedRow_forTheSameDeterministicId() {
		UUID userId = UUID.randomUUID();
		DailyStepLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		DailyStepLog saved = service.create(userId, dto(existing.getId(), 5000));

		assertThat(saved.getDeleted()).isFalse();
		assertThat(saved.getStepCount()).isEqualTo(5000);
	}

	@Test
	void create_rejectsForeignLog_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		DailyStepLogEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), 100)))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_throwsEntityDeleted_afterTheLogWasDeleted() {
		UUID userId = UUID.randomUUID();
		DailyStepLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId(), 100)))
				.isInstanceOf(EntityDeletedException.class);
	}

	@Test
	void delete_isIdempotent_andKeepsTheTombstone() {
		UUID userId = UUID.randomUUID();
		DailyStepLogEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		DailyStepLog first = service.delete(userId, existing.getId());
		DailyStepLog second = service.delete(userId, existing.getId());

		assertThat(first.getDeleted()).isTrue();
		assertThat(second.getDeleted()).isTrue();
		verify(repository).saveAndFlush(any());
	}

	@Test
	void get_throwsNotFound_whenMissing() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, userId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(userId, id)).isInstanceOf(EntityNotFoundException.class);
	}
}
