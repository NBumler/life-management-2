package hu.bumler.lm2.workout;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import hu.bumler.lm2.api.model.BikeRideLog;
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
class BikeRideLogServiceTest {

	private BikeRideLogRepository repository;
	private BikeRideLogService service;

	@BeforeEach
	void setUp() {
		repository = mock(BikeRideLogRepository.class);
		service = new BikeRideLogService(repository, new BikeRideLogMapper());
	}

	private static BikeRideLog dto(UUID id, BikeRideLog.IntensityEnum intensity) {
		return new BikeRideLog(id, LocalDate.parse("2026-08-29"), 60, intensity, false);
	}

	private static BikeRideLogEntity entity(UUID id, UUID userId) {
		BikeRideLogEntity entity = new BikeRideLogEntity(id, userId);
		entity.setRideDate(LocalDate.parse("2026-08-01"));
		entity.setDurationMinutes(45);
		entity.setIntensity("CITY");
		return entity;
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewLog_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		BikeRideLog saved = service.create(userId, dto(id, BikeRideLog.IntensityEnum.ROAD_VIGOROUS));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getIntensity()).isEqualTo(BikeRideLog.IntensityEnum.ROAD_VIGOROUS);
		assertThat(saved.getDurationMinutes()).isEqualTo(60);
	}

	@Test
	void create_persistsOptionalDistanceAndElevation() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		BikeRideLog input = dto(id, BikeRideLog.IntensityEnum.ROAD_LEISURE);
		input.distanceKm(24.5);
		input.elevationGainMeters(320);

		BikeRideLog saved = service.create(userId, input);

		assertThat(saved.getDistanceKm().orElse(null)).isEqualTo(24.5);
		assertThat(saved.getElevationGainMeters().orElse(null)).isEqualTo(320);
	}

	@Test
	void create_rejectsForeignLog_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		BikeRideLogEntity existing = entity(UUID.randomUUID(), owner);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId(), BikeRideLog.IntensityEnum.CITY)))
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
		BikeRideLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(
				() -> service.update(userId, existing.getId(), dto(existing.getId(), BikeRideLog.IntensityEnum.CITY)))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_clearsOptionalFields_whenTheyAreOmitted() {
		UUID userId = UUID.randomUUID();
		BikeRideLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.setDistanceKm(30.0);
		existing.setElevationGainMeters(500);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		BikeRideLog updated = service.update(userId, existing.getId(),
				dto(existing.getId(), BikeRideLog.IntensityEnum.MOUNTAIN_TRAIL));

		assertThat(updated.getDistanceKm().orElse(null)).isNull();
		assertThat(updated.getElevationGainMeters().orElse(null)).isNull();
	}

	// --- delete (soft, idempotent) ---

	@Test
	void delete_softDeletes_whenLogNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		BikeRideLogEntity existing = entity(UUID.randomUUID(), userId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		BikeRideLog deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenLogAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		BikeRideLogEntity existing = entity(UUID.randomUUID(), userId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		BikeRideLog deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedLogsForUser() {
		UUID userId = UUID.randomUUID();
		BikeRideLogEntity e1 = entity(UUID.randomUUID(), userId);
		BikeRideLogEntity e2 = entity(UUID.randomUUID(), userId);
		when(repository.findByUserIdAndDeletedFalseOrderByRideDateDescCreatedAtDesc(userId)).thenReturn(List.of(e1, e2));

		List<BikeRideLog> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(BikeRideLog::getId).containsExactly(e1.getId(), e2.getId());
	}
}
