package hu.bumler.lm2.tasks;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import hu.bumler.lm2.api.model.HouseholdTask;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Plain JUnit 5 + Mockito, no Spring context (spring-boot-conventions testing.md). */
class HouseholdTaskServiceTest {

	private HouseholdTaskRepository repository;
	private HouseholdRoomRepository roomRepository;
	private HouseholdTaskService service;
	private UUID roomId;

	@BeforeEach
	void setUp() {
		repository = mock(HouseholdTaskRepository.class);
		roomRepository = mock(HouseholdRoomRepository.class);
		roomId = UUID.randomUUID();
		service = new HouseholdTaskService(repository, roomRepository, new HouseholdTaskMapper());
	}

	private static HouseholdTaskEntity entity(UUID id, UUID userId, UUID roomId) {
		HouseholdTaskEntity entity = new HouseholdTaskEntity(id, userId);
		entity.setRoomId(roomId);
		entity.rename("Porszívózás", "porszívózás");
		entity.setEnergyLevel("MEDIUM");
		entity.setEstimatedMinutes(15);
		entity.setIntervalDays(7);
		entity.setNextDue(LocalDate.of(2026, 1, 1));
		return entity;
	}

	private HouseholdTask dto(UUID id) {
		HouseholdTask dto = new HouseholdTask(id, roomId, "Porszívózás", HouseholdTask.EnergyLevelEnum.MEDIUM, 15, 7,
				LocalDate.of(2026, 1, 1), false);
		return dto;
	}

	private void ownRoom(UUID userId) {
		when(roomRepository.findByIdAndUserId(eq(roomId), eq(userId))).thenReturn(Optional.of(new HouseholdRoomEntity(roomId, userId)));
	}

	// --- create (idempotent upsert) ---

	@Test
	void create_insertsNewTask_whenIdNotFoundAnywhere() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		ownRoom(userId);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByRoomIdAndNameNormalizedAndDeletedFalse(eq(roomId), any())).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		HouseholdTask saved = service.create(userId, dto(id));

		assertThat(saved.getId()).isEqualTo(id);
		assertThat(saved.getName()).isEqualTo("Porszívózás");
		assertThat(saved.getEnergyLevel()).isEqualTo(HouseholdTask.EnergyLevelEnum.MEDIUM);

		ArgumentCaptor<HouseholdTaskEntity> captor = ArgumentCaptor.forClass(HouseholdTaskEntity.class);
		verify(repository).saveAndFlush(captor.capture());
		assertThat(captor.getValue().getUserId()).isEqualTo(userId);
		assertThat(captor.getValue().getNameNormalized()).isEqualTo("porszívózás");
	}

	@Test
	void create_rejectsForeignTask_whenIdBelongsToAnotherUser() {
		UUID owner = UUID.randomUUID();
		UUID attacker = UUID.randomUUID();
		HouseholdTaskEntity existing = entity(UUID.randomUUID(), owner, roomId);
		when(repository.findById(existing.getId())).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.create(attacker, dto(existing.getId()))).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsNotFound_whenRoomDoesNotBelongToCaller() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(roomRepository.findByIdAndUserId(roomId, userId)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.create(userId, dto(id))).isInstanceOf(EntityNotFoundException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void create_throwsUniqueViolationWithConflictingId_whenNameAlreadyLiveInTheSameRoom() {
		UUID userId = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		ownRoom(userId);
		HouseholdTaskEntity conflict = entity(UUID.randomUUID(), userId, roomId);
		when(repository.findById(id)).thenReturn(Optional.empty());
		when(repository.findByRoomIdAndNameNormalizedAndDeletedFalse(roomId, "porszívózás")).thenReturn(Optional.of(conflict));

		assertThatThrownBy(() -> service.create(userId, dto(id)))
				.isInstanceOf(UniqueViolationException.class)
				.satisfies(ex -> {
					UniqueViolationException uve = (UniqueViolationException) ex;
					assertThat(uve.getField()).isEqualTo("name");
					assertThat(uve.getConflictingId()).isEqualTo(conflict.getId());
				});
		verify(repository, never()).saveAndFlush(any());
	}

	// --- get ---

	@Test
	void get_throwsNotFound_whenTaskBelongsToAnotherUser() {
		UUID attacker = UUID.randomUUID();
		UUID id = UUID.randomUUID();
		when(repository.findByIdAndUserId(id, attacker)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.get(attacker, id)).isInstanceOf(EntityNotFoundException.class);
	}

	// --- update (pipálás is a plain PUT) ---

	@Test
	void update_throwsEntityDeleted_whenTaskAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		HouseholdTaskEntity existing = entity(UUID.randomUUID(), userId, roomId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		assertThatThrownBy(() -> service.update(userId, existing.getId(), dto(existing.getId())))
				.isInstanceOf(EntityDeletedException.class);
		verify(repository, never()).saveAndFlush(any());
	}

	@Test
	void update_storesTheClientRolledNextDueAndLastCompletedAt_onCompletion() {
		UUID userId = UUID.randomUUID();
		HouseholdTaskEntity existing = entity(UUID.randomUUID(), userId, roomId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		ownRoom(userId);
		when(repository.findByRoomIdAndNameNormalizedAndDeletedFalse(roomId, "porszívózás")).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		HouseholdTask dto = dto(existing.getId());
		dto.nextDue(LocalDate.of(2026, 1, 8));
		dto.lastCompletedAt(java.time.OffsetDateTime.parse("2026-01-01T09:00:00Z"));

		HouseholdTask saved = service.update(userId, existing.getId(), dto);

		assertThat(saved.getNextDue()).isEqualTo(LocalDate.of(2026, 1, 8));
		assertThat(saved.getLastCompletedAt().orElse(null)).isEqualTo(java.time.OffsetDateTime.parse("2026-01-01T09:00:00Z"));
	}

	@Test
	void update_allowsMovingTheTaskToAnotherRoom_whenTargetRoomHasNoNameConflict() {
		UUID userId = UUID.randomUUID();
		UUID newRoomId = UUID.randomUUID();
		HouseholdTaskEntity existing = entity(UUID.randomUUID(), userId, roomId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(roomRepository.findByIdAndUserId(newRoomId, userId)).thenReturn(Optional.of(new HouseholdRoomEntity(newRoomId, userId)));
		when(repository.findByRoomIdAndNameNormalizedAndDeletedFalse(newRoomId, "porszívózás")).thenReturn(Optional.empty());
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		HouseholdTask dto = new HouseholdTask(existing.getId(), newRoomId, "Porszívózás", HouseholdTask.EnergyLevelEnum.MEDIUM, 15, 7,
				LocalDate.of(2026, 1, 1), false);

		HouseholdTask saved = service.update(userId, existing.getId(), dto);

		assertThat(saved.getRoomId()).isEqualTo(newRoomId);
	}

	// --- delete (soft, idempotent, no cascade) ---

	@Test
	void delete_softDeletes_whenTaskNotYetDeleted() {
		UUID userId = UUID.randomUUID();
		HouseholdTaskEntity existing = entity(UUID.randomUUID(), userId, roomId);
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));
		when(repository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

		HouseholdTask deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository).saveAndFlush(existing);
	}

	@Test
	void delete_isIdempotent_whenTaskAlreadyDeleted() {
		UUID userId = UUID.randomUUID();
		HouseholdTaskEntity existing = entity(UUID.randomUUID(), userId, roomId);
		existing.softDelete();
		when(repository.findByIdAndUserId(existing.getId(), userId)).thenReturn(Optional.of(existing));

		HouseholdTask deleted = service.delete(userId, existing.getId());

		assertThat(deleted.getDeleted()).isTrue();
		verify(repository, never()).saveAndFlush(any());
	}

	// --- list ---

	@Test
	void list_returnsMappedTasksForUser() {
		UUID userId = UUID.randomUUID();
		HouseholdTaskEntity e1 = entity(UUID.randomUUID(), userId, roomId);
		HouseholdTaskEntity e2 = entity(UUID.randomUUID(), userId, roomId);
		when(repository.findByUserIdAndDeletedFalseOrderByNextDueAsc(userId)).thenReturn(List.of(e1, e2));

		List<HouseholdTask> result = service.list(userId);

		assertThat(result).hasSize(2).extracting(HouseholdTask::getId).containsExactly(e1.getId(), e2.getId());
	}
}
