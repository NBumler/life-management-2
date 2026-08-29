package hu.bumler.lm2.workout;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.SwimLog;
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
class SwimLogServiceTest {

	private SwimLogRepository repository;
	private SwimLogService service;

	@BeforeEach
	void setUp() {
		repository = mock(SwimLogRepository.class);
		service = new SwimLogService(repository, new SwimLogMapper());
	}

	private static SwimLog dto(UUID id, SwimLog.IntensityEnum intensity) {
		return new SwimLog(id, LocalDate.parse("2026-08-29"), 40, intensity, false);
	}

	private static SwimLogEntity entity(UUID id, UUID userId) {
		SwimLogEntity entity = new SwimLogEntity(id, userId);
		entity.setSwimDate(LocalDate.parse("2026-08-01"));
		entity.setDurationMinutes(30);
		entity.setIntensity("CASUAL");
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewLog_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		SwimLog saved = service.create(userId, dto(id, SwimLog.IntensityEnum.CRAWL_FREESTYLE));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getIntensity()).isEqualTo(SwimLog.IntensityEnum.CRAWL_FREESTYLE);
		assertThat(saved.getDurationMinutes()).isEqualTo(40);
	}

	@Test
	void create_rejectsForeignLog_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		SwimLogEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), SwimLog.IntensityEnum.CASUAL)))
				.isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_computesDistance_fromPoolLengthAndLapCount_ignoringSentValue() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		SwimLog input = dto(id, SwimLog.IntensityEnum.CASUAL);
		input.poolLengthMeters(25);
		input.lapCount(40);
		input.distanceMeters(9999);

		SwimLog saved = service.create(userId, input);

		assertThat(saved.getDistanceMeters().orElse(null)).isEqualTo(1000);
	}

	@Test
	void create_keepsManualDistance_forOpenWater() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		SwimLog input = dto(id, SwimLog.IntensityEnum.OPEN_WATER);
		input.distanceMeters(1800);

		SwimLog saved = service.create(userId, input);

		assertThat(saved.getDistanceMeters().orElse(null)).isEqualTo(1800);
		assertThat(saved.getPoolLengthMeters().orElse(null)).isNull();
	}

	@Test
	void create_throwsValidation_whenOnlyOnePoolFieldIsPresent() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		SwimLog input = dto(id, SwimLog.IntensityEnum.CASUAL);
		input.poolLengthMeters(25);

		assertThatThrownBy(() -> service.create(userId, input))
				.isInstanceOf(ValidationException.class)
				.satisfies(ex -> assertThat(((ValidationException) ex).getField()).isEqualTo("lapCount"));
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsValidation_whenPoolFieldsSetForOpenWater() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		SwimLog input = dto(id, SwimLog.IntensityEnum.OPEN_WATER);
		input.poolLengthMeters(25);
		input.lapCount(20);

		assertThatThrownBy(() -> service.create(userId, input))
				.isInstanceOf(ValidationException.class)
				.satisfies(ex -> assertThat(((ValidationException) ex).getField()).isEqualTo("poolLengthMeters"));
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
		SwimLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId(), SwimLog.IntensityEnum.CASUAL)))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenLogNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		SwimLogEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		SwimLog deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenLogAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		SwimLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		SwimLog deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedLogsForUser() {
		UUID userId = UUID.randomUUID();
		SwimLogEntity e1 = entity(UUID.randomUUID(), userId);
		SwimLogEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderBySwimDateDescCreatedAtDesc(userId)).thenReturn(List.of(e1, e2));

		List<SwimLog> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(SwimLog::getId).containsExactly(e1.getId(), e2.getId());
	}
}
