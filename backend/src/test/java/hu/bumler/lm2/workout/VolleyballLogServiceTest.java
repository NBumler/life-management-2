package hu.bumler.lm2.workout;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.VolleyballLog;
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
class VolleyballLogServiceTest {

	private VolleyballLogRepository repository;
	private VolleyballLogService service;

	@BeforeEach
	void setUp() {
		repository = mock(VolleyballLogRepository.class);
		service = new VolleyballLogService(repository, new VolleyballLogMapper());
	}

	private static VolleyballLog dto(UUID id, int durationMinutes) {
		return new VolleyballLog(id, LocalDate.parse("2026-10-17"), durationMinutes, false);
	}

	private static VolleyballLogEntity entity(UUID id, UUID userId) {
		VolleyballLogEntity entity = new VolleyballLogEntity(id, userId);
		entity.setVolleyballDate(LocalDate.parse("2026-10-01"));
		entity.setDurationMinutes(60);
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewLog_withOptionalStatisticsFields() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		VolleyballLog input = dto(id, 90);
		input.intensity(VolleyballLog.IntensityEnum.HARD);
		input.setsPlayed(4);
		input.notes("erős ellenfél");

		VolleyballLog saved = service.create(userId, input);

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getDurationMinutes()).isEqualTo(90);
		assertThat(saved.getIntensity().orElse(null)).isEqualTo(VolleyballLog.IntensityEnum.HARD);
		assertThat(saved.getSetsPlayed().orElse(null)).isEqualTo(4);
		assertThat(saved.getNotes().orElse(null)).isEqualTo("erős ellenfél");
	}

	@Test
	void create_acceptsMissingIntensity() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		VolleyballLog saved = service.create(userId, dto(id, 60));

		assertThat(saved.getIntensity().orElse(null)).isNull();
	}

	@Test
	void create_acceptsTheDurationCap() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		VolleyballLog saved = service.create(userId, dto(id, VolleyballLogService.MAX_DURATION_MINUTES));

		assertThat(saved.getDurationMinutes()).isEqualTo(240);
	}

	@Test
	void create_throwsValidation_whenDurationExceedsTheCap() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.create(userId, dto(id, 241)))
				.isInstanceOf(ValidationException.class)
				.satisfies(ex -> assertThat(((ValidationException) ex).getField()).isEqualTo("durationMinutes"));
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_rejectsForeignLog_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		VolleyballLogEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), 60)))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenLogBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- update ---

	@Test
	void update_throwsEntityDeleted_whenLogAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		VolleyballLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId(), 60)))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenLogNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		VolleyballLogEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		VolleyballLog deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenLogAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		VolleyballLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		VolleyballLog deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedLogsForUser() {
		UUID userId = UUID.randomUUID();
		VolleyballLogEntity e1 = entity(UUID.randomUUID(), userId);
		VolleyballLogEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByVolleyballDateDescCreatedAtDesc(userId))
				.thenReturn(List.of(e1, e2));

		List<VolleyballLog> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(VolleyballLog::getId).containsExactly(e1.getId(), e2.getId());
	}
}
